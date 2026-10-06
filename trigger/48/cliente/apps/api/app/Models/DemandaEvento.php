<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandaEvento extends Model
{
    public $timestamps = false;

    protected $table = 'demanda_eventos';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['em' => 'datetime'];
    }
}
