<?php

namespace App\Support;

/**
 * Espelho da regra de UI de dimensões de bobina (ADR-039-UNID-001 + ADR-043-CAD-001).
 *
 * A UI React usa a mesma decisão em `produtoBobinaDimensoesUi.ts`.
 * Este helper trava o contrato em teste PHP sem acoplar ao front.
 *
 * `exige_dimensao_sku` = oferece seção de dimensões **nominais** (conversão/OC),
 * não identidade L×C do SKU (Exact/variável → volume na entrada).
 */
final class ProdutoBobinaDimensoes
{
    public const ATTR_KEYS = ['largura_mm', 'comprimento_m', 'gramatura_g_m2'];

    /**
     * Grupos canônicos que abrem dimensões nominais de bobina.
     *
     * @return list<string>
     */
    public static function gruposQueExigemDimensao(): array
    {
        return [
            'MP-PAP',
            'MP-FLM',
            'MP-TEC',
            'MP-LAM',
            'MP-CLD',
            'MP-ADF',
            'MP-RET',
            'PA-BOB',
        ];
    }

    /**
     * Grupos que NÃO devem abrir a seção de bobina por padrão.
     *
     * @return list<string>
     */
    public static function gruposSemDimensao(): array
    {
        return [
            'MP-TIN',
            'EMB-TUB',
            'EMB-CX',
            'REV-RIB',
            'PA-ETQ',
            'SVC',
            'FAC',
        ];
    }

    /**
     * @param  list<string>  $faltando
     * @return array{
     *   show_section: bool,
     *   mode: string,
     *   show_largura: bool,
     *   show_comprimento: bool,
     *   show_gramatura: bool
     * }
     */
    public static function decide(
        bool $exigeDimensaoSku,
        ?string $larguraMm,
        ?string $comprimentoM,
        ?string $gramaturaGm2,
        array $faltando = []
    ): array {
        $filledL = self::filled($larguraMm);
        $filledC = self::filled($comprimentoM);
        $filledG = self::filled($gramaturaGm2);

        if ($exigeDimensaoSku) {
            return [
                'show_section' => true,
                'mode' => 'grupo',
                'show_largura' => true,
                'show_comprimento' => true,
                'show_gramatura' => true,
            ];
        }

        $faltandoBobina = array_values(array_intersect($faltando, self::ATTR_KEYS));
        if ($faltandoBobina !== []) {
            return [
                'show_section' => true,
                'mode' => 'formula',
                'show_largura' => in_array('largura_mm', $faltandoBobina, true) || $filledL,
                'show_comprimento' => in_array('comprimento_m', $faltandoBobina, true) || $filledC,
                'show_gramatura' => in_array('gramatura_g_m2', $faltandoBobina, true) || $filledG,
            ];
        }

        if ($filledL || $filledC || $filledG) {
            return [
                'show_section' => true,
                'mode' => 'legado',
                'show_largura' => $filledL,
                'show_comprimento' => $filledC,
                'show_gramatura' => $filledG,
            ];
        }

        return [
            'show_section' => false,
            'mode' => 'oculto',
            'show_largura' => false,
            'show_comprimento' => false,
            'show_gramatura' => false,
        ];
    }

    private static function filled(?string $value): bool
    {
        return $value !== null && trim($value) !== '';
    }
}
