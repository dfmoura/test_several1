<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public const ORIGEM_FOCUS = 'FOCUS'; // legado

    public const ORIGEM_SEFAZ = 'SEFAZ';

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

        // Stub local pode ser promovido à autorização SEFAZ (mesma ref) quando A1/nuvem ficar apto.
        return $this->status === self::STATUS_AUTORIZADO && $this->eSimulado();
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(DocumentoFiscalSaidaEvento::class, 'documento_fiscal_saida_id');
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

    /**
     * NF-e cancelada na SEFAZ com chave — ainda imprime DANFE completo (barras/chave/portal).
     * Não reabre estorno de FAT nem eventos; só identidade fiscal para exibição.
     */
    public function eCanceladaOficial(): bool
    {
        if ($this->tipo !== self::TIPO_NFE || $this->status !== self::STATUS_CANCELADO) {
            return false;
        }
        if ($this->autorizacao_origem === self::ORIGEM_STUB) {
            return false;
        }
        $chave = preg_replace('/\D+/', '', (string) $this->chave);

        return is_string($chave) && strlen($chave) === 44;
    }

    /** Autorizada ou cancelada oficial — numeração/chave/protocolo no DANFE. */
    public function temNumeracaoFiscal(): bool
    {
        return $this->eOficial() || $this->eSimulado() || $this->eCanceladaOficial();
    }

    public function bloqueiaEstornoFat(): bool
    {
        if ($this->status === self::STATUS_PROCESSANDO) {
            return true;
        }

        return $this->eOficial();
    }
}
