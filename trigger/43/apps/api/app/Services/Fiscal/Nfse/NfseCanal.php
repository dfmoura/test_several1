<?php

namespace App\Services\Fiscal\Nfse;

/**
 * Canal oficial da NFS-e Nacional.
 * Emissão: local e homologação na SEFIN de produção restrita; produção na SEFIN de produção.
 * Caixa: ADN de produção em todo stage operacional. A restrita não distribui as NFS-e já tomadas.
 * O stage testing não chama o fisco, salvo driver explícito fake.
 */
final class NfseCanal
{
    public static function emissao(): string
    {
        return self::resolver((string) config('erp.nfse.driver', ''), 'sefin');
    }

    public static function caixa(): string
    {
        return self::resolver((string) config('erp.nfse.caixa_driver', ''), 'adn');
    }

    public static function falaComFisco(): bool
    {
        $stage = self::stage();

        return in_array($stage, config('erp.nfse.stages_permitidos', []), true);
    }

    /** Emissão na SEFIN de produção. Local e homologação ficam na produção restrita. */
    public static function producao(): bool
    {
        return in_array(self::stage(), ['production', 'prod', 'producao'], true);
    }

    /**
     * Caixa no ADN de produção. NFSE_ADN_AMBIENTE=restrita devolve o sandbox.
     */
    public static function adnProducao(): bool
    {
        $forcado = strtolower(trim((string) config('erp.nfse.adn_ambiente', '')));

        return ! in_array($forcado, ['restrita', 'homolog', 'homologacao'], true);
    }

    public static function numeroNaChave(string $chave): ?string
    {
        $digitos = preg_replace('/\D/', '', $chave) ?: '';
        if (strlen($digitos) !== 50) {
            return null;
        }
        $numero = ltrim(substr($digitos, 23, 13), '0');

        return $numero === '' ? '0' : $numero;
    }

    private static function resolver(string $configurado, string $oficial): string
    {
        $valor = strtolower(trim($configurado));
        if (in_array($valor, ['off', 'fake', 'sefin', 'adn'], true)) {
            return $valor;
        }

        return self::falaComFisco() ? $oficial : 'off';
    }

    private static function stage(): string
    {
        return strtolower(trim((string) config('erp.stage', 'local')));
    }
}
