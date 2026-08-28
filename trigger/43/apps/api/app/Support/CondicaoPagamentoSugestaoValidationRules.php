<?php

namespace App\Support;

class CondicaoPagamentoSugestaoValidationRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'texto' => [$partial ? 'sometimes' : 'required', 'string', 'max:64'],
            'ordenacao' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }
}
