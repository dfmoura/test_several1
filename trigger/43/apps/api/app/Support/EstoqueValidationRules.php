<?php

namespace App\Support;

use App\Models\EstoqueAjuste;
use App\Models\EstoqueInventario;
use Illuminate\Validation\Rule;

/**
 * Validação BL-036 / BL-042 — reposição, ajuste e inventário.
 */
final class EstoqueValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function reposicaoGerarOc(): array
    {
        return [
            'fornecedor_id' => ['required', 'integer', 'exists:parceiros,id'],
            'urgente' => ['sometimes', 'boolean'],
            'condicao_pagamento' => ['nullable', 'string', 'max:120'],
            'previsao_entrega' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.qtde_pedida' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY)),
            'itens.*.valor_unitario' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE, false)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ajusteCreate(): array
    {
        return [
            'produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'origem' => ['nullable', 'string', Rule::in([EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA])],
            'motivo_codigo' => ['required', 'string', Rule::in(array_keys(EstoqueAjuste::MOTIVOS))],
            'motivo_complemento' => ['nullable', 'string', 'max:240'],
            'qtde_contada' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'checklist_confirmado' => ['required', 'accepted'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'causa_raiz' => ['nullable', 'string', 'max:2000'],
            'lote_id' => ['nullable', 'integer', 'exists:estoque_lotes,id'],
            'lote_codigo' => ['nullable', 'string', 'max:60'],
            'lote_data_entrada' => ['nullable', 'date'],
            'lote_data_fabricacao' => ['nullable', 'date'],
            'lote_data_validade' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ajusteAprovar(): array
    {
        return [
            'causa_raiz' => ['nullable', 'string', 'max:2000'],
            'ciencia_diretoria' => ['sometimes', 'boolean'],
            'ciencia_contabilidade' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ajusteRejeitar(): array
    {
        return [
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ajusteCancelar(): array
    {
        return [
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function listFilters(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(EstoqueAjuste::STATUSES)],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventarioList(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(EstoqueInventario::STATUSES)],
            'tipo' => ['nullable', 'string', Rule::in(EstoqueInventario::TIPOS)],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventarioCreate(): array
    {
        return [
            'tipo' => ['required', 'string', Rule::in(EstoqueInventario::TIPOS)],
            'produto_ids' => ['required', 'array', 'min:1'],
            'produto_ids.*' => ['required', 'integer', 'exists:produtos,id'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventarioContagem(): array
    {
        return [
            'qtde' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventarioGerarAjuste(): array
    {
        return [
            'motivo_codigo' => ['nullable', 'string', Rule::in(array_keys(EstoqueAjuste::MOTIVOS))],
            'motivo_complemento' => ['nullable', 'string', 'max:240'],
            'checklist_confirmado' => ['required', 'accepted'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'causa_raiz' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
