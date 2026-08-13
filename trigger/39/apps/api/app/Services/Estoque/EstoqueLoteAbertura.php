<?php

namespace App\Services\Estoque;

use App\Models\Produto;
use App\Support\PadraoDecimal;

/**
 * Lotes sintéticos de abertura (virada / backfill) — estudo 32 §6 + §11.
 * Dois lotes quando a qtde permite: um mais antigo (FEFO) e um recente.
 */
final class EstoqueLoteAbertura
{
    /**
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   data_entrada: string,
     *   data_fabricacao: ?string,
     *   data_validade: ?string
     * }>
     */
    public static function planejar(Produto $produto, string $qtdeTotal, ?string $hoje = null): array
    {
        if (! $produto->controla_lote) {
            return [];
        }

        $qtdeTotal = PadraoDecimal::roundHalfUp($qtdeTotal, PadraoDecimal::SCALE_QTY);
        if (bccomp($qtdeTotal, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return [];
        }

        $hoje = $hoje ?: now()->toDateString();
        $prazo = $produto->prazo_validade_dias ? (int) $produto->prazo_validade_dias : null;
        $sku = preg_replace('/[^A-Z0-9\-]/i', '', (string) $produto->codigo) ?: 'SKU';

        $split = bccomp($qtdeTotal, '10', PadraoDecimal::SCALE_QTY) >= 0;

        if (! $split) {
            $entrada = self::subDays($hoje, 45);

            return [self::linha($sku, 'A', $qtdeTotal, $entrada, $prazo, $hoje, 400)];
        }

        $qtdeA = PadraoDecimal::roundHalfUp(
            bcmul($qtdeTotal, '0.6', PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        $qtdeB = PadraoDecimal::roundHalfUp(
            bcsub($qtdeTotal, $qtdeA, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        $entradaA = self::subDays($hoje, 200);
        $entradaB = self::subDays($hoje, 25);

        return [
            self::linha($sku, 'A', $qtdeA, $entradaA, $prazo, $hoje, 40),
            self::linha($sku, 'B', $qtdeB, $entradaB, $prazo, $hoje, null),
        ];
    }

    /**
     * @return array{
     *   codigo: string,
     *   qtde: string,
     *   data_entrada: string,
     *   data_fabricacao: ?string,
     *   data_validade: ?string
     * }
     */
    private static function linha(
        string $sku,
        string $sufixo,
        string $qtde,
        string $entrada,
        ?int $prazo,
        string $hoje,
        ?int $venceEmDias
    ): array {
        $validade = null;
        if ($prazo !== null) {
            $validade = $venceEmDias !== null
                ? self::addDays($hoje, $venceEmDias)
                : self::addDays($entrada, $prazo);
        }

        return [
            'codigo' => 'VIR-'.$sku.'-'.$sufixo,
            'qtde' => $qtde,
            'data_entrada' => $entrada,
            'data_fabricacao' => $entrada,
            'data_validade' => $validade,
        ];
    }

    private static function subDays(string $date, int $days): string
    {
        return date('Y-m-d', strtotime($date.' -'.$days.' days'));
    }

    private static function addDays(string $date, int $days): string
    {
        return date('Y-m-d', strtotime($date.' +'.$days.' days'));
    }
}
