<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodigoSequence extends Model
{
    protected $table = 'codigo_sequences';

    protected $fillable = [
        'empresa_id',
        'prefixo',
        'proximo',
    ];

    protected function casts(): array
    {
        return [
            'proximo' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
