<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImplantacaoAceite extends Model
{
    use BelongsToEmpresa;

    protected $table = 'implantacao_aceites';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'status_dev',
        'status_cliente',
        'obs_dev',
        'obs_cliente',
        'validado_dev_por',
        'validado_dev_em',
        'validado_cliente_por',
        'validado_cliente_em',
    ];

    protected function casts(): array
    {
        return [
            'validado_dev_em' => 'datetime',
            'validado_cliente_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function validadoDevPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_dev_por');
    }

    public function validadoClientePor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_cliente_por');
    }
}
