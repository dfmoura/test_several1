<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Relatorio extends Model
{
    use SoftDeletes;

    public const ORIENTACAO_RETRATO = 'retrato';

    public const ORIENTACAO_PAISAGEM = 'paisagem';

    /** @var list<string> */
    public const ORIENTACOES = [
        self::ORIENTACAO_RETRATO,
        self::ORIENTACAO_PAISAGEM,
    ];

    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_PROCESSANDO = 'PROCESSANDO';

    public const STATUS_CONCLUIDO = 'CONCLUIDO';

    public const STATUS_ERRO = 'ERRO';

    public const STATUS_CANCELADO = 'CANCELADO';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_PENDENTE,
        self::STATUS_PROCESSANDO,
        self::STATUS_CONCLUIDO,
        self::STATUS_ERRO,
        self::STATUS_CANCELADO,
    ];

    /** @var list<string> */
    public const STATUSES_REPROCESSAVEIS = [
        self::STATUS_CONCLUIDO,
        self::STATUS_ERRO,
    ];

    protected $fillable = [
        'empresa_id',
        'ano',
        'numero',
        'codigo',
        'titulo',
        'prompt',
        'orientacao',
        'status',
        'programa_json',
        'contexto_flags',
        'erro_mensagem',
        'arquivo_path',
        'provedor_ia_id',
        'criado_por',
    ];

    protected function casts(): array
    {
        return [
            'ano' => 'integer',
            'numero' => 'integer',
            'programa_json' => 'array',
            'contexto_flags' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function provedorIa(): BelongsTo
    {
        return $this->belongsTo(IaProvedor::class, 'provedor_ia_id');
    }

    public function isReprocessavel(): bool
    {
        return in_array($this->status, self::STATUSES_REPROCESSAVEIS, true)
            && $this->deleted_at === null;
    }

    public function isDownloadable(): bool
    {
        return $this->status === self::STATUS_CONCLUIDO
            && filled($this->arquivo_path)
            && $this->deleted_at === null;
    }
}
