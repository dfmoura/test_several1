<?php

namespace App\Support;

/**
 * Estações de cor do ORC (motor + UI).
 *
 * `0` = lisa / sem impressão — valor canônico informado, não “ausente”.
 * Espelha `CORES_OPCOES` em apps/web/src/lib/orcamentoForm.ts.
 */
final class OrcamentoCores
{
    /** @var list<string> */
    public const VALORES = ['0', '1', '2', '3', '4', '4V', '5', '6', '7', '8'];

    /**
     * Chave canônica ou null se vazio/inválido.
     */
    public static function chave(mixed $cores): ?string
    {
        if ($cores === null) {
            return null;
        }
        if (is_string($cores) && trim($cores) === '') {
            return null;
        }

        $k = strtoupper(trim((string) $cores));
        if ($k !== '4V' && is_numeric($k)) {
            $k = (string) (int) (float) $k;
        }

        return in_array($k, self::VALORES, true) ? $k : null;
    }

    public static function isInformada(mixed $cores): bool
    {
        return self::chave($cores) !== null;
    }

    /** Lisa / sem tinta de impressão. */
    public static function isLisa(mixed $cores): bool
    {
        return self::chave($cores) === '0';
    }
}
