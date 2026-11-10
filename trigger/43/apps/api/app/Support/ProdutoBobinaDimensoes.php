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
 *
 * Progressive disclosure: Exact/filme/laminação/retalho escondem L×C por padrão;
 * TEC/CLD/ADF mantêm largura (identifica o material); comprimento no volume.
 */
final class ProdutoBobinaDimensoes
{
    public const ATTR_KEYS = ['largura_mm', 'comprimento_m', 'gramatura_g_m2'];

    /** @var list<string> */
    public const GRUPOS_VOLUME_VARIAVEL = [
        'MP-PAP',
        'MP-FLM',
        'MP-LAM',
        'MP-RET',
        'PA-BOB',
    ];

    /** @var list<string> */
    public const GRUPOS_LARGURA_IDENTIFICA = [
        'MP-TEC',
        'MP-CLD',
        'MP-ADF',
    ];

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

    public static function perfilDoGrupo(?string $grupoCodigo): string
    {
        $g = strtoupper(trim((string) $grupoCodigo));
        if (in_array($g, self::GRUPOS_LARGURA_IDENTIFICA, true)) {
            return 'largura_identifica';
        }
        if (in_array($g, self::GRUPOS_VOLUME_VARIAVEL, true)) {
            return 'volume_variavel';
        }

        return 'desconhecido';
    }

    /**
     * @param  list<string>  $faltando
     * @return array{
     *   show_section: bool,
     *   mode: string,
     *   show_programa: bool,
     *   show_largura: bool,
     *   show_comprimento: bool,
     *   show_gramatura: bool,
     *   perfil: ?string,
     *   pode_expandir_referencia: bool
     * }
     */
    public static function decide(
        bool $exigeDimensaoSku,
        ?string $larguraMm,
        ?string $comprimentoM,
        ?string $gramaturaGm2,
        array $faltando = [],
        ?string $grupoCodigo = null,
        bool $expandirReferencia = false
    ): array {
        $filledL = self::filled($larguraMm);
        $filledC = self::filled($comprimentoM);
        $filledG = self::filled($gramaturaGm2);

        $faltandoBobina = array_values(array_intersect($faltando, self::ATTR_KEYS));
        $needL = in_array('largura_mm', $faltandoBobina, true) || $filledL;
        $needC = in_array('comprimento_m', $faltandoBobina, true) || $filledC;
        $needG = in_array('gramatura_g_m2', $faltandoBobina, true) || $filledG;

        if ($exigeDimensaoSku) {
            $perfil = self::perfilDoGrupo($grupoCodigo);
            $defaultLargura = $perfil === 'largura_identifica';

            $showL = $defaultLargura || $needL || $expandirReferencia;
            $showC = $needC || $expandirReferencia;
            $showG = $needG || $expandirReferencia;

            $podeExpandir = ! $expandirReferencia && (
                (! $defaultLargura && ! $needL)
                || ! $needC
                || ! $needG
            );

            return [
                'show_section' => true,
                'mode' => 'grupo',
                'show_programa' => true,
                'show_largura' => $showL,
                'show_comprimento' => $showC,
                'show_gramatura' => $showG,
                'perfil' => $perfil,
                'pode_expandir_referencia' => $podeExpandir,
            ];
        }

        if ($faltandoBobina !== []) {
            return [
                'show_section' => true,
                'mode' => 'formula',
                'show_programa' => false,
                'show_largura' => $needL,
                'show_comprimento' => $needC,
                'show_gramatura' => $needG,
                'perfil' => null,
                'pode_expandir_referencia' => false,
            ];
        }

        if ($filledL || $filledC || $filledG) {
            return [
                'show_section' => true,
                'mode' => 'legado',
                'show_programa' => false,
                'show_largura' => $filledL,
                'show_comprimento' => $filledC,
                'show_gramatura' => $filledG,
                'perfil' => null,
                'pode_expandir_referencia' => false,
            ];
        }

        return [
            'show_section' => false,
            'mode' => 'oculto',
            'show_programa' => false,
            'show_largura' => false,
            'show_comprimento' => false,
            'show_gramatura' => false,
            'perfil' => null,
            'pode_expandir_referencia' => false,
        ];
    }

    private static function filled(?string $value): bool
    {
        return $value !== null && trim($value) !== '';
    }
}
