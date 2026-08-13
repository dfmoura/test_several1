<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class NaturezaGerencial extends Model
{
    use SoftDeletes;

    public const GRUPOS = [1, 2, 3, 4, 5];

    public const GRUPO_NOMES = [
        1 => 'Receitas',
        2 => 'Custos operacionais',
        3 => 'Despesas operacionais',
        4 => 'Investimentos / patrimônio',
        5 => 'Movimentações não-resultado',
    ];

    protected $table = 'naturezas_gerenciais';

    protected $fillable = [
        'codigo',
        'codigo_exibicao',
        'grupo',
        'nivel',
        'parent_id',
        'nome',
        'descricao',
        'aceita_lancamento',
        'ativo',
        'ordenacao',
    ];

    protected function casts(): array
    {
        return [
            'grupo' => 'integer',
            'nivel' => 'integer',
            'aceita_lancamento' => 'boolean',
            'ativo' => 'boolean',
            'ordenacao' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('ordenacao')->orderBy('codigo');
    }

    public function isAtivo(): bool
    {
        return (bool) $this->ativo;
    }

    public function isFolha(): bool
    {
        return (bool) $this->aceita_lancamento;
    }

    public function grupoNome(): string
    {
        return self::GRUPO_NOMES[$this->grupo] ?? 'Grupo '.$this->grupo;
    }

    public static function codigoExibicaoFrom(string $codigo): string
    {
        return 'NAT-'.$codigo;
    }
}
