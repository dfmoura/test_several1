<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Item de backlog da EMP (ADR_BACKLOG.md).
 * Lançamento = created_at; conclusão = concluido_em (ambos automáticos).
 */
class BacklogItem extends Model
{
    use BelongsToEmpresa;
    use SoftDeletes;

    protected $table = 'backlog_itens';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tarefa',
        'concluido_em',
        'observacao_conclusao',
    ];

    protected function casts(): array
    {
        return [
            'concluido_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function isConcluido(): bool
    {
        return $this->concluido_em !== null;
    }
}
