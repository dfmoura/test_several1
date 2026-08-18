<?php

namespace App\Support;

class ParceiroValidationRules
{
    /**
     * Regras HTTP/service compartilhadas entre CRUD e importação.
     *
     * @return array<string, list<\Closure|string>>
     */
    public static function rules(bool $partial = false): array
    {
        return [
            'tipo_pessoa' => [$partial ? 'sometimes' : 'nullable', 'string', 'in:PJ,PF,ESTRANGEIRO'],
            'cnpj_cpf' => ['nullable', 'string', 'max:14'],
            'razao_social' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'nome_fantasia' => ['nullable', 'string', 'max:255'],
            'ie' => ['nullable', 'string', 'max:32'],
            'im' => ['nullable', 'string', 'max:32'],
            'suframa' => ['nullable', 'string', 'max:16'],
            'area_incentivada' => ['sometimes', 'boolean'],
            'ind_ie_dest' => ['nullable', 'integer', 'in:1,2,9'],
            'ie_status' => ['nullable', 'string', 'in:NAO_VERIFICADA,OK,BAIXADA,NAO_HABILITADA,ISENTA'],
            'ie_consultado_em' => ['nullable', 'date'],
            'consumidor_final' => ['sometimes', 'boolean'],
            'finalidade' => ['nullable', 'string', 'in:REVENDA,INDUSTRIALIZACAO,USO_CONSUMO'],
            'regime' => ['nullable', 'string', 'in:SIMPLES_NACIONAL,MEI,PRESUMIDO,REAL,ISENTO,OUTRO'],
            'regime_desde' => ['nullable', 'date'],
            'cnae' => ['nullable', 'string', 'max:16'],
            'cnaes_secundarios' => ['nullable', 'array'],
            'cnaes_secundarios.*.codigo' => ['required_with:cnaes_secundarios', 'string', 'max:16'],
            'cnaes_secundarios.*.descricao' => ['nullable', 'string', 'max:255'],
            'situacao' => ['sometimes', 'string', 'max:16'],
            'is_prospect' => ['sometimes', 'boolean'],
            'origem_lead' => ['nullable', 'string', 'in:'.implode(',', OrigemLead::OPCOES)],
            'emite_documento_fiscal' => ['sometimes', 'boolean'],
            'motivo_vigencia_fiscal' => ['nullable', 'string', 'max:255'],
            'papel_cliente' => ['sometimes', 'boolean'],
            'papel_fornecedor' => ['sometimes', 'boolean'],
            'papel_colaborador' => ['sometimes', 'boolean'],
            'papel_transportadora' => ['sometimes', 'boolean'],
            'papel_banco' => ['sometimes', 'boolean'],
            'papel_entidade' => ['sometimes', 'boolean'],
            'papel_vendedor' => ['sometimes', 'boolean'],
            'papel_contador' => ['sometimes', 'boolean'],
            'logradouro' => ['nullable', 'string'],
            'numero' => ['nullable', 'string', 'max:32'],
            'complemento' => ['nullable', 'string'],
            'bairro' => ['nullable', 'string'],
            'municipio' => ['nullable', 'string'],
            'uf' => ['nullable', 'string', 'size:2'],
            'cep' => ['nullable', 'string', 'max:8'],
            'ibge' => ['nullable', 'string', 'max:7'],
            'latitude' => PadraoDecimal::coordinateRules('latitude'),
            'longitude' => PadraoDecimal::coordinateRules('longitude'),
            'distancia_km' => PadraoDecimal::rules(PadraoDecimal::SCALE_DISTANCE),
            'distancia_fonte' => ['nullable', 'string', 'max:32'],
            'distancia_calculada_em' => ['nullable', 'date'],
            'telefone' => ['nullable', 'string', 'max:32'],
            'whatsapp' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email'],
            'email_xml' => ['nullable', 'email'],
            'contato_nome' => ['nullable', 'string'],
            'contato_funcao' => ['nullable', 'string'],
            'limite_credito' => PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY),
            'credito_utilizado' => PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY),
            'comissao_percentual' => PadraoDecimal::rules(PadraoDecimal::SCALE_PERCENT),
            'vendedor_parceiro_id' => ['nullable', 'integer'],
            'condicao_pagamento' => ['nullable', 'string', 'max:64'],
            'forma_pagamento' => ['nullable', 'string', 'max:32'],
            'banco_codigo' => ['nullable', 'string', 'max:8'],
            'banco_nome' => ['nullable', 'string'],
            'agencia' => ['nullable', 'string', 'max:16'],
            'conta' => ['nullable', 'string', 'max:32'],
            'pix_chave' => ['nullable', 'string'],
            'tipo_fornecimento' => ['nullable', 'string', 'max:32'],
            'cfop_entrada_padrao' => ['nullable', 'string', 'max:8'],
            'vinculo' => ['nullable', 'string', 'max:32'],
            'cargo' => ['nullable', 'string'],
            'departamento_id' => ['nullable', 'integer'],
            'departamento' => ['nullable', 'string', 'max:64'],
            'contatos' => ['sometimes', 'array'],
            'contatos.*.id' => ['nullable', 'integer'],
            'contatos.*.nome' => ['nullable', 'string', 'max:255'],
            'contatos.*.funcao' => ['nullable', 'string', 'max:255'],
            'contatos.*.telefone' => ['nullable', 'string', 'max:32'],
            'contatos.*.whatsapp' => ['nullable', 'string', 'max:32'],
            'contatos.*.email' => ['nullable', 'email'],
            'contatos.*.principal' => ['sometimes', 'boolean'],
            'contatos.*.autorizado_aprovar' => ['sometimes', 'boolean'],
            'contatos.*.ordem' => ['nullable', 'integer', 'min:0'],
            'contas_bancarias' => ['sometimes', 'array'],
            'contas_bancarias.*.id' => ['nullable', 'integer'],
            'contas_bancarias.*.banco_codigo' => ['nullable', 'string', 'max:8'],
            'contas_bancarias.*.banco_nome' => ['nullable', 'string', 'max:255'],
            'contas_bancarias.*.agencia' => ['nullable', 'string', 'max:16'],
            'contas_bancarias.*.conta' => ['nullable', 'string', 'max:32'],
            'contas_bancarias.*.pix_chave' => ['nullable', 'string', 'max:255'],
            'contas_bancarias.*.tipo_conta' => ['nullable', 'string', 'in:CORRENTE,POUPANCA,PAGAMENTO'],
            'contas_bancarias.*.principal' => ['sometimes', 'boolean'],
            'contas_bancarias.*.ordem' => ['nullable', 'integer', 'min:0'],
            'enderecos_entrega' => ['sometimes', 'array'],
            'enderecos_entrega.*.id' => ['nullable', 'integer'],
            'enderecos_entrega.*.apelido' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.logradouro' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.numero' => ['nullable', 'string', 'max:32'],
            'enderecos_entrega.*.complemento' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.bairro' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.municipio' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.uf' => ['nullable', 'string', 'size:2'],
            'enderecos_entrega.*.cep' => ['nullable', 'string', 'max:8'],
            'enderecos_entrega.*.ibge' => ['nullable', 'string', 'max:7'],
            'enderecos_entrega.*.latitude' => PadraoDecimal::coordinateRules('latitude'),
            'enderecos_entrega.*.longitude' => PadraoDecimal::coordinateRules('longitude'),
            'enderecos_entrega.*.distancia_km' => PadraoDecimal::rules(PadraoDecimal::SCALE_DISTANCE),
            'enderecos_entrega.*.distancia_fonte' => ['nullable', 'string', 'max:32'],
            'enderecos_entrega.*.distancia_calculada_em' => ['nullable', 'date'],
            'enderecos_entrega.*.responsavel_nome' => ['nullable', 'string', 'max:255'],
            'enderecos_entrega.*.responsavel_telefone' => ['nullable', 'string', 'max:32'],
            'enderecos_entrega.*.responsavel_documento' => ['nullable', 'string', 'max:32'],
            'enderecos_entrega.*.observacoes' => ['nullable', 'string', 'max:1000'],
            'enderecos_entrega.*.principal' => ['sometimes', 'boolean'],
            'enderecos_entrega.*.ordem' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function bancarioKeys(): array
    {
        return ['banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_chave', 'contas_bancarias'];
    }

    /**
     * @return list<string>
     */
    public static function creditoKeys(): array
    {
        return ['limite_credito'];
    }
}
