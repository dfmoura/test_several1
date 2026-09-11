<?php

namespace App\Services\Cadastros;

/**
 * Insumos operacionais evidenciados em `/Downloads/notas_entrada` (111 NF-e).
 *
 * Norma: ADR_CADASTRO_INSUMO_VOLUME — 1 SKU por material/programa; largura variável
 * vira de-para + volume na entrada (não explode cadastro).
 *
 * Avery Exact permanece em ProdutoCadastroExactData (F1).
 * Uso/consumo, ferramental avulso e remessa de clichê ficam de fora (sem SKU).
 */
final class ProdutoCadastroNfEntradaData
{
    public const FONTE = 'notas_entrada XML · EMP RLP · amostragem 2026-09';

    public const TOTAL = 26;

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
     *   programa_compra: ?string,
     *   comprimento_m_nominal: ?string
     * }>
     */
    public static function insumos(): array
    {
        return [
            // ——— Papéis (M2 comercial = M2 estoque) ———
            self::mp('MP-PAP-016', 'MP-PAP', 'VERTEX 5030 G62', 'Vertex 5030 G62', '48114190', '10', 'PAPEL_AUTO', 'VERTEX 5030', null),
            self::mp('MP-PAP-017', 'MP-PAP', 'COLACRIL TERMICO ECO70G ADC5240/60G FSC', 'Colacril térmico Eco70 ADC5240', '48114190', '12', 'PAPEL_AUTO', 'ADC5240', null),
            self::mp('MP-PAP-018', 'MP-PAP', 'COLACRIL COUCHE 80G ADC200/60G', 'Colacril couché 80g ADC200', '48114190', '10', 'PAPEL_AUTO', 'ADC200', null),
            self::mp('MP-PAP-019', 'MP-PAP', 'COLACRIL COUCHE 80G ADC5240/60G', 'Colacril couché 80g ADC5240', '48114190', '10', 'PAPEL_AUTO', 'ADC5240', null),
            self::mp('MP-PAP-020', 'MP-PAP', 'PPA COUCHE TACKMELT AHM850 GL50', 'PPA couché Tackmelt AHM850', '48114190', '10', 'PAPEL_AUTO', 'AHM850', null),

            // ——— Filmes BOPP / PP ———
            self::mp('MP-FLM-016', 'MP-FLM', 'FEDRIGONI PP TC8 GLOSS CLEAR B0883/FLM4443', 'Fedrigoni PP TC8 gloss clear', '39199010', '20', 'BOPP', 'B0883', null),
            self::mp('MP-FLM-017', 'MP-FLM', 'FEDRIGONI PP MATT WHITE B0912/FLM4445', 'Fedrigoni PP matt white', '39199010', '20', 'BOPP', 'B0912', null),
            self::mp('MP-FLM-018', 'MP-FLM', 'FEDRIGONI PP TC8 GLOSS WHITE B5009/FLM4274', 'Fedrigoni PP TC8 gloss white', '39191090', '20', 'BOPP', 'B5009', null),
            self::mp('MP-FLM-019', 'MP-FLM', 'COLACRIL BOPP TRANSPARENTE TC ADC1000/GL52', 'Colacril BOPP transp. TC ADC1000', '39199010', '20', 'BOPP', 'ADC1000', null),
            self::mp('MP-FLM-020', 'MP-FLM', 'COLACRIL BOPP BRANCO TC ADC210/GL52', 'Colacril BOPP branco TC ADC210', '39199010', '20', 'BOPP', 'ADC210', null),
            self::mp('MP-FLM-021', 'MP-FLM', 'COLACRIL BOPP BRANCO FOSCO NTC ADC1000/GL52', 'Colacril BOPP branco fosco NTC ADC1000', '39199010', '20', 'BOPP', 'ADC1000', null),
            self::mp('MP-FLM-022', 'MP-FLM', 'COLACRIL BOPP METALIZADO TC ADC1000/GL52', 'Colacril BOPP metalizado TC ADC1000', '39199010', '20', 'BOPP', 'ADC1000', null),
            self::mp('MP-FLM-023', 'MP-FLM', 'COLACRIL BOPP BRANCO FOSCO TC ADC1000/GL52', 'Colacril BOPP branco fosco TC ADC1000', '39199010', '20', 'BOPP', 'ADC1000', null),
            self::mp('MP-FLM-024', 'MP-FLM', 'COLACRIL BOPP BRANCO FOSCO NTC ADC3000/GL52', 'Colacril BOPP branco fosco NTC ADC3000', '39199010', '20', 'BOPP', 'ADC3000', null),
            self::mp('MP-FLM-025', 'MP-FLM', 'PPA BOPP BRANCO BRILHO TC AP120 GL58', 'PPA BOPP branco brilho AP120', '39199090', '20', 'BOPP', 'AP120', null),
            self::mp('MP-FLM-026', 'MP-FLM', 'PPA BOPP TRANSPARENTE TC AP120 GL58', 'PPA BOPP transparente AP120', '39199090', '20', 'BOPP', 'AP120', null),
            self::mp('MP-FLM-027', 'MP-FLM', 'PPA BOPP TERMICO BR TC AP718 GL58', 'PPA BOPP térmico BR AP718', '39199090', '20', 'BOPP', 'AP718', null),
            self::mp('MP-FLM-028', 'MP-FLM', 'PPA BOPP METALIZADO PRATA TC AP120 GL58', 'PPA BOPP metalizado prata AP120', '39199090', '20', 'BOPP', 'AP120', null),

            // ——— Cold foil (evidência Crown / Kurz) ———
            self::mp('MP-CLD-003', 'MP-CLD', 'FOIL HOT/COLD LUX KPW XU 220', 'Kurz Lux KPW XU 220', '32121000', '41', 'COLD', 'LUX KPW XU 220', '1000', 'BB', 'BB'),

            // ——— Dupla face (código 52916 — Softprint 52015 já é MP-ADF-002) ———
            self::mp('MP-ADF-004', 'MP-ADF', 'FITA DUPLA FACE FLEXO PRINT 52916 460X25', 'Fita dupla face Flexo Print 52916', '39199090', '72', 'DUPLA_FACE', '52916', null, 'RL', 'RL'),

            // ——— Ribbons (dimensão comercial = identidade) ———
            self::rev('REV-RIB-006', 'RIBBON AXR1 ZEBRA 110MM X 74M', 'AXR1 Zebra 110×74', 'AXR1 ZEBRA'),
            self::rev('REV-RIB-007', 'RIBBON AXR1 ZEBRA 110MM X 300M', 'AXR1 Zebra 110×300', 'AXR1 ZEBRA 300'),
            self::rev('REV-RIB-008', 'RIBBON AWR1 GENIUS 110MM X 450M', 'AWR1 Genius 110×450', 'AWR1 GENIUS'),
            self::rev('REV-RIB-009', 'RIBBON AXR1 GENIUS 110MM X 300M', 'AXR1 Genius 110×300', 'AXR1 GENIUS'),
            self::rev('REV-RIB-010', 'RIBBON APR1 ZEBRA 110MM X 450M', 'APR1 Zebra 110×450', 'APR1 ZEBRA 450'),

            // Tubetes físicos: ProdutoCadastroTubeteData (Ø × espessura × comprimento × logo).
            // ORC usa só diâmetro — não recriar SKUs genéricos nem os da NF (004–010).

            // ——— Auxiliar de limpeza (Sunquimica) ———
            self::tin('MP-TIN-027', 'PERFECT CLEANER FLOTADOR', 'Perfect Cleaner flotador', '34024900', 'L'),
        ];
    }

    /**
     * @return array{
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
     *   programa_compra: ?string,
     *   comprimento_m_nominal: ?string
     * }
     */
    private static function mp(
        string $codigo,
        string $grupo,
        string $fiscal,
        string $comercial,
        string $ncm,
        string $gg,
        string $listagem,
        ?string $programa,
        ?string $comp,
        string $uCom = 'M2',
        string $uInt = 'M2',
    ): array {
        return [
            'codigo' => $codigo,
            'familia' => 'MP',
            'grupo' => $grupo,
            'descricao_fiscal' => $fiscal,
            'descricao_comercial' => $comercial,
            'ncm' => $ncm,
            'tipo_item_sped' => '01',
            'unidade_comercial' => $uCom,
            'unidade_interna' => $uInt,
            'grupo_estoque' => $gg,
            'ncm_situacao' => 'OK',
            'listagem_grupo' => $listagem,
            'programa_compra' => $programa,
            'comprimento_m_nominal' => $comp,
        ];
    }

    /**
     * @return array{
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
     *   programa_compra: ?string,
     *   comprimento_m_nominal: ?string
     * }
     */
    private static function rev(string $codigo, string $fiscal, string $comercial, string $programa): array
    {
        return [
            'codigo' => $codigo,
            'familia' => 'REV',
            'grupo' => 'REV-RIB',
            'descricao_fiscal' => $fiscal,
            'descricao_comercial' => $comercial,
            'ncm' => '96121000',
            'tipo_item_sped' => '00',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'grupo_estoque' => '60',
            'ncm_situacao' => 'OK',
            'listagem_grupo' => 'RIBBON',
            'programa_compra' => $programa,
            'comprimento_m_nominal' => null,
        ];
    }

    /**
     * @return array{
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
     *   programa_compra: ?string,
     *   comprimento_m_nominal: ?string
     * }
     */
    private static function tin(string $codigo, string $fiscal, string $comercial, string $ncm, string $un): array
    {
        return [
            'codigo' => $codigo,
            'familia' => 'MP',
            'grupo' => 'MP-TIN',
            'descricao_fiscal' => $fiscal,
            'descricao_comercial' => $comercial,
            'ncm' => $ncm,
            'tipo_item_sped' => '01',
            'unidade_comercial' => $un,
            'unidade_interna' => $un,
            'grupo_estoque' => '50',
            'ncm_situacao' => 'OK',
            'listagem_grupo' => 'AUX_IMPRESSAO',
            'programa_compra' => null,
            'comprimento_m_nominal' => null,
        ];
    }
}
