<?php

namespace App\Services\Fiscal;

use App\Support\PadraoDecimal;

/**
 * IBS/CBS ano-teste 2026 (LC 214): UF 0,1% · município 0% · CBS 0,9%.
 * Não entra em vNF.
 */
final class NfeIbsCbs
{
    public const ALIQUOTA_UF = '0.1000';

    public const ALIQUOTA_MUN = '0.0000';

    public const ALIQUOTA_CBS = '0.9000';

    /**
     * @return array{vbc: string, vuf: string, vmun: string, vibs: string, vcbs: string, p_uf: string, p_mun: string, p_cbs: string}
     */
    public static function calcular(string $base, mixed $aliquotaCbs = null): array
    {
        $vBc = PadraoDecimal::roundHalfUp($base, PadraoDecimal::SCALE_MONEY);
        $pCbs = self::aliquota($aliquotaCbs, self::ALIQUOTA_CBS);
        $vUf = self::parcela($vBc, self::ALIQUOTA_UF);
        $vMun = self::parcela($vBc, self::ALIQUOTA_MUN);
        $vCbs = self::parcela($vBc, $pCbs);
        $vIbs = PadraoDecimal::roundHalfUp(bcadd($vUf, $vMun, 8), PadraoDecimal::SCALE_MONEY);

        return [
            'vbc' => $vBc,
            'vuf' => $vUf,
            'vmun' => $vMun,
            'vibs' => $vIbs,
            'vcbs' => $vCbs,
            'p_uf' => self::ALIQUOTA_UF,
            'p_mun' => self::ALIQUOTA_MUN,
            'p_cbs' => $pCbs,
        ];
    }

    private static function aliquota(mixed $valor, string $padrao): string
    {
        $n = preg_replace('/[^\d.]/', '', str_replace(',', '.', (string) $valor)) ?: '';
        if ($n === '' || (float) $n <= 0) {
            return $padrao;
        }

        return PadraoDecimal::roundHalfUp($n, 4);
    }

    private static function parcela(string $base, string $percentual): string
    {
        return PadraoDecimal::roundHalfUp(
            bcdiv(bcmul($base, $percentual, 8), '100', 8),
            PadraoDecimal::SCALE_MONEY
        );
    }
}
