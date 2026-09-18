<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaEmbalagemCaixa extends Model
{
    protected $table = 'pa_embalagem_caixas';

    protected $fillable = [
        'empresa_id',
        'embalagem_id',
        'sequencia',
        'codigo',
        'qtde_bobinas',
        'qtde_etiquetas',
        'qr_token',
    ];

    protected function casts(): array
    {
        return [
            'sequencia' => 'integer',
            'qtde_bobinas' => 'integer',
            'qtde_etiquetas' => 'decimal:'.PadraoDecimal::SCALE_QTY,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function embalagem(): BelongsTo
    {
        return $this->belongsTo(PaEmbalagem::class, 'embalagem_id');
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
        return 'CX:'.$this->empresa_id.':'.$this->id.':'.$this->ensureQrToken();
    }
}
