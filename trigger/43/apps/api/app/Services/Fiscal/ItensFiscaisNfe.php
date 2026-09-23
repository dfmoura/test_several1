<?php

namespace App\Services\Fiscal;

use App\Models\FaturamentoItem;
use App\Support\PadraoDecimal;

/**
 * NF-e descreve o PA/REV. Matriz/clichê, faca e arte ficam no FAT e entram no unitário do acabado.
 */
final class ItensFiscaisNfe
{
    /**
     * @param  list<array<string, mixed>>  $linhas
     * @return list<array<string, mixed>>
     */
    public static function consolidar(array $linhas): array
    {
        $setup = '0.00';
        $mercadorias = [];
        $outros = [];
        foreach ($linhas as $linha) {
            if (! is_array($linha)) {
                continue;
            }
            $desc = (string) ($linha['descricao'] ?? '');
            $fam = isset($linha['familia_fiscal']) ? (string) $linha['familia_fiscal'] : null;
            $valor = PadraoDecimal::roundHalfUp((string) ($linha['valor'] ?? '0'), PadraoDecimal::SCALE_MONEY);
            if (FaturamentoItem::eLinhaDeSetup($desc)) {
                $setup = PadraoDecimal::roundHalfUp(
                    bcadd($setup, $valor, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
                continue;
            }
            if (FaturamentoItem::eLinhaDeEstoque($desc, $fam)) {
                $mercadorias[] = self::comDescricaoDoPa($linha);
                continue;
            }
            $outros[] = $linha;
        }

        if ($mercadorias === []) {
            return $outros;
        }

        if (bccomp($setup, '0', PadraoDecimal::SCALE_MONEY) > 0) {
            $mercadorias = self::incorporarSetup($mercadorias, $setup);
        }

        return array_values(array_merge($mercadorias, $outros));
    }

    public static function temSetup(array $linhas): bool
    {
        foreach ($linhas as $linha) {
            if (is_array($linha) && FaturamentoItem::eLinhaDeSetup((string) ($linha['descricao'] ?? ''))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $linha
     * @return array<string, mixed>
     */
    private static function comDescricaoDoPa(array $linha): array
    {
        $produto = $linha['produto'] ?? null;
        $fiscal = is_object($produto) ? trim((string) ($produto->descricao_fiscal ?? '')) : '';
        if ($fiscal !== '') {
            $linha['descricao'] = $fiscal;
        }

        return $linha;
    }

    /**
     * @param  list<array<string, mixed>>  $mercadorias
     * @return list<array<string, mixed>>
     */
    private static function incorporarSetup(array $mercadorias, string $setup): array
    {
        $base = '0.00';
        foreach ($mercadorias as $linha) {
            $base = bcadd($base, (string) ($linha['valor'] ?? '0'), PadraoDecimal::SCALE_MONEY + 2);
        }
        $base = PadraoDecimal::roundHalfUp($base, PadraoDecimal::SCALE_MONEY);
        $resto = $setup;
        $n = count($mercadorias);
        foreach ($mercadorias as $i => $linha) {
            $ultimo = $i === $n - 1;
            if ($ultimo || bccomp($base, '0', PadraoDecimal::SCALE_MONEY) === 0) {
                $share = $resto;
            } else {
                $peso = (string) ($linha['valor'] ?? '0');
                $share = PadraoDecimal::roundHalfUp(
                    bcmul($setup, bcdiv($peso, $base, 8), PadraoDecimal::SCALE_MONEY + 4),
                    PadraoDecimal::SCALE_MONEY
                );
                if (bccomp($share, $resto, PadraoDecimal::SCALE_MONEY) > 0) {
                    $share = $resto;
                }
            }
            $resto = PadraoDecimal::roundHalfUp(
                bcsub($resto, $share, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
            $valor = PadraoDecimal::roundHalfUp(
                bcadd((string) ($linha['valor'] ?? '0'), $share, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
            $qtde = PadraoDecimal::roundHalfUp((string) ($linha['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $linha['valor'] = $valor;
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) > 0) {
                $linha['preco_unitario'] = PadraoDecimal::roundHalfUp(
                    bcdiv($valor, $qtde, PadraoDecimal::SCALE_NF_UNIT + 4),
                    PadraoDecimal::SCALE_NF_UNIT
                );
            }
            $mercadorias[$i] = $linha;
        }

        return $mercadorias;
    }
}
