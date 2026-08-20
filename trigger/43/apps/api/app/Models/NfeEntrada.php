<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NfeEntrada extends Model
{
    use HasUserStamps;

    protected $table = 'nfe_entradas';

    protected $fillable = [
        'empresa_id',
        'movimento_id',
        'ordem_compra_id',
        'fornecedor_id',
        'chave',
        'modelo',
        'serie',
        'numero',
        'data_emissao',
        'nat_op',
        'id_dest',
        'fin_nfe',
        'emit_cnpj',
        'emit_ie',
        'emit_uf',
        'emit_crt',
        'emit_nome',
        'dest_cnpj',
        'dest_ie',
        'dest_uf',
        'totais',
        'xml_path',
        'xml_sha256',
        'protocolo',
        'c_stat',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao' => 'date',
            'totais' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function movimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'movimento_id');
    }

    public function ordemCompra(): BelongsTo
    {
        return $this->belongsTo(OrdemCompra::class, 'ordem_compra_id');
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(NfeEntradaItem::class, 'nfe_entrada_id')->orderBy('ordem');
    }
}
