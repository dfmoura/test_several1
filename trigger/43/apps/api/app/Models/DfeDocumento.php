<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Documento DF-e na caixa de NF-e destinadas (ADR_CAIXA_DFE_NFE_DESTINADAS).
 * Preenchido pelo sync (BL-091); BL-090 = leitura local.
 */
class DfeDocumento extends Model
{
    use BelongsToEmpresa;
    use SoftDeletes;

    public const SITUACAO_NOVA = 'NOVA';

    public const SITUACAO_DISPONIVEL = 'DISPONIVEL';

    public const SITUACAO_AMARRADA = 'AMARRADA';

    public const SITUACAO_RECEBIDA = 'RECEBIDA';

    public const SITUACAO_SEM_INTERESSE = 'SEM_INTERESSE';

    public const SITUACOES = [
        self::SITUACAO_NOVA,
        self::SITUACAO_DISPONIVEL,
        self::SITUACAO_AMARRADA,
        self::SITUACAO_RECEBIDA,
        self::SITUACAO_SEM_INTERESSE,
    ];

    protected $table = 'dfe_documentos';

    protected $fillable = [
        'empresa_id',
        'nsu',
        'schema_dfe',
        'chave',
        'modelo',
        'serie',
        'numero',
        'data_emissao',
        'emit_cnpj',
        'emit_nome',
        'transp_cnpj',
        'transp_nome',
        'transp_extraido',
        'valor_total',
        'situacao',
        'ordem_compra_id',
        'xml_path',
        'xml_sha256',
        'resumo',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao' => 'date',
            'valor_total' => 'decimal:2',
            'resumo' => 'array',
            'transp_extraido' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function ordemCompra(): BelongsTo
    {
        return $this->belongsTo(OrdemCompra::class, 'ordem_compra_id');
    }

    public function temXml(): bool
    {
        return filled($this->xml_path);
    }

    /**
     * Caixa UX = NF-e (resNFe / procNFe). Eventos DF-e (ciência, cancelamento…)
     * não têm vNF/emissão e poluem a lista com valor "—".
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeCaixaNfe(Builder $query): Builder
    {
        return $query->where(function (Builder $outer) {
            $outer->whereNull('schema_dfe')
                ->orWhere(function (Builder $inner) {
                    $inner->where('schema_dfe', 'not like', '%Evento%')
                        ->where('schema_dfe', 'not like', '%evento%');
                });
        });
    }

    public static function schemaEhEvento(?string $schema): bool
    {
        if ($schema === null || $schema === '') {
            return false;
        }

        return str_contains(strtolower($schema), 'evento');
    }
}
