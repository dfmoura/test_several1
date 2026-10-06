<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensagem extends Model
{
    public $timestamps = false;

    protected $table = 'mensagens';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['criada_em' => 'datetime'];
    }

    public function demanda(): BelongsTo
    {
        return $this->belongsTo(Demanda::class);
    }
}
