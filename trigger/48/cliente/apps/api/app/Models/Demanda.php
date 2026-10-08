<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Demanda extends Model
{
    public const TERMINAIS = [
        'CONCLUIDA',
        'RECUSADA_CLIENTE',
        'RECUSADA_TRIGGER',
        'EXPIRADA',
        'CANCELADA',
    ];

    public $timestamps = false;

    protected $table = 'demandas';

    protected $guarded = ['id'];

    protected $hidden = ['acessos'];

    protected function casts(): array
    {
        return [
            'prazo_desejado' => 'date',
            'aguardando_cliente' => 'boolean',
            'encerrada_em' => 'datetime',
            'criada_em' => 'datetime',
            'acessos' => 'encrypted',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(DemandaEvento::class);
    }

    public function mensagens(): HasMany
    {
        return $this->hasMany(Mensagem::class);
    }

    public function anexos(): HasMany
    {
        return $this->hasMany(DemandaAnexo::class);
    }

    public function propostas(): HasMany
    {
        return $this->hasMany(Proposta::class);
    }

    public function propostaVigente(): HasOne
    {
        return $this->hasOne(Proposta::class)->where('status', 'VIGENTE');
    }

    public function propostaAprovada(): HasOne
    {
        return $this->hasOne(Proposta::class)->where('status', 'APROVADA');
    }

    public function fatura(): HasOne
    {
        return $this->hasOne(Fatura::class);
    }

    public function apresentacao(): HasOne
    {
        return $this->hasOne(Apresentacao::class);
    }

    public function marcos(): HasMany
    {
        return $this->hasMany(Marco::class);
    }

    public function terminal(): bool
    {
        return in_array($this->status, self::TERMINAIS, true);
    }
}
