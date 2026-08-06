<?php

namespace App\Services\Fiscal;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;

/**
 * Cifra tokens de hubs fiscais em repouso (Laravel Crypt / APP_KEY).
 * Nunca logar o plaintext do token.
 */
class FiscalHubCrypto
{
    public function mascarar(string $token): string
    {
        $key = trim($token);
        if ($key === '') {
            return '';
        }
        if (strlen($key) <= 8) {
            return '••••'.substr($key, -2);
        }

        return substr($key, 0, 4).'…'.substr($key, -4);
    }

    public function criptografar(string $token): string
    {
        $plain = trim($token);
        if ($plain === '') {
            throw new RuntimeException('Token vazio.');
        }

        return Crypt::encryptString($plain);
    }

    public function descriptografar(string $cipher): string
    {
        if ($cipher === '') {
            throw new RuntimeException('Token criptografado vazio.');
        }

        try {
            return Crypt::decryptString($cipher);
        } catch (DecryptException $e) {
            throw new RuntimeException(
                'Não foi possível descriptografar o token do hub (APP_KEY incompatível).',
                0,
                $e,
            );
        }
    }
}
