<?php

namespace App\Support;

/**
 * Origem do lead — catálogo fechado (ORCAMENTO_PROSPECT §3.2 / §7).
 * Valores estáveis para relatório de conversão prospect → cliente por origem.
 */
final class OrigemLead
{
    /** @var list<string> */
    public const OPCOES = [
        'WhatsApp',
        'Indicação',
        'Site',
        'Telefone',
        'Instagram',
        'Google',
        'E-mail',
        'Visita',
        'Feira / evento',
        'Outro',
    ];

    public static function isCanonico(?string $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }

        return in_array($value, self::OPCOES, true);
    }
}
