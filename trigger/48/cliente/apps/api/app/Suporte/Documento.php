<?php

declare(strict_types=1);

namespace App\Suporte;

final class Documento
{
    public static function soDigitos(string $valor): string
    {
        return preg_replace('/\D+/', '', $valor) ?? '';
    }

    public static function cnpjValido(string $valor): bool
    {
        $cnpj = self::soDigitos($valor);
        if (strlen($cnpj) !== 14 || preg_match('/^(\d)\1{13}$/', $cnpj)) {
            return false;
        }
        $base = substr($cnpj, 0, 12);

        return $cnpj === $base.self::digitoCnpj($base).self::digitoCnpj($base.self::digitoCnpj($base));
    }

    public static function cpfValido(string $valor): bool
    {
        $cpf = self::soDigitos($valor);
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }
        $base = substr($cpf, 0, 9);

        return $cpf === $base.self::digitoCpf($base).self::digitoCpf($base.self::digitoCpf($base));
    }

    public static function formatarCnpj(string $cnpj): string
    {
        $d = self::soDigitos($cnpj);

        return substr($d, 0, 2).'.'.substr($d, 2, 3).'.'.substr($d, 5, 3).'/'.substr($d, 8, 4).'-'.substr($d, 12, 2);
    }

    public static function mascararCpf(string $cpf): string
    {
        $d = self::soDigitos($cpf);
        if (strlen($d) !== 11) {
            return 'indisponível';
        }

        return '***.'.substr($d, 3, 3).'.'.substr($d, 6, 3).'-**';
    }

    private static function digitoCnpj(string $base): string
    {
        $pesos = strlen($base) === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $soma = 0;
        foreach ($pesos as $i => $peso) {
            $soma += (int) $base[$i] * $peso;
        }
        $resto = $soma % 11;

        return (string) ($resto < 2 ? 0 : 11 - $resto);
    }

    private static function digitoCpf(string $base): string
    {
        $tamanho = strlen($base);
        $soma = 0;
        for ($i = 0; $i < $tamanho; $i++) {
            $soma += (int) $base[$i] * ($tamanho + 1 - $i);
        }
        $resto = $soma % 11;

        return (string) ($resto < 2 ? 0 : 11 - $resto);
    }
}
