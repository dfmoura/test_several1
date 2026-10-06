<?php

declare(strict_types=1);

namespace App\Suporte;

use App\Domain\RegraNegocio;

final class Dinheiro
{
    public static function reais(int $centavos): string
    {
        $negativo = $centavos < 0;
        $absoluto = abs($centavos);
        $texto = number_format($absoluto / 100, 2, ',', '.');

        return ($negativo ? '- ' : '').'R$ '.$texto;
    }

    public static function centavosDeTexto(string $texto): int
    {
        $limpo = trim(str_replace(['R$', ' '], '', $texto));
        if (str_contains($limpo, ',')) {
            $limpo = str_replace('.', '', $limpo);
            $limpo = str_replace(',', '.', $limpo);
        }
        if (! preg_match('/^\d+(\.\d{1,2})?$/', $limpo)) {
            throw new RegraNegocio('Informe um valor em reais, por exemplo 1.500,00.');
        }
        [$reais, $fracao] = array_pad(explode('.', $limpo, 2), 2, '0');
        $fracao = str_pad(substr($fracao, 0, 2), 2, '0');

        return ((int) $reais * 100) + (int) $fracao;
    }

    public static function centavosDePix(string $valor): int
    {
        if (! preg_match('/^\d+\.\d{2}$/', $valor)) {
            throw new RegraNegocio('O valor informado pelo banco não está no formato esperado.');
        }
        [$reais, $centavos] = explode('.', $valor);

        return ((int) $reais * 100) + (int) $centavos;
    }
}
