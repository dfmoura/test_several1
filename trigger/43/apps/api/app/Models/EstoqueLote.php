<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use App\Support\ProdutoLotePolitica;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EstoqueLote extends Model
{
    public const ORIGEM_ENTRADA_COMPRA = 'ENTRADA_COMPRA';

    public const ORIGEM_AJUSTE = 'AJUSTE';

    public const ORIGEM_VIRADA = 'VIRADA';

    public const ORIGEM_BACKFILL = 'BACKFILL';

    public const ORIGEM_PRODUCAO = 'PRODUCAO';

    protected $table = 'estoque_lotes';

    protected $fillable = [
        'empresa_id',
        'produto_id',
        'codigo',
        'data_entrada',
        'data_fabricacao',
        'data_validade',
        'qtde',
        'unidade',
        'origem_tipo',
        'origem_id',
        'nf_numero',
        'observacao',
        'largura_mm',
        'comprimento_m',
        'endereco_id',
        'qr_token',
    ];

    protected function casts(): array
    {
        return [
            'data_entrada' => 'date',
            'data_fabricacao' => 'date',
            'data_validade' => 'date',
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'largura_mm' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'comprimento_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function endereco(): BelongsTo
    {
        return $this->belongsTo(EstoqueEndereco::class, 'endereco_id');
    }

    public function movimentoItens(): HasMany
    {
        return $this->hasMany(EstoqueMovimentoItem::class, 'lote_id');
    }

    public function statusValidade(?string $hoje = null): string
    {
        $data = $this->data_validade?->format('Y-m-d');

        return ProdutoLotePolitica::statusValidade($data, $hoje);
    }

    public function ensureQrToken(): string
    {
        if (is_string($this->qr_token) && $this->qr_token !== '') {
            return $this->qr_token;
        }

        $this->qr_token = bin2hex(random_bytes(16));
        $this->save();

        return $this->qr_token;
    }

    public function qrPayload(): string
    {
        return 'VOL:'.$this->empresa_id.':'.$this->id.':'.$this->ensureQrToken();
    }
}
