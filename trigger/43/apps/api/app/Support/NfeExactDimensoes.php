<?php

namespace App\Support;

/**
 * Dimensão real de bobina Exact a partir de infAdProd (ADR_CADASTRO_INSUMO_VOLUME F2.1).
 *
 * Padrão Avery: `4x205x1000`, `1x215x900 | 1x215x1050 | 4x215x1000`.
 * Área m² = (largura_mm / 1000) × comprimento_m — casa com qLote do rastro.
 */
final class NfeExactDimensoes
{
    /**
     * Expande slots N×L×C em lista de dimensões unitárias.
     *
     * @return list<array{largura_mm: string, comprimento_m: string, area_m2: string}>
     */
    public static function expandirSlots(?string $infAdProd): array
    {
        if ($infAdProd === null || trim($infAdProd) === '') {
            return [];
        }

        if (! preg_match_all(
            '/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/iu',
            $infAdProd,
            $matches,
            PREG_SET_ORDER
        )) {
            return [];
        }

        $slots = [];
        foreach ($matches as $m) {
            $n = (int) $m[1];
            if ($n < 1 || $n > 500) {
                continue;
            }
            $larguraRaw = str_replace(',', '.', $m[2]);
            $comprimentoRaw = str_replace(',', '.', $m[3]);
            $largura = PadraoDecimal::roundHalfUp($larguraRaw, PadraoDecimal::SCALE_DIM);
            $comprimento = PadraoDecimal::roundHalfUp($comprimentoRaw, PadraoDecimal::SCALE_DIM);
            if (bccomp($largura, '0', PadraoDecimal::SCALE_DIM) <= 0
                || bccomp($comprimento, '0', PadraoDecimal::SCALE_DIM) <= 0) {
                continue;
            }
            $area = self::areaM2($largura, $comprimento);
            for ($i = 0; $i < $n; $i++) {
                $slots[] = [
                    'largura_mm' => $largura,
                    'comprimento_m' => $comprimento,
                    'area_m2' => $area,
                ];
            }
        }

        return $slots;
    }

    public static function areaM2(string $larguraMm, string $comprimentoM): string
    {
        $larguraM = bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_QTY + 6);

        return PadraoDecimal::roundHalfUp(
            bcmul($larguraM, $comprimentoM, PadraoDecimal::SCALE_QTY + 6),
            PadraoDecimal::SCALE_QTY
        );
    }

    public static function comprimentoFromArea(string $qtdeM2, string $larguraMm): ?string
    {
        if (bccomp($qtdeM2, '0', PadraoDecimal::SCALE_QTY) <= 0
            || bccomp($larguraMm, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return null;
        }
        $larguraM = bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_DIM + 6);

        return PadraoDecimal::roundHalfUp(
            bcdiv($qtdeM2, $larguraM, PadraoDecimal::SCALE_DIM + 4),
            PadraoDecimal::SCALE_DIM
        );
    }

    /**
     * Heurística legado: "60 MM" em xProd ou sufixo numérico do cProd Exact (…110060).
     */
    public static function sugerirLarguraMm(?string $xProd, ?string $cProd): ?string
    {
        if (is_string($xProd) && preg_match('/\b(\d{2,4})\s*MM\b/i', $xProd, $m)) {
            return PadraoDecimal::roundHalfUp($m[1], PadraoDecimal::SCALE_DIM);
        }
        if (is_string($cProd) && preg_match('/(\d{2,3})$/', $cProd, $m)) {
            $n = (int) $m[1];
            if ($n >= 10 && $n <= 500) {
                return PadraoDecimal::roundHalfUp((string) $n, PadraoDecimal::SCALE_DIM);
            }
        }

        return null;
    }

    /**
     * Amarras 1:1 slot Exact → volume por área (qtde). Fallback: heurística L + deriva C.
     *
     * @param  list<array<string, mixed>>  $volumes
     * @return list<array<string, mixed>>
     */
    public static function amarrarVolumes(
        array $volumes,
        ?string $infAdProd,
        ?string $xProd = null,
        ?string $cProd = null,
    ): array {
        $slots = self::expandirSlots($infAdProd);
        $used = array_fill(0, count($slots), false);
        $fallbackLargura = self::sugerirLarguraMm($xProd, $cProd);

        foreach ($volumes as $i => $vol) {
            $qtde = PadraoDecimal::roundHalfUp(
                (string) ($vol['qtde'] ?? '0'),
                PadraoDecimal::SCALE_QTY
            );
            $matched = false;

            foreach ($slots as $sIdx => $slot) {
                if ($used[$sIdx] ?? false) {
                    continue;
                }
                if (bccomp($qtde, $slot['area_m2'], PadraoDecimal::SCALE_QTY) === 0) {
                    $volumes[$i]['largura_mm'] = $slot['largura_mm'];
                    $volumes[$i]['comprimento_m'] = $slot['comprimento_m'];
                    $used[$sIdx] = true;
                    $matched = true;
                    break;
                }
            }

            if ($matched) {
                continue;
            }

            if ($fallbackLargura !== null) {
                $volumes[$i]['largura_mm'] = $fallbackLargura;
                $volumes[$i]['comprimento_m'] = self::comprimentoFromArea($qtde, $fallbackLargura);
            } else {
                $volumes[$i]['largura_mm'] = $vol['largura_mm'] ?? null;
                $volumes[$i]['comprimento_m'] = $vol['comprimento_m'] ?? null;
            }
        }

        return $volumes;
    }

    /**
     * @param  list<array<string, mixed>>  $volumes
     */
    public static function algumSemDimensao(array $volumes): bool
    {
        foreach ($volumes as $vol) {
            $l = $vol['largura_mm'] ?? null;
            $c = $vol['comprimento_m'] ?? null;
            if ($l === null || $l === '' || $c === null || $c === '') {
                return true;
            }
        }

        return false;
    }
}
