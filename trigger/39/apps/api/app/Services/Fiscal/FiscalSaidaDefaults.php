<?php

namespace App\Services\Fiscal;

/**
 * Defaults fiscais de saída alinhados ao estudo 32 e ao contrato Focus do 28.
 * Nunca inventam chave/número SEFAZ — só preenchem campos de cadastro/tributação
 * quando o item ainda não tem NCM/CFOP/ISS (homologação).
 */
final class FiscalSaidaDefaults
{
    public const NCM_ETIQUETA = '48211000';

    public const CSOSN_SIMPLES = '102';

    public const CST_PIS = '49';

    public const CST_COFINS = '49';

    public const CFOP_PA_INTERNO = '5101';

    public const CFOP_PA_INTERESTADUAL = '6101';

    public const CFOP_REV_INTERNO = '5102';

    public const CFOP_REV_INTERESTADUAL = '6102';

    public const NATUREZA_PA = 'VENDA DE PRODUCAO DO ESTABELECIMENTO';

    public const NATUREZA_REV = 'VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS';

    /** Código de tributação nacional ISS (NFS-e Nacional) — serviços de impressão (28). */
    public const C_TRIB_NAC = '130501';

    public const C_NBS = '121012100';

    public const TRIBUTACAO_ISS = 1;

    public const SERIE_NFE = 1;

    public const SERIE_DPS = 1;

    public const PAIS = '1058';

    public const MODALIDADE_FRETE_SEM = 9;

    public const PRESENCA_COMPRADOR = 1;

    public static function tipoDeFamilia(?string $familia): string
    {
        $f = strtoupper(trim((string) $familia));

        return str_starts_with($f, 'SVC') ? 'NFSE' : 'NFE';
    }

    public static function isRevenda(?string $familia): bool
    {
        return str_starts_with(strtoupper(trim((string) $familia)), 'REV');
    }

    public static function cfopSaida(?string $familia, string $ufEmitente, string $ufDestino, ?string $cfopItem = null): string
    {
        $interno = strtoupper(trim($ufEmitente)) === strtoupper(trim($ufDestino));
        $cfop = preg_replace('/\D/', '', (string) $cfopItem) ?: '';
        if (strlen($cfop) === 4) {
            $primeiro = $cfop[0];
            if ($interno && $primeiro === '6') {
                return '5'.substr($cfop, 1);
            }
            if (! $interno && $primeiro === '5') {
                return '6'.substr($cfop, 1);
            }

            return $cfop;
        }

        if (self::isRevenda($familia)) {
            return $interno ? self::CFOP_REV_INTERNO : self::CFOP_REV_INTERESTADUAL;
        }

        return $interno ? self::CFOP_PA_INTERNO : self::CFOP_PA_INTERESTADUAL;
    }

    public static function natureza(?string $familia): string
    {
        return self::isRevenda($familia) ? self::NATUREZA_REV : self::NATUREZA_PA;
    }

    /**
     * Meio de pagamento Focus (formas_pagamento.forma_pagamento).
     */
    public static function formaPagamentoFocus(?string $forma, bool $saldoZero): int
    {
        if ($saldoZero) {
            return 90; // sem pagamento (sinal cobriu)
        }

        return match (strtoupper(trim((string) $forma))) {
            'PIX' => 17,
            'BOLETO' => 15,
            'DINHEIRO' => 1,
            'CARTAO', 'CARTÃO' => 3,
            default => 99,
        };
    }
}
