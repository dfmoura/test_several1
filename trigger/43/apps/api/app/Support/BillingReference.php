<?php

namespace App\Support;

/**
 * Referências externas da mensalidade (conta → TRIGGER).
 * Novos ciclos: prefixo FLEXOERP-* · legado FLEXORC-* permanece válido em webhooks.
 * Norma: docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md § Fase 3.
 */
final class BillingReference
{
    public const CONTA_LEGACY = 'FLEXORC-CONTA-';

    public const CONTA = 'FLEXOERP-CONTA-';

    public const BILLING_LEGACY = 'FLEXORC-BILLING-';

    public const BILLING = 'FLEXOERP-BILLING-';

    /** @var list<string> */
    private const CONTA_PREFIXES = [self::CONTA, self::CONTA_LEGACY];

    /** @var list<string> */
    private const BILLING_PREFIXES = [self::BILLING, self::BILLING_LEGACY];

    public static function contaRef(int $userId): string
    {
        return self::CONTA.$userId;
    }

    public static function billingRef(int $empresaId): string
    {
        return self::BILLING.$empresaId;
    }

    public static function isContaRef(?string $ref): bool
    {
        return self::matchPrefix($ref, self::CONTA_PREFIXES) !== null;
    }

    public static function isBillingRef(?string $ref): bool
    {
        return self::matchPrefix($ref, self::BILLING_PREFIXES) !== null;
    }

    public static function isAnyRef(?string $ref): bool
    {
        return self::isContaRef($ref) || self::isBillingRef($ref);
    }

    public static function userIdFromContaRef(?string $ref): ?int
    {
        $prefix = self::matchPrefix($ref, self::CONTA_PREFIXES);
        if ($prefix === null || $ref === null) {
            return null;
        }

        $id = (int) substr($ref, strlen($prefix));

        return $id > 0 ? $id : null;
    }

    public static function empresaIdFromBillingRef(?string $ref): ?int
    {
        $prefix = self::matchPrefix($ref, self::BILLING_PREFIXES);
        if ($prefix === null || $ref === null) {
            return null;
        }

        $id = (int) substr($ref, strlen($prefix));

        return $id > 0 ? $id : null;
    }

    /**
     * @param  list<string>  $prefixes
     */
    private static function matchPrefix(?string $ref, array $prefixes): ?string
    {
        if ($ref === null || $ref === '') {
            return null;
        }
        foreach ($prefixes as $prefix) {
            if (str_starts_with($ref, $prefix)) {
                return $prefix;
            }
        }

        return null;
    }
}
