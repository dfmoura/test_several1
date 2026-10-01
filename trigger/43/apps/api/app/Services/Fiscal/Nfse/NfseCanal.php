<?php

namespace App\Services\Fiscal\Nfse;

/**
 * Canal oficial da NFS-e Nacional.
 * Local e homologação falam com a produção restrita. Produção fala com a produção.
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

    /** Produção de verdade. Local e homologação ficam na produção restrita. */
    public static function producao(): bool
    {
        return in_array(self::stage(), ['production', 'prod', 'producao'], true);
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
