<?php

namespace App\Support;

/**
 * Espelho da progressive disclosure de conversão na UI (ADR-039-UNID-001).
 *
 * Dual canônico sempre no schema; fator/equação só quando comercial ≠ estoque.
 * A UI React usa a mesma decisão em `produtoUnidadesConversaoUi.ts`.
 */
final class ProdutoUnidadesConversao
{
    /**
     * Interna vazia = mesma da comercial (normalização no ProdutoService).
     */
    public static function unidadesDiferem(?string $unidadeComercial, ?string $unidadeInterna): bool
    {
        $a = strtoupper(trim((string) $unidadeComercial));
        $b = strtoupper(trim((string) $unidadeInterna));

        return $a !== '' && $b !== '' && $a !== $b;
    }

    /**
     * @return array{
     *   mode: string,
     *   section_title: string,
     *   show_fator: bool,
     *   show_equacao: bool
     * }
     */
    public static function decide(?string $unidadeComercial, ?string $unidadeInterna): array
    {
        if (self::unidadesDiferem($unidadeComercial, $unidadeInterna)) {
            return [
                'mode' => 'conversao',
                'section_title' => 'Unidades e conversão',
                'show_fator' => true,
                'show_equacao' => true,
            ];
        }

        return [
            'mode' => 'simples',
            'section_title' => 'Unidades',
            'show_fator' => false,
            'show_equacao' => false,
        ];
    }
}
