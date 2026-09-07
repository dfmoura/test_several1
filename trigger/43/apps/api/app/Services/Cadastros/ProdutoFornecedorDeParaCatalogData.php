<?php

namespace App\Services\Cadastros;

/**
 * De-para canônico cProd → SKU (ADR_CADASTRO_INSUMO_VOLUME).
 * Evidência: pasta notas_entrada (111 XML) + Avery Exact F1.
 * Só grava se o parceiro (CNPJ) e o SKU existirem na EMP.
 */
final class ProdutoFornecedorDeParaCatalogData
{
    public const AVERY_CNPJ = '43999630000124';

    public const TOTAL = 87;

    /**
     * @return list<array{cnpj: string, c_prod: string, x_prod: string, produto_codigo: string}>
     */
    public static function maps(): array
    {
        return [
            [
                'cnpj' => '43999630000124',
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
                'produto_codigo' => 'MP-PAP-013',
            ],
            [
                'cnpj' => '43999630000124',
                'c_prod' => 'AAS029-EX3',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1500',
                'produto_codigo' => 'MP-PAP-014',
            ],
            [
                'cnpj' => '43999630000124',
                'c_prod' => 'AAS040-EX1',
                'x_prod' => 'FASSON TERMICO DRY/S2045N/60G - EXACT 1000',
                'produto_codigo' => 'MP-PAP-015',
            ],
            [
                'cnpj' => '43999630000124',
                'c_prod' => 'AAS121-EX3',
                'x_prod' => 'FASSON PP BRANCO FOSCO NTC/S0290/60G - EXACT 1500',
                'produto_codigo' => 'MP-FLM-015',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '05850111',
                'x_prod' => 'COLACRIL_TERMICO ECO70G L/ADC5240/60G FSC _',
                'produto_codigo' => 'MP-PAP-017',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '301A3G133N',
                'x_prod' => 'COLACRIL_BOPP TPTE TC 50M L/ADC1000/GL52M',
                'produto_codigo' => 'MP-FLM-019',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '301A3G333N',
                'x_prod' => 'COLACRIL_BOPP BRANCO TC60M L/ADC210/GL52M',
                'produto_codigo' => 'MP-FLM-020',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '301A3G43N',
                'x_prod' => 'COLACRIL_BOPP BCO FOSCONTC 60M L/ADC1000/GL52M',
                'produto_codigo' => 'MP-FLM-021',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '301A4G13N',
                'x_prod' => 'COLACRIL_BOPP METALIZADOTC 50M L/ADC1000/GL52M',
                'produto_codigo' => 'MP-FLM-022',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '301A4G592N',
                'x_prod' => 'COLACRIL_BOPP BCO FOSCOTC 60M/ADC1000/GL52M',
                'produto_codigo' => 'MP-FLM-023',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '303A5G13C',
                'x_prod' => 'COLACRIL_COUCHE 80GL/ADC200/60GR_',
                'produto_codigo' => 'MP-PAP-018',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '303H5G73C',
                'x_prod' => 'COLACRIL_COUCHE 80G L/ADC5240/60G _',
                'produto_codigo' => 'MP-PAP-019',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '503H5G73C',
                'x_prod' => 'COLACRIL_COUCHE 80G L/ADC5240/60G _',
                'produto_codigo' => 'MP-PAP-019',
            ],
            [
                'cnpj' => '03514129000106',
                'c_prod' => '501H3G03C',
                'x_prod' => 'COLACRIL_BOPP BCO FOSCONTC 60M L/ADC3000/GL52M_',
                'produto_codigo' => 'MP-FLM-024',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0193927730060',
                'x_prod' => 'B0883 | FLM4443 | 03838 PP TC8 GLOSS CLEAR',
                'produto_codigo' => 'MP-FLM-016',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0193927730240',
                'x_prod' => 'B0883 | FLM4443 | 03838 PP TC8 GLOSS CLEAR',
                'produto_codigo' => 'MP-FLM-016',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0193927730250',
                'x_prod' => 'B0883 | FLM4443 | 03838 PP TC8 GLOSS CLEAR',
                'produto_codigo' => 'MP-FLM-016',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0211927730080',
                'x_prod' => 'B0912 | FLM4445 | 07182 PP MATT WHITE',
                'produto_codigo' => 'MP-FLM-017',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0211927730090',
                'x_prod' => 'B0912 | FLM4445 | 07182 PP MATT WHITE',
                'produto_codigo' => 'MP-FLM-017',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0211927730110',
                'x_prod' => 'B0912 | FLM4445 | 07182 PP MATT WHITE',
                'produto_codigo' => 'MP-FLM-017',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E0211927730210',
                'x_prod' => 'B0912 | FLM4445 | 07182 PP MATT WHITE',
                'produto_codigo' => 'MP-FLM-017',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0070',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0075',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0080',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0085',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0105',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0110',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0130',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0160',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '34661762000150',
                'c_prod' => '8E02889277O0210',
                'x_prod' => 'B5009 | FLM4274 | 02102 PP TC8 GLOSS WHITE',
                'produto_codigo' => 'MP-FLM-018',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110060',
                'x_prod' => 'VERTEX 5030 G62 60 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110080',
                'x_prod' => 'VERTEX 5030 G62 80 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110095',
                'x_prod' => 'VERTEX 5030 G62 95 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110100',
                'x_prod' => 'VERTEX 5030 G62 100 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110110',
                'x_prod' => 'VERTEX 5030 G62 110 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PA900392110250',
                'x_prod' => 'VERTEX 5030 G62 250 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '48062707000159',
                'c_prod' => 'PL900392110166',
                'x_prod' => 'VERTEX 5030 G62 166 MM IMP',
                'produto_codigo' => 'MP-PAP-016',
            ],
            [
                'cnpj' => '06154635000391',
                'c_prod' => '2070',
                'x_prod' => 'BOPP BRANCO BRILHO TC AP120 GL58',
                'produto_codigo' => 'MP-FLM-025',
            ],
            [
                'cnpj' => '06154635000391',
                'c_prod' => '2071',
                'x_prod' => 'BOPP TRANSPARENTE TC AP120 GL58',
                'produto_codigo' => 'MP-FLM-026',
            ],
            [
                'cnpj' => '06154635000391',
                'c_prod' => '2237',
                'x_prod' => 'BOPP TERMICO BR TC AP718 GL58',
                'produto_codigo' => 'MP-FLM-027',
            ],
            [
                'cnpj' => '06154635000391',
                'c_prod' => '2371',
                'x_prod' => 'COUCHE TACKMELT AHM850 GL50',
                'produto_codigo' => 'MP-PAP-020',
            ],
            [
                'cnpj' => '06154635000391',
                'c_prod' => '2424',
                'x_prod' => 'BOPP METALIZADO PRATA TC AP120 GL58',
                'produto_codigo' => 'MP-FLM-028',
            ],
            [
                'cnpj' => '18270945000199',
                'c_prod' => '1193',
                'x_prod' => '808M-FILME ADESIVO P/LAMINACAO - FOSCO',
                'produto_codigo' => 'MP-LAM-003',
            ],
            [
                'cnpj' => '18270945000199',
                'c_prod' => '1218',
                'x_prod' => '808C-FILME ADESIVO P/LAMINACAO - BRILHO',
                'produto_codigo' => 'MP-LAM-002',
            ],
            [
                'cnpj' => '11510299000140',
                'c_prod' => '52015-09903-00',
                'x_prod' => 'FITA D FACE FLEXO SOFTPRINT 460mm x 25m - 52015',
                'produto_codigo' => 'MP-ADF-002',
            ],
            [
                'cnpj' => '11510299000140',
                'c_prod' => '52916-00002-00',
                'x_prod' => 'FITA D FACE FLEXO PRINT 460mm x 25m - 52916',
                'produto_codigo' => 'MP-ADF-004',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T57605IO',
                'x_prod' => 'AWR1 ZEBRA 110MM X 74M - IO',
                'produto_codigo' => 'REV-RIB-005',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T59198IO',
                'x_prod' => 'AXR1 ZEBRA 110MM X 74M',
                'produto_codigo' => 'REV-RIB-006',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T62631IO',
                'x_prod' => 'AXR1 ZEBRA GT800 110MMX300M',
                'produto_codigo' => 'REV-RIB-007',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T65053IO',
                'x_prod' => 'AWR1 GENIUS 110MM X 450M - IO',
                'produto_codigo' => 'REV-RIB-008',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T65130IO',
                'x_prod' => 'AXR1 GENIUS 110MM X 300M - IO',
                'produto_codigo' => 'REV-RIB-009',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T74346IO',
                'x_prod' => 'APR1 ZEBRA 110MM X 74M - IO',
                'produto_codigo' => 'REV-RIB-004',
            ],
            [
                'cnpj' => '08979043000172',
                'c_prod' => 'T74580IO',
                'x_prod' => 'APR1 ZEBRA 110MMX450M',
                'produto_codigo' => 'REV-RIB-010',
            ],
            [
                'cnpj' => '21309396000123',
                'c_prod' => 'T11074108',
                'x_prod' => 'RIBBON CERA TDW108 - 110MMX74M',
                'produto_codigo' => 'REV-RIB-001',
            ],
            [
                'cnpj' => '21309396000123',
                'c_prod' => 'Z11074108',
                'x_prod' => 'RIBBON CERA TDW108 - 110MMX74M',
                'produto_codigo' => 'REV-RIB-001',
            ],
            [
                'cnpj' => '03447983000105',
                'c_prod' => 'TERCFG14',
                'x_prod' => 'RIBBON CERA TDW108 - 110MMX74M',
                'produto_codigo' => 'REV-RIB-001',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WA500',
                'x_prod' => 'REDUTOR DE VISCOSIDADE',
                'produto_codigo' => 'MP-TIN-025',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF02001',
                'x_prod' => 'FILM WIN BW3 RED PANTONE 485',
                'produto_codigo' => 'MP-TIN-023',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF1000',
                'x_prod' => 'FILM WIN BW6 PROCESS YELLOW',
                'produto_codigo' => 'MP-TIN-020',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF2000',
                'x_prod' => 'FILM WIN BW4 PROCESS MAGENTA',
                'produto_codigo' => 'MP-TIN-019',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF3000',
                'x_prod' => 'FILM WIN BW8 PROCESS CYAN',
                'produto_codigo' => 'MP-TIN-018',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF4000',
                'x_prod' => 'FILM WIN BW8 PROCESS BLACK',
                'produto_codigo' => 'MP-TIN-003',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WF8000',
                'x_prod' => 'FILM WIN BRANCO OPACO',
                'produto_codigo' => 'MP-TIN-007',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WUV4080-02',
                'x_prod' => 'FLEXO UV WIN BW8 PANTHER POWER BLACK',
                'produto_codigo' => 'MP-TIN-002',
            ],
            [
                'cnpj' => '16889258000120',
                'c_prod' => 'WUV8000',
                'x_prod' => 'FLEXO UV DOT WIN BRANCO OPACO',
                'produto_codigo' => 'MP-TIN-007',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'ESV10089-02',
                'x_prod' => 'ETISTAR VERSA STRONG BW5 PROCESS YELLOW',
                'produto_codigo' => 'MP-TIN-020',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'ESV30088-02',
                'x_prod' => 'ETISTAR VERSA STRONG BW4 PROCESS MAGENTA',
                'produto_codigo' => 'MP-TIN-019',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'ESV50088-02',
                'x_prod' => 'ETISTAR VERSA STRONG BW8 PROCESS CYAN',
                'produto_codigo' => 'MP-TIN-018',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'ESV80088-02',
                'x_prod' => 'ETISTAR VERSA STRONG BW8 PROCESS BLACK',
                'produto_codigo' => 'MP-TIN-003',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'UFC10082-02',
                'x_prod' => 'FLEXOCURE COLOUR BW4 PROCESS YELLOW',
                'produto_codigo' => 'MP-TIN-020',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'UFC80082-02',
                'x_prod' => 'FLEXOCURE COLOUR BW8 PROCESS BLACK',
                'produto_codigo' => 'MP-TIN-003',
            ],
            [
                'cnpj' => '02744462000149',
                'c_prod' => 'UPF00081-02',
                'x_prod' => 'VERNIZ UV PRIME COAT',
                'produto_codigo' => 'MP-TIN-024',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25394',
                'x_prod' => '63 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    1482 pc',
                'produto_codigo' => 'EMB-TUB-004',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25395',
                'x_prod' => '60 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    1560 pc',
                'produto_codigo' => 'EMB-TUB-005',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25396',
                'x_prod' => '55 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    1716 pc',
                'produto_codigo' => 'EMB-TUB-006',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25397',
                'x_prod' => '50 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    1872 pc',
                'produto_codigo' => 'EMB-TUB-007',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25398',
                'x_prod' => '41 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    2301 pc',
                'produto_codigo' => 'EMB-TUB-008',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25399',
                'x_prod' => '20 x 76,2 x 3 mm   Interno e ext semi-kraft personalizado    1185 pc',
                'produto_codigo' => 'EMB-TUB-009',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25400',
                'x_prod' => '25 x 76,2 x 3 mm   Interno e ext semi-kraft personalizado    945 pc',
                'produto_codigo' => 'EMB-TUB-010',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25426',
                'x_prod' => '60 x 25,7 x 2 mm   Interno e ext semi-kraft Neutro    1560 pc',
                'produto_codigo' => 'EMB-TUB-005',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25434',
                'x_prod' => '25 x 76,2 x 3 mm   Interno e ext semi-kraft personalizado    577 pc',
                'produto_codigo' => 'EMB-TUB-010',
            ],
            [
                'cnpj' => '12531813000197',
                'c_prod' => '25435',
                'x_prod' => '50 x 25,7 x 2 mm   Interno e ext semi-kraft personalizado    2112 pc',
                'produto_codigo' => 'EMB-TUB-007',
            ],
            [
                'cnpj' => '04207230000187',
                'c_prod' => 'PA1674',
                'x_prod' => 'Folhas para marcar a ferro UC75260E - COLD FOIL OURO GREENFOIL-1',
                'produto_codigo' => 'MP-CLD-001',
            ],
            [
                'cnpj' => '44022333000197',
                'c_prod' => 'LUX KPW XU 220',
                'x_prod' => 'LUX KPW XU 220 - 1000M X 610MM',
                'produto_codigo' => 'MP-CLD-003',
            ],
            [
                'cnpj' => '25328710000176',
                'c_prod' => 'PA000000000002',
                'x_prod' => 'PAPEL COUCHE L2 170G',
                'produto_codigo' => 'MP-PAP-012',
            ],
            [
                'cnpj' => '25328710000176',
                'c_prod' => 'PA000000000006',
                'x_prod' => 'PAPEL COUCHE L2 80G',
                'produto_codigo' => 'MP-PAP-010',
            ],
            [
                'cnpj' => '17681727000184',
                'c_prod' => '020040',
                'x_prod' => 'PERFECT CLEANER FLOTADOR (BB.5 L)',
                'produto_codigo' => 'MP-TIN-027',
            ],
        ];
    }
}
