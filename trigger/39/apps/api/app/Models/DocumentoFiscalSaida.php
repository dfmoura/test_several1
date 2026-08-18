<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    public const ORIGEM_FOCUS = 'FOCUS';

    public const ORIGEM_STUB = 'STUB';

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
        'autorizacao_origem',
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

    public function saidaEstoque(): HasOne
    {
        return $this->hasOne(EstoqueMovimento::class, 'documento_fiscal_saida_id');
    }

    public function podeEnviar(): bool
    {
        if (in_array($this->status, [
            self::STATUS_PLANEJADO,
            self::STATUS_ERRO,
            self::STATUS_REJEITADO,
        ], true)) {
            return true;
        }

        // Stub local pode ser promovido à autorização Focus (mesma ref) quando o hub ficar apto.
        return $this->status === self::STATUS_AUTORIZADO && $this->eSimulado();
    }

    public function eOficial(): bool
    {
        return $this->status === self::STATUS_AUTORIZADO && ! $this->eSimulado();
    }

    public function eSimulado(): bool
    {
        return $this->status === self::STATUS_AUTORIZADO
            && $this->autorizacao_origem === self::ORIGEM_STUB;
    }

    public function bloqueiaEstornoFat(): bool
    {
        if ($this->status === self::STATUS_PROCESSANDO) {
            return true;
        }

        return $this->eOficial();
    }
}
