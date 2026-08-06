<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelatorioPlanejamento extends Model
{
    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_PROCESSANDO = 'PROCESSANDO';

    public const STATUS_PRONTO = 'PRONTO';

    public const STATUS_ERRO = 'ERRO';

    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'prompt',
        'titulo',
        'orientacao',
        'status',
        'programa_json',
        'resumo_legivel',
        'amostra_json',
        'total_estimado',
        'avisos_json',
        'contexto_flags',
        'provedor_ia_id',
        'tentativas',
        'erro_mensagem',
    ];

    protected function casts(): array
    {
        return [
            'programa_json' => 'array',
            'amostra_json' => 'array',
            'avisos_json' => 'array',
            'contexto_flags' => 'array',
            'total_estimado' => 'integer',
            'tentativas' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function provedorIa(): BelongsTo
    {
        return $this->belongsTo(IaProvedor::class, 'provedor_ia_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_PRONTO, self::STATUS_ERRO], true);
    }
}
