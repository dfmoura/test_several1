<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueInventarioLeitura extends Model
{
    public const RESULTADO_ENCONTRADO = 'ENCONTRADO';

    public const RESULTADO_LOCAL_ERRADO = 'LOCAL_ERRADO';

    public const RESULTADO_FALTANTE = 'FALTANTE';

    public const RESULTADO_FORA_ESCOPO = 'FORA_ESCOPO';

    public const RESULTADO_ANULADA = 'ANULADA';

    /** Volumes que entram no rollup de quantidade do SKU. */
    public const RESULTADOS_ENCONTRADOS = [
        self::RESULTADO_ENCONTRADO,
        self::RESULTADO_LOCAL_ERRADO,
    ];

    public const RESULTADOS = [
        self::RESULTADO_ENCONTRADO,
        self::RESULTADO_LOCAL_ERRADO,
        self::RESULTADO_FALTANTE,
        self::RESULTADO_FORA_ESCOPO,
        self::RESULTADO_ANULADA,
    ];

    protected $table = 'estoque_inventario_leituras';

    protected $fillable = [
        'inventario_id',
        'empresa_id',
        'rodada',
        'lote_id',
        'produto_id',
        'endereco_id_lido',
        'endereco_id_esperado',
        'qtde_volume',
        'unidade',
        'resultado',
        'lido_por',
        'lido_em',
    ];

    protected function casts(): array
    {
        return [
            'qtde_volume' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'lido_em' => 'datetime',
            'rodada' => 'integer',
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

    public function lote(): BelongsTo
    {
        return $this->belongsTo(EstoqueLote::class, 'lote_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function enderecoLido(): BelongsTo
    {
        return $this->belongsTo(EstoqueEndereco::class, 'endereco_id_lido');
    }

    public function enderecoEsperado(): BelongsTo
    {
        return $this->belongsTo(EstoqueEndereco::class, 'endereco_id_esperado');
    }

    public function lidoPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lido_por');
    }

    public function estaAtiva(): bool
    {
        return $this->resultado !== self::RESULTADO_ANULADA;
    }

    public function contaNoRollup(): bool
    {
        return in_array($this->resultado, self::RESULTADOS_ENCONTRADOS, true);
    }
}
