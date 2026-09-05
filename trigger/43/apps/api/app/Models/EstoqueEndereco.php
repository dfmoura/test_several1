<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Endereço físico do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Gabarito canônico: 6 prateleiras × 4 colunas × 4 vãos.
 */
class EstoqueEndereco extends Model
{
    public const PRATELEIRAS = 6;

    public const COLUNAS = 4;

    public const VAOS = 4;

    public const LARGURA_M = '1.500';

    public const PROFUNDIDADE_M = '0.600';

    public const ALTURA_M = '1.000';

    protected $table = 'estoque_enderecos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'prateleira',
        'coluna',
        'vao',
        'largura_m',
        'profundidade_m',
        'altura_m',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'prateleira' => 'integer',
            'coluna' => 'integer',
            'vao' => 'integer',
            'largura_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'profundidade_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'altura_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(EstoqueLote::class, 'endereco_id');
    }

    public static function codigoDe(int $prateleira, int $coluna, int $vao): string
    {
        return sprintf('P%02d-C%02d-V%02d', $prateleira, $coluna, $vao);
    }

    public function qrPayload(): string
    {
        return 'END:'.$this->empresa_id.':'.$this->id.':'.$this->codigo;
    }
}
