<?php

namespace App\Services\Comercial;

use App\Models\PedidoItem;
use App\Support\PadraoDecimal;

/**
 * Preço comercial travado no PED (estudo 32 / GERACAO_PEDIDO + motor ORC).
 *
 * No motor, `valor_etiqueta` é o TOTAL das etiquetas da faixa — não o unitário.
 * A UI do ORC já mostra unitário = valor_etiqueta / quantidade.
 * Matriz/clichê e faca nova são fixos do job; não escalam com a qtde produzida.
 *
 * @phpstan-type Travado array{
 *   qtde_faixa: string,
 *   valor_etiqueta: string,
 *   preco_unitario: string,
 *   valor_matriz: string,
 *   valor_comercial: string,
 *   origem: 'faixa'|'item'
 * }
 */
final class PrecoTravadoPedido
{
    /**
     * @param  array<string, mixed>  $faixa
     * @return Travado
     */
    public static function daFaixa(array $faixa): array
    {
        $qtde = self::fromMixed($faixa['quantidade'] ?? null, PadraoDecimal::SCALE_QTY) ?? '0.0000';
        $etiqueta = self::fromMixed($faixa['valor_etiqueta'] ?? null, PadraoDecimal::SCALE_MONEY) ?? '0.00';
        $matriz = self::fromMixed($faixa['valor_matriz'] ?? null, PadraoDecimal::SCALE_MONEY);
        $total = self::fromMixed($faixa['valor_total'] ?? null, PadraoDecimal::SCALE_MONEY);

        if ($matriz === null) {
            $matriz = ($total !== null && bccomp($total, $etiqueta, PadraoDecimal::SCALE_MONEY) >= 0)
                ? bcsub($total, $etiqueta, PadraoDecimal::SCALE_MONEY)
                : '0.00';
        }

        $comercial = $total ?? bcadd($etiqueta, $matriz, PadraoDecimal::SCALE_MONEY);

        return [
            'qtde_faixa' => $qtde,
            'valor_etiqueta' => $etiqueta,
            'preco_unitario' => self::unitario($etiqueta, $qtde),
            'valor_matriz' => $matriz,
            'valor_comercial' => $comercial,
            'origem' => 'faixa',
        ];
    }

    /**
     * Recupera o travado quando o snapshot da faixa não está utilizável.
     * Detecta a contaminação: `preco_unitario` gravado com o total da faixa.
     *
     * @return Travado
     */
    public static function doItem(PedidoItem $item): array
    {
        $qtde = PadraoDecimal::roundHalfUp((string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY);
        $stored = $item->preco_unitario !== null
            ? PadraoDecimal::roundHalfUp((string) $item->preco_unitario, PadraoDecimal::SCALE_UNIT_PRICE)
            : '0.000000';
        $total = $item->valor_total !== null
            ? PadraoDecimal::roundHalfUp((string) $item->valor_total, PadraoDecimal::SCALE_MONEY)
            : null;

        $produto = '0.00';
        if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) > 0 && bccomp($stored, '0', PadraoDecimal::SCALE_UNIT_PRICE) > 0) {
            $produto = PadraoDecimal::roundHalfUp(
                bcmul($qtde, $stored, PadraoDecimal::SCALE_UNIT_PRICE + 2),
                PadraoDecimal::SCALE_MONEY
            );
        }

        $contaminado = bccomp($qtde, '1', PadraoDecimal::SCALE_QTY) > 0
            && bccomp($stored, '0', PadraoDecimal::SCALE_UNIT_PRICE) > 0
            && (
                ($total !== null && bccomp($stored, $total, PadraoDecimal::SCALE_MONEY) === 0)
                || ($total !== null && bccomp($produto, bcmul($total, '10', PadraoDecimal::SCALE_MONEY), PadraoDecimal::SCALE_MONEY) > 0)
            );

        if ($contaminado) {
            $etiqueta = PadraoDecimal::roundHalfUp($stored, PadraoDecimal::SCALE_MONEY);
            $matriz = ($total !== null && bccomp($total, $etiqueta, PadraoDecimal::SCALE_MONEY) > 0)
                ? bcsub($total, $etiqueta, PadraoDecimal::SCALE_MONEY)
                : '0.00';

            return [
                'qtde_faixa' => $qtde,
                'valor_etiqueta' => $etiqueta,
                'preco_unitario' => self::unitario($etiqueta, $qtde),
                'valor_matriz' => $matriz,
                'valor_comercial' => $total ?? $etiqueta,
                'origem' => 'item',
            ];
        }

        return [
            'qtde_faixa' => $qtde,
            'valor_etiqueta' => $produto,
            'preco_unitario' => $stored,
            'valor_matriz' => '0.00',
            'valor_comercial' => $total ?? $produto,
            'origem' => 'item',
        ];
    }

    /**
     * @param  Travado  $travado
     */
    public static function valorEtiquetas(string $qtdeFaturavel, array $travado): string
    {
        $qtdeFat = PadraoDecimal::roundHalfUp($qtdeFaturavel, PadraoDecimal::SCALE_QTY);
        $qtdeFaixa = $travado['qtde_faixa'];
        $etiqueta = $travado['valor_etiqueta'];

        if (bccomp($qtdeFaixa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return '0.00';
        }
        if (bccomp($qtdeFat, $qtdeFaixa, PadraoDecimal::SCALE_QTY) === 0) {
            return $etiqueta;
        }

        $raw = bcdiv(
            bcmul($qtdeFat, $etiqueta, PadraoDecimal::SCALE_UNIT_PRICE + 4),
            $qtdeFaixa,
            PadraoDecimal::SCALE_MONEY + 4
        );

        return PadraoDecimal::roundHalfUp($raw, PadraoDecimal::SCALE_MONEY);
    }

    public static function faixaUtil(array $faixa): bool
    {
        $qtde = self::fromMixed($faixa['quantidade'] ?? null, PadraoDecimal::SCALE_QTY);
        $etiqueta = self::fromMixed($faixa['valor_etiqueta'] ?? null, PadraoDecimal::SCALE_MONEY);

        return $qtde !== null
            && $etiqueta !== null
            && bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) > 0
            && bccomp($etiqueta, '0', PadraoDecimal::SCALE_MONEY) > 0;
    }

    public static function unitario(string $valorEtiqueta, string $qtdeFaixa): string
    {
        if (bccomp($qtdeFaixa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return '0.000000';
        }

        return PadraoDecimal::roundHalfUp(
            bcdiv($valorEtiqueta, $qtdeFaixa, PadraoDecimal::SCALE_UNIT_PRICE + 4),
            PadraoDecimal::SCALE_UNIT_PRICE
        );
    }

    public static function fromMixed(mixed $value, int $scale): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return null;
        }
        if (is_int($value)) {
            return PadraoDecimal::roundHalfUp((string) $value, $scale);
        }
        if (is_float($value)) {
            return PadraoDecimal::roundHalfUp(number_format($value, $scale + 6, '.', ''), $scale);
        }

        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        return PadraoDecimal::roundHalfUp($s, $scale);
    }
}
