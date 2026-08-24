<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\BelongsToEmpresa;
use App\Services\Cadastros\ParceiroFiscalRules;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Parceiro extends Model
{
    use HasUserStamps;
    use BelongsToEmpresa;
    use SoftDeletes;

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tipo_pessoa',
        'cnpj_cpf',
        'razao_social',
        'nome_fantasia',
        'ie',
        'im',
        'suframa',
        'area_incentivada',
        'ind_ie_dest',
        'ie_status',
        'ie_consultado_em',
        'consumidor_final',
        'finalidade',
        'regime',
        'regime_desde',
        'cnae',
        'cnaes_secundarios',
        'situacao',
        'motivo_bloqueio',
        'bloqueado_em',
        'cadastro_fiscal_completo',
        'emite_documento_fiscal',
        'is_prospect',
        'origem_lead',
        'papel_cliente',
        'papel_fornecedor',
        'papel_colaborador',
        'papel_transportadora',
        'papel_banco',
        'papel_entidade',
        'papel_vendedor',
        'papel_contador',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'municipio',
        'uf',
        'cep',
        'ibge',
        'latitude',
        'longitude',
        'distancia_km',
        'distancia_fonte',
        'distancia_calculada_em',
        'distancia_empresa_id',
        'telefone',
        'whatsapp',
        'email',
        'email_xml',
        'contato_nome',
        'contato_funcao',
        'limite_credito',
        'credito_utilizado',
        'condicao_pagamento',
        'forma_pagamento',
        'vendedor_parceiro_id',
        'comissao_percentual',
        'tipo_fornecimento',
        'cfop_entrada_padrao',
        'vinculo',
        'cargo',
        'departamento',
        'departamento_id',
        'admissao_em',
        'desligamento_em',
        'banco_codigo',
        'banco_nome',
        'agencia',
        'conta',
        'pix_chave',
        'consulta_snapshot',
    ];

    protected $appends = [
        'apto_emissao_nfe',
        'fiscal_pendencias',
        'fiscal_pendencias_emissao',
    ];

    protected function casts(): array
    {
        return [
            'consumidor_final' => 'boolean',
            'area_incentivada' => 'boolean',
            'cadastro_fiscal_completo' => 'boolean',
            'emite_documento_fiscal' => 'boolean',
            'is_prospect' => 'boolean',
            'papel_cliente' => 'boolean',
            'papel_fornecedor' => 'boolean',
            'papel_colaborador' => 'boolean',
            'papel_transportadora' => 'boolean',
            'papel_banco' => 'boolean',
            'papel_entidade' => 'boolean',
            'papel_vendedor' => 'boolean',
            'papel_contador' => 'boolean',
            // Casts decimal:N → string JSON (PADRAO_DECIMAL §1.2 / §9.1)
            'limite_credito' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_MONEY,
            'credito_utilizado' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_MONEY,
            'comissao_percentual' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_PERCENT,
            'latitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
            'longitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
            'distancia_km' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_DISTANCE,
            'distancia_calculada_em' => 'datetime',
            'bloqueado_em' => 'datetime',
            'ie_consultado_em' => 'datetime',
            'regime_desde' => 'date',
            'admissao_em' => 'date',
            'desligamento_em' => 'date',
            'consulta_snapshot' => 'array',
            'cnaes_secundarios' => 'array',
            'ind_ie_dest' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'vendedor_parceiro_id');
    }

    public function departamentoRef(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_id');
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function contatos(): HasMany
    {
        return $this->hasMany(ParceiroContato::class)->orderBy('ordem')->orderBy('id');
    }

    public function contasBancarias(): HasMany
    {
        return $this->hasMany(ParceiroContaBancaria::class)->orderBy('ordem')->orderBy('id');
    }

    public function enderecosEntrega(): HasMany
    {
        return $this->hasMany(ParceiroEnderecoEntrega::class)->orderBy('ordem')->orderBy('id');
    }

    public function fiscaisHistorico(): HasMany
    {
        return $this->hasMany(ParceiroFiscalHistorico::class)
            ->orderByDesc('vigencia_inicio')
            ->orderByDesc('id');
    }

    public function hasAnyPapel(): bool
    {
        return $this->papel_cliente
            || $this->papel_fornecedor
            || $this->papel_colaborador
            || $this->papel_transportadora
            || $this->papel_banco
            || $this->papel_entidade
            || $this->papel_vendedor
            || $this->papel_contador;
    }

    public function getAptoEmissaoNfeAttribute(): bool
    {
        return ParceiroFiscalRules::evaluate($this->attributesToFiscalArray())['apto_emissao_nfe'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasAttribute(): array
    {
        return ParceiroFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasEmissaoAttribute(): array
    {
        return ParceiroFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias_emissao'];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesToFiscalArray(): array
    {
        return [
            'tipo_pessoa' => $this->tipo_pessoa,
            'cnpj_cpf' => $this->cnpj_cpf,
            'razao_social' => $this->razao_social,
            'nome_fantasia' => $this->nome_fantasia,
            'ie' => $this->ie,
            'im' => $this->im,
            'ind_ie_dest' => $this->ind_ie_dest,
            'ie_status' => $this->ie_status,
            'consumidor_final' => $this->consumidor_final,
            'finalidade' => $this->finalidade,
            'regime' => $this->regime,
            'situacao' => $this->situacao,
            'emite_documento_fiscal' => $this->emite_documento_fiscal,
            'papel_cliente' => $this->papel_cliente,
            'papel_fornecedor' => $this->papel_fornecedor,
            'papel_transportadora' => $this->papel_transportadora,
            'logradouro' => $this->logradouro,
            'numero' => $this->numero,
            'bairro' => $this->bairro,
            'municipio' => $this->municipio,
            'uf' => $this->uf,
            'cep' => $this->cep,
            'ibge' => $this->ibge,
            'email_xml' => $this->email_xml,
            'suframa' => $this->suframa,
            'area_incentivada' => $this->area_incentivada,
        ];
    }
}
