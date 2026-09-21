<?php

namespace App\Support;

/**
 * Referência visual da arte por modelo (composição).
 * http(s) externo ou ref interna `orc-arte:{empresaId}/{uuid}.{ext}` (upload EMP).
 * Não entra em R1–R20 / valor_arte / %.
 */
final class ArteModeloUrl
{
    public const MAX_LEN = 2048;

    public const REF_PREFIX = 'orc-arte:';

    /** @var list<string> */
    public const EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

    /**
     * @return list<string|array>
     */
    public static function validationRule(): array
    {
        return [
            'nullable',
            'string',
            'max:'.self::MAX_LEN,
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
        if (self::isInternalRef($s)) {
            return $s;
        }
        if (UrlArtePublica::isAllowed($s)) {
            return $s;
        }

        return null;
    }

    public static function isInternalRef(string $url): bool
    {
        return self::parseInternal($url) !== null;
    }

    /**
     * @return array{empresa_id: int, arquivo: string}|null
     */
    public static function parseInternal(string $url): ?array
    {
        if (! str_starts_with($url, self::REF_PREFIX)) {
            return null;
        }
        $rest = substr($url, strlen(self::REF_PREFIX));
        if (! preg_match(
            '/^(\d+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:svg|png|jpe?g|webp))$/i',
            $rest,
            $m
        )) {
            return null;
        }

        return [
            'empresa_id' => (int) $m[1],
            'arquivo' => strtolower($m[2]),
        ];
    }

    public static function makeInternalRef(int $empresaId, string $arquivo): string
    {
        return self::REF_PREFIX.$empresaId.'/'.strtolower($arquivo);
    }
}
