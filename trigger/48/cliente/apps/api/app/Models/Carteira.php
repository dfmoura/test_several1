<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Carteira extends Model
{
    public const CREATED_AT = null;

    public const UPDATED_AT = 'atualizada_em';

    protected $table = 'carteiras';

    protected $guarded = ['id'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
