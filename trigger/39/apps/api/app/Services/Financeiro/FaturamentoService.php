<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Faturamento;
use App\Models\FaturamentoItem;
use App\Models\NaturezaGerencial;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Titulo;
use App\Services\Banking\BankProviderResolver;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\PrecoTravadoPedido;
use App\Services\Fiscal\EmissaoFiscalService;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Faturamento do PED PRODUZIDO + TIT/COB do saldo (estudo 32 / ADR_FATURAMENTO_COBRANCA).
 * NF-e/NFS-e: planeja no mesmo FAT e emite via hub Focus se estiver habilitado (ADR_EMISSAO_NFE_NFSE).
 * Baixa PA/REV só na NF-e Focus autorizada (SAIDA_VENDA). Estorno só com NF pendente/rejeitada (BL-050).
 */
class FaturamentoService
{
    public const ORIGEM_FATURA = 'FATURA';

    public const NF_PENDENTE = Faturamento::NF_PENDENTE;

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly TituloService $titulos,
        private readonly CondicaoPagamentoParser $condicoes,
        private readonly BankProviderResolver $banks,
        private readonly EmissaoFiscalService $emissao,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null): array
    {
        $query = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->with(['parceiro:id,codigo,razao_social', 'pedido:id,codigo,status', 'orcamento:id,codigo'])
            ->orderByDesc('id');

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $like))
                    ->orWhereHas('parceiro', fn ($p) => $p->where('razao_social', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (Faturamento $f) => $this->toOut($f))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Faturamento $faturamento): array
    {
        $faturamento->load([
            'parceiro:id,codigo,razao_social',
            'pedido:id,codigo,status',
            'orcamento:id,codigo',
            'itens',
            'titulos.cobrancas',
            'adiantamentoTitulo:id,codigo,valor,status,saldo',
            'documentosFiscais',
            ...Faturamento::userStampWith(),
            'estornadoPor:id,name',
        ]);

        return $this->toOut($faturamento, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, Pedido $pedido): array
    {
        $this->assertEmpresa($empresa, $pedido);
        $existente = $this->existenteDoPedido($empresa, $pedido);
        if ($existente) {
            $fatOut = $this->show($existente);

            return [
                'ja_faturado' => true,
                'apto' => false,
                'pode_estornar' => (bool) ($fatOut['pode_estornar'] ?? false),
                'faturamento' => $fatOut,
            ];
        }

        $calc = $this->montarCalculo($pedido);
        $fiscal = $this->emissao->checklist()->paraPedido($empresa, $pedido, $calc['itens'] ?? []);

        return array_merge($calc, [
            'ja_faturado' => false,
            'apto' => $calc['bloqueios'] === [],
            'fiscal' => $fiscal,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function faturar(Empresa $empresa, Pedido $pedido): array
    {
        $this->assertEmpresa($empresa, $pedido);

        $existente = $this->existenteDoPedido($empresa, $pedido);
        if ($existente) {
            return $this->show($existente);
        }

        $calc = $this->montarCalculo($pedido);
        if ($calc['bloqueios'] !== []) {
            throw ValidationException::withMessages([
                'pedido' => $calc['bloqueios'],
            ]);
        }

        $precisaCob = $this->formaEmiteCobranca($calc['forma_pagamento'])
            && bccomp($calc['valor_a_cobrar'], '0', PadraoDecimal::SCALE_MONEY) > 0;
        $conta = null;
        if ($precisaCob) {
            $conta = $this->contaFinanceira($empresa);
        }

        $natureza = $this->naturezaReceita($calc['familia_fiscal']);

        $fat = DB::transaction(function () use ($empresa, $pedido, $calc, $conta, $natureza) {
            $locked = Pedido::query()->lockForUpdate()->with(['parceiro', 'itens'])->findOrFail($pedido->id);
            $dup = $this->existenteDoPedido($empresa, $locked);
            if ($dup) {
                return $dup;
            }

            if ($locked->status !== Pedido::STATUS_PRODUZIDO) {
                throw ValidationException::withMessages([
                    'pedido' => ['Pedido não está produzido — não é possível faturar.'],
                ]);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'FAT-'.$ano, 5);

            $fat = Faturamento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $locked->id,
                'orcamento_id' => $locked->orcamento_id,
                'parceiro_id' => $locked->parceiro_id,
                'status' => Faturamento::STATUS_CONFIRMADO,
                'nf_status' => self::NF_PENDENTE,
                'valor_bruto' => $calc['valor_bruto'],
                'valor_adiantamento' => $calc['valor_adiantamento'],
                'valor_a_cobrar' => $calc['valor_a_cobrar'],
                'condicao_pagamento' => $calc['condicao_pagamento'],
                'forma_pagamento' => $calc['forma_pagamento'],
                'adiantamento_titulo_id' => $calc['adiantamento_titulo_id'],
                'snapshot' => $calc['snapshot'],
                'faturado_em' => now(),
                'faturado_por' => Auth::id(),
            ]);

            foreach ($calc['itens'] as $linha) {
                FaturamentoItem::query()->create([
                    'empresa_id' => $empresa->id,
                    'faturamento_id' => $fat->id,
                    'pedido_item_id' => $linha['pedido_item_id'],
                    'ordem' => $linha['ordem'],
                    'descricao' => $linha['descricao'],
                    'unidade' => $linha['unidade'],
                    'qtde' => $linha['qtde'],
                    'preco_unitario' => $linha['preco_unitario'],
                    'valor' => $linha['valor'],
                    'familia_fiscal' => $linha['familia_fiscal'] ?? null,
                ]);
            }

            $emissao = now()->toDateString();
            foreach ($calc['parcelas'] as $p) {
                $titulo = $this->titulos->criarReceberFatura(
                    $empresa,
                    $locked,
                    $fat,
                    $natureza,
                    $p['valor'],
                    $emissao,
                    $p['vencimento'],
                    (int) $p['parcela'],
                    count($calc['parcelas']),
                    'Fatura '.$fat->codigo.' · '.$p['rotulo'],
                );

                if ($conta !== null && $this->formaEmiteCobranca($calc['forma_pagamento'])) {
                    $this->emitirCobranca(
                        $empresa,
                        $titulo,
                        $conta,
                        $locked,
                        $fat,
                        $p,
                    );
                }
            }

            $locked->status = Pedido::STATUS_FATURADO;
            $locked->save();

            $this->emissao->planejar($empresa, $fat);

            app(ComissaoService::class)->apurarApropriacaoSinal($locked, $fat);

            return $fat;
        });

        $this->emissao->emitirSeApto($empresa, $fat);

        return $this->show($fat->fresh());
    }

    /**
     * Estorno comercial/financeiro enquanto a NF não foi autorizada (estudo 32 / UC-PLT-007).
     *
     * @return array<string, mixed>
     */
    public function estornar(Empresa $empresa, Faturamento $faturamento, string $motivo): array
    {
        $this->assertEmpresaFat($empresa, $faturamento);
        $motivo = trim($motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo do estorno (mínimo 3 caracteres).'],
            ]);
        }

        $fat = DB::transaction(function () use ($empresa, $faturamento, $motivo) {
            $fat = Faturamento::query()->lockForUpdate()->findOrFail($faturamento->id);
            if ($fat->empresa_id !== $empresa->id) {
                abort(404);
            }

            if ($fat->status === Faturamento::STATUS_ESTORNADO) {
                return $fat;
            }

            $bloqueios = $this->bloqueiosEstorno($fat);
            if ($bloqueios !== []) {
                throw ValidationException::withMessages([
                    'faturamento' => $bloqueios,
                ]);
            }

            $this->cancelarCobrancasDoFaturamento($empresa, $fat);

            app(ComissaoService::class)->estornarDoFaturamento($fat, $motivo);

            $fat->load(['titulos.baixas']);
            foreach ($fat->titulos as $titulo) {
                if ($titulo->origem !== self::ORIGEM_FATURA) {
                    continue;
                }
                $this->titulos->cancelarAberto($titulo, $motivo);
            }

            $fat->status = Faturamento::STATUS_ESTORNADO;
            $fat->motivo_estorno = $motivo;
            $fat->estornado_em = now();
            $fat->estornado_por = Auth::id();
            $fat->save();

            $this->emissao->cancelarPlanejados($fat);

            $pedido = Pedido::query()->lockForUpdate()->findOrFail($fat->pedido_id);
            if ($pedido->status === Pedido::STATUS_FATURADO) {
                $pedido->status = Pedido::STATUS_PRODUZIDO;
                $pedido->save();
            }

            return $fat;
        });

        return $this->show($fat->fresh());
    }

    /**
     * Reenvia NF-e/NFS-e planejadas ou rejeitadas (mesma ref Focus).
     *
     * @return array<string, mixed>
     */
    public function emitirDocumentos(Empresa $empresa, Faturamento $faturamento): array
    {
        $this->assertEmpresaFat($empresa, $faturamento);
        $this->emissao->emitir($empresa, $faturamento, true);

        return $this->show($faturamento->fresh());
    }

    /**
     * Consulta status no hub (documentos em processamento).
     *
     * @return array<string, mixed>
     */
    public function consultarDocumentos(Empresa $empresa, Faturamento $faturamento): array
    {
        $this->assertEmpresaFat($empresa, $faturamento);
        $this->emissao->consultar($empresa, $faturamento);

        return $this->show($faturamento->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Faturamento $f, bool $detalhe = false): array
    {
        $out = [
            'id' => $f->id,
            'codigo' => $f->codigo,
            'status' => $f->status,
            'nf_status' => $f->nf_status,
            'nf_simulada' => $f->relationLoaded('documentosFiscais')
                && $f->documentosFiscais->isNotEmpty()
                && $f->documentosFiscais->every(fn ($d) => $d->eSimulado()),
            'valor_bruto' => (string) $f->valor_bruto,
            'valor_adiantamento' => (string) $f->valor_adiantamento,
            'valor_a_cobrar' => (string) $f->valor_a_cobrar,
            'condicao_pagamento' => $f->condicao_pagamento,
            'forma_pagamento' => $f->forma_pagamento,
            'faturado_em' => optional($f->faturado_em)?->toIso8601String(),
            'estornado_em' => optional($f->estornado_em)?->toIso8601String(),
            'motivo_estorno' => $f->motivo_estorno,
            'parceiro' => $f->parceiro ? [
                'id' => $f->parceiro->id,
                'codigo' => $f->parceiro->codigo,
                'razao_social' => $f->parceiro->razao_social,
            ] : null,
            'pedido' => $f->pedido ? [
                'id' => $f->pedido->id,
                'codigo' => $f->pedido->codigo,
                'status' => $f->pedido->status,
            ] : null,
            'orcamento' => $f->orcamento ? [
                'id' => $f->orcamento->id,
                'codigo' => $f->orcamento->codigo,
            ] : null,
            'created_at' => optional($f->created_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $bloqueiosEstorno = $this->bloqueiosEstorno($f);
            $out['pode_estornar'] = $bloqueiosEstorno === [];
            $out['bloqueios_estorno'] = $bloqueiosEstorno;
            $out['itens'] = $f->itens->map(fn (FaturamentoItem $i) => [
                'id' => $i->id,
                'pedido_item_id' => $i->pedido_item_id,
                'ordem' => $i->ordem,
                'descricao' => $i->descricao,
                'unidade' => $i->unidade,
                'qtde' => (string) $i->qtde,
                'preco_unitario' => $i->preco_unitario !== null ? (string) $i->preco_unitario : null,
                'valor' => (string) $i->valor,
            ])->all();
            $out['titulos'] = $f->titulos->map(fn (Titulo $t) => $this->titulos->toOut($t))->all();
            $out['adiantamento'] = $f->adiantamentoTitulo ? [
                'id' => $f->adiantamentoTitulo->id,
                'codigo' => $f->adiantamentoTitulo->codigo,
                'valor' => (string) $f->adiantamentoTitulo->valor,
                'status' => $f->adiantamentoTitulo->status,
            ] : null;
            $out['snapshot'] = $f->snapshot;
            $out['documentos_fiscais'] = $this->emissao->documentosOut($f);
            $out['criado_por'] = Faturamento::userStampFrom($f->criador);
            $out['estornado_por'] = Faturamento::userStampFrom($f->estornadoPor);
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function montarCalculo(Pedido $pedido): array
    {
        $pedido->loadMissing(['itens', 'orcamento.adiantamentoTitulo', 'parceiro']);

        $bloqueios = [];
        if ($pedido->status === Pedido::STATUS_CANCELADO) {
            $bloqueios[] = 'Pedido cancelado não pode ser faturado.';
        } elseif ($pedido->status !== Pedido::STATUS_PRODUZIDO) {
            $bloqueios[] = 'Faturamento exige pedido produzido (OP/OS concluída).';
        }

        $travado = $this->precoTravado($pedido);

        $itens = [];
        $valorItens = '0.00';
        $familia = 'PA-ETQ';
        $qtdeFaturavel = '0.0000';
        foreach ($pedido->itens as $item) {
            if ($item->status === PedidoItem::STATUS_CANCELADO) {
                continue;
            }
            $qtde = PadraoDecimal::roundHalfUp((string) $item->qtde_faturavel, PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                $bloqueios[] = 'Item '.$item->descricao.' sem quantidade faturável.';
                continue;
            }
            if ($item->status !== PedidoItem::STATUS_PRODUZIDO) {
                $bloqueios[] = 'Item ainda não produzido: '.$item->descricao.'.';
            }
            $preco = $travado['preco_unitario'];
            $valor = PrecoTravadoPedido::valorEtiquetas($qtde, $travado);
            $valorItens = bcadd($valorItens, $valor, PadraoDecimal::SCALE_MONEY);
            $familia = (string) ($item->familia_fiscal ?: $familia);
            $qtdeFaturavel = $qtde;
            $itens[] = [
                'pedido_item_id' => $item->id,
                'ordem' => $item->ordem,
                'descricao' => $item->descricao,
                'unidade' => $item->unidade,
                'qtde' => $qtde,
                'preco_unitario' => $preco,
                'valor' => $valor,
                'familia_fiscal' => $item->familia_fiscal,
            ];
        }

        if ($itens === []) {
            $bloqueios[] = 'Nenhum item faturável no pedido.';
        }

        $valorMatriz = $travado['valor_matriz'];
        $valorFaca = $this->valorFaca($pedido);
        $pedidoItemId = $itens[0]['pedido_item_id'] ?? null;
        $ordem = count($itens);
        if ($pedidoItemId !== null && bccomp($valorMatriz, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            $ordem++;
            $itens[] = [
                'pedido_item_id' => $pedidoItemId,
                'ordem' => $ordem,
                'descricao' => FaturamentoItem::DESC_MATRIZ,
                'unidade' => 'UN',
                'qtde' => '1.0000',
                'preco_unitario' => PadraoDecimal::roundHalfUp($valorMatriz, PadraoDecimal::SCALE_UNIT_PRICE),
                'valor' => $valorMatriz,
                'familia_fiscal' => $familia,
            ];
        }
        if ($pedidoItemId !== null && bccomp($valorFaca, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            $ordem++;
            $itens[] = [
                'pedido_item_id' => $pedidoItemId,
                'ordem' => $ordem,
                'descricao' => FaturamentoItem::DESC_FACA,
                'unidade' => 'UN',
                'qtde' => '1.0000',
                'preco_unitario' => PadraoDecimal::roundHalfUp($valorFaca, PadraoDecimal::SCALE_UNIT_PRICE),
                'valor' => $valorFaca,
                'familia_fiscal' => $familia,
            ];
        }

        $valorBruto = bcadd(bcadd($valorItens, $valorMatriz, PadraoDecimal::SCALE_MONEY), $valorFaca, PadraoDecimal::SCALE_MONEY);

        $adi = $this->adiantamentoQuitado($pedido);
        $valorAdiantamento = '0.00';
        $adiTituloId = null;
        if ($adi !== null) {
            $valorAdiantamento = PadraoDecimal::roundHalfUp((string) $adi->valor, PadraoDecimal::SCALE_MONEY);
            $adiTituloId = $adi->id;
            if (bccomp($valorAdiantamento, $valorBruto, PadraoDecimal::SCALE_MONEY) > 0) {
                $valorAdiantamento = $valorBruto;
            }
        }

        $valorACobrar = PadraoDecimal::roundHalfUp(
            bcsub($valorBruto, $valorAdiantamento, PadraoDecimal::SCALE_MONEY + 2),
            PadraoDecimal::SCALE_MONEY
        );
        if (bccomp($valorACobrar, '0', PadraoDecimal::SCALE_MONEY) < 0) {
            $valorACobrar = '0.00';
        }

        $input = is_array($pedido->snapshot['input'] ?? null) ? $pedido->snapshot['input'] : [];
        $condicao = trim((string) ($input['condicao_pagamento'] ?? $pedido->parceiro?->condicao_pagamento ?? ''));
        $forma = $this->normalizarForma(
            (string) ($input['forma_pagamento'] ?? $pedido->parceiro?->forma_pagamento ?? 'PIX')
        );

        $specs = $this->condicoes->parse($condicao !== '' ? $condicao : null);
        $specs = $this->condicoes->aposAdiantamento($specs, $adiTituloId !== null);
        $parcelas = $this->condicoes->ratear($valorACobrar, $specs, now());

        if (bccomp($valorACobrar, '0', PadraoDecimal::SCALE_MONEY) > 0 && $parcelas === []) {
            $parcelas = $this->condicoes->ratear(
                $valorACobrar,
                $this->condicoes->parse('À vista'),
                now()
            );
        }

        $avisos = [];
        if ($adiTituloId !== null) {
            $avisos[] = 'Sinal/adiantamento já recebido será apropriado — não gera nova cobrança desse valor.';
        }
        if (bccomp($valorMatriz, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            $avisos[] = 'Matriz/clichê é valor fixo do orçamento — não varia com a quantidade produzida.';
        }
        if (bccomp($valorFaca, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            $avisos[] = 'Ferramental (faca nova) incluído no valor da fatura.';
        }
        if ($valorACobrar === '0.00' && $adiTituloId !== null) {
            $avisos[] = 'Saldo a cobrar é zero: o sinal cobre a quantidade faturável.';
        }
        if ($this->formaEmiteCobranca($forma) && bccomp($valorACobrar, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            try {
                $this->contaFinanceira($pedido->empresa ?? Empresa::query()->findOrFail($pedido->empresa_id));
            } catch (ValidationException $e) {
                $bloqueios = array_merge($bloqueios, $e->errors()['conta_financeira'] ?? ['Cadastre uma conta financeira antes de emitir cobrança.']);
            }
        }

        return [
            'pedido_id' => $pedido->id,
            'pedido_codigo' => $pedido->codigo,
            'valor_itens' => $valorItens,
            'valor_matriz' => $valorMatriz,
            'valor_faca' => $valorFaca,
            'preco_unitario' => $travado['preco_unitario'],
            'qtde_faturavel' => $qtdeFaturavel,
            'qtde_pedida' => $travado['qtde_faixa'],
            'valor_bruto' => $valorBruto,
            'valor_adiantamento' => $valorAdiantamento,
            'valor_a_cobrar' => $valorACobrar,
            'adiantamento_titulo_id' => $adiTituloId,
            'adiantamento' => $adi ? [
                'id' => $adi->id,
                'codigo' => $adi->codigo,
                'valor' => (string) $adi->valor,
                'status' => $adi->status,
            ] : null,
            'condicao_pagamento' => $condicao !== '' ? $condicao : '28 DDL (padrão)',
            'forma_pagamento' => $forma,
            'emite_cobranca' => $this->formaEmiteCobranca($forma) && bccomp($valorACobrar, '0', PadraoDecimal::SCALE_MONEY) > 0,
            'familia_fiscal' => $familia,
            'itens' => $itens,
            'parcelas' => $parcelas,
            'avisos' => $avisos,
            'bloqueios' => array_values(array_unique($bloqueios)),
            'snapshot' => [
                'condicao_pagamento' => $condicao,
                'forma_pagamento' => $forma,
                'valor_itens' => $valorItens,
                'valor_matriz' => $valorMatriz,
                'valor_faca' => $valorFaca,
                'preco_unitario' => $travado['preco_unitario'],
                'qtde_pedida' => $pedido->itens->first()?->qtde_pedida,
                'qtde_faturavel' => $pedido->itens->first()?->qtde_faturavel,
            ],
        ];
    }

    /**
     * @return array{qtde_faixa: string, valor_etiqueta: string, preco_unitario: string, valor_matriz: string, valor_comercial: string, origem: string}
     */
    private function precoTravado(Pedido $pedido): array
    {
        $faixa = is_array($pedido->snapshot['faixa'] ?? null) ? $pedido->snapshot['faixa'] : [];
        if (PrecoTravadoPedido::faixaUtil($faixa)) {
            return PrecoTravadoPedido::daFaixa($faixa);
        }
        $item = $pedido->itens->first();
        if ($item !== null) {
            return PrecoTravadoPedido::doItem($item);
        }

        return PrecoTravadoPedido::daFaixa([]);
    }

    private function valorFaca(Pedido $pedido): string
    {
        $input = is_array($pedido->snapshot['input'] ?? null) ? $pedido->snapshot['input'] : [];
        $faixa = is_array($pedido->snapshot['faixa'] ?? null) ? $pedido->snapshot['faixa'] : [];
        $facaNova = (bool) ($faixa['faca_nova'] ?? $input['faca_nova'] ?? false);
        if (! $facaNova) {
            return '0.00';
        }
        $raw = $faixa['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0;
        $v = PadraoDecimal::parseStrict((string) $raw, PadraoDecimal::SCALE_MONEY);

        return $v !== null && bccomp($v, '0', PadraoDecimal::SCALE_MONEY) > 0 ? $v : '0.00';
    }

    private function adiantamentoQuitado(Pedido $pedido): ?Titulo
    {
        $orc = $pedido->orcamento;
        if ($orc === null) {
            return null;
        }
        $orc->loadMissing('adiantamentoTitulo');
        $tit = $orc->adiantamentoTitulo;
        if ($tit === null) {
            return null;
        }
        if ($tit->origem !== AdiantamentoService::ORIGEM_ADIANTAMENTO) {
            return null;
        }
        if ($tit->status !== Titulo::STATUS_QUITADO) {
            return null;
        }

        return $tit;
    }

    private function existenteDoPedido(Empresa $empresa, Pedido $pedido): ?Faturamento
    {
        return Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->first();
    }

    /**
     * @return list<string>
     */
    private function bloqueiosEstorno(Faturamento $fat): array
    {
        $bloqueios = [];
        if ($fat->status === Faturamento::STATUS_ESTORNADO) {
            return ['Faturamento já estornado.'];
        }
        if ($fat->status !== Faturamento::STATUS_CONFIRMADO) {
            $bloqueios[] = 'Só o faturamento vigente pode ser estornado.';
        }
        $fat->loadMissing('documentosFiscais');
        if (! in_array($fat->nf_status, [self::NF_PENDENTE, Faturamento::NF_REJEITADA], true)) {
            $soStub = $fat->documentosFiscais->isNotEmpty()
                && $fat->documentosFiscais->contains(fn ($d) => $d->eSimulado())
                && ! $fat->documentosFiscais->contains(fn ($d) => $d->bloqueiaEstornoFat());
            if (! $soStub) {
                $bloqueios[] = 'Estorno só é permitido enquanto a nota estiver pendente ou rejeitada. Nota autorizada ou em processamento segue cancelamento fiscal.';
            }
        }
        foreach ($fat->documentosFiscais as $doc) {
            if ($doc->bloqueiaEstornoFat()) {
                $bloqueios[] = 'Documento fiscal '.$doc->codigo.' está '.$doc->status.' — cancele a nota no hub antes de estornar o faturamento.';
            }
        }

        $fat->loadMissing(['titulos.cobrancas', 'titulos.baixas']);
        foreach ($fat->titulos as $titulo) {
            if ($titulo->origem !== self::ORIGEM_FATURA) {
                continue;
            }
            if ($titulo->baixas->isNotEmpty()) {
                $bloqueios[] = 'Título '.$titulo->codigo.' já possui baixa — quite ou use compensação financeira.';
            }
            if (! in_array($titulo->status, [Titulo::STATUS_ABERTO, Titulo::STATUS_CANCELADO], true)) {
                $bloqueios[] = 'Título '.$titulo->codigo.' está '.$titulo->status.' — estorno exige cobrança ainda em aberto.';
            }
            foreach ($titulo->cobrancas as $cob) {
                if ($cob->status === Cobranca::STATUS_PAGA) {
                    $bloqueios[] = 'Cobrança '.$cob->codigo.' já está paga.';
                }
            }
        }

        if (app(\App\Services\Expedicao\EntregaService::class)->pedidoTemEntregaVigenteOuFechada((int) $fat->empresa_id, (int) $fat->pedido_id)) {
            $bloqueios[] = 'Há romaneio de entrega neste pedido — cancele a expedição antes de estornar o faturamento.';
        }

        if (app(ComissaoService::class)->temComissaoNaoPrevista((int) $fat->empresa_id, (int) $fat->id)) {
            $bloqueios[] = 'Há comissão já liberada ou paga neste faturamento — cancele o fechamento antes de estornar.';
        }

        return array_values(array_unique($bloqueios));
    }

    private function cancelarCobrancasDoFaturamento(Empresa $empresa, Faturamento $fat): void
    {
        $fat->loadMissing('titulos.cobrancas');
        foreach ($fat->titulos as $titulo) {
            if ($titulo->origem !== self::ORIGEM_FATURA) {
                continue;
            }
            foreach ($titulo->cobrancas as $cob) {
                if (in_array($cob->status, [Cobranca::STATUS_CANCELADA, Cobranca::STATUS_ESTORNADA], true)) {
                    continue;
                }
                if ($cob->status === Cobranca::STATUS_PAGA) {
                    throw ValidationException::withMessages([
                        'cobranca' => ['Cobrança '.$cob->codigo.' já está paga — não é possível estornar.'],
                    ]);
                }

                if ($cob->provider_ref) {
                    try {
                        $provider = $this->banks->resolve((string) $cob->provider);
                        $provider->cancelarCobranca($empresa, (string) $cob->provider_ref);
                    } catch (\Throwable $e) {
                        throw ValidationException::withMessages([
                            'cobranca' => [
                                'Não foi possível cancelar a cobrança '.$cob->codigo.' no banco. Tente de novo. '.$e->getMessage(),
                            ],
                        ]);
                    }
                }

                $cob->status = Cobranca::STATUS_CANCELADA;
                $cob->save();
            }
        }
    }

    private function assertEmpresaFat(Empresa $empresa, Faturamento $faturamento): void
    {
        if ($faturamento->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    private function formaEmiteCobranca(string $forma): bool
    {
        $f = mb_strtolower($forma);

        return $f === 'pix' || $f === 'boleto';
    }

    private function normalizarForma(string $forma): string
    {
        $t = trim($forma);
        if ($t === '') {
            return 'PIX';
        }
        foreach (['PIX', 'Boleto', 'Transferência', 'Cartão'] as $canon) {
            if (strcasecmp($t, $canon) === 0) {
                return $canon;
            }
        }

        return $t;
    }

    private function naturezaReceita(string $familia): NaturezaGerencial
    {
        $codigo = match (true) {
            str_starts_with($familia, 'SVC') => '1.01.03',
            str_starts_with($familia, 'REV') => '1.01.02',
            default => '1.01.01',
        };

        $nat = NaturezaGerencial::query()
            ->where(function ($q) use ($codigo) {
                $q->where('codigo_exibicao', $codigo)->orWhere('codigo', $codigo);
            })
            ->first();

        if ($nat === null) {
            $nat = NaturezaGerencial::query()
                ->where('codigo_exibicao', 'like', '1.01.%')
                ->orderBy('codigo_exibicao')
                ->first();
        }
        if ($nat === null) {
            throw new RuntimeException('Natureza gerencial de receita (1.01) não encontrada — rode o seed de naturezas.');
        }

        return $nat;
    }

    private function contaFinanceira(Empresa $empresa): EmpresaContaFinanceira
    {
        $conta = EmpresaContaFinanceira::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativa', true)
            ->orderByDesc('principal')
            ->orderBy('ordem')
            ->orderBy('id')
            ->first();

        if ($conta === null) {
            throw ValidationException::withMessages([
                'conta_financeira' => ['Cadastre uma conta financeira (CFIN) na empresa antes de emitir cobrança.'],
            ]);
        }

        return $conta;
    }

    /**
     * @param  array{valor: string, vencimento: string, parcela: int, rotulo: string}  $parcela
     */
    private function emitirCobranca(
        Empresa $empresa,
        Titulo $titulo,
        EmpresaContaFinanceira $conta,
        Pedido $pedido,
        Faturamento $fat,
        array $parcela,
    ): Cobranca {
        $idempotency = 'FAT-'.$fat->id.'-P'.$parcela['parcela'];
        $existente = Cobranca::query()
            ->where('empresa_id', $empresa->id)
            ->where('idempotency_key', $idempotency)
            ->first();
        if ($existente) {
            return $existente;
        }

        $provider = $this->banks->default();
        $emitida = $provider->emitirCobranca($empresa, $titulo, [
            'valor' => $parcela['valor'],
            'vencimento' => $parcela['vencimento'],
            'pagador_nome' => $pedido->parceiro?->razao_social,
            'pagador_documento' => $pedido->parceiro?->cnpj_cpf,
            'descricao' => $fat->codigo.' · '.$pedido->codigo,
            'idempotency_key' => $idempotency,
            'seu_numero' => substr(preg_replace('/\W+/', '', $fat->codigo.$parcela['parcela']) ?: (string) $fat->id, 0, 15),
        ]);

        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'COB-'.$ano, 5);

        return Cobranca::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'titulo_id' => $titulo->id,
            'empresa_conta_financeira_id' => $conta->id,
            'provider' => $provider->nome(),
            'provider_ref' => $emitida->providerRef,
            'txid' => $emitida->txid,
            'idempotency_key' => $idempotency,
            'pix_copia_cola' => $emitida->pixCopiaCola,
            'pix_qr_base64' => $emitida->pixQrBase64,
            'linha_digitavel' => $emitida->linhaDigitavel,
            'pdf_url' => $emitida->pdfUrl,
            'vencimento' => $parcela['vencimento'],
            'status' => $emitida->status,
            'provider_payload' => $emitida->raw,
        ]);
    }

    private function assertEmpresa(Empresa $empresa, Pedido $pedido): void
    {
        if ($pedido->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
