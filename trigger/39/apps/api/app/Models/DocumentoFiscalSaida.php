<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentoFiscalSaida extends Model
{
    protected $table = 'documento_fiscal_saidas';

    public const TIPO_NFE = 'NFE';

    public const TIPO_NFSE = 'NFSE';

    public const MODELO_NFE = '55';

    public const MODELO_NFSE = 'NFSEN';

    public const STATUS_PLANEJADO = 'PLANEJADO';

    public const STATUS_PROCESSANDO = 'PROCESSANDO';

    public const STATUS_AUTORIZADO = 'AUTORIZADO';

    public const STATUS_REJEITADO = 'REJEITADO';

    public const STATUS_ERRO = 'ERRO';

    public const STATUS_CANCELADO = 'CANCELADO';

    /** @var list<string> */
    public const TIPOS = [self::TIPO_NFE, self::TIPO_NFSE];

    protected $fillable = [
        'empresa_id',
        'codigo',
        'faturamento_id',
        'pedido_id',
        'parceiro_id',
        'fiscal_hub_id',
        'tipo',
        'modelo',
        'status',
        'ambiente',
        'ref',
        'serie',
        'numero',
        'chave',
        'protocolo',
        'mensagem',
        'valor',
        'payload_json',
        'response_json',
        'enviado_em',
        'autorizado_em',
        'criado_por',
    ];

    protected function casts(): array
    {
        return [
            'serie' => 'integer',
            'numero' => 'integer',
            'valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'payload_json' => 'array',
            'response_json' => 'array',
            'enviado_em' => 'datetime',
            'autorizado_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function faturamento(): BelongsTo
    {
        return $this->belongsTo(Faturamento::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function fiscalHub(): BelongsTo
    {
        return $this->belongsTo(FiscalHub::class);
    }

    public function podeEnviar(): bool
    {
        return in_array($this->status, [
            self::STATUS_PLANEJADO,
            self::STATUS_ERRO,
            self::STATUS_REJEITADO,
        ], true);
    }

    public function bloqueiaEstornoFat(): bool
    {
        return in_array($this->status, [
            self::STATUS_PROCESSANDO,
            self::STATUS_AUTORIZADO,
        ], true);
    }
}
