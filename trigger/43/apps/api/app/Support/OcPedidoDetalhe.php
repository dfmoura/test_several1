<?php

namespace App\Support;

use App\Models\Produto;

/**
 * Quando a OC / A repor oferece o “Detalhe do pedido” (faixas físicas L × volumes × m → m²).
 *
 * Espelho de `apps/web/src/lib/ocPedidoDetalheUi.ts`.
 * Fonte: `exige_dimensao_sku` + lista canônica de grupos (ProdutoBobinaDimensoes).
 * Qtde comercial da linha deriva de Σ m² (KG via fator) — faixas não mudam de unidade.
 */
final class OcPedidoDetalhe
{
    /**
     * @return array{show_detalhe_bobina: bool, mode: string}
     */
    public static function decide(
        ?bool $exigeDimensaoSku,
        ?string $grupoCodigo = null,
        bool $temComposicao = false,
    ): array {
        if ($temComposicao) {
            return [
                'show_detalhe_bobina' => true,
                'mode' => 'legado',
            ];
        }

        if ($exigeDimensaoSku === true) {
            return [
                'show_detalhe_bobina' => true,
                'mode' => 'bobina',
            ];
        }

        // Flag explícita do catálogo prevalece sobre fallback de código.
        if ($exigeDimensaoSku === false) {
            return [
                'show_detalhe_bobina' => false,
                'mode' => 'oculto',
            ];
        }

        $g = strtoupper(trim((string) $grupoCodigo));
        if ($g !== '' && in_array($g, ProdutoBobinaDimensoes::gruposQueExigemDimensao(), true)) {
            return [
                'show_detalhe_bobina' => true,
                'mode' => 'bobina',
            ];
        }

        return [
            'show_detalhe_bobina' => false,
            'mode' => 'oculto',
        ];
    }

    public static function permiteParaProduto(Produto $produto, bool $temComposicao = false): bool
    {
        $grupo = $produto->relationLoaded('grupoCatalogo')
            ? $produto->grupoCatalogo
            : null;

        $exige = $grupo !== null
            ? (bool) $grupo->exige_dimensao_sku
            : null;

        $codigo = $grupo?->codigo ?? $produto->grupo;

        return self::decide($exige, $codigo, $temComposicao)['show_detalhe_bobina'];
    }
}
