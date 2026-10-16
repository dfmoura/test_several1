<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Local do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME (emenda 2026-10-16).
 * Identidade operacional: L00000001, sequencial por EMP. Sem prateleira/coluna/vão.
 * O conjunto inicial semeado tem 72 números (L00000001–L00000072).
 */
class EstoqueEndereco extends Model
{
    /** Quantos locais o comando de semente garante. Não é o limite do cadastro. */
    public const LOCAIS_INICIAIS = 72;

    /** Prefixo do rótulo sequencial impresso (L00000001). */
    public const PREFIXO_ROTULO = 'L';

    /** Prefixo impresso antes da emenda 2026-10-16. O QR antigo ainda resolve. */
    public const PREFIXO_ROTULO_LEGADO = 'P';

    public const PAD_ROTULO = 8;

    /** Prefixo em codigo_sequences (não aparece na etiqueta). */
    public const SEQ_PREFIXO = 'LOC';

    public const LARGURA_M = '1.500';

    public const PROFUNDIDADE_M = '0.600';

    public const ALTURA_M = '1.000';

    protected $table = 'estoque_enderecos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'nome',
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

    /**
     * @return array{id: int, codigo: string, nome: ?string}
     */
    public function resumo(): array
    {
        return [
            'id' => (int) $this->id,
            'codigo' => (string) $this->codigo,
            'nome' => $this->nome,
        ];
    }

    /** Rótulo canônico impresso — L00000001. */
    public static function codigoSequencialDe(int $numero): string
    {
        return self::PREFIXO_ROTULO.str_pad((string) $numero, self::PAD_ROTULO, '0', STR_PAD_LEFT);
    }

    /** Mesmo número com o prefixo impresso antigo (P00000001). */
    public static function codigoSequencialLegadoDe(int $numero): string
    {
        return self::PREFIXO_ROTULO_LEGADO.str_pad((string) $numero, self::PAD_ROTULO, '0', STR_PAD_LEFT);
    }

    public static function isCodigoSequencial(string $codigo): bool
    {
        return self::numeroSequencial($codigo, false) !== null;
    }

    /**
     * Número do rótulo. Canônico aceita só L; leitura de QR aceita também o P antigo.
     */
    public static function numeroSequencial(string $codigo, bool $aceitaLegado = false): ?int
    {
        $prefixos = $aceitaLegado
            ? self::PREFIXO_ROTULO.self::PREFIXO_ROTULO_LEGADO
            : self::PREFIXO_ROTULO;
        if (preg_match('/^['.$prefixos.'](\d{'.self::PAD_ROTULO.'})$/', $codigo, $m) !== 1) {
            return null;
        }

        return (int) $m[1];
    }

    public function qrPayload(): string
    {
        return 'END:'.$this->empresa_id.':'.$this->id.':'.$this->codigo;
    }
}
