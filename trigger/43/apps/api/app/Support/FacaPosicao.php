<?php

namespace App\Support;

use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Posição da faca no cilindro — snapshot ORC usa faca_posicao (mesmos códigos). */
final class FacaPosicao
{
    public const CIMA = 'CIMA';

    public const BAIXO = 'BAIXO';

    public const ESQUERDA = 'ESQUERDA';

    public const DIREITA = 'DIREITA';

    /** @var list<string> */
    public const CODIGOS = [
        self::CIMA,
        self::BAIXO,
        self::ESQUERDA,
        self::DIREITA,
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
        $code = strtoupper(trim((string) $value));
        if (! in_array($code, self::CODIGOS, true)) {
            throw ValidationException::withMessages([
                'posicao' => ['Posição inválida. Use CIMA, BAIXO, ESQUERDA ou DIREITA.'],
            ]);
        }

        return $code;
    }
}
