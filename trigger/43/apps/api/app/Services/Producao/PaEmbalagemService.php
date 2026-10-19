<?php

namespace App\Services\Producao;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\PaEmbalagemBobina;
use App\Models\PaEmbalagemCaixa;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Fiscal\NfePesoExpedicao;
use App\Services\Fiscal\NfeVolumeNumeracao;
use App\Support\CaixaMedida;
use App\Support\PadraoDecimal;
use App\Support\RoloCaixaEncaixe;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Embalagem física do PA (bobina → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Não mexe em estoque / Writer / ENTRADA_PA.
 */
class PaEmbalagemService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return array<string, mixed>
     */
    public function sugerir(Empresa $empresa, OrdemProducao $op): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $plano = $this->montarPlano($op, $qtdeBoa, null);
        $vigente = $this->vigenteDaOp($empresa, $op);

        return [
            'ordem_producao' => [
                'id' => $op->id,
                'codigo' => $op->codigo,
                'qtde_boa' => $qtdeBoa,
            ],
            'pedido' => $op->pedido ? [
                'id' => $op->pedido->id,
                'codigo' => $op->pedido->codigo,
            ] : null,
            'sugerido' => true,
            'plano' => $plano,
            'embalagem' => $vigente
                ? $this->toOut($vigente->load(['bobinas', 'caixas']))
                : null,
        ];
    }

    /**
     * Confirma (ou substitui) a embalagem real.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function confirmar(Empresa $empresa, OrdemProducao $op, array $data = []): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $existente = $this->vigenteDaOp($empresa, $op);
        if ($existente && $this->nfAutorizadaDoPedido($empresa, (int) $op->pedido_id)) {
            throw ValidationException::withMessages([
                'embalagem' => ['NF já autorizada — embalagem não pode ser alterada.'],
            ]);
        }

        $bobinasIn = isset($data['bobinas']) && is_array($data['bobinas']) ? $data['bobinas'] : null;
        $nRolos = isset($data['qtde_bobinas']) ? (int) $data['qtde_bobinas'] : null;
        $nCaixas = isset($data['qtde_caixas']) ? (int) $data['qtde_caixas'] : null;
        if ($nCaixas === null && $this->capacidadeCaixaDoSnapshot($op) === null) {
            throw ValidationException::withMessages([
                'qtde_caixas' => ['Informe quantas caixas saíram.'],
            ]);
        }
        $caixaProduto = $this->caixaInformada($empresa, $data['caixa_produto_id'] ?? null);
        $medidaCaixa = $caixaProduto !== null
            ? CaixaMedida::rotulo(is_array($caixaProduto->atributos) ? $caixaProduto->atributos : null)
            : null;
        $plano = $this->montarPlano($op, $qtdeBoa, $bobinasIn, $nRolos, $nCaixas, $medidaCaixa);
        $origem = ($bobinasIn !== null || $nRolos !== null || $nCaixas !== null)
            ? PaEmbalagem::ORIGEM_MANUAL
            : PaEmbalagem::ORIGEM_SUGERIDA;
        $obs = isset($data['observacao']) ? trim((string) $data['observacao']) : null;

        $emb = DB::transaction(function () use ($empresa, $op, $plano, $origem, $obs, $existente, $caixaProduto) {
            if ($existente) {
                $existente->bobinas()->delete();
                $existente->caixas()->delete();
                $existente->delete();
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'EMBPA-'.$ano, 5);

            $emb = PaEmbalagem::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $op->pedido_id,
                'pedido_item_id' => $op->pedido_item_id,
                'ordem_producao_id' => $op->id,
                'status' => PaEmbalagem::STATUS_CONFIRMADA,
                'qtde_etiquetas' => $plano['qtde_etiquetas'],
                'qtde_bobinas' => $plano['qtde_bobinas'],
                'qtde_caixas' => $plano['qtde_caixas'],
                'etiq_por_rolo' => $plano['etiq_por_rolo'],
                'rolos_por_caixa' => $plano['rolos_por_caixa'],
                'tubete' => $plano['tubete'],
                'caixa_medida' => $plano['caixa_medida'],
                'caixa_produto_id' => $caixaProduto?->id,
                'saida_etiqueta' => $plano['saida_etiqueta'],
                'origem' => $origem,
                'observacao' => $obs !== '' ? $obs : null,
                'confirmada_em' => now(),
                'confirmada_por' => Auth::id(),
            ]);

            /** @var list<PaEmbalagemCaixa> $caixas */
            $caixas = [];
            foreach ($plano['caixas'] as $cx) {
                $caixas[] = PaEmbalagemCaixa::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'sequencia' => $cx['sequencia'],
                    'codigo' => sprintf('%s-CX%02d', $emb->codigo, $cx['sequencia']),
                    'qtde_bobinas' => $cx['qtde_bobinas'],
                    'qtde_etiquetas' => $cx['qtde_etiquetas'],
                ]);
            }

            foreach ($plano['bobinas'] as $bob) {
                $caixa = $caixas[$bob['caixa_idx']] ?? null;
                PaEmbalagemBobina::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'caixa_id' => $caixa?->id,
                    'sequencia' => $bob['sequencia'],
                    'codigo' => sprintf('%s-B%03d', $emb->codigo, $bob['sequencia']),
                    'qtde_etiquetas' => $bob['qtde_etiquetas'],
                    'tubete' => $plano['tubete'],
                ]);
            }

            return $emb->fresh(['bobinas', 'caixas']);
        });

        return $this->toOut($emb);
    }

    public function vigenteDaOp(Empresa $empresa, OrdemProducao $op): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('ordem_producao_id', $op->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->first();
    }

    public function vigenteDoPedido(Empresa $empresa, Pedido $pedido): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Embalagens confirmadas do PED (1 por OP/item), mais recente primeiro.
     *
     * @return \Illuminate\Support\Collection<int, PaEmbalagem>
     */
    public function confirmadasDoPedido(Empresa $empresa, Pedido $pedido)
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->with(['bobinas', 'pedidoItem'])
            ->orderByDesc('id')
            ->get();
    }

    public function vigenteDoPedidoItem(Empresa $empresa, int $pedidoId, ?int $pedidoItemId): ?PaEmbalagem
    {
        if ($pedidoItemId === null || $pedidoItemId < 1) {
            return null;
        }

        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('pedido_item_id', $pedidoItemId)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->with('bobinas')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function resumoPedido(Empresa $empresa, Pedido $pedido): ?array
    {
        $todos = $this->confirmadasDoPedido($empresa, $pedido);
        if ($todos->isEmpty()) {
            return null;
        }

        if ($todos->count() === 1) {
            $emb = $todos->first();
            $emb->loadMissing(['bobinas', 'caixas']);

            return $this->toOut($emb, false);
        }

        $bobinas = (int) $todos->sum('qtde_bobinas');
        $caixas = (int) $todos->sum('qtde_caixas');
        $etiquetas = '0';
        foreach ($todos as $e) {
            $etiquetas = bcadd($etiquetas, (string) $e->qtde_etiquetas, PadraoDecimal::SCALE_QTY);
        }

        return [
            'multipla' => true,
            'qtde_etiquetas' => $etiquetas,
            'qtde_bobinas' => $bobinas,
            'qtde_caixas' => $caixas,
            'resumo' => $todos->count().' itens · '
                .number_format((float) $etiquetas, 0, ',', '.').' etiquetas · '
                .$bobinas.' bobina'.($bobinas === 1 ? '' : 's').' · '
                .$caixas.' caixa'.($caixas === 1 ? '' : 's'),
            'pedido_id' => $pedido->id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function etiquetas(Empresa $empresa, PaEmbalagem $embalagem): array
    {
        if ($embalagem->empresa_id !== $empresa->id) {
            abort(404);
        }

        $embalagem->loadMissing(['bobinas', 'caixas', 'pedido:id,codigo', 'ordemProducao:id,codigo', 'pedidoItem:id,descricao']);

        $bobinas = $embalagem->bobinas->map(function (PaEmbalagemBobina $b) use ($embalagem) {
            return [
                'id' => $b->id,
                'tipo' => 'BOBINA',
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'qr_payload' => $b->qrPayload(),
                'pedido' => $embalagem->pedido?->codigo,
                'op' => $embalagem->ordemProducao?->codigo,
                'descricao' => $embalagem->pedidoItem?->descricao,
            ];
        })->all();

        $caixas = $embalagem->caixas->map(function (PaEmbalagemCaixa $c) use ($embalagem) {
            return [
                'id' => $c->id,
                'tipo' => 'CAIXA',
                'codigo' => $c->codigo,
                'sequencia' => $c->sequencia,
                'qtde_bobinas' => $c->qtde_bobinas,
                'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                'qr_payload' => $c->qrPayload(),
                'pedido' => $embalagem->pedido?->codigo,
                'op' => $embalagem->ordemProducao?->codigo,
                'descricao' => $embalagem->pedidoItem?->descricao,
                'tubete' => $embalagem->tubete,
                'caixa_medida' => $embalagem->caixa_medida,
                'total_caixas' => $embalagem->qtde_caixas,
            ];
        })->all();

        return [
            'embalagem' => $this->toOut($embalagem, false),
            'bobinas' => $bobinas,
            'caixas' => $caixas,
        ];
    }

    /**
     * Texto para NF-e item (infAdProd) — bobinas + detalhe; ≤500 chars.
     * Default = modo ETIQUETA (compat). Preferir textoFiscalModo na emissão.
     */
    public function textoFiscal(?PaEmbalagem $emb): ?string
    {
        return $this->textoFiscalModo($emb, 'ETIQUETA');
    }

    /**
     * @param  array<string, mixed>|null  $especOverride
     */
    public function textoFiscalModo(?PaEmbalagem $emb, string $modo, ?array $especOverride = null): ?string
    {
        if (! $emb) {
            return null;
        }

        $emb->loadMissing(['bobinas', 'pedidoItem']);

        return mb_substr($emb->textoFiscalModo($modo, $especOverride), 0, 500);
    }

    /**
     * Eco do infCpl: uma frase por embalagem, com o item do pedido.
     * Vários itens não viram um único “N BOB · M CX”.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>|iterable<int, PaEmbalagem>  $embs
     */
    public function textoFiscalEco(iterable $embs): ?string
    {
        $partes = [];
        foreach ($embs as $e) {
            if (! $e instanceof PaEmbalagem) {
                continue;
            }
            if ((int) $e->qtde_bobinas < 1 && (int) $e->qtde_caixas < 1) {
                continue;
            }
            $e->loadMissing('pedidoItem');
            $nome = trim((string) ($e->pedidoItem?->descricao ?? ''));
            $fisico = (int) $e->qtde_bobinas.' BOB · '.(int) $e->qtde_caixas.' CX';
            $partes[] = $nome !== '' ? $nome.' - '.$fisico : $fisico;
        }
        if ($partes === []) {
            return null;
        }

        return implode(' | ', $partes);
    }

    /**
     * Resolve embalagem do item fiscal (pedido_item_id); fallback 1 embalagem no PED.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>  $embs
     */
    public function resolverParaItem($embs, ?int $pedidoItemId): ?PaEmbalagem
    {
        if ($embs->isEmpty()) {
            return null;
        }
        if ($pedidoItemId !== null && $pedidoItemId > 0) {
            $hit = $embs->first(
                fn (PaEmbalagem $e) => (int) $e->pedido_item_id === $pedidoItemId
            );
            // Item explícito sem embalagem própria (ex.: REV no PED misto) — não herdar a do PA.
            return $hit instanceof PaEmbalagem ? $hit : null;
        }
        // Legado: linha sem pedido_item_id e uma única embalagem no PED.
        if ($embs->count() === 1) {
            return $embs->first();
        }

        return null;
    }

    /**
     * @return array{quantidade: int, especie: string}|null
     */
    public function volumesTransporte(?PaEmbalagem $emb): ?array
    {
        if (! $emb || $emb->qtde_caixas < 1) {
            return null;
        }

        return [
            'quantidade' => (int) $emb->qtde_caixas,
            'especie' => 'CAIXA',
        ];
    }

    /**
     * Volume da NF-e. Quantidade/espécie só com caixa confirmada.
     * Marca = nome do emitente. Numeração = faixa CX (nVol, até 60).
     * Peso (kg, 3 casas) = área travada × 160 g/m², mais tubete e caixa.
     * Sem m² (e sem peso de revenda), o peso fica vazio. Sem placa nem ANTT.
     *
     * @return array{
     *     quantidade: ?int,
     *     especie: ?string,
     *     marca: ?string,
     *     numeracao: string,
     *     peso_liquido: ?string,
     *     peso_bruto: ?string
     * }
     */
    public function volumesTransportePedido(Empresa $empresa, Pedido $pedido): array
    {
        $confirmadas = $this->confirmadasDoPedido($empresa, $pedido);
        $caixas = (int) $confirmadas->sum('qtde_caixas');
        $peso = (new NfePesoExpedicao())->doPedido($empresa, $pedido, $confirmadas);

        return [
            'quantidade' => $caixas >= 1 ? $caixas : null,
            'especie' => $caixas >= 1 ? 'CAIXA' : null,
            'marca' => $this->marcaVolume($empresa),
            'numeracao' => $this->numeracaoVolumes($confirmadas, $caixas),
            'peso_liquido' => $peso['peso_liquido'],
            'peso_bruto' => $peso['peso_bruto'],
        ];
    }

    private function marcaVolume(Empresa $empresa): ?string
    {
        $marca = trim((string) ($empresa->nome_fantasia ?: $empresa->razao_social));
        if ($marca === '') {
            return null;
        }

        return mb_substr($marca, 0, 60);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>  $confirmadas
     */
    private function numeracaoVolumes($confirmadas, int $caixas): string
    {
        $sequencias = [];
        foreach ($confirmadas as $e) {
            $e->loadMissing('caixas');
            foreach ($e->caixas as $c) {
                $sequencias[] = (int) $c->sequencia;
            }
        }

        return NfeVolumeNumeracao::nVol($sequencias, $caixas);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(PaEmbalagem $e, bool $detalhe = true): array
    {
        $e->loadMissing('caixaProduto');
        $out = [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'status' => $e->status,
            'qtde_etiquetas' => (string) $e->qtde_etiquetas,
            'qtde_bobinas' => $e->qtde_bobinas,
            'qtde_caixas' => $e->qtde_caixas,
            'etiq_por_rolo' => $e->etiq_por_rolo,
            'rolos_por_caixa' => $e->rolos_por_caixa,
            'tubete' => $e->tubete,
            'caixa_medida' => $e->caixa_medida,
            'caixa_produto_id' => $e->caixa_produto_id,
            'caixa_produto_codigo' => $e->caixaProduto?->codigo,
            'caixa_produto_descricao' => $e->caixaProduto
                ? trim((string) ($e->caixaProduto->descricao_comercial ?: $e->caixaProduto->descricao_fiscal))
                : null,
            'saida_etiqueta' => $e->saida_etiqueta,
            'origem' => $e->origem,
            'resumo' => $e->resumoTexto(),
            'confirmada_em' => optional($e->confirmada_em)?->toIso8601String(),
            'ordem_producao_id' => $e->ordem_producao_id,
            'pedido_id' => $e->pedido_id,
        ];

        if ($detalhe) {
            $e->loadMissing(['bobinas', 'caixas']);
            $out['observacao'] = $e->observacao;
            $out['bobinas'] = $e->bobinas->map(fn (PaEmbalagemBobina $b) => [
                'id' => $b->id,
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'qr_payload' => $b->qrPayload(),
            ])->all();
            $out['caixas'] = $e->caixas->map(fn (PaEmbalagemCaixa $c) => [
                'id' => $c->id,
                'codigo' => $c->codigo,
                'sequencia' => $c->sequencia,
                'qtde_bobinas' => $c->qtde_bobinas,
                'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                'qr_payload' => $c->qrPayload(),
            ])->all();
        }

        return $out;
    }

    /**
     * @param  list<array{qtde_etiquetas?: mixed}>|null  $bobinasIn
     * @return array<string, mixed>
     */
    private function montarPlano(
        OrdemProducao $op,
        string $qtdeBoa,
        ?array $bobinasIn,
        ?int $nRolos = null,
        ?int $nCaixasPedidas = null,
        ?string $medidaCaixaEscolhida = null,
    ): array
    {
        $pedido = $op->pedido;
        $snap = is_array($pedido?->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        $espec = is_array($op->pedidoItem?->especificacao) ? $op->pedidoItem->especificacao : [];

        $etiqPorRolo = (int) ($espec['etiq_por_rolo'] ?? $input['etiq_por_rolo'] ?? 1000);
        if ($etiqPorRolo < 1) {
            $etiqPorRolo = 1000;
        }

        $capLegada = (int) ($faixa['rolos_por_caixa'] ?? 0);
        $capLegada = $capLegada > 0 ? $capLegada : null;

        $tubete = trim((string) ($espec['tubete'] ?? $input['tubete'] ?? ''));
        $medidaEscolhida = trim((string) $medidaCaixaEscolhida);
        $caixaMedida = $medidaEscolhida !== ''
            ? $medidaEscolhida
            : trim((string) ($faixa['caixa_medida'] ?? ''));
        $saidaRaw = $espec['saida_etiqueta'] ?? $input['saida_etiqueta'] ?? null;
        $saida = $saidaRaw !== null ? trim((string) $saidaRaw) : null;
        if ($saida === '') {
            $saida = null;
        }

        $qtysSugeridas = $this->distribuirEtiquetas($qtdeBoa, $etiqPorRolo);
        if ($bobinasIn !== null) {
            $qtys = [];
            foreach ($bobinasIn as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $q = PadraoDecimal::parseStrict((string) ($row['qtde_etiquetas'] ?? ''), PadraoDecimal::SCALE_QTY);
                if ($q === null || bccomp($q, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "bobinas.{$i}.qtde_etiquetas" => ['Quantidade da bobina inválida.'],
                    ]);
                }
                $qtys[] = $q;
            }
            if ($qtys === []) {
                throw ValidationException::withMessages([
                    'bobinas' => ['Informe ao menos uma bobina.'],
                ]);
            }
        } elseif ($nRolos !== null && $nRolos !== count($qtysSugeridas)) {
            if ($nRolos < 1 || $nRolos > 500) {
                throw ValidationException::withMessages([
                    'qtde_bobinas' => ['Informe entre 1 e 500 rolos.'],
                ]);
            }
            $qtys = $this->distribuirEmN($qtdeBoa, $nRolos);
        } else {
            $qtys = $qtysSugeridas;
        }

        $soma = '0';
        foreach ($qtys as $q) {
            $soma = bcadd($soma, $q, PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($soma, $qtdeBoa, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'bobinas' => ["Soma das bobinas ({$soma}) deve igualar a quantidade boa ({$qtdeBoa})."],
            ]);
        }

        $nBobinas = count($qtys);
        if ($nCaixasPedidas === null && $capLegada === null) {
            $bobinas = [];
            foreach ($qtys as $i => $q) {
                $bobinas[] = [
                    'sequencia' => $i + 1,
                    'qtde_etiquetas' => $q,
                    'caixa_idx' => 0,
                ];
            }
            $caixa = $this->caixaDoEncaixe((int) $op->empresa_id, $caixaMedida);
            $largura = $espec['largura_cm'] ?? $input['largura_cm'] ?? null;
            $encaixe = RoloCaixaEncaixe::avaliar(
                $largura !== null && $largura !== '' ? (string) $largura : null,
                $caixa['lados'],
                $caixa['rotulo'],
            );

            return [
                'qtde_etiquetas' => $qtdeBoa,
                'qtde_bobinas' => $nBobinas,
                'qtde_caixas' => 0,
                'etiq_por_rolo' => $etiqPorRolo,
                'rolos_por_caixa' => null,
                'caixa_planejada_no_orcamento' => false,
                'tubete' => $tubete !== '' ? $tubete : null,
                'caixa_medida' => $caixaMedida !== '' ? $caixaMedida : null,
                'saida_etiqueta' => $saida,
                'encaixe' => $encaixe,
                'bobinas' => $bobinas,
                'caixas' => [],
                'resumo' => number_format((float) $qtdeBoa, 0, ',', '.').' etiquetas · '
                    .$nBobinas.' bobina'.($nBobinas === 1 ? '' : 's'),
            ];
        }

        $rolosPorCaixa = $capLegada ?? $nBobinas;
        $caixasNaturais = (int) ceil($nBobinas / max(1, $rolosPorCaixa));
        $nCaixas = $nCaixasPedidas ?? $caixasNaturais;
        if ($nCaixas < 1 || $nCaixas > $nBobinas) {
            throw ValidationException::withMessages([
                'qtde_caixas' => ['As caixas ficam entre 1 e a quantidade de rolos.'],
            ]);
        }
        $mapaCaixas = ($nCaixasPedidas !== null && $nCaixasPedidas !== $caixasNaturais)
            ? $this->indiceCaixaEquilibrada($nBobinas, $nCaixas)
            : null;

        $bobinas = [];
        $caixasAcc = [];
        for ($c = 0; $c < $nCaixas; $c++) {
            $caixasAcc[$c] = [
                'sequencia' => $c + 1,
                'qtde_bobinas' => 0,
                'qtde_etiquetas' => '0',
            ];
        }

        foreach ($qtys as $i => $q) {
            $caixaIdx = $mapaCaixas[$i] ?? (int) floor($i / $rolosPorCaixa);
            $bobinas[] = [
                'sequencia' => $i + 1,
                'qtde_etiquetas' => $q,
                'caixa_idx' => $caixaIdx,
            ];
            $caixasAcc[$caixaIdx]['qtde_bobinas']++;
            $caixasAcc[$caixaIdx]['qtde_etiquetas'] = bcadd(
                $caixasAcc[$caixaIdx]['qtde_etiquetas'],
                $q,
                PadraoDecimal::SCALE_QTY
            );
        }

        $caixa = $this->caixaDoEncaixe((int) $op->empresa_id, $caixaMedida);
        $largura = $espec['largura_cm'] ?? $input['largura_cm'] ?? null;
        $encaixe = RoloCaixaEncaixe::avaliar(
            $largura !== null && $largura !== '' ? (string) $largura : null,
            $caixa['lados'],
            $caixa['rotulo'],
        );

        return [
            'qtde_etiquetas' => $qtdeBoa,
            'qtde_bobinas' => $nBobinas,
            'qtde_caixas' => $nCaixas,
            'etiq_por_rolo' => $etiqPorRolo,
            'rolos_por_caixa' => $capLegada,
            'caixa_planejada_no_orcamento' => $capLegada !== null,
            'tubete' => $tubete !== '' ? $tubete : null,
            'caixa_medida' => $caixaMedida !== '' ? $caixaMedida : null,
            'saida_etiqueta' => $saida,
            'encaixe' => $encaixe,
            'bobinas' => $bobinas,
            'caixas' => array_values($caixasAcc),
            'resumo' => number_format((float) $qtdeBoa, 0, ',', '.').' etiquetas · '
                .$nBobinas.' bobina'.($nBobinas === 1 ? '' : 's').' · '
                .$nCaixas.' caixa'.($nCaixas === 1 ? '' : 's'),
        ];
    }

    private function capacidadeCaixaDoSnapshot(OrdemProducao $op): ?int
    {
        $snap = is_array($op->pedido?->snapshot) ? $op->pedido->snapshot : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        $cap = (int) ($faixa['rolos_por_caixa'] ?? 0);

        return $cap > 0 ? $cap : null;
    }

    private function caixaInformada(Empresa $empresa, mixed $id): ?Produto
    {
        if ($id === null || $id === '' || (int) $id < 1) {
            return null;
        }

        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey((int) $id)
            ->where('situacao', 'ATIVO')
            ->with('grupoCatalogo:id,codigo')
            ->first();
        if ($produto === null || ! $this->ehCaixaDeEstoque($produto)) {
            throw ValidationException::withMessages([
                'caixa_produto_id' => ['Escolha uma caixa ativa desta empresa.'],
            ]);
        }

        return $produto;
    }

    private function ehCaixaDeEstoque(Produto $produto): bool
    {
        if ($produto->familia !== 'EMB') {
            return false;
        }
        $grupo = (string) ($produto->grupoCatalogo?->codigo ?? '');
        if ($grupo === 'EMB-CX') {
            return true;
        }
        $hay = mb_strtoupper(
            $produto->codigo.' '.$produto->descricao_fiscal.' '.$produto->descricao_comercial,
            'UTF-8',
        );

        return str_starts_with((string) $produto->codigo, 'EMB-CX') || str_contains($hay, 'CAIXA');
    }

    /**
     * @return array{lados: list<string>|null, rotulo: ?string}
     */
    private function caixaDoEncaixe(int $empresaId, string $medida): array
    {
        $vazio = ['lados' => null, 'rotulo' => null];
        if ($medida === '' || $empresaId < 1) {
            return $vazio;
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresaId)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'EMB')
            ->where(function ($q) {
                $q->where('codigo', 'like', 'EMB-CX%')
                    ->orWhere('descricao_fiscal', 'like', '%CAIXA%');
            })
            ->orderBy('codigo')
            ->get(['codigo', 'atributos']);

        foreach ($produtos as $produto) {
            $attrs = is_array($produto->atributos) ? $produto->atributos : null;
            if (CaixaMedida::casaAtributos($attrs, $medida) !== true) {
                continue;
            }
            $m = CaixaMedida::fromAtributos($attrs);
            if ($m === null) {
                continue;
            }

            return [
                'lados' => [$m[CaixaMedida::COMP], $m[CaixaMedida::LARG], $m[CaixaMedida::ALT]],
                'rotulo' => $produto->codigo.' · '.CaixaMedida::rotulo($attrs),
            ];
        }

        return $vazio;
    }

    /**
     * @return list<string>
     */
    /**
     * Reparte a quantidade boa em N rolos. Os primeiros levam a parte inteira; o último absorve o resto.
     *
     * @return list<string>
     */
    private function distribuirEmN(string $qtdeBoa, int $n): array
    {
        if ($n === 1) {
            return [$qtdeBoa];
        }

        $cada = bcdiv($qtdeBoa, (string) $n, PadraoDecimal::SCALE_QTY);
        if (bccomp($cada, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ['A quantidade boa não cobre essa quantidade de rolos.'],
            ]);
        }

        $out = [];
        $soma = '0';
        for ($i = 0; $i < $n - 1; $i++) {
            $out[] = $cada;
            $soma = bcadd($soma, $cada, PadraoDecimal::SCALE_QTY);
        }
        $ultima = bcsub($qtdeBoa, $soma, PadraoDecimal::SCALE_QTY);
        if (bccomp($ultima, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ['A quantidade boa não cobre essa quantidade de rolos.'],
            ]);
        }
        $out[] = $ultima;

        return $out;
    }

    /**
     * @return list<int> índice da caixa de cada rolo
     */
    private function indiceCaixaEquilibrada(int $nBobinas, int $nCaixas): array
    {
        $base = intdiv($nBobinas, $nCaixas);
        $extra = $nBobinas % $nCaixas;
        $map = [];
        $caixa = 0;
        $naCaixa = 0;
        $capacidade = $base + ($extra > 0 ? 1 : 0);
        for ($i = 0; $i < $nBobinas; $i++) {
            if ($naCaixa >= $capacidade) {
                $caixa++;
                $naCaixa = 0;
                $capacidade = $base + ($caixa < $extra ? 1 : 0);
            }
            $map[$i] = $caixa;
            $naCaixa++;
        }

        return $map;
    }

    /**
     * @return list<string>
     */
    private function distribuirEtiquetas(string $qtdeBoa, int $etiqPorRolo): array
    {
        $porRolo = (string) $etiqPorRolo;
        if (bccomp($qtdeBoa, $porRolo, PadraoDecimal::SCALE_QTY) <= 0) {
            return [$qtdeBoa];
        }

        $nCheias = (int) floor((float) bcdiv($qtdeBoa, $porRolo, 8));
        $consumido = bcmul((string) $nCheias, $porRolo, PadraoDecimal::SCALE_QTY);
        $resto = PadraoDecimal::roundHalfUp(
            bcsub($qtdeBoa, $consumido, PadraoDecimal::SCALE_QTY + 2),
            PadraoDecimal::SCALE_QTY
        );

        $out = [];
        for ($i = 0; $i < $nCheias; $i++) {
            $out[] = PadraoDecimal::roundHalfUp($porRolo, PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($resto, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $out[] = $resto;
        }

        return $out;
    }

    private function nfAutorizadaDoPedido(Empresa $empresa, int $pedidoId): bool
    {
        $fat = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->first();
        if (! $fat) {
            return false;
        }

        return DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where('status', DocumentoFiscalSaida::STATUS_AUTORIZADO)
            ->exists();
    }

    private function assertOpEmpresa(Empresa $empresa, OrdemProducao $op): void
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
