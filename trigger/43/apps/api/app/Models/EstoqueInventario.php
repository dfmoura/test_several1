<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EstoqueInventario extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const TIPO_ROTATIVO = 'ROTATIVO';

    public const TIPO_GERAL = 'GERAL';

    public const TIPO_VIRADA = 'VIRADA';

    public const TIPOS = [
        self::TIPO_ROTATIVO,
        self::TIPO_GERAL,
        self::TIPO_VIRADA,
    ];

    public const STATUS_ABERTO = 'ABERTO';

    public const STATUS_EM_CONTAGEM = 'EM_CONTAGEM';

    public const STATUS_CONFRONTADO = 'CONFRONTADO';

    public const STATUS_ENCERRADO = 'ENCERRADO';

    public const STATUS_CANCELADO = 'CANCELADO';

    public const STATUSES = [
        self::STATUS_ABERTO,
        self::STATUS_EM_CONTAGEM,
        self::STATUS_CONFRONTADO,
        self::STATUS_ENCERRADO,
        self::STATUS_CANCELADO,
    ];

    protected $table = 'estoque_inventarios';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tipo',
        'status',
        'iniciado_em',
        'encerrado_em',
        'acuracidade_pct',
        'skus_contados',
        'skus_ok',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'iniciado_em' => 'datetime',
            'encerrado_em' => 'datetime',
            'acuracidade_pct' => 'decimal:4',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(EstoqueInventarioItem::class, 'inventario_id');
    }

    /** Origem de AJU correspondente ao tipo do INV. */
    public function origemAjuste(): string
    {
        return match ($this->tipo) {
            self::TIPO_GERAL => EstoqueAjuste::ORIGEM_INV_GERAL,
            self::TIPO_VIRADA => EstoqueAjuste::ORIGEM_VIRADA,
            default => EstoqueAjuste::ORIGEM_INV_ROTATIVO,
        };
    }

    public function motivoPadrao(): string
    {
        return match ($this->tipo) {
            self::TIPO_GERAL => 'A02',
            self::TIPO_VIRADA => 'A03',
            default => 'A01',
        };
    }
}
