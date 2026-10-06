<?php

namespace App\Models;

use App\Domain\RegraNegocio;
use Illuminate\Database\Eloquent\Model;

class Parametro extends Model
{
    public const CREATED_AT = null;

    public const UPDATED_AT = 'atualizado_em';

    protected $table = 'parametros';

    protected $primaryKey = 'chave';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    public static function inteiro(string $chave): int
    {
        $valor = static::query()->where('chave', $chave)->value('valor');
        if ($valor === null) {
            throw new RegraNegocio("Parâmetro {$chave} não configurado.");
        }

        return (int) $valor;
    }
}
