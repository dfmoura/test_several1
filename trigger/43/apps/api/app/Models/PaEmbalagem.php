<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaEmbalagem extends Model
{
    use SoftDeletes;

    public const STATUS_CONFIRMADA = 'CONFIRMADA';

    public const ORIGEM_SUGERIDA = 'SUGERIDA';

    public const ORIGEM_MANUAL = 'MANUAL';

    protected $table = 'pa_embalagens';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'pedido_id',
        'pedido_item_id',
        'ordem_producao_id',
        'status',
        'qtde_etiquetas',
        'qtde_bobinas',
        'qtde_caixas',
        'etiq_por_rolo',
        'rolos_por_caixa',
        'tubete',
        'caixa_medida',
        'caixa_produto_id',
        'saida_etiqueta',
        'origem',
        'observacao',
        'confirmada_em',
        'confirmada_por',
    ];

    protected function casts(): array
    {
        return [
            'qtde_etiquetas' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_bobinas' => 'integer',
            'qtde_caixas' => 'integer',
            'etiq_por_rolo' => 'integer',
            'rolos_por_caixa' => 'integer',
            'confirmada_em' => 'datetime',
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

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class, 'pedido_item_id');
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function confirmadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmada_por');
    }

    public function bobinas(): HasMany
    {
        return $this->hasMany(PaEmbalagemBobina::class, 'embalagem_id')->orderBy('sequencia');
    }

    public function caixaProduto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'caixa_produto_id');
    }

    public function caixas(): HasMany
    {
        return $this->hasMany(PaEmbalagemCaixa::class, 'embalagem_id')->orderBy('sequencia');
    }

    /**
     * Resumo operacional (UI OP/FAT) — inclui etiquetas.
     */
    public function resumoTexto(): string
    {
        $parts = [
            number_format((float) $this->qtde_etiquetas, 0, ',', '.').' etiquetas',
            $this->qtde_bobinas.' bobina'.($this->qtde_bobinas === 1 ? '' : 's'),
            $this->qtde_caixas.' caixa'.($this->qtde_caixas === 1 ? '' : 's'),
        ];
        if ($this->tubete) {
            $parts[] = 'tubete '.$this->tubete;
        }

        return implode(' · ', $parts);
    }

    /**
     * Texto canônico para NF-e item (infAdProd) — só etiq/rolo.
     */
    public function textoFiscalItem(): string
    {
        return $this->textoFiscalModoEtiqueta();
    }

    /**
     * infAdProd: composição de rolos (cheios + resto). Spec/CX/tubete fora da nota.
     * $especOverride mantido na assinatura por compat com chamadores.
     *
     * @param  array<string, mixed>|null  $especOverride
     */
    public function textoFiscalModo(string $modo, ?array $especOverride = null): string
    {
        return $modo === 'ROLO'
            ? $this->textoFiscalModoRolo($especOverride)
            : $this->textoFiscalModoEtiqueta($especOverride);
    }

    /**
     * @param  array<string, mixed>|null  $especOverride
     */
    public function textoFiscalModoEtiqueta(?array $especOverride = null): string
    {
        return $this->composicaoBobinasTexto() ?? '';
    }

    /**
     * @param  array<string, mixed>|null  $especOverride
     */
    public function textoFiscalModoRolo(?array $especOverride = null): string
    {
        return $this->composicaoBobinasTexto() ?? '';
    }

    /**
     * Spec do PED (medida/papel/…) — uso interno/UI; não vai mais no infAdProd.
     *
     * @param  array<string, mixed>|null  $especOverride
     * @return list<string>
     */
    public function detalheEspecificacaoFiscalParts(?array $especOverride = null): array
    {
        $spec = $especOverride;
        if (! is_array($spec) || $spec === []) {
            $this->loadMissing('pedidoItem');
            $spec = is_array($this->pedidoItem?->especificacao) ? $this->pedidoItem->especificacao : [];
        }

        return self::partsFromEspecificacao($spec);
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return list<string>
     */
    public static function partsFromEspecificacao(array $spec): array
    {
        $parts = [];
        $medida = trim((string) ($spec['medida'] ?? ''));
        if ($medida !== '') {
            $parts[] = 'med '.$medida;
        }
        $papel = trim((string) ($spec['papel'] ?? ''));
        if ($papel !== '') {
            $parts[] = $papel;
        }
        if (isset($spec['cores']) && $spec['cores'] !== '' && $spec['cores'] !== null) {
            $parts[] = $spec['cores'].' cor(es)';
        }
        $acab = trim((string) ($spec['acabamento'] ?? ''));
        if ($acab !== '') {
            $parts[] = $acab;
        }
        $mods = $spec['modelos_composicao'] ?? null;
        if (is_array($mods) && $mods !== []) {
            $nomes = [];
            foreach ($mods as $m) {
                if (! is_array($m)) {
                    continue;
                }
                $n = trim((string) ($m['nome'] ?? ''));
                if ($n !== '') {
                    $nomes[] = $n;
                }
            }
            if ($nomes !== []) {
                $parts[] = 'modelo '.implode('/', array_slice($nomes, 0, 4));
            }
        }

        return $parts;
    }

    /**
     * Agrega bobinas por qtde de etiquetas — cheios vs resto, bem legível.
     * Ex.: "3 rolos com 1000 etiquetas + 1 rolo com 250 etiquetas"
     * Fonte: bobinas confirmadas; se vazias, etiq_por_rolo do ORC/embalagem.
     */
    public function composicaoBobinasTexto(): ?string
    {
        $grupos = $this->gruposEtiquetasPorRolo();
        if ($grupos === []) {
            return null;
        }

        $chunks = [];
        foreach ($grupos as $qtde => $n) {
            $rolo = $n === 1 ? '1 rolo com ' : $n.' rolos com ';
            $chunks[] = $rolo.$qtde.' etiquetas';
        }

        return implode(' + ', $chunks);
    }

    /**
     * @return array<string, int> qtde etiquetas => quantidade de rolos
     */
    private function gruposEtiquetasPorRolo(): array
    {
        $this->loadMissing('bobinas');
        if (! $this->bobinas->isEmpty()) {
            $grupos = [];
            foreach ($this->bobinas as $b) {
                $fmt = self::fmtQtdeCurta((string) $b->qtde_etiquetas);
                $grupos[$fmt] = ($grupos[$fmt] ?? 0) + 1;
            }

            return $grupos;
        }

        // Fallback: mesma lógica do embalar (cheias de etiq_por_rolo + resto).
        $porRolo = (int) ($this->etiq_por_rolo ?? 0);
        $total = PadraoDecimal::roundHalfUp((string) ($this->qtde_etiquetas ?? '0'), PadraoDecimal::SCALE_QTY);
        if ($porRolo < 1 || bccomp($total, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return [];
        }

        $por = (string) $porRolo;
        if (bccomp($total, $por, PadraoDecimal::SCALE_QTY) <= 0) {
            return [self::fmtQtdeCurta($total) => 1];
        }

        $nCheias = (int) floor((float) bcdiv($total, $por, 8));
        $consumido = bcmul((string) $nCheias, $por, PadraoDecimal::SCALE_QTY);
        $resto = PadraoDecimal::roundHalfUp(
            bcsub($total, $consumido, PadraoDecimal::SCALE_QTY + 2),
            PadraoDecimal::SCALE_QTY
        );

        $grupos = [];
        if ($nCheias > 0) {
            $grupos[self::fmtQtdeCurta($por)] = $nCheias;
        }
        if (bccomp($resto, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $fmtResto = self::fmtQtdeCurta($resto);
            $grupos[$fmtResto] = ($grupos[$fmtResto] ?? 0) + 1;
        }

        return $grupos;
    }

    private static function fmtQtdeCurta(string $qtde): string
    {
        $q = PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY);
        if (bccomp($q, PadraoDecimal::roundHalfUp($q, 0), PadraoDecimal::SCALE_QTY) === 0) {
            return number_format((float) $q, 0, '', '');
        }

        return rtrim(rtrim($q, '0'), '.') ?: '0';
    }
}
