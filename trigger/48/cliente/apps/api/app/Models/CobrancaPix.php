<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CobrancaPix extends Model
{
    public $timestamps = false;

    protected $table = 'cobrancas_pix';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'expira_em' => 'datetime',
            'criada_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function fatura(): BelongsTo
    {
        return $this->belongsTo(Fatura::class);
    }
}
