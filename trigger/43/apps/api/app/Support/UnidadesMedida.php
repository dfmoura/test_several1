<?php

namespace App\Support;

/**
 * Unidades oficiais do domínio RLP (trigger/32 — CONVERSOES_UNIDADES_MEDIDA).
 *
 * Fonte única para catálogo de consulta, validação de produto e importação CSV.
 * Cada item tem UMA unidade de estoque (interna) e pode ter unidade comercial
 * (compra/venda) distinta, ligada por fator_conversao.
 *
 * ADR: docs/ADR_UNIDADES_PRODUTO.md — dual canônico; sem alternativas abertas.
 */
final class UnidadesMedida
{
    /**
     * @return list<array{codigo: string, descricao: string, uso: string}>
     */
    public static function all(): array
    {
        return [
            [
                'codigo' => 'RL',
                'descricao' => 'Rolo / bobina',
                'uso' => 'Estoque de substratos (largura × comprimento no SKU).',
            ],
            [
                'codigo' => 'M',
                'descricao' => 'Metro linear',
                'uso' => 'Consumo na produção, retalho e ficha técnica.',
            ],
            [
                'codigo' => 'M2',
                'descricao' => 'Metro quadrado',
                'uso' => 'Faturamento de alguns fornecedores; base da gramatura.',
            ],
            [
                'codigo' => 'KG',
                'descricao' => 'Quilograma',
                'uso' => 'Faturamento de substrato; tintas/vernizes; pesagem.',
            ],
            [
                'codigo' => 'G',
                'descricao' => 'Grama',
                'uso' => 'Apontamento de tinta na OP; pesagem fina.',
            ],
            [
                'codigo' => 'UN',
                'descricao' => 'Unidade',
                'uso' => 'Ribbons, tubetes, caixas e itens contados.',
            ],
            [
                'codigo' => 'MIL',
                'descricao' => 'Milheiro',
                'uso' => 'Venda/produção de etiquetas (1 MIL = 1.000).',
            ],
            [
                'codigo' => 'L',
                'descricao' => 'Litro',
                'uso' => 'Alternativa de estoque para tintas líquidas.',
            ],
            [
                'codigo' => 'CX',
                'descricao' => 'Caixa',
                'uso' => 'Embalagem de PA (milheiros ou rolos por caixa).',
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public static function codes(): array
    {
        return array_column(self::all(), 'codigo');
    }

    public static function isOfficial(?string $codigo): bool
    {
        if ($codigo === null || $codigo === '') {
            return false;
        }

        return in_array(strtoupper(trim($codigo)), self::codes(), true);
    }

    /**
     * Catálogo para API de consulta (mesmo shape dos demais selects estáticos).
     *
     * @return list<array{codigo: string, descricao: string, uso: string}>
     */
    public static function catalog(): array
    {
        return self::all();
    }

    public static function validationRule(): string
    {
        return 'in:'.implode(',', self::codes());
    }
}
