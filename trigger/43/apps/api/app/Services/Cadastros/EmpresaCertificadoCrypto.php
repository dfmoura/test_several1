<?php

namespace App\Services\Cadastros;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;

/**
 * Cifra PFX A1 e senha em repouso (Laravel Crypt / APP_KEY).
 * Nunca logar plaintext do PFX nem da senha.
 */
class EmpresaCertificadoCrypto
{
    public function criptografarBinario(string $bytes): string
    {
        if ($bytes === '') {
            throw new RuntimeException('Conteúdo do certificado vazio.');
        }

        return Crypt::encryptString(base64_encode($bytes));
    }

    public function descriptografarBinario(string $cipher): string
    {
        if ($cipher === '') {
            throw new RuntimeException('Certificado criptografado vazio.');
        }

        try {
            $b64 = Crypt::decryptString($cipher);
        } catch (DecryptException $e) {
            throw new RuntimeException(
                'Não foi possível descriptografar o certificado A1 (APP_KEY incompatível).',
                0,
                $e,
            );
        }

        $bytes = base64_decode($b64, true);
        if ($bytes === false || $bytes === '') {
            throw new RuntimeException('Certificado A1 corrompido após descriptografia.');
        }

        return $bytes;
    }

    public function criptografarSenha(string $senha): string
    {
        $plain = (string) $senha;
        if ($plain === '') {
            throw new RuntimeException('Senha do certificado vazia.');
        }

        return Crypt::encryptString($plain);
    }

    public function descriptografarSenha(string $cipher): string
    {
        if ($cipher === '') {
            throw new RuntimeException('Senha criptografada vazia.');
        }

        try {
            return Crypt::decryptString($cipher);
        } catch (DecryptException $e) {
            throw new RuntimeException(
                'Não foi possível descriptografar a senha do A1 (APP_KEY incompatível).',
                0,
                $e,
            );
        }
    }
}
