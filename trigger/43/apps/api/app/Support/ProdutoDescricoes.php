<?php

namespace App\Support;

/**
 * Normalização de textos do cadastro de produto (Nome no estoque / Descrição fiscal).
 * Canônico: maiúsculas UTF-8 — listagens, NF/SPED e almoxarifado leem o mesmo padrão.
 */
final class ProdutoDescricoes
{
    public static function maiusculas(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trim = trim($value);
        if ($trim === '') {
            return null;
        }

        return mb_strtoupper($trim, 'UTF-8');
    }

    /**
     * Descrição fiscal é obrigatória no formulário; string vazia permanece '' para a validação.
     */
    public static function fiscal(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trim = trim($value);
        if ($trim === '') {
            return '';
        }

        return mb_strtoupper($trim, 'UTF-8');
    }
}
