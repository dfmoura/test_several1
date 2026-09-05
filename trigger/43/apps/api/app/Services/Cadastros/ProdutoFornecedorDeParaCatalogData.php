<?php

namespace App\Services\Cadastros;

/**
 * De-para canônico cProd → SKU (ADR_CADASTRO_INSUMO_VOLUME F1).
 * Só grava se o parceiro (CNPJ) e o SKU existirem na EMP.
 */
final class ProdutoFornecedorDeParaCatalogData
{
    public const AVERY_CNPJ = '43999630000124';

    /**
     * @return list<array{cnpj: string, c_prod: string, x_prod: string, produto_codigo: string}>
     */
    public static function maps(): array
    {
        return [
            [
                'cnpj' => self::AVERY_CNPJ,
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
                'produto_codigo' => 'MP-PAP-013',
            ],
            [
                'cnpj' => self::AVERY_CNPJ,
                'c_prod' => 'AAS029-EX3',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1500',
                'produto_codigo' => 'MP-PAP-014',
            ],
            [
                'cnpj' => self::AVERY_CNPJ,
                'c_prod' => 'AAS040-EX1',
                'x_prod' => 'FASSON TERMICO DRY/S2045N/60G - EXACT 1000',
                'produto_codigo' => 'MP-PAP-015',
            ],
            [
                'cnpj' => self::AVERY_CNPJ,
                'c_prod' => 'AAS121-EX3',
                'x_prod' => 'FASSON PP BRANCO FOSCO NTC/S0290/60G - EXACT 1500',
                'produto_codigo' => 'MP-FLM-015',
            ],
        ];
    }
}
