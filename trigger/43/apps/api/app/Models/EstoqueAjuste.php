<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EstoqueAjuste extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const ORIGEM_CONTAGEM_AVULSA = 'CONTAGEM_AVULSA';

    public const ORIGEM_INV_ROTATIVO = 'INV_ROTATIVO';

    public const ORIGEM_INV_GERAL = 'INV_GERAL';

    public const ORIGEM_VIRADA = 'VIRADA';

    public const ORIGENS = [
        self::ORIGEM_CONTAGEM_AVULSA,
        self::ORIGEM_INV_ROTATIVO,
        self::ORIGEM_INV_GERAL,
        self::ORIGEM_VIRADA,
    ];

    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_APROVADO = 'APROVADO';

    public const STATUS_REJEITADO = 'REJEITADO';

    /** Solicitação retirada antes da alçada — sem MOV / sem impacto em saldo. */
    public const STATUS_CANCELADO = 'CANCELADO';

    public const STATUSES = [
        self::STATUS_PENDENTE,
        self::STATUS_APROVADO,
        self::STATUS_REJEITADO,
        self::STATUS_CANCELADO,
    ];

    public const ALCADA_LIDER = 'LIDER';

    public const ALCADA_GESTOR = 'GESTOR';

    public const ALCADA_DIRECAO = 'DIRECAO';

    /** Motivos canônicos — estudo 32 AJUSTE_ESTOQUE_INVENTARIO §5 */
    public const MOTIVOS = [
        'A01' => 'Diferença de inventário rotativo',
        'A02' => 'Diferença de inventário geral',
        'A03' => 'Saldo inicial / implantação ERP',
        'A04' => 'Avaria / material danificado',
        'A05' => 'Perda de processo acima do padrão',
        'A06' => 'Obsolescência / descarte aprovado',
        'A07' => 'Erro de apontamento corrigido',
        'A08' => 'Sobra de produção não registrada',
        'A09' => 'Furto / extravio comprovado',
        'A10' => 'Erro de unidade / conversão',
        'A11' => 'Amostra / teste de máquina',
    ];

    protected $table = 'estoque_ajustes';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'produto_id',
        'lote_id',
        'lote_codigo',
        'lote_data_entrada',
        'lote_data_fabricacao',
        'lote_data_validade',
        'lote_payload',
        'inventario_item_id',
        'origem',
        'motivo_codigo',
        'motivo_complemento',
        'qtde_sistema',
        'qtde_contada',
        'qtde_diferenca',
        'valor_ajuste',
        'alcada',
        'unidade',
        'checklist_confirmado',
        'status',
        'solicitado_por',
        'aprovado_por',
        'aprovado_em',
        'movimento_id',
        'observacao',
        'causa_raiz',
        'ciencia_diretoria',
        'ciencia_contabilidade',
        'divergencia_relevante',
    ];

    protected function casts(): array
    {
        return [
            'qtde_sistema' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_contada' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'qtde_diferenca' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'valor_ajuste' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_MONEY,
            'checklist_confirmado' => 'boolean',
            'ciencia_diretoria' => 'boolean',
            'ciencia_contabilidade' => 'boolean',
            'divergencia_relevante' => 'boolean',
            'lote_data_entrada' => 'date',
            'lote_data_fabricacao' => 'date',
            'lote_data_validade' => 'date',
            'lote_payload' => 'array',
            'aprovado_em' => 'datetime',
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

    public function lote(): BelongsTo
    {
        return $this->belongsTo(EstoqueLote::class, 'lote_id');
    }

    public function inventarioItem(): BelongsTo
    {
        return $this->belongsTo(EstoqueInventarioItem::class, 'inventario_item_id');
    }

    public function movimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'movimento_id');
    }

    public function solicitadoPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitado_por');
    }

    public function aprovadoPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}
