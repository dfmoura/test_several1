<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\CatalogoServicoSaida;
use App\Support\PadraoDecimal;
use App\Support\TipoOperacaoSaida;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conversão ORC LIBERADO → PED (estudo 32 GERACAO_PEDIDO / ADR_PRODUCAO_PED_OP_ESTOQUE).
 */
class PedidoService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * Idempotente: se ORC já tem PED, devolve; se LIBERADO, cria.
     */
    public function garantirDeOrcamentoLiberado(Orcamento $orcamento): ?Pedido
    {
        $orcamento->loadMissing(['empresa', 'parceiro', 'pedido']);

        if ($orcamento->pedido) {
            return $orcamento->pedido;
        }

        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            return null;
        }

        if ($orcamento->financeiro_status !== AdiantamentoService::FIN_LIBERADO) {
            return null;
        }

        return $this->criarDeOrcamento($orcamento);
    }

    public function criarDeOrcamento(Orcamento $orcamento): Pedido
    {
        $orcamento->loadMissing(['empresa', 'parceiro']);

        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            throw ValidationException::withMessages([
                'orcamento' => ['Pedido só nasce de orçamento APROVADO.'],
            ]);
        }

        if ($orcamento->financeiro_status !== AdiantamentoService::FIN_LIBERADO) {
            throw ValidationException::withMessages([
                'orcamento' => ['Pedido exige liberação financeira (crédito/sinal ok).'],
            ]);
        }

        if (! $orcamento->parceiro_id) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Orçamento sem parceiro cadastrado.'],
            ]);
        }

        $existente = Pedido::query()
            ->where('empresa_id', $orcamento->empresa_id)
            ->where('orcamento_id', $orcamento->id)
            ->first();
        if ($existente) {
            return $existente;
        }

        $faixaIndex = (int) ($orcamento->aceite_faixa_index ?? 0);
        $faixa = $this->faixaAprovada($orcamento, $faixaIndex);
        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $necessidade = $this->resolverNecessidade($input);
        $tipoOp = TipoOperacaoSaida::fromInput($input['tipo_operacao'] ?? $necessidade);
        if ($tipoOp === TipoOperacaoSaida::SERVICO) {
            $necessidade = PedidoItem::NEC_SERVICO;
        }
        $paProduto = $this->resolverProdutoPa($orcamento->empresa, $necessidade);
        $servico = $necessidade === PedidoItem::NEC_SERVICO
            ? CatalogoServicoSaida::get((string) ($input['tipo_servico'] ?? CatalogoServicoSaida::AVULSO))
            : null;

        return DB::transaction(function () use ($orcamento, $faixaIndex, $faixa, $input, $necessidade, $paProduto, $servico) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode((int) $orcamento->empresa_id, 'PED-'.$ano, 5);

            $travado = PrecoTravadoPedido::daFaixa($faixa);
            $qtde = $travado['qtde_faixa'];
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    'quantidade' => ['Faixa aprovada sem quantidade válida.'],
                ]);
            }

            $preco = $travado['preco_unitario'];
            $total = $travado['valor_comercial'];

            $descricao = $this->montarDescricao($input, $faixa);

            $pedido = Pedido::query()->create([
                'empresa_id' => $orcamento->empresa_id,
                'codigo' => $codigo,
                'orcamento_id' => $orcamento->id,
                'parceiro_id' => $orcamento->parceiro_id,
                'vendedor_parceiro_id' => $orcamento->vendedor_parceiro_id,
                'status' => Pedido::STATUS_LIBERADO,
                'faixa_index' => $faixaIndex,
                'tolerancia_qtd_pct' => $orcamento->tolerancia_qtd_pct ?? '20',
                'prazo_entrega_dias' => $orcamento->prazo_entrega_dias,
                'snapshot' => [
                    'orcamento_codigo' => $orcamento->codigo,
                    'orcamento_versao' => $orcamento->versao,
                    'input' => $input,
                    'faixa' => $faixa,
                ],
                'observacao' => $orcamento->observacao,
            ]);

            $unidade = 'MIL';
            $familia = 'PA-ETQ';
            if ($servico !== null) {
                $familia = $servico['familia_fiscal'];
                $unidade = strtoupper(trim((string) ($input['unidade'] ?? $servico['unidade_padrao']))) ?: $servico['unidade_padrao'];
            } elseif ($necessidade === PedidoItem::NEC_SERVICO) {
                $familia = 'SVC';
                $unidade = 'UN';
            }

            PedidoItem::query()->create([
                'empresa_id' => $orcamento->empresa_id,
                'pedido_id' => $pedido->id,
                'ordem' => 1,
                'necessidade' => $necessidade,
                'familia_fiscal' => $familia,
                'descricao' => $descricao,
                'especificacao' => $this->montarEspecificacao($input, $servico),
                'qtde_pedida' => $qtde,
                'qtde_produzida' => '0',
                'qtde_faturavel' => '0',
                'unidade' => $unidade,
                'preco_unitario' => $preco,
                'valor_total' => $total,
                'status' => PedidoItem::STATUS_PENDENTE,
                'produto_pa_id' => $paProduto?->id,
            ]);

            return $pedido->fresh(['itens.produtoPa', 'parceiro', 'orcamento']);
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = Pedido::query()
            ->where('empresa_id', $empresa->id)
            ->with(['parceiro:id,codigo,razao_social', 'vendedor:id,codigo,razao_social', 'orcamento:id,codigo', 'itens', 'faturamento'])
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('parceiro', fn ($p) => $p->where('razao_social', 'like', $like))
                    ->orWhereHas('orcamento', fn ($o) => $o->where('codigo', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (Pedido $p) => $this->toOut($p))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Pedido $pedido): array
    {
        $pedido->load([
            'parceiro:id,codigo,razao_social',
            'vendedor:id,codigo,razao_social,nome_fantasia',
            'orcamento:id,codigo,status,financeiro_status,tolerancia_qtd_pct,vendedor_parceiro_id',
            'itens.produtoPa:id,codigo,descricao_fiscal',
            'ordensProducao',
            'ordensServico',
            'faturamento',
        ]);

        return $this->toOut($pedido, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Pedido $p, bool $detalhe = false): array
    {
        $out = [
            'id' => $p->id,
            'codigo' => $p->codigo,
            'status' => $p->status,
            'faixa_index' => $p->faixa_index,
            'tolerancia_qtd_pct' => (string) $p->tolerancia_qtd_pct,
            'prazo_entrega_dias' => $p->prazo_entrega_dias,
            'observacao' => $p->observacao,
            'parceiro' => $p->parceiro ? [
                'id' => $p->parceiro->id,
                'codigo' => $p->parceiro->codigo,
                'razao_social' => $p->parceiro->razao_social,
            ] : null,
            'vendedor' => $p->vendedor ? [
                'id' => $p->vendedor->id,
                'codigo' => $p->vendedor->codigo,
                'razao_social' => $p->vendedor->razao_social,
            ] : null,
            'orcamento' => $p->orcamento ? [
                'id' => $p->orcamento->id,
                'codigo' => $p->orcamento->codigo,
                'status' => $p->orcamento->status ?? null,
                'financeiro_status' => $p->orcamento->financeiro_status ?? null,
            ] : null,
            'itens' => $p->itens->map(fn (PedidoItem $i) => [
                'id' => $i->id,
                'ordem' => $i->ordem,
                'necessidade' => $i->necessidade,
                'familia_fiscal' => $i->familia_fiscal,
                'descricao' => $i->descricao,
                'especificacao' => $i->especificacao,
                'qtde_pedida' => (string) $i->qtde_pedida,
                'qtde_produzida' => (string) $i->qtde_produzida,
                'qtde_faturavel' => (string) $i->qtde_faturavel,
                'unidade' => $i->unidade,
                'preco_unitario' => $i->preco_unitario !== null ? (string) $i->preco_unitario : null,
                'valor_total' => $i->valor_total !== null ? (string) $i->valor_total : null,
                'status' => $i->status,
                'produto_pa' => $i->produtoPa ? [
                    'id' => $i->produtoPa->id,
                    'codigo' => $i->produtoPa->codigo,
                    'descricao_fiscal' => $i->produtoPa->descricao_fiscal,
                ] : null,
            ])->all(),
            'created_at' => optional($p->created_at)?->toIso8601String(),
            'apto_faturar' => $p->status === Pedido::STATUS_FATURADO
                ? false
                : ($p->status === Pedido::STATUS_PRODUZIDO),
            'faturamento' => $p->relationLoaded('faturamento') && $p->faturamento
                ? [
                    'id' => $p->faturamento->id,
                    'codigo' => $p->faturamento->codigo,
                    'status' => $p->faturamento->status,
                    'nf_status' => $p->faturamento->nf_status,
                    'valor_bruto' => (string) $p->faturamento->valor_bruto,
                    'valor_adiantamento' => (string) $p->faturamento->valor_adiantamento,
                    'valor_a_cobrar' => (string) $p->faturamento->valor_a_cobrar,
                ]
                : null,
        ];

        if ($detalhe) {
            $out['snapshot'] = $p->snapshot;
            $out['ordens_producao'] = $p->ordensProducao->map(fn ($o) => [
                'id' => $o->id,
                'codigo' => $o->codigo,
                'status' => $o->status,
                'pedido_item_id' => $o->pedido_item_id,
                'qtde_planejada' => (string) $o->qtde_planejada,
                'qtde_boa' => $o->qtde_boa !== null ? (string) $o->qtde_boa : null,
            ])->all();
            $out['ordens_servico'] = $p->ordensServico->map(fn ($o) => [
                'id' => $o->id,
                'codigo' => $o->codigo,
                'status' => $o->status,
                'pedido_item_id' => $o->pedido_item_id,
                'qtde_planejada' => (string) $o->qtde_planejada,
                'qtde_executada' => $o->qtde_executada !== null ? (string) $o->qtde_executada : null,
            ])->all();
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function faixaAprovada(Orcamento $orcamento, int $faixaIndex): array
    {
        $faixas = $orcamento->result_snapshot['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas) || ! is_array($faixas[$faixaIndex])) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Faixa aprovada inválida.'],
            ]);
        }

        return $faixas[$faixaIndex];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function resolverNecessidade(array $input): string
    {
        $raw = strtoupper(trim((string) ($input['necessidade'] ?? $input['tipo_pedido'] ?? 'PRODUCAO')));
        if (in_array($raw, PedidoItem::NECESSIDADES, true)) {
            return $raw;
        }
        if (str_contains($raw, 'SERV')) {
            return PedidoItem::NEC_SERVICO;
        }
        if (str_contains($raw, 'REV')) {
            return PedidoItem::NEC_REVENDA;
        }

        return PedidoItem::NEC_PRODUCAO;
    }

    private function resolverProdutoPa(?Empresa $empresa, string $necessidade): ?Produto
    {
        if ($empresa === null || $necessidade !== PedidoItem::NEC_PRODUCAO) {
            return null;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'like', 'PA-ETQ%')
            ->where('situacao', 'ATIVO')
            ->orderBy('codigo')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $faixa
     */
    private function montarDescricao(array $input, array $faixa): string
    {
        $servicoDesc = trim((string) ($input['descricao_servico'] ?? ''));
        if ($servicoDesc !== '') {
            $q = isset($faixa['quantidade'])
                ? PadraoDecimal::roundHalfUp((string) $faixa['quantidade'], 0)
                : null;

            return mb_substr($q ? $servicoDesc.' · Q '.$q : $servicoDesc, 0, 255);
        }

        $parts = array_filter([
            $input['medida'] ?? null,
            isset($input['papel']) ? (string) $input['papel'] : null,
            isset($input['cores']) ? $input['cores'].' cor(es)' : null,
            $input['acabamento'] ?? null,
            isset($faixa['quantidade']) ? 'Q '.PadraoDecimal::roundHalfUp((string) $faixa['quantidade'], 0) : null,
        ]);

        $desc = implode(' · ', $parts);

        return $desc !== '' ? mb_substr($desc, 0, 255) : 'Item do pedido';
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>|null  $servico
     * @return array<string, mixed>
     */
    private function montarEspecificacao(array $input, ?array $servico): array
    {
        if ($servico !== null || TipoOperacaoSaida::isServico($input['tipo_operacao'] ?? $input['necessidade'] ?? null)) {
            $cat = $servico ?? CatalogoServicoSaida::get((string) ($input['tipo_servico'] ?? CatalogoServicoSaida::AVULSO));

            return [
                'tipo_operacao' => TipoOperacaoSaida::SERVICO,
                'tipo_servico' => $cat['codigo'],
                'descricao_servico' => $input['descricao_servico'] ?? $cat['descricao_padrao'],
                'material_cliente' => (bool) ($input['material_cliente'] ?? $cat['material_cliente_padrao']),
                'unidade' => $input['unidade'] ?? $cat['unidade_padrao'],
                'horas_maquina' => $input['horas_maquina'] ?? null,
                'maquina' => $input['maquina'] ?? null,
                'cessao_bem_id' => $input['cessao_bem_id'] ?? null,
                'codigo_tributacao_nacional_iss' => $input['codigo_tributacao_nacional_iss'] ?? $cat['codigo_tributacao_nacional_iss'],
                'codigo_nbs' => $input['codigo_nbs'] ?? $cat['codigo_nbs'],
            ];
        }

        return [
            'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            'medida' => $input['medida'] ?? null,
            'papel' => $input['papel'] ?? null,
            'cores' => $input['cores'] ?? null,
            'acabamento' => $input['acabamento'] ?? null,
            'maquina' => $input['maquina'] ?? null,
            'tubete' => $input['tubete'] ?? null,
            'etiq_por_rolo' => $input['etiq_por_rolo'] ?? null,
            'largura_cm' => $input['largura_cm'] ?? null,
            'puxada_cm' => $input['puxada_cm'] ?? null,
            'modelos_composicao' => $input['modelos_composicao'] ?? null,
        ];
    }
}
