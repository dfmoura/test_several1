<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Proposta extends Model
{
    public $timestamps = false;

    protected $table = 'propostas';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'valida_ate' => 'datetime',
            'criada_em' => 'datetime',
        ];
    }

    public function demanda(): BelongsTo
    {
        return $this->belongsTo(Demanda::class);
    }

    public function snapshot(): array
    {
        return [
            'versao' => $this->versao,
            'objetivo' => $this->objetivo,
            'contexto' => $this->contexto,
            'descricao_funcional' => $this->descricao_funcional,
            'requisitos' => $this->requisitos,
            'criterios_aceite' => $this->criterios_aceite,
            'premissas' => $this->premissas,
            'restricoes' => $this->restricoes,
            'incluso' => $this->incluso,
            'nao_incluso' => $this->nao_incluso,
            'prazo_dias_uteis' => $this->prazo_dias_uteis,
            'valor_centavos' => $this->valor_centavos,
            'observacao' => $this->observacao,
        ];
    }
}
