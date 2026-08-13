<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\Produto;
use App\Services\Compras\OrdemCompraService;
use App\Support\PadraoDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Reposição gerencial: saldo × estoque_mínimo → sugestão → OC DIRETA (BL-036).
 * NEC/COT permanecem fora do menu (ADR-039-CPR-001).
 */
class EstoqueReposicaoService
{
    /** Famílias de compra/estoque de insumos (estudo 32). */
    public const FAMILIAS = ['MP', 'EMB', 'REV'];

    public function __construct(private readonly OrdemCompraService $ordens) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null): array
    {
        $produtos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('familia', self::FAMILIAS)
            ->where('situacao', 'ATIVO')
            ->whereNotNull('estoque_minimo')
            ->where('estoque_minimo', '>', 0)
            ->when($q, function ($query) use ($q) {
                $like = '%'.$q.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('codigo', 'like', $like)
                        ->orWhere('descricao_fiscal', 'like', $like);
                });
            })
            ->orderBy('codigo')
            ->get();

        if ($produtos->isEmpty()) {
            return [];
        }

        $produtoIds = $produtos->pluck('id')->all();

        $saldos = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $produtoIds)
            ->get()
            ->keyBy('produto_id');

        $emTransito = $this->emTransitoPorProduto($empresa, $produtoIds);

        $out = [];
        foreach ($produtos as $produto) {
            /** @var Produto $produto */
            $minimo = PadraoDecimal::roundHalfUp((string) $produto->estoque_minimo, PadraoDecimal::SCALE_QTY);
            $saldo = $saldos->get($produto->id);
            $qtdeSaldo = $saldo
                ? PadraoDecimal::roundHalfUp((string) $saldo->qtde, PadraoDecimal::SCALE_QTY)
                : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
            $transito = $emTransito[$produto->id] ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

            $disponivel = PadraoDecimal::roundHalfUp(
                bcadd($qtdeSaldo, $transito, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );

            if (bccomp($disponivel, $minimo, PadraoDecimal::SCALE_QTY) >= 0) {
                continue;
            }

            $faltanteInt = PadraoDecimal::roundHalfUp(
                bcsub($minimo, $disponivel, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );

            $fator = $this->fator($produto);
            $faltanteCom = $this->paraComercial($faltanteInt, $fator);

            $out[] = [
                'produto_id' => $produto->id,
                'produto' => [
                    'id' => $produto->id,
                    'codigo' => $produto->codigo,
                    'descricao_fiscal' => $produto->descricao_fiscal,
                    'familia' => $produto->familia,
                    'grupo' => $produto->grupo,
                    'unidade_comercial' => $produto->unidade_comercial,
                    'unidade_interna' => $produto->unidade_interna,
                    'fator_conversao' => (string) ($produto->fator_conversao ?? '1'),
                    'custo_medio' => (string) ($produto->custo_medio ?? '0'),
                    'lead_time_dias' => $produto->lead_time_dias,
                ],
                'estoque_minimo' => $minimo,
                'saldo' => $qtdeSaldo,
                'em_transito' => $transito,
                'disponivel' => $disponivel,
                'faltante_interna' => $faltanteInt,
                'faltante_comercial' => $faltanteCom,
                'unidade_interna' => $produto->unidade_interna ?? 'UN',
                'unidade_comercial' => $produto->unidade_comercial ?? 'UN',
            ];
        }

        return $out;
    }

    /**
     * Gera OC DIRETA a partir da seleção (humano confirma fornecedor/preço/qtde).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function gerarOc(Empresa $empresa, array $data): array
    {
        $sugestoes = collect($this->list($empresa))->keyBy('produto_id');

        $itens = [];
        foreach ($data['itens'] ?? [] as $idx => $raw) {
            $produtoId = (int) ($raw['produto_id'] ?? 0);
            $sug = $sugestoes->get($produtoId);
            if (! $sug) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.produto_id" => ['Produto sem necessidade de reposição no momento.'],
                ]);
            }

            $qtde = isset($raw['qtde_pedida']) && $raw['qtde_pedida'] !== '' && $raw['qtde_pedida'] !== null
                ? PadraoDecimal::parseStrict($raw['qtde_pedida'], PadraoDecimal::SCALE_QTY)
                : $sug['faltante_comercial'];

            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.qtde_pedida" => ['Quantidade pedida deve ser maior que zero.'],
                ]);
            }

            $valor = PadraoDecimal::parseStrict($raw['valor_unitario'] ?? null, PadraoDecimal::SCALE_UNIT_PRICE);
            if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_UNIT_PRICE) < 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.valor_unitario" => ['Informe o valor unitário (unidade comercial).'],
                ]);
            }

            $itens[] = [
                'produto_id' => $produtoId,
                'qtde_pedida' => $qtde,
                'valor_unitario' => $valor,
                'unidade' => $sug['unidade_comercial'],
            ];
        }

        if ($itens === []) {
            throw ValidationException::withMessages([
                'itens' => ['Selecione ao menos um item para gerar a OC.'],
            ]);
        }

        return $this->ordens->create($empresa, [
            'fornecedor_id' => (int) $data['fornecedor_id'],
            'origem' => OrdemCompra::ORIGEM_DIRETA,
            'urgente' => (bool) ($data['urgente'] ?? false),
            'condicao_pagamento' => $data['condicao_pagamento'] ?? null,
            'previsao_entrega' => $data['previsao_entrega'] ?? null,
            'observacao' => $this->composeObservacao($data['observacao'] ?? null),
            'itens' => $itens,
        ]);
    }

    /**
     * Pendente em OC ABERTA/PARCIAL convertido para unidade_interna.
     *
     * @param  list<int>  $produtoIds
     * @return array<int, string>
     */
    private function emTransitoPorProduto(Empresa $empresa, array $produtoIds): array
    {
        $itens = OrdemCompraItem::query()
            ->with(['produto:id,fator_conversao', 'ordemCompra:id,empresa_id,status'])
            ->whereIn('produto_id', $produtoIds)
            ->whereHas('ordemCompra', function ($q) use ($empresa) {
                $q->where('empresa_id', $empresa->id)
                    ->whereIn('status', [
                        OrdemCompra::STATUS_ABERTA,
                        OrdemCompra::STATUS_PARCIAL,
                    ]);
            })
            ->get();

        $map = [];
        foreach ($itens as $item) {
            $pendenteCom = PadraoDecimal::roundHalfUp(
                bcsub((string) $item->qtde_pedida, (string) $item->qtde_recebida, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
            if (bccomp($pendenteCom, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }

            $fator = $this->fator($item->produto);
            $pendenteInt = PadraoDecimal::roundHalfUp(
                bcmul($pendenteCom, $fator, PadraoDecimal::SCALE_FACTOR + 4),
                PadraoDecimal::SCALE_QTY
            );

            $pid = (int) $item->produto_id;
            $map[$pid] = isset($map[$pid])
                ? PadraoDecimal::roundHalfUp(
                    bcadd($map[$pid], $pendenteInt, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                )
                : $pendenteInt;
        }

        return $map;
    }

    private function fator(?Produto $produto): string
    {
        if (! $produto || $produto->fator_conversao === null || $produto->fator_conversao === '') {
            return '1';
        }

        $fator = (string) $produto->fator_conversao;
        if (bccomp($fator, '0', PadraoDecimal::SCALE_FACTOR) <= 0) {
            return '1';
        }

        return $fator;
    }

    private function paraComercial(string $qtdeInt, string $fator): string
    {
        if (bccomp($fator, '1', PadraoDecimal::SCALE_FACTOR) === 0) {
            return $qtdeInt;
        }

        return PadraoDecimal::roundHalfUp(
            bcdiv($qtdeInt, $fator, PadraoDecimal::SCALE_FACTOR + 4),
            PadraoDecimal::SCALE_QTY
        );
    }

    private function composeObservacao(mixed $obs): string
    {
        $base = 'OC gerada pela reposição (estoque mínimo).';
        if ($obs === null || (is_string($obs) && trim($obs) === '')) {
            return $base;
        }

        return $base.' '.trim((string) $obs);
    }
}
