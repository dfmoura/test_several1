<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vinculo extends Model
{
    public $timestamps = false;

    protected $table = 'vinculos';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'aceite_em' => 'datetime',
            'criado_em' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
