<?php

namespace App\Support;

use App\Models\CompraNecessidade;
use App\Models\Cotacao;
use App\Models\OrdemCompra;
use App\Models\Titulo;
use Illuminate\Validation\Rule;

/**
 * Regras de validação BL-033 — Compras → Estoque → TIT.
 */
final class CompraValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function necessidade(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'produto_id' => [$req, 'integer', 'exists:produtos,id'],
            'qtde' => array_merge([$req], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'unidade' => ['nullable', 'string', 'max:8'],
            'necessario_em' => ['nullable', 'date'],
            'motivo' => ['nullable', 'string', 'max:240'],
            'prioridade' => ['nullable', 'string', Rule::in(CompraNecessidade::PRIORIDADES)],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function cotacao(): array
    {
        return [
            'necessidade_id' => ['nullable', 'integer', 'exists:compra_necessidades,id'],
            'prazo_resposta' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.qtde' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'itens.*.unidade' => ['nullable', 'string', 'max:8'],
            'itens.*.ordem' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function proposta(): array
    {
        return [
            'cotacao_item_id' => ['required', 'integer', 'exists:cotacao_itens,id'],
            'fornecedor_id' => ['required', 'integer', 'exists:parceiros,id'],
            'valor_unitario' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE, false)),
            'frete' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY)),
            'prazo_dias' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'validade' => ['nullable', 'date'],
            'condicao_pagamento' => ['nullable', 'string', 'max:120'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function decidirCotacao(): array
    {
        return [
            'proposta_ids' => ['required', 'array', 'min:1'],
            'proposta_ids.*' => ['required', 'integer', 'exists:cotacao_propostas,id'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ordemCompraDireta(): array
    {
        return [
            'fornecedor_id' => ['required', 'integer', 'exists:parceiros,id'],
            'necessidade_id' => ['nullable', 'integer', 'exists:compra_necessidades,id'],
            'urgente' => ['sometimes', 'boolean'],
            'condicao_pagamento' => ['nullable', 'string', 'max:120'],
            'previsao_entrega' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.qtde_pedida' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'itens.*.valor_unitario' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE, false)),
            'itens.*.unidade' => ['nullable', 'string', 'max:8'],
            'itens.*.ordem' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function receber(): array
    {
        return [
            'nf_chave' => ['nullable', 'string', 'max:44'],
            'nf_numero' => ['nullable', 'string', 'max:20'],
            'nf_data' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'natureza_id' => ['nullable', 'integer', 'exists:naturezas_gerenciais,id'],
            'vencimento' => ['required_without:parcelas', 'nullable', 'date'],
            'parcelas' => ['sometimes', 'array', 'min:1'],
            'parcelas.*.vencimento' => ['required', 'date'],
            'parcelas.*.valor' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY, false)),
            'parcelas.*.n_dup' => ['nullable', 'string', 'max:16'],
            'parcelas.*.parcela' => ['nullable', 'integer', 'min:1'],
            'nf_valor' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY, true)),
            'nf_totais' => ['nullable', 'array'],
            'nf_totais.v_nf' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_prod' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_ipi' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_icms' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_frete' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_desc' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_outro' => ['nullable', 'string', 'max:24'],
            'nf_totais.v_st' => ['nullable', 'string', 'max:24'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.ordem_compra_item_id' => ['required', 'integer', 'exists:ordem_compra_itens,id'],
            'itens.*.qtde_recebida' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'itens.*.lote_codigo' => ['nullable', 'string', 'max:60'],
            'itens.*.lote_data_entrada' => ['nullable', 'date'],
            'itens.*.lote_data_fabricacao' => ['nullable', 'date'],
            'itens.*.lote_data_validade' => ['nullable', 'date'],
            'itens.*.lotes' => ['sometimes', 'array'],
            'itens.*.lotes.*.codigo' => ['required_with:itens.*.lotes', 'string', 'max:60'],
            'itens.*.lotes.*.qtde' => array_merge(['required_with:itens.*.lotes'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'itens.*.lotes.*.data_entrada' => ['nullable', 'date'],
            'itens.*.lotes.*.data_fabricacao' => ['nullable', 'date'],
            'itens.*.lotes.*.data_validade' => ['nullable', 'date'],
            'cprod_maps' => ['sometimes', 'array'],
            'cprod_maps.*.c_prod' => ['required_with:cprod_maps', 'string', 'max:60'],
            'cprod_maps.*.produto_id' => ['required_with:cprod_maps', 'integer', 'exists:produtos,id'],
            'cprod_maps.*.x_prod' => ['nullable', 'string', 'max:240'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function baixarTitulo(): array
    {
        return [
            'conta_financeira_id' => ['required', 'integer', 'exists:empresa_contas_financeiras,id'],
            'valor' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY, false)),
            'pago_em' => ['required', 'date'],
            'forma' => ['nullable', 'string', 'max:32'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function listFilters(string $statusClass = ''): array
    {
        $statusRule = ['nullable', 'string', 'max:16'];
        if ($statusClass === CompraNecessidade::class) {
            $statusRule = ['nullable', 'string', Rule::in(CompraNecessidade::STATUSES)];
        } elseif ($statusClass === Cotacao::class) {
            $statusRule = ['nullable', 'string', Rule::in(Cotacao::STATUSES)];
        } elseif ($statusClass === OrdemCompra::class) {
            $statusRule = ['nullable', 'string', Rule::in(OrdemCompra::STATUSES)];
        } elseif ($statusClass === Titulo::class) {
            $statusRule = ['nullable', 'string', Rule::in(Titulo::STATUSES)];
        }

        return [
            'q' => ['nullable', 'string', 'max:120'],
            'status' => $statusRule,
            'produto_id' => ['nullable', 'integer'],
            'fornecedor_id' => ['nullable', 'integer'],
            'parceiro_id' => ['nullable', 'integer'],
        ];
    }
}
