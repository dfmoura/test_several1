<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Unidade organizacional da EMP (ADR-039-DEP-001).
 * Consumidores: colaborador (PAR) e local do patrimônio (BEM).
 * Não confundir com centro de custo (financeiro).
 */
class Departamento extends Model
{
    use BelongsToEmpresa;
    use SoftDeletes;

    /** @var list<string> */
    public const CANONICOS = [
        'Comercial',
        'Produção',
        'Expedição',
        'Financeiro',
        'Fiscal',
        'Administrativo',
        'Operacional',
    ];

    protected $fillable = [
        'empresa_id',
        'codigo',
        'nome',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function parceiros(): HasMany
    {
        return $this->hasMany(Parceiro::class, 'departamento_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'departamento_id');
    }
}