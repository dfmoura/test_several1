<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NfseTomada extends Model
{
    protected $table = 'nfse_tomadas';

    public const SITUACAO_CAIXA = 'NA_CAIXA';

    public const SITUACAO_VINCULADA = 'VINCULADA';

    public const SITUACAO_SEM_INTERESSE = 'SEM_INTERESSE';

    public const SITUACAO_EVENTO = 'EVENTO';

    /** @var list<string> */
    public const SITUACOES = [
        self::SITUACAO_CAIXA,
        self::SITUACAO_VINCULADA,
        self::SITUACAO_SEM_INTERESSE,
        self::SITUACAO_EVENTO,
    ];

    protected $fillable = [
        'empresa_id',
        'nsu',
        'tipo_documento',
        'chave',
        'numero',
        'data_emissao',
        'emit_cnpj',
        'emit_nome',
        'valor_total',
        'situacao',
        'parceiro_id',
        'xml',
        'vinculado_em',
    ];

    protected $hidden = [
        'xml',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao' => 'date',
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'vinculado_em' => 'datetime',
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

    public function titulos(): HasMany
    {
        return $this->hasMany(Titulo::class, 'nfse_tomada_id');
    }
}
