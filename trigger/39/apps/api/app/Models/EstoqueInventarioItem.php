<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueInventarioItem extends Model
{
    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_EM_CONTAGEM = 'EM_CONTAGEM';

    public const STATUS_CONTADO_1 = 'CONTADO_1';

    public const STATUS_DIVERGENTE = 'DIVERGENTE';

    public const STATUS_RECONTADO = 'RECONTADO';

    public const STATUS_OK = 'OK';

    public const STATUS_AJU_PENDENTE = 'AJU_PENDENTE';

    public const STATUS_AJU_GERADO = 'AJU_GERADO';

    /** Status que congelam o SKU (bloqueiam receber / AJU avulso). */
    public const STATUSES_CONGELADOS = [
        self::STATUS_EM_CONTAGEM,
        self::STATUS_CONTADO_1,
        self::STATUS_DIVERGENTE,
        self::STATUS_RECONTADO,
        self::STATUS_AJU_PENDENTE,
    ];

    public const STATUSES = [
        self::STATUS_PENDENTE,
        self::STATUS_EM_CONTAGEM,
        self::STATUS_CONTADO_1,
        self::STATUS_DIVERGENTE,
        self::STATUS_RECONTADO,
        self::STATUS_OK,
        self::STATUS_AJU_PENDENTE,
        self::STATUS_AJU_GERADO,
    ];

    protected $table = 'estoque_inventario_itens';

    protected $fillable = [
        'inventario_id',
        'empresa_id',
        'produto_id',
        'qtde_sistema_corte',
        'unidade',
        'qtde_1',
        'contado_por_1',
        'contado_em_1',
        'qtde_2',
        'contado_por_2',
        'contado_em_2',
        'qtde_final',
        'qtde_diferenca',
        'status',
        'ajuste_id',
        'checklist_confirmado',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'qtde_sistema_corte' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_1' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_2' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_final' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_diferenca' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'contado_em_1' => 'datetime',
            'contado_em_2' => 'datetime',
            'checklist_confirmado' => 'boolean',
        ];
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(EstoqueInventario::class, 'inventario_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function ajuste(): BelongsTo
    {
        return $this->belongsTo(EstoqueAjuste::class, 'ajuste_id');
    }

    public function contadoPor1User(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contado_por_1');
    }

    public function contadoPor2User(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contado_por_2');
    }

    public function estaCongelado(): bool
    {
        return in_array($this->status, self::STATUSES_CONGELADOS, true);
    }
}
