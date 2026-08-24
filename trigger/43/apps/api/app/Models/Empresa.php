<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Services\Cadastros\EmpresaFiscalRules;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Empresa extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    protected $fillable = [
        'codigo',
        'cnpj',
        'razao_social',
        'nome_fantasia',
        'ie',
        'ie_status',
        'ie_consultado_em',
        'im',
        'im_obrigatoria_nfse',
        'iest',
        'regime',
        'crt',
        'regime_desde',
        'cnae',
        'cnaes_secundarios',
        'email',
        'telefone',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'municipio',
        'uf',
        'cep',
        'ibge',
        'origem_latitude',
        'origem_longitude',
        'venda_ativa',
        'estoque_ativo',
        'logo_path',
        'situacao',
        'cadastro_fiscal_completo',
    ];

    protected $appends = [
        'apto_emissao_nfe',
        'apto_emissao_nfse',
        'fiscal_pendencias',
        'fiscal_pendencias_emissao',
        'fiscal_pendencias_nfse',
        'fiscal_pendencias_emissao_nfse',
    ];

    protected function casts(): array
    {
        return [
            'crt' => 'integer',
            'venda_ativa' => 'boolean',
            'estoque_ativo' => 'boolean',
            'cadastro_fiscal_completo' => 'boolean',
            'im_obrigatoria_nfse' => 'boolean',
            'ie_consultado_em' => 'datetime',
            'regime_desde' => 'date',
            'cnaes_secundarios' => 'array',
            'origem_latitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
            'origem_longitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
        ];
    }

    public function parametros(): HasMany
    {
        return $this->hasMany(ParametroEmpresa::class);
    }

    public function parceiros(): HasMany
    {
        return $this->hasMany(Parceiro::class);
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class);
    }

    public function fiscaisHistorico(): HasMany
    {
        return $this->hasMany(EmpresaFiscalHistorico::class)
            ->orderByDesc('vigencia_inicio')
            ->orderByDesc('id');
    }

    public function contasFinanceiras(): HasMany
    {
        return $this->hasMany(EmpresaContaFinanceira::class)
            ->orderByDesc('principal')
            ->orderBy('ordem')
            ->orderBy('id');
    }

    public function certificadoA1(): HasOne
    {
        return $this->hasOne(EmpresaCertificadoA1::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'empresa_user')
            ->withPivot('padrao')
            ->withTimestamps();
    }

    public function ativacao(): HasOne
    {
        return $this->hasOne(EmpresaAtivacao::class);
    }

    public function temOrigemOperacional(): bool
    {
        $lat = $this->origem_latitude;
        $lng = $this->origem_longitude;

        return $lat !== null && $lat !== '' && $lng !== null && $lng !== '';
    }

    public function getAptoEmissaoNfeAttribute(): bool
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['apto_emissao_nfe'];
    }

    public function getAptoEmissaoNfseAttribute(): bool
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['apto_emissao_nfse'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasAttribute(): array
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasEmissaoAttribute(): array
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias_emissao'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasNfseAttribute(): array
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias_nfse'];
    }

    /**
     * @return list<string>
     */
    public function getFiscalPendenciasEmissaoNfseAttribute(): array
    {
        return EmpresaFiscalRules::evaluate($this->attributesToFiscalArray())['pendencias_emissao_nfse'];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesToFiscalArray(): array
    {
        return [
            'cnpj' => $this->cnpj,
            'razao_social' => $this->razao_social,
            'ie' => $this->ie,
            'ie_status' => $this->ie_status,
            'im' => $this->im,
            'im_obrigatoria_nfse' => $this->im_obrigatoria_nfse,
            'iest' => $this->iest,
            'regime' => $this->regime,
            'crt' => $this->crt,
            'cnae' => $this->cnae,
            'logradouro' => $this->logradouro,
            'numero' => $this->numero,
            'bairro' => $this->bairro,
            'municipio' => $this->municipio,
            'uf' => $this->uf,
            'cep' => $this->cep,
            'ibge' => $this->ibge,
            'situacao' => $this->situacao,
            'venda_ativa' => $this->venda_ativa,
        ];
    }
}
