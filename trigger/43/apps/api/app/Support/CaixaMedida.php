<?php

namespace App\Support;

/**
 * Medida nominal da caixa de papelão (EMB-CX).
 *
 * Três lados em mm no JSON do SKU — a mesma identidade do nome
 * (250×200×200). Não é cubagem, peso nem escolha de caixa no orçamento.
 */
final class CaixaMedida
{
    public const COMP = 'comp_mm';

    public const LARG = 'larg_mm';

    public const ALT = 'alt_mm';

    /** @var list<string> */
    public const KEYS = [self::COMP, self::LARG, self::ALT];

    /**
     * SKUs canônicos do catálogo de compra (ordem do nome fiscal).
     *
     * @var array<string, array{0: int, 1: int, 2: int}>
     */
    public const CANONICAS = [
        'EMB-CX-001' => [200, 150, 120],
        'EMB-CX-002' => [250, 200, 200],
        'EMB-CX-003' => [250, 250, 200],
        'EMB-CX-004' => [300, 300, 317],
        'EMB-CX-005' => [400, 300, 223],
        'EMB-CX-006' => [460, 360, 340],
        'EMB-CX-007' => [500, 300, 300],
        'EMB-CX-008' => [500, 400, 300],
        'EMB-CX-009' => [540, 405, 335],
    ];

    /**
     * @return array{comp_mm: string, larg_mm: string, alt_mm: string}|null
     */
    public static function atributosDoCodigo(string $codigo): ?array
    {
        $t = self::CANONICAS[$codigo] ?? null;
        if ($t === null) {
            return null;
        }

        return [
            self::COMP => (string) $t[0],
            self::LARG => (string) $t[1],
            self::ALT => (string) $t[2],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $atributos
     * @return array{comp_mm: string, larg_mm: string, alt_mm: string}|null
     */
    public static function fromAtributos(?array $atributos): ?array
    {
        if ($atributos === null) {
            return null;
        }
        $comp = self::normalizarMm($atributos[self::COMP] ?? null);
        $larg = self::normalizarMm($atributos[self::LARG] ?? null);
        $alt = self::normalizarMm($atributos[self::ALT] ?? null);
        if ($comp === null || $larg === null || $alt === null) {
            return null;
        }

        return [
            self::COMP => $comp,
            self::LARG => $larg,
            self::ALT => $alt,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $atributos
     */
    public static function rotulo(?array $atributos): ?string
    {
        $m = self::fromAtributos($atributos);
        if ($m === null) {
            return null;
        }

        return self::lado($m[self::COMP]).'x'.self::lado($m[self::LARG]).'x'.self::lado($m[self::ALT]);
    }

    /**
     * Casa a tripla do SKU com a medida aprovada (ex.: 500x300x300).
     *
     * null = SKU sem as três medidas, ou a aprovação não tem três lados:
     * o chamador segue no texto do nome. false = a tripla existe e não é esta caixa.
     *
     * @param  array<string, mixed>|null  $atributos
     */
    public static function casaAtributos(?array $atributos, string $medidaAprovada): ?bool
    {
        $doSku = self::fromAtributos($atributos);
        if ($doSku === null) {
            return null;
        }
        $daMedida = self::ladosDaMedida($medidaAprovada);
        if (count($daMedida) !== 3) {
            return null;
        }

        $a = [$doSku[self::COMP], $doSku[self::LARG], $doSku[self::ALT]];
        sort($a, SORT_STRING);
        sort($daMedida, SORT_STRING);

        return $a === $daMedida;
    }

    public static function normalizarMm(mixed $raw): ?string
    {
        $canonical = PadraoDecimal::parse($raw);
        if ($canonical === null || ! PadraoDecimal::hasValidScale($canonical, PadraoDecimal::SCALE_DIM)) {
            return null;
        }
        $mm = PadraoDecimal::roundHalfUp($canonical, PadraoDecimal::SCALE_DIM);
        if (bccomp($mm, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return null;
        }

        return $mm;
    }

    /**
     * @return list<string>
     */
    private static function ladosDaMedida(string $medida): array
    {
        if (preg_match_all('/\d+(?:[.,]\d+)?/', $medida, $m) === false || ($m[0] ?? []) === []) {
            return [];
        }
        $out = [];
        foreach ($m[0] ?? [] as $parte) {
            $mm = self::normalizarMm($parte);
            if ($mm === null) {
                return [];
            }
            $out[] = $mm;
        }

        return $out;
    }

    private static function lado(string $mm): string
    {
        $n = rtrim(rtrim($mm, '0'), '.');

        return $n === '' ? '0' : $n;
    }
}
