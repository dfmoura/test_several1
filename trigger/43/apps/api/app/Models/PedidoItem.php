<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PedidoItem extends Model
{
    protected $table = 'pedido_itens';

    public const NEC_PRODUCAO = 'PRODUCAO';

    public const NEC_SERVICO = 'SERVICO';

    public const NEC_REVENDA = 'REVENDA';

    /** @var list<string> */
    public const NECESSIDADES = [
        self::NEC_PRODUCAO,
        self::NEC_SERVICO,
        self::NEC_REVENDA,
    ];

    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_EM_PRODUCAO = 'EM_PRODUCAO';

    public const STATUS_PRODUZIDO = 'PRODUZIDO';

    public const STATUS_CANCELADO = 'CANCELADO';

    protected $fillable = [
        'empresa_id',
        'pedido_id',
        'ordem',
        'necessidade',
        'familia_fiscal',
        'descricao',
        'especificacao',
        'qtde_pedida',
        'qtde_produzida',
        'qtde_faturavel',
        'unidade',
        'preco_unitario',
        'valor_total',
        'status',
        'produto_pa_id',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'especificacao' => 'array',
            'qtde_pedida' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_produzida' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_faturavel' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'preco_unitario' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function produtoPa(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'produto_pa_id');
    }

    public function ordensProducao(): HasMany
    {
        return $this->hasMany(OrdemProducao::class, 'pedido_item_id');
    }

    public function ordensServico(): HasMany
    {
        return $this->hasMany(OrdemServico::class, 'pedido_item_id');
    }
}
