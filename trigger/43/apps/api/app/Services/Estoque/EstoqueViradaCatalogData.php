<?php

namespace App\Services\Estoque;

/**
 * Saldos de abertura (virada) — Camada A ↔ consolidado estudo 32.
 *
 * Fonte: trigger/32 CONSOLIDADO_PRODUTOS_ESTOQUE.txt (planilha ESTOQUE DE PAPEIS).
 * Motivo canônico: A03 (saldo inicial / implantação ERP) — AJUSTE_ESTOQUE_INVENTARIO §5
 * + estrategia_implantacao_ja.txt (estoque na data da virada).
 *
 * Unidades: Camada A ainda não tem bobina (largura×comprimento). Onde o consolidado
 * fala em rolos/bobinas e o cadastro usa KG/M2, a qtde é a magnitude do consolidado
 * na unidade_interna já cadastrada — sem inventar conversão dimensional (ADR unidades).
 * Tecidos/tubetes/caixas/cold/dupla-face: unidade do consolidado = unidade do cadastro.
 */
final class EstoqueViradaCatalogData
{
    public const FONTE = 'trigger/32 CONSOLIDADO_PRODUTOS_ESTOQUE.txt';

    /**
     * Itens com saldo > 0 no consolidado, mapeados ao código Camada A.
     *
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }>
     */
    public static function abertura(): array
    {
        return [
            // ——— Papéis / tag (consolidado: rolos) ———
            self::row('MP-PAP-001', '8', '2', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-002', '60', '12', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-003', '75', '15', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-004', '312', '60', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-005', '1', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-006', '35', '8', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-007', '3', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-008', '2', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-009', '85', '20', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-010', '14', '4', 'rolos→unidade_interna Camada A'),
            self::row('MP-PAP-011', '26', '6', 'rolos→unidade_interna Camada A'),
            // MP-PAP-012 TAG 170G = 0 no consolidado — omitido

            // ——— BOPP (consolidado: rolos) ———
            self::row('MP-FLM-001', '29', '6', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-002', '9', '2', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-003', '27', '6', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-004', '40', '8', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-005', '88', '18', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-006', '5', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-007', '8', '2', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-008', '24', '5', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-009', '5', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-010', '28', '6', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-011', '6', '2', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-012', '5', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-013', '1', '1', 'rolos→unidade_interna Camada A'),
            self::row('MP-FLM-014', '8', '2', 'rolos→unidade_interna Camada A'),

            // ——— Tecidos (consolidado: metros = UN M) ———
            self::row('MP-TEC-001', '8800', '1500', 'metros (consolidado)'),
            self::row('MP-TEC-002', '2100', '400', 'metros (consolidado)'),
            self::row('MP-TEC-003', '2550', '500', 'metros (consolidado)'),
            self::row('MP-TEC-004', '3500', '700', 'metros (consolidado)'),
            self::row('MP-TEC-005', '2050', '400', 'metros (consolidado)'),
            self::row('MP-TEC-006', '2150', '400', 'metros (consolidado)'),
            self::row('MP-TEC-007', '13670', '2500', 'metros (consolidado)'),
            self::row('MP-TEC-008', '18730', '3500', 'metros (consolidado)'),
            // resinados importados / perolizado / verde = 0 — omitidos

            // ——— Laminação (consolidado: rolos) ———
            self::row('MP-LAM-002', '118', '24', 'rolos→unidade_interna Camada A'),
            self::row('MP-LAM-003', '12', '3', 'rolos→unidade_interna Camada A'),
            // MP-LAM-001 = 0 — omitido

            // ——— Cold (bobinas = RL) ———
            self::row('MP-CLD-001', '23', '5', 'bobinas (consolidado)'),
            self::row('MP-CLD-002', '8', '2', 'bobinas (consolidado)'),

            // ——— Dupla face (RL) ———
            self::row('MP-ADF-001', '7', '2', 'consolidado'),
            self::row('MP-ADF-002', '1', '1', 'consolidado'),
            self::row('MP-ADF-003', '1', '1', 'consolidado'),

            // ——— Tubetes (UN) ———
            self::row('EMB-TUB-001', '70396', '10000', 'unidades (consolidado)'),
            self::row('EMB-TUB-002', '4890', '800', 'unidades (consolidado)'),
            self::row('EMB-TUB-003', '27300.5000', '5000', 'unidades (consolidado)'),

            // ——— Caixas (UN) ———
            self::row('EMB-CX-001', '325', '80', 'unidades (consolidado)'),
            self::row('EMB-CX-002', '575', '120', 'unidades (consolidado)'),
            self::row('EMB-CX-003', '250', '60', 'unidades (consolidado)'),
            self::row('EMB-CX-004', '350', '80', 'unidades (consolidado)'),
            self::row('EMB-CX-005', '670', '140', 'unidades (consolidado)'),
            self::row('EMB-CX-006', '540', '110', 'unidades (consolidado)'),
            self::row('EMB-CX-007', '550', '110', 'unidades (consolidado)'),
            self::row('EMB-CX-008', '460', '90', 'unidades (consolidado)'),
            // EMB-CX-009 = 0 — omitido
        ];
    }

    /**
     * Tintas/auxiliares — consolidado 32 = 0 kg (não inventar como se fosse a planilha).
     *
     * Homolog/local precisa de saldo para exercitar lote + validade + FEFO (estudo §6.2/§7.1).
     * Quantidades: abertura operacional típica de flexo (ABC), na unidade_interna do cadastro
     * (KG tinta/verniz · L diluente/antiespumante). Na virada de produção, substituir pela
     * contagem física A03 — este catálogo não é o consolidado.
     *
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }>
     */
    public static function aberturaTintas(): array
    {
        $nota = 'abertura operacional homolog (consolidado tinta=0)';

        return [
            // Classe A — process / branco / preto (qtde ≥ 10 → 2 lotes FEFO)
            self::row('MP-TIN-001', '15', '5', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-003', '10', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-006', '14', '4', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-008', '12', '4', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-016', '12', '4', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-018', '10', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-019', '10', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-020', '10', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-022', '12', '4', $nota, 'abertura_operacional_tinta'),

            // Classe B — spot / especial
            self::row('MP-TIN-002', '8', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-005', '8', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-007', '8', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-009', '6', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-017', '6', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-021', '8', '3', $nota, 'abertura_operacional_tinta'),

            // Lacas (NCM VAL na 1ª NF) — giro menor
            self::row('MP-TIN-004', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-010', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-011', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-012', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-013', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-014', '5', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-015', '5', '2', $nota, 'abertura_operacional_tinta'),

            // Classe C + auxiliares (Pantone a definir; verniz KG; diluente/antiespumante L)
            self::row('MP-TIN-023', '3', '1', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-024', '8', '3', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-025', '6', '2', $nota, 'abertura_operacional_tinta'),
            self::row('MP-TIN-026', '4', '1', $nota, 'abertura_operacional_tinta'),
        ];
    }

    /**
     * Ribbons sintéticos (itens novos no cadastro, fora do consolidado).
     * Só entram com --incluir-demos.
     *
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }>
     */
    public static function demosTeste(): array
    {
        return [
            self::row('REV-RIB-001', '42', '10', 'demo teste (estrategia_implantacao_ja exemplo)', 'demo_teste'),
            self::row('REV-RIB-002', '18', '5', 'demo teste REV', 'demo_teste'),
            self::row('REV-RIB-003', '25', '8', 'demo teste REV', 'demo_teste'),
        ];
    }

    /**
     * Catálogo da virada: consolidado (>0) + tintas operacionais; demos opcionais.
     *
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }>
     */
    public static function catalogo(bool $incluirDemos = false): array
    {
        $rows = array_merge(self::abertura(), self::aberturaTintas());
        if ($incluirDemos) {
            $rows = array_merge($rows, self::demosTeste());
        }

        return $rows;
    }

    /**
     * @return array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }
     */
    private static function row(
        string $codigo,
        string $qtde,
        ?string $minimo,
        string $nota,
        string $fonte = 'consolidado_32',
    ): array {
        return [
            'codigo' => $codigo,
            'qtde' => $qtde,
            'minimo' => $minimo,
            'fonte' => $fonte,
            'nota' => $nota,
        ];
    }
}
