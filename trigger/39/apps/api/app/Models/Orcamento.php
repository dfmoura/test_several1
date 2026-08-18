<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Orcamento extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_RASCUNHO = 'RASCUNHO';

    public const STATUS_CALCULADO = 'CALCULADO';

    public const STATUS_ENVIADO = 'ENVIADO';

    public const STATUS_VISUALIZADO = 'VISUALIZADO';

    public const STATUS_APROVADO = 'APROVADO';

    public const STATUS_REPROVADO = 'REPROVADO';

    public const STATUS_VENCIDO = 'VENCIDO';

    public const STATUS_CANCELADO = 'CANCELADO';

    public const CANAL_LINK = 'LINK';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_RASCUNHO,
        self::STATUS_CALCULADO,
        self::STATUS_ENVIADO,
        self::STATUS_VISUALIZADO,
        self::STATUS_APROVADO,
        self::STATUS_REPROVADO,
        self::STATUS_VENCIDO,
        self::STATUS_CANCELADO,
    ];

    /**
     * Em preparação + rejeitado (pode recalcular e reenviar).
     * Enviado/aprovado/vencido/cancelado ficam travados.
     *
     * @var list<string>
     */
    public const STATUSES_EDITAVEIS = [
        self::STATUS_RASCUNHO,
        self::STATUS_CALCULADO,
        self::STATUS_REPROVADO,
    ];

    /** @var list<string> */
    public const STATUSES_AGUARDANDO_CLIENTE = [
        self::STATUS_ENVIADO,
        self::STATUS_VISUALIZADO,
    ];

    /**
     * CALCULADO/REPROVADO = 1º envio ou reenvio após recusa.
     * ENVIADO/VISUALIZADO = lembrete (mesmo link ativo).
     *
     * @var list<string>
     */
    public const STATUSES_ENVIAVEIS = [
        self::STATUS_CALCULADO,
        self::STATUS_REPROVADO,
        self::STATUS_ENVIADO,
        self::STATUS_VISUALIZADO,
    ];

    protected $fillable = [
        'empresa_id',
        'ano',
        'numero',
        'codigo',
        'versao',
        'parceiro_id',
        'vendedor_parceiro_id',
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
        'enviado_em',
        'visualizado_em',
        'decidido_em',
        'canal_aprovacao',
        'aceite_nome_cliente',
        'aceite_faixa_index',
        'aceite_ip',
        'aceite_user_agent',
        'motivo_decisao',
        'financeiro_status',
        'adiantamento_titulo_id',
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
            'enviado_em' => 'datetime',
            'visualizado_em' => 'datetime',
            'decidido_em' => 'datetime',
            'aceite_faixa_index' => 'integer',
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

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'vendedor_parceiro_id');
    }

    public function linkAprovacao(): HasOne
    {
        return $this->hasOne(OrcamentoLinkAprovacao::class);
    }

    public function adiantamentoTitulo(): BelongsTo
    {
        return $this->belongsTo(Titulo::class, 'adiantamento_titulo_id');
    }

    public function pedido(): HasOne
    {
        return $this->hasOne(Pedido::class);
    }

    public function isEditavel(): bool
    {
        return in_array($this->status, self::STATUSES_EDITAVEIS, true)
            && $this->deleted_at === null;
    }

    public function isEnviavel(): bool
    {
        return in_array($this->status, self::STATUSES_ENVIAVEIS, true)
            && $this->deleted_at === null
            && is_array($this->result_snapshot)
            && ! empty($this->result_snapshot['faixas'] ?? null);
    }

    public function aguardandoCliente(): bool
    {
        return in_array($this->status, self::STATUSES_AGUARDANDO_CLIENTE, true);
    }
}
