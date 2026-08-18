<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaturamentoItem extends Model
{
    public const DESC_MATRIZ = 'Matriz / clichê';

    public const DESC_FACA = 'Ferramental (faca nova)';

    protected $table = 'faturamento_itens';

    protected $fillable = [
        'empresa_id',
        'faturamento_id',
        'pedido_item_id',
        'ordem',
        'descricao',
        'familia_fiscal',
        'unidade',
        'qtde',
        'preco_unitario',
        'valor',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'preco_unitario' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
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

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class);
    }

    public static function eLinhaDeFerramental(string $descricao): bool
    {
        return in_array(trim($descricao), [self::DESC_MATRIZ, self::DESC_FACA], true);
    }

    public static function eLinhaDeEstoque(string $descricao, ?string $familiaFiscal): bool
    {
        if (self::eLinhaDeFerramental($descricao)) {
            return false;
        }
        $fam = strtoupper(trim((string) $familiaFiscal));

        return str_starts_with($fam, 'PA') || str_starts_with($fam, 'REV');
    }
}
