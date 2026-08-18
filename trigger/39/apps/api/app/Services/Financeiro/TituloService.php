<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueMovimento;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\TituloBaixa;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use App\Support\TituloAging;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TituloService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function listCarteira(Empresa $empresa, string $tipo, array $filters = []): array
    {
        $query = $this->baseQuery($empresa, $tipo);
        $this->applyBusca($query, $filters['q'] ?? null);
        $this->applyParceiroNatureza($query, $filters);

        $resumo = $this->montarResumo(clone $query, $empresa);

        $this->applySituacao($query, $filters['situacao'] ?? null, $filters['status'] ?? null);
        $this->applyFaixa($query, $filters['faixa'] ?? null);

        $data = $query
            ->orderBy('vencimento')
            ->orderBy('codigo')
            ->get()
            ->map(fn (Titulo $t) => $this->toOut($t))
            ->all();

        return [
            'data' => $data,
            'meta' => [
                'tipo' => $tipo,
                'statuses' => Titulo::STATUSES,
                'formas' => Titulo::FORMAS,
                'faixas' => TituloAging::labels(),
                'aging' => $resumo['aging'],
                'aberto' => $resumo['aberto'],
                'previsao' => $resumo['previsao'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPagar(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $parceiroId = null): array
    {
        return $this->listCarteira($empresa, Titulo::TIPO_PAGAR, [
            'q' => $q,
            'status' => $status,
            'parceiro_id' => $parceiroId,
        ])['data'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listReceber(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $parceiroId = null): array
    {
        return $this->listCarteira($empresa, Titulo::TIPO_RECEBER, [
            'q' => $q,
            'status' => $status,
            'parceiro_id' => $parceiroId,
        ])['data'];
    }

    public function criarReceberAdiantamento(
        Empresa $empresa,
        int $parceiroId,
        NaturezaGerencial $natureza,
        Orcamento $orcamento,
        string $valor,
        string $emissao,
        string $vencimento,
        ?string $observacao,
    ): Titulo {
        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $parceiroId,
            'natureza_id' => $natureza->id,
            'orcamento_id' => $orcamento->id,
            'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
            'documento' => $orcamento->codigo,
            'emissao' => $emissao,
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $observacao,
        ]);
    }

    public function criarReceberFatura(
        Empresa $empresa,
        Pedido $pedido,
        Faturamento $faturamento,
        NaturezaGerencial $natureza,
        string $valor,
        string $emissao,
        string $vencimento,
        int $parcela,
        int $totalParcelas,
        ?string $observacao,
    ): Titulo {
        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);
        $nDup = $totalParcelas > 1 ? str_pad((string) $parcela, 3, '0', STR_PAD_LEFT) : null;
        $doc = $faturamento->codigo;
        if ($nDup) {
            $doc .= '-'.$nDup;
        }

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $pedido->parceiro_id,
            'natureza_id' => $natureza->id,
            'orcamento_id' => $pedido->orcamento_id,
            'pedido_id' => $pedido->id,
            'faturamento_id' => $faturamento->id,
            'origem' => FaturamentoService::ORIGEM_FATURA,
            'documento' => $doc,
            'parcela' => $parcela,
            'n_dup' => $nDup,
            'emissao' => $emissao,
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $observacao,
        ]);
    }

    public function criarPagarComissao(
        Empresa $empresa,
        int $vendedorParceiroId,
        NaturezaGerencial $natureza,
        string $valor,
        string $emissao,
        string $vencimento,
        string $documento,
        ?string $observacao,
    ): Titulo {
        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => Titulo::TIPO_PAGAR,
            'parceiro_id' => $vendedorParceiroId,
            'natureza_id' => $natureza->id,
            'origem' => ComissaoService::ORIGEM_TITULO,
            'documento' => $documento,
            'parcela' => 1,
            'emissao' => $emissao,
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $observacao,
        ]);
    }

    /**
     * Lançamento pontual (origem AVULSO). Não substitui FAT/OC/CFE.
     *
     * @param  array<string, mixed>  $data
     */
    public function criarAvulso(Empresa $empresa, array $data): Titulo
    {
        $tipo = strtoupper((string) $data['tipo']);
        if (! in_array($tipo, Titulo::TIPOS, true)) {
            throw ValidationException::withMessages([
                'tipo' => ['Tipo deve ser PAGAR ou RECEBER.'],
            ]);
        }

        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $data['parceiro_id'])
            ->first();
        if (! $parceiro) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Parceiro inválido para a empresa.'],
            ]);
        }

        $natureza = $this->assertNaturezaAvulso($tipo, (int) $data['natureza_id'], $data['observacao'] ?? null);

        $valor = PadraoDecimal::parseStrict((string) $data['valor'], PadraoDecimal::SCALE_MONEY);
        if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            throw ValidationException::withMessages([
                'valor' => ['Valor deve ser maior que zero.'],
            ]);
        }

        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => $tipo,
            'parceiro_id' => $parceiro->id,
            'natureza_id' => $natureza->id,
            'origem' => Titulo::ORIGEM_AVULSO,
            'documento' => $this->nullIfEmpty($data['documento'] ?? null),
            'parcela' => 1,
            'emissao' => $data['emissao'],
            'vencimento' => $data['vencimento'],
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
        ]);
    }

    public function cancelarAvulso(Empresa $empresa, Titulo $titulo, string $motivo): Titulo
    {
        if ($titulo->empresa_id !== $empresa->id) {
            abort(404);
        }

        if ($titulo->origem !== Titulo::ORIGEM_AVULSO) {
            throw ValidationException::withMessages([
                'titulo' => ['Só o lançamento pontual pode ser cancelado por aqui. Títulos de fatura, compra, adiantamento ou comissão seguem o documento de origem.'],
            ]);
        }

        return $this->cancelarAberto($titulo, $motivo);
    }

    /**
     * Cria título(s) a pagar a partir da entrada de estoque (chamado só por EstoqueEntradaService).
     *
     * @param  list<array{vencimento: string, valor: string, n_dup?: ?string, parcela?: int}>|null  $parcelas
     * @return list<\App\Models\Titulo>
     */
    public function criarPagarDeEntrada(
        Empresa $empresa,
        OrdemCompra $oc,
        EstoqueMovimento $movimento,
        NaturezaGerencial $natureza,
        string $valorFallback,
        ?string $vencimentoFallback,
        string $emissao,
        ?string $documento,
        ?array $parcelas = null,
    ): array {
        $linhas = $parcelas;
        if ($linhas === null || $linhas === []) {
            if ($vencimentoFallback === null || $vencimentoFallback === '') {
                throw ValidationException::withMessages([
                    'vencimento' => ['Informe o vencimento do título ou as parcelas da NF.'],
                ]);
            }
            $linhas = [[
                'vencimento' => $vencimentoFallback,
                'valor' => $valorFallback,
                'n_dup' => null,
                'parcela' => 1,
            ]];
        }

        $titulos = [];
        $ordem = 1;
        foreach ($linhas as $linha) {
            $valor = PadraoDecimal::parseStrict((string) $linha['valor'], PadraoDecimal::SCALE_MONEY);
            if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
                throw ValidationException::withMessages([
                    'parcelas' => ['Cada parcela deve ter valor maior que zero.'],
                ]);
            }

            $parcela = isset($linha['parcela']) ? (int) $linha['parcela'] : $ordem;
            $nDup = isset($linha['n_dup']) ? $this->nullIfEmpty($linha['n_dup']) : null;
            $doc = $documento;
            if ($doc && $nDup) {
                $doc = $doc.'-'.$nDup;
            } elseif ($doc && count($linhas) > 1) {
                $doc = $doc.'-'.str_pad((string) $parcela, 3, '0', STR_PAD_LEFT);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

            $titulos[] = Titulo::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'tipo' => Titulo::TIPO_PAGAR,
                'parceiro_id' => $oc->fornecedor_id,
                'natureza_id' => $natureza->id,
                'ordem_compra_id' => $oc->id,
                'movimento_id' => $movimento->id,
                'documento' => $doc,
                'parcela' => $parcela,
                'n_dup' => $nDup,
                'emissao' => $emissao,
                'vencimento' => (string) $linha['vencimento'],
                'valor' => $valor,
                'saldo' => $valor,
                'status' => Titulo::STATUS_ABERTO,
            ]);
            $ordem++;
        }

        return $titulos;
    }

    public function cancelarAberto(Titulo $titulo, string $motivo): Titulo
    {
        if ($titulo->status === Titulo::STATUS_CANCELADO) {
            return $titulo;
        }

        if ($titulo->status !== Titulo::STATUS_ABERTO) {
            throw ValidationException::withMessages([
                'titulo' => ['Título '.$titulo->codigo.' não está aberto — não é possível estornar o faturamento.'],
            ]);
        }

        $titulo->loadMissing('baixas');
        if ($titulo->baixas->isNotEmpty()) {
            throw ValidationException::withMessages([
                'titulo' => ['Título '.$titulo->codigo.' já possui baixa — não é possível estornar o faturamento.'],
            ]);
        }

        $titulo->status = Titulo::STATUS_CANCELADO;
        $titulo->saldo = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);
        $obs = trim((string) $titulo->observacao);
        $nota = 'Estorno: '.$motivo;
        $titulo->observacao = $obs === '' ? $nota : $obs.' · '.$nota;
        $titulo->save();

        return $titulo;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function baixar(Empresa $empresa, Titulo $titulo, array $data, bool $permitirReceber = false): array
    {
        if ($titulo->empresa_id !== $empresa->id) {
            abort(404);
        }

        $tiposOk = $permitirReceber
            ? [Titulo::TIPO_PAGAR, Titulo::TIPO_RECEBER]
            : [Titulo::TIPO_PAGAR];

        // Contas a receber também baixam pela UI financeira.
        if ($titulo->tipo === Titulo::TIPO_RECEBER) {
            $tiposOk = [Titulo::TIPO_PAGAR, Titulo::TIPO_RECEBER];
        }

        if (! in_array($titulo->tipo, $tiposOk, true)) {
            throw ValidationException::withMessages([
                'tipo' => ['Tipo de título não elegível para baixa.'],
            ]);
        }

        if (! in_array($titulo->status, [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL], true)) {
            throw ValidationException::withMessages([
                'status' => ['Título não está aberto para baixa.'],
            ]);
        }

        $conta = EmpresaContaFinanceira::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $data['conta_financeira_id'])
            ->first();

        if (! $conta) {
            throw ValidationException::withMessages([
                'conta_financeira_id' => ['Conta financeira inválida para a empresa.'],
            ]);
        }

        $valor = PadraoDecimal::parseStrict($data['valor'], PadraoDecimal::SCALE_MONEY);
        if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            throw ValidationException::withMessages([
                'valor' => ['Valor da baixa deve ser maior que zero.'],
            ]);
        }

        if (bccomp($valor, (string) $titulo->saldo, PadraoDecimal::SCALE_MONEY) > 0) {
            throw ValidationException::withMessages([
                'valor' => ['Valor da baixa não pode exceder o saldo do título.'],
            ]);
        }

        $baixa = DB::transaction(function () use ($empresa, $titulo, $conta, $valor, $data) {
            $titulo = Titulo::query()->lockForUpdate()->findOrFail($titulo->id);

            if (bccomp($valor, (string) $titulo->saldo, PadraoDecimal::SCALE_MONEY) > 0) {
                throw ValidationException::withMessages([
                    'valor' => ['Valor da baixa não pode exceder o saldo do título.'],
                ]);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'BX-'.$ano, 5);

            $baixa = TituloBaixa::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'titulo_id' => $titulo->id,
                'conta_financeira_id' => $conta->id,
                'valor' => $valor,
                'pago_em' => $data['pago_em'],
                'forma' => $this->nullIfEmpty($data['forma'] ?? null),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            $novoSaldo = PadraoDecimal::roundHalfUp(
                bcsub((string) $titulo->saldo, $valor, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );

            $titulo->saldo = $novoSaldo;
            $titulo->status = bccomp($novoSaldo, '0', PadraoDecimal::SCALE_MONEY) === 0
                ? Titulo::STATUS_QUITADO
                : Titulo::STATUS_PARCIAL;
            $titulo->save();

            return $baixa;
        });

        $tituloFresh = $titulo->fresh(['cobrancas', 'orcamento']);
        if ($tituloFresh && $tituloFresh->tipo === Titulo::TIPO_RECEBER) {
            // Lazy resolve evita ciclo no container se AdiantamentoService injeta TituloService.
            app(AdiantamentoService::class)->liberarSeAdiantamentoQuitado($tituloFresh);
            if ($tituloFresh->pedido_id) {
                $pedido = Pedido::query()->find($tituloFresh->pedido_id);
                if ($pedido) {
                    app(\App\Services\Expedicao\EntregaService::class)->tentarEncerrarPedido($pedido);
                }
            }
        }
        if ($tituloFresh) {
            app(ComissaoService::class)->apurarBaixa($tituloFresh, $baixa);
        }

        return [
            'baixa' => $this->baixaToOut($baixa->fresh(['contaFinanceira'])),
            'titulo' => $this->toOut($tituloFresh ?? $titulo->fresh()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Titulo $t): array
    {
        $t->loadMissing([
            'parceiro:id,codigo,razao_social,nome_fantasia',
            'natureza:id,codigo,codigo_exibicao,nome',
            'ordemCompra:id,codigo',
            'orcamento:id,codigo,financeiro_status',
            'pedido:id,codigo',
            'faturamento:id,codigo',
            'cobrancas',
            'baixas.contaFinanceira:id,codigo,descricao',
            ...Titulo::userStampWith(),
        ]);

        $dias = $t->vencimento
            ? TituloAging::diasAtraso($t->vencimento)
            : 0;
        $faixa = TituloAging::faixa($dias);
        $emAberto = in_array($t->status, [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL], true);

        return [
            'id' => $t->id,
            'empresa_id' => $t->empresa_id,
            'codigo' => $t->codigo,
            'tipo' => $t->tipo,
            'origem' => $t->origem,
            'parceiro_id' => $t->parceiro_id,
            'parceiro' => $t->parceiro ? [
                'id' => $t->parceiro->id,
                'codigo' => $t->parceiro->codigo,
                'razao_social' => $t->parceiro->razao_social,
                'nome_fantasia' => $t->parceiro->nome_fantasia,
            ] : null,
            'natureza_id' => $t->natureza_id,
            'natureza' => $t->natureza ? [
                'id' => $t->natureza->id,
                'codigo' => $t->natureza->codigo,
                'codigo_exibicao' => $t->natureza->codigo_exibicao,
                'nome' => $t->natureza->nome,
            ] : null,
            'ordem_compra_id' => $t->ordem_compra_id,
            'ordem_compra' => $t->ordemCompra ? [
                'id' => $t->ordemCompra->id,
                'codigo' => $t->ordemCompra->codigo,
            ] : null,
            'movimento_id' => $t->movimento_id,
            'orcamento_id' => $t->orcamento_id,
            'orcamento' => $t->orcamento ? [
                'id' => $t->orcamento->id,
                'codigo' => $t->orcamento->codigo,
                'financeiro_status' => $t->orcamento->financeiro_status,
            ] : null,
            'pedido_id' => $t->pedido_id,
            'pedido' => $t->pedido ? [
                'id' => $t->pedido->id,
                'codigo' => $t->pedido->codigo,
            ] : null,
            'faturamento_id' => $t->faturamento_id,
            'faturamento' => $t->faturamento ? [
                'id' => $t->faturamento->id,
                'codigo' => $t->faturamento->codigo,
            ] : null,
            'documento' => $t->documento,
            'parcela' => $t->parcela,
            'n_dup' => $t->n_dup,
            'emissao' => optional($t->emissao)?->format('Y-m-d'),
            'vencimento' => optional($t->vencimento)?->format('Y-m-d'),
            'valor' => (string) $t->valor,
            'saldo' => (string) $t->saldo,
            'status' => $t->status,
            'observacao' => $t->observacao,
            'dias_atraso' => $emAberto ? $dias : 0,
            'faixa_aging' => $emAberto ? $faixa : null,
            'vencido' => $emAberto && TituloAging::vencido($dias),
            'cobrancas' => $t->relationLoaded('cobrancas')
                ? $t->cobrancas->map(fn (Cobranca $c) => [
                    'id' => $c->id,
                    'codigo' => $c->codigo,
                    'provider' => $c->provider,
                    'status' => $c->status,
                    'pix_copia_cola' => $c->pix_copia_cola,
                    'pix_qr_base64' => $c->pix_qr_base64,
                    'linha_digitavel' => $c->linha_digitavel,
                    'vencimento' => optional($c->vencimento)?->format('Y-m-d'),
                ])->values()->all()
                : [],
            'baixas' => $t->relationLoaded('baixas')
                ? $t->baixas->map(fn (TituloBaixa $b) => $this->baixaToOut($b))->values()->all()
                : [],
            'created_at' => optional($t->created_at)?->toIso8601String(),
            'updated_at' => optional($t->updated_at)?->toIso8601String(),
            'criado_por' => Titulo::userStampFrom($t->criador),
            'atualizado_por' => Titulo::userStampFrom($t->atualizador),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function baixaToOut(TituloBaixa $b): array
    {
        $b->loadMissing(['contaFinanceira:id,codigo,descricao', ...TituloBaixa::userStampWith()]);

        return [
            'id' => $b->id,
            'empresa_id' => $b->empresa_id,
            'codigo' => $b->codigo,
            'titulo_id' => $b->titulo_id,
            'conta_financeira_id' => $b->conta_financeira_id,
            'conta_financeira' => $b->contaFinanceira ? [
                'id' => $b->contaFinanceira->id,
                'codigo' => $b->contaFinanceira->codigo,
                'descricao' => $b->contaFinanceira->descricao,
            ] : null,
            'valor' => (string) $b->valor,
            'pago_em' => optional($b->pago_em)?->format('Y-m-d'),
            'forma' => $b->forma,
            'observacao' => $b->observacao,
            'created_at' => optional($b->created_at)?->toIso8601String(),
            'criado_por' => TituloBaixa::userStampFrom($b->criador),
            'atualizado_por' => TituloBaixa::userStampFrom($b->atualizador),
        ];
    }

    private function nullIfEmpty(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value) && trim($value) === '') {
            return null;
        }

        return $value;
    }

    private function baseQuery(Empresa $empresa, string $tipo): Builder
    {
        return Titulo::query()
            ->with([
                'parceiro:id,codigo,razao_social,nome_fantasia',
                'natureza:id,codigo,codigo_exibicao,nome',
                'ordemCompra:id,codigo',
                'orcamento:id,codigo,financeiro_status',
                'pedido:id,codigo',
                'faturamento:id,codigo',
                'cobrancas',
                'baixas.contaFinanceira:id,codigo,descricao',
                ...Titulo::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->where('tipo', $tipo);
    }

    private function applyBusca(Builder $query, ?string $q): void
    {
        if ($q === null || trim($q) === '') {
            return;
        }

        $like = '%'.$q.'%';
        $query->where(function ($inner) use ($like) {
            $inner->where('codigo', 'like', $like)
                ->orWhere('documento', 'like', $like)
                ->orWhereHas('parceiro', function ($pq) use ($like) {
                    $pq->where('codigo', 'like', $like)
                        ->orWhere('razao_social', 'like', $like)
                        ->orWhere('nome_fantasia', 'like', $like);
                })
                ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $like))
                ->orWhereHas('faturamento', fn ($p) => $p->where('codigo', 'like', $like))
                ->orWhereHas('ordemCompra', fn ($p) => $p->where('codigo', 'like', $like))
                ->orWhereHas('natureza', function ($nq) use ($like) {
                    $nq->where('codigo', 'like', $like)
                        ->orWhere('codigo_exibicao', 'like', $like)
                        ->orWhere('nome', 'like', $like);
                });
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyParceiroNatureza(Builder $query, array $filters): void
    {
        if (! empty($filters['parceiro_id'])) {
            $query->where('parceiro_id', (int) $filters['parceiro_id']);
        }
        if (! empty($filters['natureza_id'])) {
            $query->where('natureza_id', (int) $filters['natureza_id']);
        }
    }

    private function applySituacao(Builder $query, ?string $situacao, ?string $status): void
    {
        if ($status) {
            $query->where('status', $status);

            return;
        }

        $sit = strtolower((string) $situacao);
        if ($sit === 'aberto') {
            $query->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL]);
        }
    }

    private function applyFaixa(Builder $query, ?string $faixa): void
    {
        if ($faixa === null || $faixa === '') {
            return;
        }

        $hoje = now()->toDateString();
        $query->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL]);

        match ($faixa) {
            TituloAging::A_VENCER => $query->whereDate('vencimento', '>', $hoje),
            TituloAging::VENCE_HOJE => $query->whereDate('vencimento', '=', $hoje),
            TituloAging::VENCIDO => $query->whereDate('vencimento', '<', $hoje),
            TituloAging::D_1_30 => $query
                ->whereDate('vencimento', '<', $hoje)
                ->whereDate('vencimento', '>=', now()->subDays(30)->toDateString()),
            TituloAging::D_31_60 => $query
                ->whereDate('vencimento', '<', now()->subDays(30)->toDateString())
                ->whereDate('vencimento', '>=', now()->subDays(60)->toDateString()),
            TituloAging::D_61_90 => $query
                ->whereDate('vencimento', '<', now()->subDays(60)->toDateString())
                ->whereDate('vencimento', '>=', now()->subDays(90)->toDateString()),
            TituloAging::D_90_MAIS => $query->whereDate('vencimento', '<', now()->subDays(90)->toDateString()),
            default => null,
        };
    }

    /**
     * @return array{aging: list<array<string, mixed>>, aberto: array<string, mixed>, previsao: array<string, mixed>}
     */
    private function montarResumo(Builder $base, Empresa $empresa): array
    {
        $abertos = (clone $base)
            ->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL])
            ->get(['id', 'vencimento', 'saldo']);

        $saldos = [];
        $contagens = [];
        foreach (TituloAging::FAIXAS as $id) {
            $saldos[$id] = '0.00';
            $contagens[$id] = 0;
        }

        $abertoSaldo = '0.00';
        foreach ($abertos as $t) {
            $saldo = PadraoDecimal::roundHalfUp((string) $t->saldo, PadraoDecimal::SCALE_MONEY);
            $abertoSaldo = PadraoDecimal::roundHalfUp(
                bcadd($abertoSaldo, $saldo, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
            $faixa = $t->vencimento
                ? TituloAging::faixaDeVencimento($t->vencimento)
                : TituloAging::VENCE_HOJE;
            $contagens[$faixa]++;
            $saldos[$faixa] = PadraoDecimal::roundHalfUp(
                bcadd($saldos[$faixa], $saldo, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
        }

        $aging = [];
        foreach (TituloAging::labels() as $label) {
            $id = $label['id'];
            $aging[] = [
                'id' => $id,
                'label' => $label['label'],
                'count' => $contagens[$id],
                'saldo' => $saldos[$id],
            ];
        }

        $receber = $this->saldoAbertoTipo($empresa, Titulo::TIPO_RECEBER);
        $pagar = $this->saldoAbertoTipo($empresa, Titulo::TIPO_PAGAR);
        $liquido = PadraoDecimal::roundHalfUp(
            bcsub($receber, $pagar, PadraoDecimal::SCALE_MONEY + 2),
            PadraoDecimal::SCALE_MONEY
        );

        return [
            'aging' => $aging,
            'aberto' => [
                'count' => $abertos->count(),
                'saldo' => $abertoSaldo,
            ],
            'previsao' => [
                'receber_saldo' => $receber,
                'pagar_saldo' => $pagar,
                'liquido' => $liquido,
                'legenda' => 'Títulos em aberto nesta EMP — não é DRE nem contabilidade oficial.',
            ],
        ];
    }

    private function saldoAbertoTipo(Empresa $empresa, string $tipo): string
    {
        $sum = Titulo::query()
            ->where('empresa_id', $empresa->id)
            ->where('tipo', $tipo)
            ->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL])
            ->sum('saldo');

        return PadraoDecimal::roundHalfUp((string) $sum, PadraoDecimal::SCALE_MONEY);
    }

    private function assertNaturezaAvulso(string $tipo, int $naturezaId, mixed $observacao): NaturezaGerencial
    {
        $natureza = NaturezaGerencial::query()->find($naturezaId);
        if (! $natureza) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza gerencial inválida.'],
            ]);
        }

        if (! in_array((int) $natureza->grupo, NaturezaGerencial::GRUPOS, true)) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza deve pertencer aos grupos 1–5.'],
            ]);
        }

        if (! $natureza->aceita_lancamento) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza deve aceitar lançamento (folha).'],
            ]);
        }

        if (! $natureza->ativo) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza gerencial inativa.'],
            ]);
        }

        if (in_array($natureza->codigo, Titulo::NAT_RESERVADAS_AVULSO, true)) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Esta natureza nasce do faturamento, da compra ou da comissão — não use lançamento pontual.'],
            ]);
        }

        $grupo = (int) $natureza->grupo;
        if ($tipo === Titulo::TIPO_RECEBER && ! in_array($grupo, [1, 5], true)) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Contas a receber usam natureza de receita (grupo 1) ou movimentação (grupo 5).'],
            ]);
        }
        if ($tipo === Titulo::TIPO_PAGAR && ! in_array($grupo, [2, 3, 4, 5], true)) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Contas a pagar usam natureza de custo, despesa, investimento ou movimentação (grupos 2–5).'],
            ]);
        }

        if ($natureza->codigo === '1.04.04') {
            $obs = is_string($observacao) ? trim($observacao) : '';
            if ($obs === '') {
                throw ValidationException::withMessages([
                    'observacao' => ['Descrição obrigatória para natureza 1.04.04 (outras receitas).'],
                ]);
            }
        }

        return $natureza;
    }
}
