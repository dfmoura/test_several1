<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BemPatrimonial extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    /**
     * Ativo físico (estudo 32 / ADR-039-BEM-001).
     * Não confundir com orc_catalogo_maquinas (tarifas G10 do ORC).
     * Produção/manutenção futuras → bem_id; ponte de preço → orc_catalogo_maquina_id.
     */

    public const CATEGORIA_MAQUINA_GRAFICA = 'MAQUINA_GRAFICA';

    public const CATEGORIA_EQUIPAMENTO = 'EQUIPAMENTO';

    public const CATEGORIA_INFORMATICA = 'INFORMATICA';

    public const CATEGORIA_VEICULO = 'VEICULO';

    public const CATEGORIA_MOVEL = 'MOVEL';

    public const CATEGORIA_SOFTWARE = 'SOFTWARE';

    public const CATEGORIA_OUTRO = 'OUTRO';

    public const CATEGORIAS = [
        self::CATEGORIA_MAQUINA_GRAFICA,
        self::CATEGORIA_EQUIPAMENTO,
        self::CATEGORIA_INFORMATICA,
        self::CATEGORIA_VEICULO,
        self::CATEGORIA_MOVEL,
        self::CATEGORIA_SOFTWARE,
        self::CATEGORIA_OUTRO,
    ];

    public const STATUS_ATIVO = 'ATIVO';

    public const STATUS_EM_MANUTENCAO = 'EM_MANUTENCAO';

    public const STATUS_CEDIDO = 'CEDIDO';

    public const STATUS_BAIXADO = 'BAIXADO';

    public const STATUS_VENDIDO = 'VENDIDO';

    public const STATUSES = [
        self::STATUS_ATIVO,
        self::STATUS_EM_MANUTENCAO,
        self::STATUS_CEDIDO,
        self::STATUS_BAIXADO,
        self::STATUS_VENDIDO,
    ];

    public const STATUSES_FINAIS = [
        self::STATUS_BAIXADO,
        self::STATUS_VENDIDO,
    ];

    protected $table = 'bens_patrimoniais';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'descricao',
        'categoria',
        'marca',
        'modelo',
        'numero_serie',
        'adquirido_em',
        'valor_aquisicao',
        'nf_numero',
        'fornecedor_id',
        'local',
        'departamento_id',
        'responsavel',
        'responsavel_user_id',
        'status',
        'garantia_ate',
        'placa',
        'renavam',
        'vida_util_meses',
        'orc_catalogo_maquina_id',
        'capitalizado',
        'observacao',
        'baixado_em',
        'motivo_baixa',
    ];

    protected function casts(): array
    {
        return [
            'adquirido_em' => 'date',
            'garantia_ate' => 'date',
            'baixado_em' => 'date',
            'valor_aquisicao' => 'decimal:2',
            'vida_util_meses' => 'integer',
            'capitalizado' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_id');
    }

    public function responsavelUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_user_id');
    }

    public function grupoHoraMaquina(): BelongsTo
    {
        return $this->belongsTo(OrcCatalogoMaquina::class, 'orc_catalogo_maquina_id');
    }
}
