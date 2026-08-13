<?php

namespace App\Services\Banking;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;

/** Cifra client_id/secret bancários em repouso (Laravel Crypt / APP_KEY). */
final class BankCrypto
{
    public function criptografar(string $plain): string
    {
        $plain = trim($plain);
        if ($plain === '') {
            throw new RuntimeException('Segredo bancário vazio.');
        }

        return Crypt::encryptString($plain);
    }

    public function descriptografar(string $cipher): string
    {
        if ($cipher === '') {
            throw new RuntimeException('Cipher bancário vazio.');
        }

        try {
            return Crypt::decryptString($cipher);
        } catch (DecryptException $e) {
            throw new RuntimeException(
                'Não foi possível descriptografar credencial bancária (APP_KEY incompatível).',
                0,
                $e,
            );
        }
    }
}
