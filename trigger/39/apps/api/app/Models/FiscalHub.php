<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalHub extends Model
{
    protected $table = 'fiscal_hubs';

    public const PROVEDORES = [
        'focusnfe',
        'generico',
    ];

    public const AMBIENTES = [
        'homologacao',
        'producao',
    ];

    /** URLs oficiais Focus NFe (doc.focusnfe.com.br/reference/ambiente). */
    public const FOCUS_URL_HOMOLOGACAO = 'https://homologacao.focusnfe.com.br';

    public const FOCUS_URL_PRODUCAO = 'https://api.focusnfe.com.br';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'nome',
        'provedor',
        'ambiente_ativo',
        'padrao',
        'ativo',
        'emissao_habilitada',
        'emissao_habilitada_em',
        'base_url_homologacao',
        'base_url_producao',
        'token_homologacao_criptografada',
        'token_homologacao_mascara',
        'token_producao_criptografada',
        'token_producao_mascara',
        'ultimo_teste_ambiente',
        'ultimo_teste_em',
        'ultimo_teste_ok',
        'ultimo_teste_msg',
        'meta',
    ];

    protected $hidden = [
        'token_homologacao_criptografada',
        'token_producao_criptografada',
    ];

    protected function casts(): array
    {
        return [
            'padrao' => 'boolean',
            'ativo' => 'boolean',
            'emissao_habilitada' => 'boolean',
            'emissao_habilitada_em' => 'datetime',
            'ultimo_teste_ok' => 'boolean',
            'ultimo_teste_em' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function baseUrlPara(string $ambiente): string
    {
        $override = $ambiente === 'producao'
            ? $this->base_url_producao
            : $this->base_url_homologacao;

        if (is_string($override) && trim($override) !== '') {
            return rtrim(trim($override), '/');
        }

        if ($this->provedor === 'focusnfe') {
            return $ambiente === 'producao'
                ? self::FOCUS_URL_PRODUCAO
                : self::FOCUS_URL_HOMOLOGACAO;
        }

        throw new \RuntimeException(
            "Hub {$this->codigo}: informe base_url_{$ambiente} para o provedor {$this->provedor}."
        );
    }

    public function temToken(string $ambiente): bool
    {
        $cipher = $ambiente === 'producao'
            ? $this->token_producao_criptografada
            : $this->token_homologacao_criptografada;

        return is_string($cipher) && $cipher !== '';
    }
}
