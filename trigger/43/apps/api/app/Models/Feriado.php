<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Feriado operacional da EMP (ADR-043-FER-001).
 */
class Feriado extends Model
{
    use BelongsToEmpresa;
    use SoftDeletes;

    public const TIPO_NACIONAL = 'NACIONAL';

    public const TIPO_ESTADUAL = 'ESTADUAL';

    public const TIPO_MUNICIPAL = 'MUNICIPAL';

    public const TIPO_EMPRESA = 'EMPRESA';

    /** @var list<string> */
    public const TIPOS = [
        self::TIPO_NACIONAL,
        self::TIPO_ESTADUAL,
        self::TIPO_MUNICIPAL,
        self::TIPO_EMPRESA,
    ];

    /**
     * Feriados nacionais fixos (móveis ex.: Carnaval ficam fora do seed).
     *
     * @var list<array{mes: int, dia: int, nome: string}>
     */
    public const NACIONAIS_FIXOS = [
        ['mes' => 1, 'dia' => 1, 'nome' => 'Confraternização Universal'],
        ['mes' => 4, 'dia' => 21, 'nome' => 'Tiradentes'],
        ['mes' => 5, 'dia' => 1, 'nome' => 'Dia do Trabalho'],
        ['mes' => 9, 'dia' => 7, 'nome' => 'Independência do Brasil'],
        ['mes' => 10, 'dia' => 12, 'nome' => 'Nossa Senhora Aparecida'],
        ['mes' => 11, 'dia' => 2, 'nome' => 'Finados'],
        ['mes' => 11, 'dia' => 15, 'nome' => 'Proclamação da República'],
        ['mes' => 11, 'dia' => 20, 'nome' => 'Dia da Consciência Negra'],
        ['mes' => 12, 'dia' => 25, 'nome' => 'Natal'],
    ];

    protected $fillable = [
        'empresa_id',
        'data',
        'nome',
        'tipo',
        'recorrente_anual',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'recorrente_anual' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
