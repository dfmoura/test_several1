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
            // Sem composição: qtde opcional (serviço usa faltante). Com composição: Σ faixas deriva qtde (mesmo contrato da OC).
            'itens.*.qtde_pedida' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY)),
            'itens.*.valor_unitario' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE, false)),
            'itens.*.composicao' => ['sometimes', 'array', 'min:1'],
            'itens.*.composicao.*.largura_mm' => array_merge(
                ['required_with:itens.*.composicao'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'itens.*.composicao.*.quantidade' => array_merge(
                ['required_with:itens.*.composicao'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)
            ),
            'itens.*.composicao.*.comprimento_m' => array_merge(
                ['required_with:itens.*.composicao'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'itens.*.composicao.*.ordem' => ['nullable', 'integer', 'min:1'],
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
            // A03/VIRADA: N volumes (bobinas) — soma = Δ; motor já aplica via lote_payload.
            'lote_payload' => ['nullable', 'array', 'min:1'],
            'lote_payload.*.codigo' => ['nullable', 'string', 'max:60'],
            'lote_payload.*.qtde' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'lote_payload.*.largura_mm' => array_merge(
                ['nullable'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'lote_payload.*.comprimento_m' => array_merge(
                ['nullable'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'lote_payload.*.data_entrada' => ['nullable', 'date'],
            'lote_payload.*.data_fabricacao' => ['nullable', 'date'],
            'lote_payload.*.data_validade' => ['nullable', 'date'],
            // Contagem avulsa por QR (volume + local) — auditoria; não alimenta Writer.
            'contagem_evidencia' => ['nullable', 'array'],
            'contagem_evidencia.modo' => ['required_with:contagem_evidencia', 'string', 'in:QR_VOLUME_LOCAL'],
            'contagem_evidencia.endereco' => ['required_with:contagem_evidencia', 'array'],
            'contagem_evidencia.endereco.id' => ['required_with:contagem_evidencia', 'integer'],
            'contagem_evidencia.endereco.codigo' => ['required_with:contagem_evidencia', 'string', 'max:40'],
            'contagem_evidencia.qtde_soma' => array_merge(
                ['required_with:contagem_evidencia'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)
            ),
            'contagem_evidencia.volumes' => ['required_with:contagem_evidencia', 'array', 'min:1'],
            'contagem_evidencia.volumes.*.lote_id' => ['required', 'integer'],
            'contagem_evidencia.volumes.*.codigo' => ['required', 'string', 'max:60'],
            'contagem_evidencia.volumes.*.qtde' => array_merge(
                ['required'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)
            ),
            'contagem_evidencia.volumes.*.unidade' => ['nullable', 'string', 'max:10'],
            'contagem_evidencia.volumes.*.status' => [
                'required',
                'string',
                Rule::in(['ENCONTRADO', 'LOCAL_ERRADO', 'SEM_LOCAL']),
            ],
            'contagem_evidencia.volumes.*.endereco_atual' => ['nullable', 'string', 'max:40'],
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
    public static function inventarioLeitura(): array
    {
        return [
            'volume_qr' => ['required', 'string', 'max:120'],
            'endereco_qr' => ['required', 'string', 'max:120'],
            'rodada' => ['nullable', 'integer', 'in:1,2'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventarioFecharRodadaFisica(): array
    {
        return [
            'rodada' => ['required', 'integer', 'in:1,2'],
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
            // VIRADA/A03: mesmos volumes da contagem avulsa (opcional).
            'lote_payload' => ['nullable', 'array', 'min:1'],
            'lote_payload.*.codigo' => ['nullable', 'string', 'max:60'],
            'lote_payload.*.qtde' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'lote_payload.*.largura_mm' => array_merge(
                ['nullable'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'lote_payload.*.comprimento_m' => array_merge(
                ['nullable'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_DIM, false)
            ),
            'lote_payload.*.data_entrada' => ['nullable', 'date'],
            'lote_payload.*.data_fabricacao' => ['nullable', 'date'],
            'lote_payload.*.data_validade' => ['nullable', 'date'],
        ];
    }
}
