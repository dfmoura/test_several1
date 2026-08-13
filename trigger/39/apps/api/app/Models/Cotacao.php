<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cotacao extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_RASCUNHO = 'RASCUNHO';

    public const STATUS_ABERTA = 'ABERTA';

    public const STATUS_DECIDIDA = 'DECIDIDA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUSES = [
        self::STATUS_RASCUNHO,
        self::STATUS_ABERTA,
        self::STATUS_DECIDIDA,
        self::STATUS_CANCELADA,
    ];

    protected $table = 'cotacoes';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'status',
        'necessidade_id',
        'prazo_resposta',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'prazo_resposta' => 'date',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function necessidade(): BelongsTo
    {
        return $this->belongsTo(CompraNecessidade::class, 'necessidade_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CotacaoItem::class, 'cotacao_id')->orderBy('ordem');
    }

    public function propostas(): HasMany
    {
        return $this->hasMany(CotacaoProposta::class, 'cotacao_id');
    }

    public function ordensCompra(): HasMany
    {
        return $this->hasMany(OrdemCompra::class, 'cotacao_id');
    }
}
