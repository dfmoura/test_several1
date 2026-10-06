<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NfseDocumento extends Model
{
    public const CREATED_AT = null;

    public const UPDATED_AT = 'atualizado_em';

    protected $table = 'nfse_documentos';

    protected $guarded = ['id'];
}
