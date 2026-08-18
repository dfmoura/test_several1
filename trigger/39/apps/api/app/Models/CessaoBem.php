<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Cessão de BEM ao cliente (comodato). Não é FAT nem documento fiscal.
 */
class CessaoBem extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    protected $table = 'cessoes_bem';

    public const TIPO_COMODATO = 'COMODATO';

    public const TIPO_LOCACAO = 'LOCACAO';

    /** @var list<string> */
    public const TIPOS = [self::TIPO_COMODATO, self::TIPO_LOCACAO];

    public const STATUS_VIGENTE = 'VIGENTE';

    public const STATUS_ENCERRADA = 'ENCERRADA';

    public const STATUS_CANCELADA = 'CANCELADA';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_VIGENTE,
        self::STATUS_ENCERRADA,
        self::STATUS_CANCELADA,
    ];

    public const DOC_NENHUM = 'NENHUM';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'bem_id',
        'parceiro_id',
        'tipo',
        'status',
        'iniciado_em',
        'encerra_previsto_em',
        'encerrado_em',
        'motivo_encerramento',
        'valor_mensal',
        'documento_fiscal',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'iniciado_em' => 'date',
            'encerra_previsto_em' => 'date',
            'encerrado_em' => 'date',
            'valor_mensal' => 'decimal:2',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function bem(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_id');
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }
}
