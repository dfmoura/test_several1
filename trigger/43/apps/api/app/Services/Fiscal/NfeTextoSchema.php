<?php

namespace App\Services\Fiscal;

/**
 * Texto do XML da NF-e (TString): do espaço ao ÿ.
 * Travessão, aspas curvas e reticências quebram o schema (cStat 225).
 */
final class NfeTextoSchema
{
    /** @var array<string, string> */
    private const TROCAS = [
        "\u{2014}" => '-',
        "\u{2013}" => '-',
        "\u{2212}" => '-',
        "\u{2018}" => "'",
        "\u{2019}" => "'",
        "\u{201A}" => "'",
        "\u{201C}" => '"',
        "\u{201D}" => '"',
        "\u{201E}" => '"',
        "\u{2026}" => '...',
        "\u{00A0}" => ' ',
        "\u{2192}" => '-',
    ];

    public static function texto(string $valor): string
    {
        $texto = strtr($valor, self::TROCAS);
        $limpo = preg_replace_callback('/./u', static function (array $m): string {
            $ord = mb_ord($m[0]);
            if ($ord === 0x20 || ($ord >= 0x21 && $ord <= 0xFF)) {
                return $m[0];
            }

            return '';
        }, $texto) ?? $texto;
        $limpo = preg_replace('/ {2,}/u', ' ', $limpo) ?? $limpo;

        return trim($limpo);
    }
}
