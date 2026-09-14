<?php

namespace App\Support;

use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Sentido de saída da etiqueta na bobina — ADR_ORC_SAIDA_ETIQUETA.
 * Snapshot ORC: saida_etiqueta. Distinto de FacaPosicao (cilindro).
 */
final class SaidaEtiqueta
{
    public const ESQUERDA = 'ESQUERDA';

    public const DIREITA = 'DIREITA';

    public const DEITADA = 'DEITADA';

    public const PE = 'PE';

    /** @var list<string> */
    public const CODIGOS = [
        self::ESQUERDA,
        self::DIREITA,
        self::DEITADA,
        self::PE,
    ];

    /** @return list<string> */
    public static function validationRule(): array
    {
        return ['nullable', 'string', Rule::in(self::CODIGOS)];
    }

    public static function normalize(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $raw = trim((string) $value);
        $ascii = strtoupper(strtr($raw, [
            'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a',
            'é' => 'e', 'ê' => 'e',
            'í' => 'i',
            'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
            'ú' => 'u',
            'Á' => 'A', 'À' => 'A', 'Ã' => 'A', 'Â' => 'A',
            'É' => 'E', 'Ê' => 'E',
            'Í' => 'I',
            'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O',
            'Ú' => 'U',
            'ç' => 'c', 'Ç' => 'C',
        ]));
        $code = preg_replace('/[\s\-]+/', '_', $ascii) ?? $ascii;

        $aliases = [
            'SAIDA_ESQUERDA' => self::ESQUERDA,
            'SAIDA_DIREITA' => self::DIREITA,
            'SAIDA_DEITADA' => self::DEITADA,
            'SAIDA_DE_PE' => self::PE,
            'DE_PE' => self::PE,
        ];
        if (isset($aliases[$code])) {
            $code = $aliases[$code];
        }

        if (! in_array($code, self::CODIGOS, true)) {
            throw ValidationException::withMessages([
                'saida_etiqueta' => ['Saída da etiqueta inválida. Use ESQUERDA, DIREITA, DEITADA ou PE.'],
            ]);
        }

        return $code;
    }

    public static function rotulo(?string $code): ?string
    {
        return match ($code) {
            self::ESQUERDA => 'Saída à esquerda',
            self::DIREITA => 'Saída à direita',
            self::DEITADA => 'Saída deitada',
            self::PE => 'Saída de pé',
            default => null,
        };
    }
}
