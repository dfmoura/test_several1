<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandaAnexo extends Model
{
    public $timestamps = false;

    protected $table = 'demanda_anexos';

    protected $guarded = ['id'];
}
