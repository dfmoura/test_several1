<?php

namespace App\Support;

class BacklogValidationRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'tarefa' => [$partial ? 'sometimes' : 'required', 'string', 'max:500'],
        ];
    }
}
