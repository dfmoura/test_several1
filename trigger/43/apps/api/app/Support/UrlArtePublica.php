<?php

namespace App\Support;

/**
 * URL pública do formato final da arte (prova para o cliente aprovar).
 * Snapshot no ORC — sem upload/R2; só referência http(s) externa.
 */
final class UrlArtePublica
{
    public const MAX_LEN = 2048;

    /**
     * @return list<string|array>
     */
    public static function validationRule(): array
    {
        return [
            'nullable',
            'string',
            'max:'.self::MAX_LEN,
            'url',
            'starts_with:https://,http://',
        ];
    }

    public static function normalize(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return null;
        }
        if (mb_strlen($s) > self::MAX_LEN) {
            $s = mb_substr($s, 0, self::MAX_LEN);
        }
        if (! self::isAllowed($s)) {
            return null;
        }

        return $s;
    }

    public static function isAllowed(string $url): bool
    {
        if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }
        $scheme = strtolower((string) (parse_url($url, PHP_URL_SCHEME) ?? ''));

        return in_array($scheme, ['http', 'https'], true);
    }
}
