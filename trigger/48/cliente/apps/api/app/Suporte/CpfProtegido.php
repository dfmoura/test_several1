<?php

declare(strict_types=1);

namespace App\Suporte;

use Illuminate\Support\Facades\Crypt;

final class CpfProtegido
{
    /**
     * @return array{cpf_cifrado: string, cpf_hash: string}
     */
    public static function guardar(string $digitos): array
    {
        return [
            'cpf_cifrado' => Crypt::encryptString($digitos),
            'cpf_hash' => self::hash($digitos),
        ];
    }

    public static function hash(string $digitos): string
    {
        return hash_hmac('sha256', $digitos, (string) config('app.key'));
    }

    public static function ler(?string $cifrado): ?string
    {
        if ($cifrado === null || $cifrado === '') {
            return null;
        }

        try {
            return Crypt::decryptString($cifrado);
        } catch (\Throwable) {
            return null;
        }
    }
}
