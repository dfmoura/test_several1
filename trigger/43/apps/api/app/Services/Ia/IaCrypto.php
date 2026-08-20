<?php

namespace App\Services\Ia;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;

/**
 * Cifra API keys de IA em repouso (Laravel Crypt / APP_KEY).
 * Nunca logar o plaintext da API key.
 */
class IaCrypto
{
    public function mascarar(string $apiKey): string
    {
        $key = trim($apiKey);
        if ($key === '') {
            return '';
        }
        if (strlen($key) <= 8) {
            return '••••'.substr($key, -2);
        }

        return substr($key, 0, 4).'…'.substr($key, -4);
    }

    public function criptografar(string $apiKey): string
    {
        $plain = trim($apiKey);
        if ($plain === '') {
            throw new RuntimeException('API key vazia.');
        }

        return Crypt::encryptString($plain);
    }

    public function descriptografar(string $token): string
    {
        if ($token === '') {
            throw new RuntimeException('Token criptografado vazio.');
        }

        try {
            return Crypt::decryptString($token);
        } catch (DecryptException $e) {
            throw new RuntimeException(
                'Não foi possível descriptografar a API key (APP_KEY incompatível).',
                0,
                $e,
            );
        }
    }
}
