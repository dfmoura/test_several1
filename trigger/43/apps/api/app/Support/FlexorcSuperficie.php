<?php

namespace App\Support;

/**
 * Superfície do produto nesta instalação (fatia comercial até envio do link).
 * Esqueleto financeiro/sinal permanece no código — só não expõe nem dispara na UX.
 *
 * @see docs/ADR_FATIA_COMERCIAL_SAAS.md
 */
final class FlexorcSuperficie
{
    /** Orçamento até enviar link de aprovar/reprovar — sem sinal PIX nem menu financeiro. */
    public static function ateEnvioLink(): bool
    {
        return (bool) config('erp.flexorc.ate_envio_link', true);
    }

    public static function expoeFinanceiro(): bool
    {
        return ! self::ateEnvioLink();
    }

    public static function emiteSinalNoAceite(): bool
    {
        return ! self::ateEnvioLink();
    }

    /**
     * @return array{ate_envio_link: bool, sinal: bool, financeiro: bool}
     */
    public static function dto(): array
    {
        return [
            'ate_envio_link' => self::ateEnvioLink(),
            'sinal' => self::emiteSinalNoAceite(),
            'financeiro' => self::expoeFinanceiro(),
        ];
    }
}
