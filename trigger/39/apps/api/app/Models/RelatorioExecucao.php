<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelatorioExecucao extends Model
{
    public $timestamps = false;

    protected $table = 'relatorio_execucoes';

    protected $fillable = [
        'relatorio_id',
        'planejamento_id',
        'empresa_id',
        'usuario_id',
        'etapa',
        'provedor_ia_id',
        'modelo',
        'tentativa',
        'prompt_hash',
        'prompt_texto',
        'prompt_tokens',
        'completion_tokens',
        'latencia_ms',
        'sucesso',
        'erro',
        'spec_resultante',
        'memory_peak_mb',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'sucesso' => 'boolean',
            'spec_resultante' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function relatorio(): BelongsTo
    {
        return $this->belongsTo(Relatorio::class);
    }

    public function provedorIa(): BelongsTo
    {
        return $this->belongsTo(IaProvedor::class, 'provedor_ia_id');
    }
}
