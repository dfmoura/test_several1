<?php

namespace App\Support;

use App\Models\Feriado;

class FeriadoValidationRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'data' => [$partial ? 'sometimes' : 'required', 'date'],
            'nome' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'tipo' => ['sometimes', 'string', 'in:'.implode(',', Feriado::TIPOS)],
            'recorrente_anual' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'ano' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
        ];
    }
}
