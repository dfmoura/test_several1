<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Endereço físico do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Gabarito inicial (seed): 6 prateleiras × 4 colunas × 3 locais.
 * Malha (prateleira/coluna/vao) = posição; código impresso = P00000001 sequencial por EMP.
 * UX: Local/Locais · coluna SQL: `vao` (eixo do slot).
 */
class EstoqueEndereco extends Model
{
    /** Teto do gabarito semeado — não é o limite do cadastro. */
    public const PRATELEIRAS = 6;

    public const COLUNAS = 4;

    public const VAOS = 3;

    public const EIXO_MAX = 255;

    /** Prefixo do rótulo sequencial impresso (P00000001). */
    public const PREFIXO_ROTULO = 'P';

    public const PAD_ROTULO = 8;

    /** Prefixo em codigo_sequences (não aparece na etiqueta). */
    public const SEQ_PREFIXO = 'LOC';

    /** Prefixo do slot na malha legada (Local). Impresso antigo: V. */
    public const PREFIXO_SLOT = 'L';

    public const PREFIXO_SLOT_LEGADO = 'V';

    public const LARGURA_M = '1.500';

    public const PROFUNDIDADE_M = '0.600';

    public const ALTURA_M = '1.000';

    protected $table = 'estoque_enderecos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'prateleira',
        'coluna',
        'vao',
        'largura_m',
        'profundidade_m',
        'altura_m',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'prateleira' => 'integer',
            'coluna' => 'integer',
            'vao' => 'integer',
            'largura_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'profundidade_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'altura_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(EstoqueLote::class, 'endereco_id');
    }

    /** Rótulo canônico impresso — P00000001. */
    public static function codigoSequencialDe(int $numero): string
    {
        return self::PREFIXO_ROTULO.str_pad((string) $numero, self::PAD_ROTULO, '0', STR_PAD_LEFT);
    }

    public static function isCodigoSequencial(string $codigo): bool
    {
        return preg_match('/^'.preg_quote(self::PREFIXO_ROTULO, '/').'\d{'.self::PAD_ROTULO.'}$/', $codigo) === 1;
    }

    /**
     * Malha legada (só referência espacial / QR antigo) — Pxx-Cxx-Lxx.
     * Não é mais o código gravado em cadastros novos.
     */
    public static function codigoMalhaDe(int $prateleira, int $coluna, int $vao): string
    {
        return sprintf(
            'P%02d-C%02d-%s%02d',
            $prateleira,
            $coluna,
            self::PREFIXO_SLOT,
            $vao
        );
    }

    /** @deprecated use codigoMalhaDe — mantido para testes/legado V→L */
    public static function codigoDe(int $prateleira, int $coluna, int $vao): string
    {
        return self::codigoMalhaDe($prateleira, $coluna, $vao);
    }

    /** Código legado (pré-Local) — Pxx-Cxx-Vxx. */
    public static function codigoLegadoDe(int $prateleira, int $coluna, int $vao): string
    {
        return sprintf(
            'P%02d-C%02d-%s%02d',
            $prateleira,
            $coluna,
            self::PREFIXO_SLOT_LEGADO,
            $vao
        );
    }

    public static function isCodigoMalha(string $codigo): bool
    {
        return preg_match('/^P\d{2}-C\d{2}-[LV]\d{2}$/i', $codigo) === 1;
    }

    public function qrPayload(): string
    {
        return 'END:'.$this->empresa_id.':'.$this->id.':'.$this->codigo;
    }
}
