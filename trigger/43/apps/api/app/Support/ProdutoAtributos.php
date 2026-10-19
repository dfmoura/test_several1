<?php

namespace App\Support;

/**
 * Contrato dos atributos JSON do produto (ADR-043-CAD-001 · ADR-039-UNID-001).
 *
 * Chaves do formulário (dimensão/programa/linha) vs metadados de seed/sistema.
 * Update do cadastro não pode apagar `camada_cadastro` / flags só porque o form
 * não os reenvia.
 */
final class ProdutoAtributos
{
    /**
     * Gramatura do conjunto que viaja (frente + adesivo + liner), g/m².
     * Não entra no formulário: a NF usa 160 g/m² quando este atributo falta.
     * A gramatura de estoque (`gramatura_g_m2`) continua a ponte KG↔m².
     */
    public const GRAMATURA_EXPEDICAO = 'gramatura_expedicao_g_m2';

    /** Quilo de uma peça (tubete, caixa ou unidade de revenda). Fora do formulário. */
    public const PESO_KG = 'peso_kg';

    /** Campos editáveis na ficha comercial (omitidos no payload = limpos). */
    public const FORM_KEYS = [
        'largura_mm',
        'comprimento_m',
        'gramatura_g_m2',
        'comp_mm',
        'larg_mm',
        'alt_mm',
        'grupo_estoque',
        'programa_compra',
    ];

    /**
     * Mescla atributos no update: form keys sobrescrevem/limpam;
     * demais chaves do cadastro atual (seed/sistema) permanecem.
     *
     * @param  array<string, mixed>|null  $current
     * @param  array<string, mixed>|null  $incoming
     * @return array<string, mixed>
     */
    public static function mergeOnUpdate(?array $current, ?array $incoming): array
    {
        $result = is_array($current) ? $current : [];
        $incoming = is_array($incoming) ? $incoming : [];

        foreach (self::FORM_KEYS as $key) {
            if (! array_key_exists($key, $incoming)) {
                unset($result[$key]);

                continue;
            }
            $value = $incoming[$key];
            if ($value === null || $value === '') {
                unset($result[$key]);
            } else {
                $result[$key] = $value;
            }
        }

        foreach ($incoming as $key => $value) {
            if (in_array($key, self::FORM_KEYS, true)) {
                continue;
            }
            if ($value === null || $value === '') {
                unset($result[$key]);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }
}
