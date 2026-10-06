<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PapelPermissao extends Model
{
    public $timestamps = false;

    protected $table = 'papel_permissoes';

    protected $guarded = ['id'];
}
