<?php

namespace App\Support;

use App\Models\Orcamento;
use Illuminate\Validation\Rule;

final class OrcamentoValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function calcularRules(): array
    {
        return [
            'parceiro_id' => ['required', 'integer'],
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
            'overrides.tinta_acima_m2' => ['nullable', 'numeric'],
            'overrides.preco_caixa' => ['nullable', 'numeric'],
            'overrides.matriz_cm2' => ['nullable', 'numeric'],
            'overrides.acabamentos' => ['nullable', 'array'],
            // GERACAO 7.3 — FACA NOVA: custo/prazo cotados; cadastro no mapa só após aprovação.
            'faca_nova' => ['sometimes', 'boolean'],
            'formato_faca' => ['nullable', 'string', 'max:64'],
            'valor_faca_nova' => ['nullable', 'numeric', 'min:0'],
            'prazo_faca_dias' => ['nullable', 'integer', 'min:0', 'max:365'],
            'prazo_entrega_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'validade_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'tolerancia_qtd_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'observacao' => ['nullable', 'string', 'max:4000'],
            // Defaults comerciais do PAR → snapshot desta proposta (ADR_CONDICOES_COMERCIAIS_PAR).
            // Não entram no motor de preço; PED/TIT futuros consomem este snapshot.
            'condicao_pagamento' => ['nullable', 'string', 'max:64'],
            'forma_pagamento' => ['nullable', 'string', 'max:32'],
            // Fechamento: frete estimado (ADR_ORC_FRETE_ESTIMADO). Default RETIRAR.
            'modo_entrega' => ['nullable', 'string', Rule::in(['RETIRAR', 'ENTREGAR'])],
            // Snapshot comercial → PED (PedidoService::resolverNecessidade). Default PRODUCAO.
            'necessidade' => ['nullable', 'string', Rule::in(['PRODUCAO', 'SERVICO', 'REVENDA'])],
        ];
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
        ];
    }
}
