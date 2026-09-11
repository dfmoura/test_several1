<?php

namespace App\Services\Cadastros;

/**
 * Tubetes físicos de compra/estoque — lista operacional RLP.
 *
 * 1 SKU = Ø × espessura × comprimento × (c/logo|s/logo).
 * ORC continua só com diâmetro ("1\"" / "1 1/2\"" / "3\"") — não misturar.
 * Norma: ADR_CADASTRO_INSUMO_VOLUME (emenda tubete dimensional fixo).
 */
final class ProdutoCadastroTubeteData
{
    public const FONTE = 'lista operacional tubetes RLP · 2026-09-10';

    public const TOTAL = 52;

    /**
     * @return list<array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   descricao_comercial: string,
     *   ncm: string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   unidade_interna: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string,
     *   diametro_pol: string,
     *   espessura_mm: string,
     *   comprimento: string,
     *   com_logo: bool
     * }>
     */
    public static function insumos(): array
    {
        $specs = [
            // ——— 1" × 2,0 ———
            ['1"', '2,0', '1,8', false],
            ['1"', '2,0', '3,9', false],
            ['1"', '2,0', '3,8', true],
            ['1"', '2,0', '3,8', false],
            ['1"', '2,0', '4,0', true],
            ['1"', '2,0', '4,0', false],
            ['1"', '2,0', '4,2', true],
            ['1"', '2,0', '5,0', true],
            ['1"', '2,0', '5,5', true],
            ['1"', '2,0', '6,0', true],
            ['1"', '2,0', '62', true],
            ['1"', '2,0', '62', false],
            ['1"', '2,0', '70', false],
            ['1"', '2,0', '80', false],
            ['1"', '2,0', '80', true],
            ['1"', '2,0', '90', true],
            ['1"', '2,0', '90', false],
            ['1"', '2,0', '100', true],
            ['1"', '2,0', '102', true],
            ['1"', '2,0', '102', false],
            ['1"', '2,0', '105', true],
            ['1"', '2,0', '107', true],
            ['1"', '2,0', '107', false],

            // ——— 1 1/2" × 2,0 ———
            ['1 1/2"', '2,0', '20', true],
            ['1 1/2"', '2,0', '25', true],
            ['1 1/2"', '2,0', '80', true],
            ['1 1/2"', '2,0', '80', false],
            ['1 1/2"', '2,0', '100', true],
            ['1 1/2"', '2,0', '102', true],
            ['1 1/2"', '2,0', '102', false],
            ['1 1/2"', '2,0', '108', true],
            ['1 1/2"', '2,0', '118', true],
            ['1 1/2"', '2,0', '118', false],

            // ——— 3" × 3,0 ———
            ['3"', '3,0', '1,1', false],
            ['3"', '3,0', '1,0', true],
            ['3"', '3,0', '1,0', false],
            ['3"', '3,0', '20', true],
            ['3"', '3,0', '25', true],
            ['3"', '3,0', '25', false],
            ['3"', '3,0', '65', false],
            ['3"', '3,0', '80', true],
            ['3"', '3,0', '85', true],
            ['3"', '3,0', '85', false],
            ['3"', '3,0', '95', false],
            ['3"', '3,0', '100', true],
            ['3"', '3,0', '100', false],
            ['3"', '3,0', '102', true],
            ['3"', '3,0', '102', false],
            ['3"', '3,0', '105', true],
            ['3"', '3,0', '107', false],
            ['3"', '3,0', '108', true],
            ['3"', '3,0', '108', false],
        ];

        $rows = [];
        $n = 1;
        foreach ($specs as [$diametro, $espessura, $comprimento, $comLogo]) {
            $rows[] = self::row($n, $diametro, $espessura, $comprimento, $comLogo);
            $n++;
        }

        return $rows;
    }

    /**
     * @return array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   descricao_comercial: string,
     *   ncm: string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   unidade_interna: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string,
     *   diametro_pol: string,
     *   espessura_mm: string,
     *   comprimento: string,
     *   com_logo: bool
     * }
     */
    private static function row(
        int $seq,
        string $diametro,
        string $espessura,
        string $comprimento,
        bool $comLogo,
    ): array {
        $logoCurto = $comLogo ? 'c/logo' : 's/logo';
        $logoFiscal = $comLogo ? 'COM LOGO' : 'SEM LOGO';
        $comercial = sprintf('%s × %s × %s %s', $diametro, $espessura, $comprimento, $logoCurto);
        $fiscal = sprintf(
            'TUBETE PAPELAO %s ESP %sMM COMP %sMM %s',
            $diametro,
            $espessura,
            $comprimento,
            $logoFiscal
        );

        return [
            'codigo' => sprintf('EMB-TUB-%03d', $seq),
            'familia' => 'EMB',
            'grupo' => 'EMB-TUB',
            'descricao_fiscal' => $fiscal,
            'descricao_comercial' => $comercial,
            'ncm' => '48229000',
            'tipo_item_sped' => '02',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'grupo_estoque' => '70',
            'ncm_situacao' => 'OK',
            'listagem_grupo' => 'TUBETE',
            'diametro_pol' => $diametro,
            'espessura_mm' => $espessura,
            'comprimento' => $comprimento,
            'com_logo' => $comLogo,
        ];
    }
}
