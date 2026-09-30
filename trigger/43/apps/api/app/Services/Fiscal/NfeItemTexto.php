<?php

namespace App\Services\Fiscal;

/**
 * xProd e texto de tributos da NF-e.
 * A descrição identifica o item do pedido; embalagem e tributos ficam fora dela.
 */
final class NfeItemTexto
{
    public static function xProd(?string $fiscal, ?string $linha, ?string $codigo = null): string
    {
        $fiscal = trim((string) $fiscal);
        $linha = self::limparLinha($linha, $codigo);
        if ($fiscal === '') {
            return mb_substr($linha, 0, 120);
        }
        if ($linha === '' || self::equivale($fiscal, $linha)) {
            return mb_substr($fiscal, 0, 120);
        }
        if (self::contem($linha, $fiscal)) {
            return mb_substr($linha, 0, 120);
        }

        return mb_substr($fiscal.' · '.$linha, 0, 120);
    }

    public static function complementoTributos(int $crt): string
    {
        if (in_array($crt, [1, 4], true)) {
            return 'ICMS CSOSN '.FiscalSaidaDefaults::CSOSN_SIMPLES
                .' · PIS CST '.FiscalSaidaDefaults::CST_PIS
                .' · COFINS CST '.FiscalSaidaDefaults::CST_COFINS;
        }

        return 'ICMS CST 40 isento'
            .' · PIS CST '.FiscalSaidaDefaults::CST_PIS
            .' · COFINS CST '.FiscalSaidaDefaults::CST_COFINS
            .' · IBS UF 0,10% · IBS mun 0% · CBS 0,90% (por fora do valor da nota)';
    }

    private static function limparLinha(?string $linha, ?string $codigo): string
    {
        $t = trim((string) $linha);
        $t = preg_replace('/\s*·\s*Q\s+[\d.]+$/u', '', $t) ?? $t;
        $codigo = trim((string) $codigo);
        if ($codigo !== '') {
            $q = preg_quote($codigo, '/');
            $t = preg_replace('/^'.$q.'\s*·\s*/u', '', $t) ?? $t;
        }

        return trim($t);
    }

    private static function equivale(string $a, string $b): bool
    {
        return mb_strtoupper($a) === mb_strtoupper($b);
    }

    private static function contem(string $haystack, string $needle): bool
    {
        return mb_stripos($haystack, $needle) !== false;
    }
}
