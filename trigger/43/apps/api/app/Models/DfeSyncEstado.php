<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cursor NSU / estado de sync DF-e por EMP (ADR_CAIXA_DFE_NFE_DESTINADAS).
 * Jobs de sync = BL-091 — este modelo só persiste o estado.
 */
class DfeSyncEstado extends Model
{
    use BelongsToEmpresa;

    public const STATUS_IDLE = 'IDLE';

    public const STATUS_RUNNING = 'RUNNING';

    public const STATUS_ERRO = 'ERRO';

    protected $table = 'dfe_sync_estados';

    protected $fillable = [
        'empresa_id',
        'ultimo_nsu',
        'max_nsu',
        'sync_status',
        'sync_mensagem',
        'ultima_sync_em',
        'primeira_hidratacao_completa',
        'ano_alvo_hidratacao',
    ];

    protected function casts(): array
    {
        return [
            'ultima_sync_em' => 'datetime',
            'primeira_hidratacao_completa' => 'boolean',
            'ano_alvo_hidratacao' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
