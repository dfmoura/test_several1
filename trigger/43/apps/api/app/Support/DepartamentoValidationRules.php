<?php

namespace App\Support;

class DepartamentoValidationRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'nome' => [$partial ? 'sometimes' : 'required', 'string', 'max:64'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }
}
