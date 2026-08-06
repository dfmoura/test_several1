<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Orcamento extends Model
{
    use SoftDeletes;

    /** Estados no enum — só RASCUNHO/CALCULADO são operacionais neste BL. */
    public const STATUS_RASCUNHO = 'RASCUNHO';

    public const STATUS_CALCULADO = 'CALCULADO';

    public const STATUS_ENVIADO = 'ENVIADO';

    public const STATUS_APROVADO = 'APROVADO';

    public const STATUS_REPROVADO = 'REPROVADO';

    public const STATUS_VENCIDO = 'VENCIDO';

    public const STATUS_CANCELADO = 'CANCELADO';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_RASCUNHO,
        self::STATUS_CALCULADO,
        self::STATUS_ENVIADO,
        self::STATUS_APROVADO,
        self::STATUS_REPROVADO,
        self::STATUS_VENCIDO,
        self::STATUS_CANCELADO,
    ];

    /** @var list<string> */
    public const STATUSES_EDITAVEIS = [
        self::STATUS_RASCUNHO,
        self::STATUS_CALCULADO,
    ];

    protected $fillable = [
        'empresa_id',
        'ano',
        'numero',
        'codigo',
        'versao',
        'parceiro_id',
        'cliente_nome',
        'status',
        'input_snapshot',
        'result_snapshot',
        'chave_matriz',
        'cobra_matriz',
        'valor_matriz',
        'valor_primeira_faixa',
        'prazo_entrega_dias',
        'validade_dias',
        'tolerancia_qtd_pct',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'ano' => 'integer',
            'numero' => 'integer',
            'versao' => 'integer',
            'input_snapshot' => 'array',
            'result_snapshot' => 'array',
            'cobra_matriz' => 'boolean',
            'valor_matriz' => 'decimal:2',
            'valor_primeira_faixa' => 'decimal:4',
            'prazo_entrega_dias' => 'integer',
            'validade_dias' => 'integer',
            'tolerancia_qtd_pct' => 'decimal:4',
            'deleted_at' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function isEditavel(): bool
    {
        return in_array($this->status, self::STATUSES_EDITAVEIS, true)
            && $this->deleted_at === null;
    }
}
