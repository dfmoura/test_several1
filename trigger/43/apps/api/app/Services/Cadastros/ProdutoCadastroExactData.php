<?php

namespace App\Services\Cadastros;

/**
 * Insumos Exact (programa comercial) — ADR_CADASTRO_INSUMO_VOLUME F1.
 *
 * 1 SKU por material+programa. L×C real = volume na entrada.
 * De-para cProd Avery: ver ProdutoFornecedorDeParaCatalogData.
 */
final class ProdutoCadastroExactData
{
    public const FONTE = 'ADR_CADASTRO_INSUMO_VOLUME + NF Avery amostra 2026';

    public const TOTAL = 4;

    /**
     * @return list<array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   descricao_comercial: ?string,
     *   ncm: string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   unidade_interna: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string,
     *   programa_compra: string,
     *   comprimento_m_nominal: string
     * }>
     */
    public static function insumos(): array
    {
        return [
            [
                'codigo' => 'MP-PAP-013',
                'familia' => 'MP',
                'grupo' => 'MP-PAP',
                'descricao_fiscal' => 'FASSON ECOPRINT/S2045N/60G EXACT 1000',
                'descricao_comercial' => 'ECOPRINT Exact 1000',
                'ncm' => '48114190',
                'tipo_item_sped' => '01',
                'unidade_comercial' => 'M2',
                'unidade_interna' => 'M2',
                'grupo_estoque' => '10',
                'ncm_situacao' => 'OK',
                'listagem_grupo' => 'PAPEL_AUTO',
                'programa_compra' => 'EXACT 1000',
                'comprimento_m_nominal' => '1000',
            ],
            [
                'codigo' => 'MP-PAP-014',
                'familia' => 'MP',
                'grupo' => 'MP-PAP',
                'descricao_fiscal' => 'FASSON ECOPRINT/S2045N/60G EXACT 1500',
                'descricao_comercial' => 'ECOPRINT Exact 1500',
                'ncm' => '48114190',
                'tipo_item_sped' => '01',
                'unidade_comercial' => 'M2',
                'unidade_interna' => 'M2',
                'grupo_estoque' => '10',
                'ncm_situacao' => 'OK',
                'listagem_grupo' => 'PAPEL_AUTO',
                'programa_compra' => 'EXACT 1500',
                'comprimento_m_nominal' => '1500',
            ],
            [
                'codigo' => 'MP-PAP-015',
                'familia' => 'MP',
                'grupo' => 'MP-PAP',
                'descricao_fiscal' => 'FASSON TERMICO DRY/S2045N/60G EXACT 1000',
                'descricao_comercial' => 'Térmico Dry Exact 1000',
                'ncm' => '48114190',
                'tipo_item_sped' => '01',
                'unidade_comercial' => 'M2',
                'unidade_interna' => 'M2',
                'grupo_estoque' => '12',
                'ncm_situacao' => 'OK',
                'listagem_grupo' => 'PAPEL_AUTO',
                'programa_compra' => 'EXACT 1000',
                'comprimento_m_nominal' => '1000',
            ],
            [
                'codigo' => 'MP-FLM-015',
                'familia' => 'MP',
                'grupo' => 'MP-FLM',
                'descricao_fiscal' => 'FASSON PP BRANCO FOSCO NTC/S0290/60G EXACT 1500',
                'descricao_comercial' => 'PP branco fosco Exact 1500',
                'ncm' => '39199010',
                'tipo_item_sped' => '01',
                'unidade_comercial' => 'M2',
                'unidade_interna' => 'M2',
                'grupo_estoque' => '20',
                'ncm_situacao' => 'OK',
                'listagem_grupo' => 'BOPP',
                'programa_compra' => 'EXACT 1500',
                'comprimento_m_nominal' => '1500',
            ],
        ];
    }
}
