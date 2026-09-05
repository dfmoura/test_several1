<?php

namespace App\Services\Cadastros;

/**
 * Catálogo canônico — Camada A (famílias fiscais) a cadastrar no ERP.
 *
 * Fonte única: trigger/32 LISTAGEM_PRODUTOS_CADASTRO.txt (07/08/2026)
 * Padrão: CODIFICACAO_INFORMACOES_SISTEMA.txt + CADASTRO_PRODUTOS_COMPRA.txt
 * Grupos: ProdutoGrupoCatalogData (MP-PAP, MP-FLM, …)
 *
 * Camada A = família fiscal (89 SKUs). Dimensão física da bobina = **volume**
 * (ADR_CADASTRO_INSUMO_VOLUME) — não Camada B por L×C no SKU Exact.
 *
 * Unidades (ADR-039-UNID-001): na Camada A comercial = interna = UN da listagem
 * e fator 1. Exact: ver ProdutoCadastroExactData (M2=M2).
 */
final class ProdutoCadastroCatalogData
{
    public const FONTE = 'trigger/32 LISTAGEM_PRODUTOS_CADASTRO.txt';

    public const TOTAL_FAMILIAS = 89;

    /**
     * @return list<array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   ncm: ?string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string
     * }>
     */
    public static function familias(): array
    {
        return [
            // ——— 1. Papéis autoadesivos — NCM 4811.41.90 ———
            self::row('MP-PAP-001', 'MP', 'MP-PAP', 'PAPEL FOSCO AUTOADESIVO COLACRIL ADC 1000', '48114190', '01', 'KG', '11', 'VAL', 'PAPEL_AUTO'),
            self::row('MP-PAP-002', 'MP', 'MP-PAP', 'PAPEL FOSCO AUTOADESIVO COLACRIL ADC 5240', '48114190', '01', 'KG', '11', 'VAL', 'PAPEL_AUTO'),
            self::row('MP-PAP-003', 'MP', 'MP-PAP', 'PAPEL COUCHE 20G AUTOADESIVO COLACRIL', '48114190', '01', 'KG', '10', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-004', 'MP', 'MP-PAP', 'PAPEL COUCHE 20G AUTOADESIVO FASSON', '48114190', '01', 'KG', '10', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-005', 'MP', 'MP-PAP', 'PAPEL COUCHE 20G AUTOADESIVO VERTEX', '48114190', '01', 'KG', '10', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-006', 'MP', 'MP-PAP', 'PAPEL COUCHE 30G AUTOADESIVO VERTEX', '48114190', '01', 'KG', '10', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-007', 'MP', 'MP-PAP', 'PAPEL COUCHE AUTOADESIVO RITRAMA', '48114190', '01', 'KG', '10', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-008', 'MP', 'MP-PAP', 'PAPEL TERMICO AUTOADESIVO COLACRIL', '48114190', '01', 'KG', '12', 'OK', 'PAPEL_AUTO'),
            self::row('MP-PAP-009', 'MP', 'MP-PAP', 'PAPEL TERMICO AUTOADESIVO FASSON', '48114190', '01', 'KG', '12', 'OK', 'PAPEL_AUTO'),

            // ——— 2. Tag / cartão sem adesivo — NCM 4810.13.89 ———
            self::row('MP-PAP-010', 'MP', 'MP-PAP', 'TAG COUCHE 80G', '48101389', '01', 'KG', '13', 'OK', 'TAG'),
            self::row('MP-PAP-011', 'MP', 'MP-PAP', 'TAG COUCHE 90G', '48101389', '01', 'KG', '13', 'OK', 'TAG'),
            self::row('MP-PAP-012', 'MP', 'MP-PAP', 'TAG COUCHE 170G', '48101389', '01', 'KG', '13', 'VAL', 'TAG'),

            // ——— 3. Filmes BOPP — NCM 3919.90.10 ———
            self::row('MP-FLM-001', 'MP', 'MP-FLM', 'BOPP BRILHO AUTOADESIVO COLACRIL BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-002', 'MP', 'MP-FLM', 'BOPP BRILHO AUTOADESIVO COLACRIL NBT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-003', 'MP', 'MP-FLM', 'BOPP BRILHO AUTOADESIVO RITRAMA', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-004', 'MP', 'MP-FLM', 'BOPP FOSCO AUTOADESIVO COLACRIL BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-005', 'MP', 'MP-FLM', 'BOPP FOSCO AUTOADESIVO FASSON 20G', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-006', 'MP', 'MP-FLM', 'BOPP FOSCO AUTOADESIVO FASSON 30G', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-007', 'MP', 'MP-FLM', 'BOPP FOSCO AUTOADESIVO RITRAMA', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-008', 'MP', 'MP-FLM', 'BOPP FOSCO AUTOADESIVO RITRAMA BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-009', 'MP', 'MP-FLM', 'BOPP METALIZADO AUTOADESIVO', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-010', 'MP', 'MP-FLM', 'BOPP METALIZADO AUTOADESIVO COLACRIL BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-011', 'MP', 'MP-FLM', 'BOPP TRANSPARENTE AUTOADESIVO COLACRIL BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-012', 'MP', 'MP-FLM', 'BOPP TRANSPARENTE AUTOADESIVO FASSON', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-013', 'MP', 'MP-FLM', 'BOPP TRANSPARENTE AUTOADESIVO RITRAMA', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),
            self::row('MP-FLM-014', 'MP', 'MP-FLM', 'BOPP TRANSPARENTE AUTOADESIVO RITRAMA BXT', '39199010', '01', 'M2', '20', 'OK', 'BOPP'),

            // ——— 4. Tecidos — NCM a confirmar ———
            self::row('MP-TEC-001', 'MP', 'MP-TEC', 'CETIM REF 6030301', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-002', 'MP', 'MP-TEC', 'CETIM REF 6030301 BEGE', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-003', 'MP', 'MP-TEC', 'CETIM REF 6030301 PEROLIZADO', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-004', 'MP', 'MP-TEC', 'CETIM BEGE', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-005', 'MP', 'MP-TEC', 'CETIM PEROLIZADO', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-006', 'MP', 'MP-TEC', 'CETIM PEROLIZADO BEGE', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-007', 'MP', 'MP-TEC', 'EMBORRACHADO REF 5090251', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-008', 'MP', 'MP-TEC', 'RESINADO REF 4010301', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-009', 'MP', 'MP-TEC', 'RESINADO IMPORTADO', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-010', 'MP', 'MP-TEC', 'RESINADO IMPORTADO BAIXA QUALIDADE', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-011', 'MP', 'MP-TEC', 'RESINADO PEROLIZADO', null, '01', 'M', '30', 'VAL', 'TECIDO'),
            self::row('MP-TEC-012', 'MP', 'MP-TEC', 'RESINADO VERDE', null, '01', 'M', '30', 'VAL', 'TECIDO'),

            // ——— 5. Laminação — NCM provisório 3919.90.90 ———
            self::row('MP-LAM-001', 'MP', 'MP-LAM', 'LAMINACAO', '39199090', '01', 'M2', '40', 'VAL', 'LAMINACAO'),
            self::row('MP-LAM-002', 'MP', 'MP-LAM', 'LAMINACAO BRILHO', '39199090', '01', 'M2', '40', 'VAL', 'LAMINACAO'),
            self::row('MP-LAM-003', 'MP', 'MP-LAM', 'LAMINACAO FOSCA', '39199090', '01', 'M2', '40', 'VAL', 'LAMINACAO'),

            // ——— 6. Cold / hot stamping ———
            self::row('MP-CLD-001', 'MP', 'MP-CLD', 'FOIL COLD OURO', '32121000', '01', 'RL', '41', 'OK', 'COLD'),
            self::row('MP-CLD-002', 'MP', 'MP-CLD', 'FOIL COLD PRATA', '32121000', '01', 'RL', '41', 'OK', 'COLD'),

            // ——— 7. Tintas e auxiliares ———
            self::row('MP-TIN-001', 'MP', 'MP-TIN', 'TINTA IMPRESSAO BLACK', '32151100', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-002', 'MP', 'MP-TIN', 'TINTA IMPRESSAO BLACK INTENSE', '32151100', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-003', 'MP', 'MP-TIN', 'TINTA IMPRESSAO PROCESS PRETO', '32151100', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-004', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA PRETO', '32151100', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-005', 'MP', 'MP-TIN', 'TINTA IMPRESSAO BLUE 072', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-006', 'MP', 'MP-TIN', 'TINTA IMPRESSAO BRANCO', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-007', 'MP', 'MP-TIN', 'TINTA IMPRESSAO BRANCO OPACO', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-008', 'MP', 'MP-TIN', 'TINTA IMPRESSAO CYAN', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-009', 'MP', 'MP-TIN', 'TINTA IMPRESSAO GOLD 871', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-010', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA AMARELO', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-011', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA AZUL 072', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-012', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA AZUL BLUE', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-013', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA BRANCO', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-014', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA MAGENTA', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-015', 'MP', 'MP-TIN', 'TINTA IMPRESSAO LACA VERMELHO', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-016', 'MP', 'MP-TIN', 'TINTA IMPRESSAO MAGENTA', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-017', 'MP', 'MP-TIN', 'TINTA IMPRESSAO METALIC GOLD', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-018', 'MP', 'MP-TIN', 'TINTA IMPRESSAO PROCESS CYAN', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-019', 'MP', 'MP-TIN', 'TINTA IMPRESSAO PROCESS MAGENTA', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-020', 'MP', 'MP-TIN', 'TINTA IMPRESSAO PROCESS YELLOW', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-021', 'MP', 'MP-TIN', 'TINTA IMPRESSAO VERMELHO', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-022', 'MP', 'MP-TIN', 'TINTA IMPRESSAO YELLOW', '32151900', '01', 'KG', '50', 'OK', 'TINTA'),
            self::row('MP-TIN-023', 'MP', 'MP-TIN', 'TINTA IMPRESSAO PANTONE (COR A DEFINIR)', '32151900', '01', 'KG', '50', 'VAL', 'TINTA'),
            self::row('MP-TIN-024', 'MP', 'MP-TIN', 'VERNIZ IMPRESSAO', null, '01', 'KG', '50', 'VAL', 'AUX_IMPRESSAO'),
            self::row('MP-TIN-025', 'MP', 'MP-TIN', 'DILUENTE', '38140090', '01', 'L', '50', 'VAL', 'AUX_IMPRESSAO'),
            self::row('MP-TIN-026', 'MP', 'MP-TIN', 'ANTIESPUMANTE', null, '01', 'L', '50', 'VAL', 'AUX_IMPRESSAO'),

            // ——— 8. Fitas dupla face ———
            self::row('MP-ADF-001', 'MP', 'MP-ADF', 'FITA DUPLA FACE REF 4880 100X30', '39191090', '01', 'RL', '72', 'VAL', 'DUPLA_FACE'),
            self::row('MP-ADF-002', 'MP', 'MP-ADF', 'FITA DUPLA FACE REF 52015 460X25', '39199090', '01', 'RL', '72', 'VAL', 'DUPLA_FACE'),
            self::row('MP-ADF-003', 'MP', 'MP-ADF', 'FITA DUPLA FACE REF 52017 460X25', '39199090', '01', 'RL', '72', 'VAL', 'DUPLA_FACE'),

            // ——— 9. Tubetes ———
            self::row('EMB-TUB-001', 'EMB', 'EMB-TUB', 'TUBETE 1"', '48229000', '02', 'UN', '70', 'OK', 'TUBETE'),
            self::row('EMB-TUB-002', 'EMB', 'EMB-TUB', 'TUBETE 1 1/2"', '48229000', '02', 'UN', '70', 'OK', 'TUBETE'),
            self::row('EMB-TUB-003', 'EMB', 'EMB-TUB', 'TUBETE 3"', '48229000', '02', 'UN', '70', 'OK', 'TUBETE'),

            // ——— 10. Caixas ———
            self::row('EMB-CX-001', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 200X150X120', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-002', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 250X200X200', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-003', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 250X250X200', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-004', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 300X300X317', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-005', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 400X300X223', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-006', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 460X360X340', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-007', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 500X300X300', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-008', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 500X400X300', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),
            self::row('EMB-CX-009', 'EMB', 'EMB-CX', 'CAIXA PAPELAO 540X405X335', '48191000', '02', 'UN', '71', 'OK', 'CAIXA'),

            // ——— 11. Ribbons (revenda) ———
            self::row('REV-RIB-001', 'REV', 'REV-RIB', 'RIBBON CERA 110MM X 74M', '96121000', '00', 'RL', '60', 'OK', 'RIBBON'),
            self::row('REV-RIB-002', 'REV', 'REV-RIB', 'RIBBON CERA 110MM X 300M', '96121000', '00', 'RL', '60', 'OK', 'RIBBON'),
            self::row('REV-RIB-003', 'REV', 'REV-RIB', 'RIBBON CERA 60MM X 450M', '96121000', '00', 'RL', '60', 'OK', 'RIBBON'),
            self::row('REV-RIB-004', 'REV', 'REV-RIB', 'RIBBON APR1 ZEBRA 110MM X 74M', '96121000', '00', 'RL', '60', 'OK', 'RIBBON'),
            self::row('REV-RIB-005', 'REV', 'REV-RIB', 'RIBBON AWR1 ZEBRA 110MM X 74M', '96121000', '00', 'RL', '60', 'OK', 'RIBBON'),
        ];
    }

    /**
     * Itens demo de venda/serviço (fora das 89 famílias de compra).
     * Mantêm fluxos ORC/PED/SVC no seed local sem poluir a listagem operacional.
     *
     * @return list<array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   descricao_comercial: ?string,
     *   ncm: ?string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   unidade_interna: string,
     *   fator_conversao: string,
     *   csosn: ?string,
     *   cfop_saida_padrao: ?string,
     *   preco_tabela: ?string,
     *   grupo_estoque: ?string
     * }>
     */
    public static function demosVenda(): array
    {
        return [
            [
                'codigo' => 'PA-ETQ-001',
                'familia' => 'PA',
                'grupo' => 'PA-ETQ',
                'descricao_fiscal' => 'ETIQUETAS BOPP',
                'descricao_comercial' => 'Etiquetas em filme plástico autoadesivo',
                'ncm' => '39191090',
                'tipo_item_sped' => '04',
                'unidade_comercial' => 'MIL',
                'unidade_interna' => 'MIL',
                'fator_conversao' => '1',
                'csosn' => '102',
                'cfop_saida_padrao' => '5101',
                'preco_tabela' => '180.000000',
                'grupo_estoque' => '80',
            ],
            [
                'codigo' => 'SVC-001',
                'familia' => 'SVC',
                'grupo' => 'SVC',
                'descricao_fiscal' => 'REBOBINACAO / ACERTO DE BOBINA',
                'descricao_comercial' => null,
                'ncm' => null,
                'tipo_item_sped' => '09',
                'unidade_comercial' => 'UN',
                'unidade_interna' => 'UN',
                'fator_conversao' => '1',
                'csosn' => '400',
                'cfop_saida_padrao' => null,
                'preco_tabela' => '250.000000',
                'grupo_estoque' => null,
            ],
        ];
    }

    /**
     * @return array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   ncm: ?string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string
     * }
     */
    private static function row(
        string $codigo,
        string $familia,
        string $grupo,
        string $descricao,
        ?string $ncm,
        string $tipo,
        string $un,
        string $grupoEstoque,
        string $sit,
        string $listagemGrupo,
    ): array {
        return [
            'codigo' => $codigo,
            'familia' => $familia,
            'grupo' => $grupo,
            'descricao_fiscal' => $descricao,
            'ncm' => $ncm,
            'tipo_item_sped' => $tipo,
            'unidade_comercial' => $un,
            'grupo_estoque' => $grupoEstoque,
            'ncm_situacao' => $sit,
            'listagem_grupo' => $listagemGrupo,
        ];
    }
}
