<?php

namespace App\Support;

class ProdutoValidationRules
{
    /**
     * Campos fiscais — exigem produto.fiscal na atualização/importação.
     *
     * @return list<string>
     */
    public static function fiscalKeys(): array
    {
        return [
            'ncm',
            'cest',
            'origem',
            'tipo_item_sped',
            'csosn',
            'cst_icms',
            'cst_pis',
            'cst_cofins',
            'cfop_saida_padrao',
            'cfop_entrada_padrao',
        ];
    }

    /**
     * Regras HTTP/service compartilhadas entre CRUD e importação.
     *
     * @return array<string, list<\Closure|string>|string>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'familia' => [$partial ? 'sometimes' : 'required', 'string', 'in:MP,EMB,REV,PA,SVC,FAC'],
            'codigo' => ['nullable', 'string', 'max:32'],
            'grupo_id' => [$partial ? 'sometimes' : 'required_without:grupo', 'nullable', 'integer', 'exists:produto_grupos,id'],
            'grupo' => [$partial ? 'sometimes' : 'required_without:grupo_id', 'nullable', 'string', 'max:16'],
            'descricao_fiscal' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'descricao_comercial' => ['nullable', 'string', 'max:255'],
            'ncm' => ['nullable', 'string', 'max:8'],
            'cest' => ['nullable', 'string', 'max:16'],
            'origem' => ['nullable', 'integer', 'min:0', 'max:8'],
            'tipo_item_sped' => ['nullable', 'string', 'max:2'],
            'unidade_comercial' => ['nullable', 'string', 'max:8'],
            'unidade_interna' => ['nullable', 'string', 'max:8'],
            'fator_conversao' => PadraoDecimal::rules(PadraoDecimal::SCALE_FACTOR),
            'cfop_saida_padrao' => ['nullable', 'string', 'max:8'],
            'cfop_entrada_padrao' => ['nullable', 'string', 'max:8'],
            'csosn' => ['nullable', 'string', 'max:8'],
            'cst_icms' => ['nullable', 'string', 'max:8'],
            'cst_pis' => ['nullable', 'string', 'max:8'],
            'cst_cofins' => ['nullable', 'string', 'max:8'],
            'preco_tabela' => PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE),
            'custo_medio' => PadraoDecimal::rules(PadraoDecimal::SCALE_UNIT_PRICE),
            'estoque_minimo' => PadraoDecimal::rules(PadraoDecimal::SCALE_QTY),
            'lead_time_dias' => ['nullable', 'integer'],
            'gtin' => ['nullable', 'string', 'max:32'],
            'situacao' => ['sometimes', 'string', 'max:16'],
            'atributos' => ['nullable', 'array'],
            'atributos.largura_mm' => PadraoDecimal::rules(PadraoDecimal::SCALE_DIM),
            'atributos.comprimento_m' => PadraoDecimal::rules(PadraoDecimal::SCALE_DIM),
            'atributos.gramatura_g_m2' => PadraoDecimal::rules(PadraoDecimal::SCALE_GRAMATURA),
            // Colunas flat de importação (mesmos atributos)
            'largura_mm' => PadraoDecimal::rules(PadraoDecimal::SCALE_DIM),
            'comprimento_m' => PadraoDecimal::rules(PadraoDecimal::SCALE_DIM),
            'gramatura_g_m2' => PadraoDecimal::rules(PadraoDecimal::SCALE_GRAMATURA),
        ];
    }
}
