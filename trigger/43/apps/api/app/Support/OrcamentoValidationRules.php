<?php

namespace App\Support;

use App\Models\Orcamento;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class OrcamentoValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function calcularRules(): array
    {
        $tipo = TipoOperacaoSaida::fromInput(request('tipo_operacao') ?? request('necessidade'));
        if ($tipo === TipoOperacaoSaida::CESSAO_BEM) {
            return [
                'tipo_operacao' => ['required', 'string'],
                'parceiro_id' => ['nullable', 'integer'],
            ];
        }
        if ($tipo === TipoOperacaoSaida::SERVICO) {
            return self::servicoRules();
        }

        return self::industrializacaoRules();
    }

    /**
     * @return array<string, mixed>
     */
    public static function industrializacaoRules(): array
    {
        return array_merge(self::comuns(), [
            'tipo_operacao' => ['nullable', 'string', Rule::in([TipoOperacaoSaida::INDUSTRIALIZACAO])],
            'medida' => ['required', 'string', 'max:64'],
            'largura_cm' => ['required', 'numeric', 'gt:0'],
            'puxada_cm' => ['required', 'numeric', 'gt:0'],
            'cores' => ['required'],
            'papel' => ['required', 'string', 'max:120'],
            'acabamento' => ['required', 'string', 'max:120'],
            'modelos' => ['required', 'integer', 'min:1'],
            // Composição operacional (nome + % qty). Motor usa só `modelos`.
            // Ausente → equal-split no service; presente → validado em ModelosComposicao.
            'modelos_composicao' => ['sometimes', 'nullable', 'array'],
            'modelos_composicao.*.ordem' => ['nullable', 'integer', 'min:1'],
            'modelos_composicao.*.nome' => ['nullable', 'string', 'max:120'],
            'modelos_composicao.*.percentual' => ['nullable', 'numeric', 'gt:0', 'lte:100'],
            'colunas' => ['required', 'integer', 'min:1'],
            'etiq_por_rolo' => ['required', 'integer', 'min:1'],
            'tubete' => ['required', 'string', 'max:32'],
            'z' => ['nullable', 'numeric', 'min:0'],
            'maquina' => ['required', 'string', 'max:64'],
            'maquina_roda_servico' => ['nullable', 'string', 'max:64'],
            'imposto_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'matriz' => ['nullable', 'string', Rule::in(['SIM', 'NAO', 'S', 'N', 'YES', 'TRUE', '1', '0'])],
            'coluna_rebobinacao' => ['nullable', 'integer', 'min:1'],
            'tipo_troca_produto' => ['nullable', 'string', 'max:64'],
            'rpm' => ['nullable', 'numeric', 'gt:0'],
            'faixas' => ['required', 'array', 'min:1'],
            'faixas.*.quantidade' => ['required', 'integer', 'min:1'],
            'faixas.*.comissao_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'overrides' => ['nullable', 'array'],
            'overrides.papel' => ['nullable', 'array'],
            'overrides.papel.*' => ['nullable', 'numeric', 'min:0'],
            'overrides.tinta_acima_m2' => ['nullable', 'numeric', 'min:0'],
            'overrides.tinta_faixa_m2' => ['nullable', 'numeric', 'min:0'],
            'overrides.tinta_valor_ate_30_por_cor' => ['nullable', 'numeric', 'min:0'],
            'overrides.preco_caixa' => ['nullable', 'numeric', 'min:0'],
            'overrides.matriz_cm2' => ['nullable', 'numeric', 'min:0'],
            'overrides.setup_horas' => ['nullable', 'numeric', 'min:0'],
            'overrides.limite_metragem_bobina' => ['nullable', 'numeric', 'min:0'],
            'overrides.minutos_troca_bobina' => ['nullable', 'numeric', 'min:0'],
            'overrides.ceiling_etiqueta' => ['nullable', 'numeric', 'min:0'],
            'overrides.acabamentos' => ['nullable', 'array'],
            'overrides.acabamentos.*' => ['nullable', 'numeric', 'min:0'],
            'overrides.tubete' => ['nullable', 'array'],
            'overrides.tubete.*' => ['nullable', 'numeric', 'min:0'],
            'overrides.hora_parada_h' => ['nullable', 'array'],
            'overrides.hora_parada_h.*' => ['nullable', 'numeric', 'min:0'],
            'overrides.hora_maquina' => ['nullable', 'array'],
            'overrides.hora_maquina.*' => ['nullable', 'array'],
            'overrides.hora_maquina.*.*' => ['nullable', 'numeric', 'min:0'],
            // GERACAO 7.3 — FACA NOVA: custo/prazo cotados; cadastro no mapa só após aprovação.
            'faca_nova' => ['sometimes', 'boolean'],
            'formato_faca' => ['nullable', 'string', 'max:64'],
            'valor_faca_nova' => ['nullable', 'numeric', 'min:0'],
            'prazo_faca_dias' => ['nullable', 'integer', 'min:0', 'max:365'],
            // Snapshot comercial → PED (PedidoService::resolverNecessidade). Default PRODUCAO.
            'necessidade' => ['nullable', 'string', Rule::in(['PRODUCAO', 'SERVICO', 'REVENDA'])],
        ]);
    }

    /**
     * Prestação de serviço — sem BOM de etiqueta (ADR_OPERACOES_SAIDA).
     *
     * @return array<string, mixed>
     */
    public static function servicoRules(): array
    {
        return array_merge(self::comuns(), [
            'tipo_operacao' => ['required', 'string', Rule::in([TipoOperacaoSaida::SERVICO])],
            'tipo_servico' => ['required', 'string', Rule::in(CatalogoServicoSaida::TIPOS)],
            'descricao_servico' => ['required', 'string', 'min:3', 'max:2000'],
            'material_cliente' => ['sometimes', 'boolean'],
            'unidade' => ['nullable', 'string', 'max:8'],
            'horas_maquina' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'maquina' => ['nullable', 'string', 'max:64'],
            'cessao_bem_id' => ['nullable', 'integer'],
            'faixas' => ['required', 'array', 'min:1'],
            'faixas.*.quantidade' => ['required', 'numeric', 'gt:0'],
            'faixas.*.valor_unitario' => ['required', 'numeric', 'gt:0'],
            'faixas.*.comissao_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'necessidade' => ['nullable', 'string', Rule::in(['SERVICO'])],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function listRules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(Orcamento::STATUSES)],
            'parceiro_id' => ['nullable', 'integer'],
            'vendedor_parceiro_id' => ['nullable', 'integer'],
        ];
    }

    public static function after(Validator $validator): void
    {
        $tipo = TipoOperacaoSaida::fromInput($validator->getData()['tipo_operacao'] ?? null);
        if ($tipo === TipoOperacaoSaida::CESSAO_BEM) {
            $validator->errors()->add(
                'tipo_operacao',
                'Cessão de equipamento (comodato) não é orçamento. Cadastre no patrimônio do bem — não gera NFS-e nem NF-e.'
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private static function comuns(): array
    {
        return [
            'parceiro_id' => ['required', 'integer'],
            'prazo_entrega_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'validade_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'tolerancia_qtd_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'observacao' => ['nullable', 'string', 'max:4000'],
            'condicao_pagamento' => ['nullable', 'string', 'max:64'],
            'forma_pagamento' => ['nullable', 'string', 'max:32'],
            'vendedor_parceiro_id' => ['nullable', 'integer'],
            'modo_entrega' => ['nullable', 'string', Rule::in(['RETIRAR', 'ENTREGAR'])],
            'origem_frete' => ['nullable', 'string', Rule::in(['CALCULADA', 'MANUAL'])],
            'valor_frete_manual' => [
                'nullable',
                'numeric',
                'min:0',
                Rule::requiredIf(static function () {
                    $modo = strtoupper(trim((string) request('modo_entrega', '')));
                    $origem = strtoupper(trim((string) request('origem_frete', '')));

                    return $modo === 'ENTREGAR' && $origem === 'MANUAL';
                }),
            ],
        ];
    }
}
