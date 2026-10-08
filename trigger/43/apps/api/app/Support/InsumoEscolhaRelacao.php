<?php

namespace App\Support;

/**
 * Relação entre a necessidade aprovada na OP e o SKU físico em estoque.
 * Tubete: a polegada do ORC (1" / 1 1/2" / 3"). Caixa: a sequência da medida.
 */
final class InsumoEscolhaRelacao
{
    public static function chavePolegada(?string $raw): ?string
    {
        $t = trim((string) $raw);
        if ($t === '') {
            return null;
        }
        $t = str_replace(['″', '”', '“'], '"', $t);
        $fold = mb_strtoupper($t, 'UTF-8');

        if (preg_match('/1\s*1\s*\/\s*2|1[,.]\s*5/', $t) === 1) {
            return '1.5';
        }
        if (preg_match('/(?<![0-9])3\s*(?:"|POL)/u', $fold) === 1 || preg_match('/^3\s*"?$/', trim($t)) === 1) {
            return '3';
        }
        if (preg_match('/(?<![0-9])1\s*(?:"|POL)/u', $fold) === 1 || preg_match('/^1\s*"?$/', trim($t)) === 1) {
            return '1';
        }
        if (preg_match('/(?<![0-9])76\s*MM/', $fold) === 1) {
            return '3';
        }
        if (preg_match('/(?<![0-9])40\s*MM/', $fold) === 1) {
            return '1.5';
        }
        if (preg_match('/(?<![0-9])25\s*MM/', $fold) === 1) {
            return '1';
        }

        return null;
    }

    public static function rotuloPolegada(?string $raw): ?string
    {
        return match (self::chavePolegada($raw)) {
            '1' => '1"',
            '1.5' => '1 1/2"',
            '3' => '3"',
            default => null,
        };
    }

    public static function caixaCompativel(string $medidaAprovada, string $textoProduto): bool
    {
        $precisa = self::gruposMedida($medidaAprovada);
        if ($precisa === []) {
            return false;
        }
        $tem = self::gruposMedida($textoProduto);
        $n = count($precisa);
        $m = count($tem);
        if ($m < $n) {
            return false;
        }
        for ($i = 0; $i <= $m - $n; $i++) {
            $ok = true;
            for ($j = 0; $j < $n; $j++) {
                if ($tem[$i + $j] !== $precisa[$j]) {
                    $ok = false;
                    break;
                }
            }
            if ($ok) {
                return true;
            }
        }

        return false;
    }

    /** Medida da caixa no mesmo papel da polegada do tubete: 500x300x300. */
    public static function rotuloMedidaCaixa(string $medidaAprovada, string $textoProduto = ''): ?string
    {
        $aprovada = self::gruposMedida($medidaAprovada);
        $doProduto = self::gruposMedida($textoProduto);
        if ($aprovada !== [] && $doProduto !== [] && self::caixaCompativel($medidaAprovada, $textoProduto)) {
            $n = count($aprovada);
            $m = count($doProduto);
            for ($i = 0; $i <= $m - $n; $i++) {
                $ok = true;
                for ($j = 0; $j < $n; $j++) {
                    if ($doProduto[$i + $j] !== $aprovada[$j]) {
                        $ok = false;
                        break;
                    }
                }
                if ($ok) {
                    $comprimento = $n < 3 && $i + $n < $m ? $n + 1 : $n;

                    return implode('x', array_slice($doProduto, $i, $comprimento));
                }
            }
        }
        if (count($aprovada) >= 2) {
            return implode('x', $aprovada);
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private static function gruposMedida(string $texto): array
    {
        preg_match_all('/\d+/', $texto, $m);

        return array_map(static fn ($n) => (string) $n, $m[0] ?? []);
    }
}
