<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Support\ProdutoLotePolitica;

class EstoqueConsultaService
{
    public function __construct(private readonly EstoqueEntradaService $entrada) {}

    /**
     * Extrato / kardex leve por SKU (BL-042).
     *
     * @return array<string, mixed>
     */
    public function extrato(Empresa $empresa, int $produtoId): array
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->first();

        if (! $produto) {
            abort(404);
        }

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produtoId)
            ->first();

        $itens = EstoqueMovimentoItem::query()
            ->with([
                'movimento:id,empresa_id,codigo,tipo,nf_numero,nf_data,motivo_codigo,ajuste_id,ordem_compra_id,conferido_em,created_at',
                'lote:id,codigo,data_entrada,data_validade,data_fabricacao',
            ])
            ->whereHas('movimento', fn ($q) => $q->where('empresa_id', $empresa->id))
            ->where('produto_id', $produtoId)
            ->orderBy('id')
            ->get();

        $linhas = $itens->map(function (EstoqueMovimentoItem $item) {
            $mov = $item->movimento;

            return [
                'movimento_id' => $mov?->id,
                'movimento_codigo' => $mov?->codigo,
                'tipo' => $mov?->tipo,
                'motivo_codigo' => $mov?->motivo_codigo,
                'ajuste_id' => $mov?->ajuste_id,
                'ordem_compra_id' => $mov?->ordem_compra_id,
                'nf_numero' => $mov?->nf_numero,
                'nf_data' => $mov?->nf_data?->format('Y-m-d'),
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade,
                'valor_unitario' => (string) $item->valor_unitario,
                'valor_total' => (string) $item->valor_total,
                'custo_medio_apos' => (string) $item->custo_medio_apos,
                'lote_id' => $item->lote_id,
                'lote' => $item->lote ? [
                    'id' => $item->lote->id,
                    'codigo' => $item->lote->codigo,
                    'data_entrada' => optional($item->lote->data_entrada)?->format('Y-m-d'),
                    'data_validade' => optional($item->lote->data_validade)?->format('Y-m-d'),
                ] : null,
                'conferido_em' => optional($mov?->conferido_em)?->toIso8601String(),
                'created_at' => optional($mov?->created_at)?->toIso8601String(),
            ];
        })->all();

        return [
            'produto' => [
                'id' => $produto->id,
                'codigo' => $produto->codigo,
                'descricao_fiscal' => $produto->descricao_fiscal,
                'familia' => $produto->familia,
                'unidade_interna' => $produto->unidade_interna,
                'controla_lote' => (bool) $produto->controla_lote,
                'controla_validade' => (bool) $produto->controla_validade,
            ],
            'saldo' => [
                'qtde' => $saldo ? (string) $saldo->qtde : '0.0000',
                'unidade' => $saldo?->unidade ?? ($produto->unidade_interna ?? 'UN'),
                'custo_medio' => $saldo ? (string) $saldo->custo_medio : (string) ($produto->custo_medio ?? '0'),
            ],
            'lotes' => $this->lotesDoProduto($empresa, $produto),
            'movimentos' => $linhas,
            'movimentos_count' => count($linhas),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listSaldos(Empresa $empresa, ?string $q = null, ?int $produtoId = null): array
    {
        $query = EstoqueSaldo::query()
            ->with(['produto:id,codigo,descricao_fiscal,familia,unidade_interna,custo_medio,controla_lote,controla_validade,prazo_validade_dias'])
            ->where('empresa_id', $empresa->id)
            ->orderBy('produto_id');

        if ($produtoId) {
            $query->where('produto_id', $produtoId);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->whereHas('produto', function ($pq) use ($like) {
                $pq->where('codigo', 'like', $like)
                    ->orWhere('descricao_fiscal', 'like', $like);
            });
        }

        $saldos = $query->get();
        $produtoIds = $saldos->pluck('produto_id')->all();
        $lotesPorProduto = $this->lotesAgrupados($empresa, $produtoIds);

        return $saldos->map(function (EstoqueSaldo $s) use ($lotesPorProduto) {
            $lotes = $lotesPorProduto[(int) $s->produto_id] ?? [];
            $resumo = $this->resumoLotes($lotes);

            return [
                'id' => $s->id,
                'empresa_id' => $s->empresa_id,
                'produto_id' => $s->produto_id,
                'produto' => $s->produto ? [
                    'id' => $s->produto->id,
                    'codigo' => $s->produto->codigo,
                    'descricao_fiscal' => $s->produto->descricao_fiscal,
                    'familia' => $s->produto->familia,
                    'unidade_interna' => $s->produto->unidade_interna,
                    'controla_lote' => (bool) $s->produto->controla_lote,
                    'controla_validade' => (bool) $s->produto->controla_validade,
                ] : null,
                'qtde' => (string) $s->qtde,
                'unidade' => $s->unidade,
                'custo_medio' => (string) $s->custo_medio,
                'controla_lote' => (bool) ($s->produto?->controla_lote ?? false),
                'lotes_count' => count($lotes),
                'validade_status' => $resumo['status'],
                'proxima_validade' => $resumo['proxima_validade'],
                'lotes' => $lotes,
                'updated_at' => optional($s->updated_at)?->toIso8601String(),
            ];
        })->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listLotes(Empresa $empresa, ?int $produtoId = null, ?string $status = null): array
    {
        $query = EstoqueLote::query()
            ->with([
                'produto:id,codigo,descricao_fiscal,familia,unidade_interna,controla_lote,controla_validade',
                'endereco:id,codigo',
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('produto_id');

        if ($produtoId) {
            $query->where('produto_id', $produtoId);
        }

        return $query->get()
            ->map(fn (EstoqueLote $lote) => $this->loteToOut($lote))
            ->filter(function (array $row) use ($status) {
                if (! $status) {
                    return true;
                }

                return $row['status'] === $status;
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listMovimentos(Empresa $empresa, ?string $q = null, ?string $tipo = null): array
    {
        $query = EstoqueMovimento::query()
            ->with([
                'itens.produto:id,codigo,descricao_fiscal',
                'itens.lote:id,codigo,data_entrada,data_validade',
                'fornecedor:id,codigo,razao_social',
                'ordemCompra:id,codigo',
                'titulo:id,codigo,valor,status',
                ...EstoqueMovimento::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($tipo) {
            $query->where('tipo', $tipo);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('nf_numero', 'like', $like)
                    ->orWhere('nf_chave', 'like', $like);
            });
        }

        return $query->get()->map(fn (EstoqueMovimento $m) => $this->entrada->toOut($m))->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function lotesDoProduto(Empresa $empresa, Produto $produto): array
    {
        return EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('data_entrada')
            ->get()
            ->map(fn (EstoqueLote $lote) => $this->loteToOut($lote))
            ->all();
    }

    /**
     * @param  list<int>  $produtoIds
     * @return array<int, list<array<string, mixed>>>
     */
    private function lotesAgrupados(Empresa $empresa, array $produtoIds): array
    {
        if ($produtoIds === []) {
            return [];
        }

        $grouped = [];
        $lotes = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $produtoIds)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('data_entrada')
            ->get();

        foreach ($lotes as $lote) {
            $grouped[(int) $lote->produto_id][] = $this->loteToOut($lote);
        }

        return $grouped;
    }

    /**
     * @return array<string, mixed>
     */
    private function loteToOut(EstoqueLote $lote): array
    {
        $status = $lote->statusValidade();

        return [
            'id' => $lote->id,
            'produto_id' => $lote->produto_id,
            'produto' => $lote->relationLoaded('produto') && $lote->produto ? [
                'id' => $lote->produto->id,
                'codigo' => $lote->produto->codigo,
                'descricao_fiscal' => $lote->produto->descricao_fiscal,
            ] : null,
            'codigo' => $lote->codigo,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'data_fabricacao' => optional($lote->data_fabricacao)?->format('Y-m-d'),
            'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
            'qtde' => (string) $lote->qtde,
            'unidade' => $lote->unidade,
            'origem_tipo' => $lote->origem_tipo,
            'status' => $status,
            'status_label' => ProdutoLotePolitica::statusLabel($status),
            'largura_mm' => $lote->largura_mm !== null ? (string) $lote->largura_mm : null,
            'comprimento_m' => $lote->comprimento_m !== null ? (string) $lote->comprimento_m : null,
            'endereco_id' => $lote->endereco_id,
            'endereco' => $lote->relationLoaded('endereco') && $lote->endereco ? [
                'id' => $lote->endereco->id,
                'codigo' => $lote->endereco->codigo,
            ] : null,
            'qr_payload' => $lote->qr_token
                ? 'VOL:'.$lote->empresa_id.':'.$lote->id.':'.$lote->qr_token
                : null,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $lotes
     * @return array{status: ?string, proxima_validade: ?string}
     */
    private function resumoLotes(array $lotes): array
    {
        if ($lotes === []) {
            return ['status' => null, 'proxima_validade' => null];
        }

        $ativos = array_values(array_filter(
            $lotes,
            fn (array $l) => bccomp((string) $l['qtde'], '0', 4) > 0
        ));
        if ($ativos === []) {
            return ['status' => null, 'proxima_validade' => null];
        }

        $pior = 'OK';
        $proxima = null;
        foreach ($ativos as $lote) {
            $st = (string) $lote['status'];
            if ($st === ProdutoLotePolitica::STATUS_VENCIDO) {
                $pior = $st;
            } elseif ($st === ProdutoLotePolitica::STATUS_A_VENCER && $pior !== ProdutoLotePolitica::STATUS_VENCIDO) {
                $pior = $st;
            }
            $val = $lote['data_validade'] ?? null;
            if (is_string($val) && $val !== '' && ($proxima === null || strcmp($val, $proxima) < 0)) {
                $proxima = $val;
            }
        }

        return ['status' => $pior, 'proxima_validade' => $proxima];
    }
}
