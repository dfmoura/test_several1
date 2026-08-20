<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IaProvedor extends Model
{
    protected $table = 'ia_provedores';

    public const PROVEDORES = [
        'openai',
        'gemini',
        'anthropic',
        'deepseek',
        'groq',
        'mistral',
        'xai',
        'openrouter',
        'together',
        'perplexity',
        'openai_compatible',
    ];

    protected $fillable = [
        'nome',
        'provedor',
        'base_url',
        'modelo',
        'api_key_criptografada',
        'api_key_mascara',
        'prioridade',
        'ativo',
        'ultimo_teste_em',
        'ultimo_teste_ok',
        'ultimo_teste_msg',
    ];

    protected $hidden = [
        'api_key_criptografada',
    ];

    protected function casts(): array
    {
        return [
            'prioridade' => 'integer',
            'ativo' => 'boolean',
            'ultimo_teste_ok' => 'boolean',
            'ultimo_teste_em' => 'datetime',
        ];
    }
}
