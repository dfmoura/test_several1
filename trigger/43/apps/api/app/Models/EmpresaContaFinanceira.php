<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmpresaContaFinanceira extends Model
{
    use SoftDeletes;

    public const TIPO_BANCO = 'BANCO';

    public const TIPO_CAIXA = 'CAIXA';

    public const TIPO_APLICACAO = 'APLICACAO';

    public const TIPOS = [
        self::TIPO_BANCO,
        self::TIPO_CAIXA,
        self::TIPO_APLICACAO,
    ];

    public const TIPOS_CONTA = ['CORRENTE', 'POUPANCA', 'PAGAMENTO'];

    protected $table = 'empresa_contas_financeiras';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tipo',
        'descricao',
        'banco_codigo',
        'banco_nome',
        'agencia',
        'conta',
        'tipo_conta',
        'pix_chave',
        'principal',
        'ativa',
        'ordem',
        'saldo_abertura',
        'saldo_abertura_em',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'boolean',
            'ativa' => 'boolean',
            'ordem' => 'integer',
            'saldo_abertura' => 'decimal:2',
            'saldo_abertura_em' => 'date',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
