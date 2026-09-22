<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Support\PadraoDecimal;

/**
 * Deriva BOM leve da OP a partir do snapshot do PED/ORC (estudo 32 PRODUCAO §2.2).
 * Não baixa estoque — só sugere SKU + qtde planejada (empenho leve).
 */
class OpBomDeriver
{
    /** Tokens genéricos que não ajudam no match. */
    private const STOP = [
        'AUTOADESIVO', 'AUTO', 'ADESIVO', 'PAPEL', 'FILME', 'DE', 'DA', 'DO', 'COM',
        'PARA', 'THE', 'AND', 'COLACRIL', 'FASSON', 'VERTEX', 'RITRAMA', 'G',
    ];

    /** Sinônimos comerciais → tokens de cadastro. */
    private const SYNONYMS = [
        'PRATA' => ['METALIZADO', 'PRATA'],
        'METALIZADO' => ['METALIZADO', 'PRATA'],
        'TRANSP' => ['TRANSPARENTE'],
        'TRANSPARENTE' => ['TRANSPARENTE'],
    ];

    /**
     * @return list<array{
     *   produto_id: int,
     *   qtde: string,
     *   unidade: string,
     *   componente: string,
     *   origem_texto: string,
     *   match_score: int
     * }>
     */
    public function derivar(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        return $this->diagnostico($empresa, $pedido, $item)['linhas'];
    }

    /**
     * Componentes esperados do snapshot sem SKU casado (transparência — sem inventar linha).
     *
     * @return list<array{componente: string, origem_texto: string, motivo: string}>
     */
    public function naoCasados(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        return $this->diagnostico($empresa, $pedido, $item)['nao_casados'];
    }

    /**
     * @return array{
     *   linhas: list<array{
     *     produto_id: int,
     *     qtde: string,
     *     unidade: string,
     *     componente: string,
     *     origem_texto: string,
     *     match_score: int
     *   }>,
     *   nao_casados: list<array{componente: string, origem_texto: string, motivo: string}>
     * }
     */
    public function diagnostico(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        $ctx = $this->contextoSnapshot($pedido, $item);

        $out = [];
        $naoCasados = [];
        $usedProdutoIds = [];

        if ($ctx['papel'] !== '' && $ctx['papel_m2'] > 0) {
            $match = $this->matchProduto($empresa, $ctx['papel'], ['MP'], $usedProdutoIds);
            if ($match) {
                $qtde = $this->qtdeParaUnidade($match, $ctx['papel_m2'], $ctx['metragem']);
                $out[] = [
                    'produto_id' => (int) $match->id,
                    'qtde' => $qtde,
                    'unidade' => (string) ($match->unidade_interna ?: 'M2'),
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'match_score' => (int) ($match->getAttribute('_score') ?? 0),
                ];
                $usedProdutoIds[] = (int) $match->id;
            } else {
                $naoCasados[] = [
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'motivo' => 'Nenhum SKU MP casado ao texto do orçamento nesta empresa.',
                ];
            }
        }

        if ($ctx['tubete'] !== '' && $ctx['rolos'] > 0) {
            $match = $this->matchTubete($empresa, $ctx['tubete'], $usedProdutoIds);
            if ($match) {
                $out[] = [
                    'produto_id' => (int) $match->id,
                    'qtde' => PadraoDecimal::roundHalfUp((string) $ctx['rolos'], PadraoDecimal::SCALE_QTY),
                    'unidade' => (string) ($match->unidade_interna ?: 'UN'),
                    'componente' => 'TUBETE',
                    'origem_texto' => $ctx['tubete'],
                    'match_score' => (int) ($match->getAttribute('_score') ?? 0),
                ];
                $usedProdutoIds[] = (int) $match->id;
            } else {
                $naoCasados[] = [
                    'componente' => 'TUBETE',
                    'origem_texto' => $ctx['tubete'],
                    'motivo' => 'Nenhum SKU de tubete (EMB) casado nesta empresa.',
                ];
            }
        }

        if ($ctx['caixas'] > 0) {
            $match = $this->matchCaixa($empresa, $ctx['caixa_medida'], $usedProdutoIds);
            if ($match) {
                $out[] = [
                    'produto_id' => (int) $match->id,
                    'qtde' => PadraoDecimal::roundHalfUp((string) $ctx['caixas'], PadraoDecimal::SCALE_QTY),
                    'unidade' => (string) ($match->unidade_interna ?: 'UN'),
                    'componente' => 'CAIXA',
                    'origem_texto' => $ctx['caixa_medida'] !== '' ? $ctx['caixa_medida'] : 'caixa',
                    'match_score' => (int) ($match->getAttribute('_score') ?? 0),
                ];
            } else {
                $naoCasados[] = [
                    'componente' => 'CAIXA',
                    'origem_texto' => $ctx['caixa_medida'] !== '' ? $ctx['caixa_medida'] : 'caixa',
                    'motivo' => 'Nenhum SKU de caixa (EMB) cadastrado nesta empresa.',
                ];
            }
        }

        return ['linhas' => $out, 'nao_casados' => $naoCasados];
    }

    /**
     * @return array{
     *   papel: string,
     *   tubete: string,
     *   papel_m2: float,
     *   metragem: float,
     *   rolos: float,
     *   caixas: float,
     *   caixa_medida: string
     * }
     */
    private function contextoSnapshot(Pedido $pedido, PedidoItem $item): array
    {
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $espec = is_array($item->especificacao) ? $item->especificacao : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];

        $papel = trim((string) ($espec['papel'] ?? $input['papel'] ?? ''));
        $tubete = trim((string) ($espec['tubete'] ?? $input['tubete'] ?? ''));

        $m2 = (float) ($faixa['m2'] ?? 0);
        $perdaAcerto = (float) ($faixa['perda_acerto'] ?? 0);
        $perdaBobina = (float) ($faixa['perda_bobina_m2'] ?? 0);
        $perdaTroca = (float) ($faixa['perda_papel_troca_produto'] ?? 0);

        return [
            'papel' => $papel,
            'tubete' => $tubete,
            'papel_m2' => $m2 + $perdaAcerto + $perdaBobina + $perdaTroca,
            'metragem' => (float) ($faixa['metragem'] ?? 0),
            'rolos' => (float) ($faixa['rolos'] ?? 0),
            'caixas' => (float) ($faixa['qtde_caixas'] ?? 0),
            'caixa_medida' => trim((string) ($faixa['caixa_medida'] ?? '')),
        ];
    }

    /**
     * @param  list<string>  $familias
     * @param  list<int>  $excludeIds
     */
    private function matchProduto(Empresa $empresa, string $needle, array $familias, array $excludeIds): ?Produto
    {
        $tokens = $this->tokens($needle);
        if ($tokens === []) {
            return null;
        }

        $expanded = $this->expandTokens($tokens);

        $candidatos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->whereIn('familia', $familias)
            ->when($excludeIds !== [], fn ($q) => $q->whereNotIn('id', $excludeIds))
            ->get(['id', 'codigo', 'descricao_fiscal', 'descricao_comercial', 'unidade_interna', 'familia', 'atributos', 'fator_conversao']);

        $best = null;
        $bestScore = 0;

        foreach ($candidatos as $p) {
            $hay = $this->normalize(
                ($p->codigo ?? '').' '.($p->descricao_fiscal ?? '').' '.($p->descricao_comercial ?? '')
            );
            $score = 0;
            foreach ($expanded as $tok) {
                if ($tok !== '' && str_contains($hay, $tok)) {
                    $score += strlen($tok) >= 4 ? 3 : 2;
                }
            }
            // Bônus se a frase do ORC aparece quase inteira
            $frase = $this->normalize($needle);
            if ($frase !== '' && str_contains($hay, $frase)) {
                $score += 10;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $p->setAttribute('_score', $score);
                $best = $p;
            }
        }

        // Exige pelo menos 1 token forte (score >= 2)
        return $bestScore >= 2 ? $best : null;
    }

    /**
     * @param  list<int>  $excludeIds
     */
    private function matchTubete(Empresa $empresa, string $tubete, array $excludeIds): ?Produto
    {
        $norm = $this->normalize($tubete);
        // Extrai polegadas: 3", 1 1/2", 1.5
        $candidatos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'EMB')
            ->where(function ($q) {
                $q->where('codigo', 'like', 'EMB-TUB%')
                    ->orWhere('descricao_fiscal', 'like', '%TUBETE%');
            })
            ->when($excludeIds !== [], fn ($q) => $q->whereNotIn('id', $excludeIds))
            ->get(['id', 'codigo', 'descricao_fiscal', 'descricao_comercial', 'unidade_interna', 'familia', 'atributos', 'fator_conversao']);

        $best = null;
        $bestScore = 0;
        foreach ($candidatos as $p) {
            $hay = $this->normalize(($p->codigo ?? '').' '.($p->descricao_fiscal ?? ''));
            $score = 0;
            if (str_contains($hay, 'TUBETE')) {
                $score += 2;
            }
            // Match de polegadas normalizado (3 → 3, 1 1/2 → 1 1/2)
            $needleInch = preg_replace('/[^0-9\/ ]/', '', $norm) ?? '';
            $needleInch = trim(preg_replace('/\s+/', ' ', $needleInch) ?? '');
            if ($needleInch !== '' && str_contains($hay, $needleInch)) {
                $score += 8;
            }
            if ($norm !== '' && str_contains($hay, $norm)) {
                $score += 5;
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $p->setAttribute('_score', $score);
                $best = $p;
            }
        }

        return $bestScore >= 5 ? $best : null;
    }

    /**
     * @param  list<int>  $excludeIds
     */
    private function matchCaixa(Empresa $empresa, string $medida, array $excludeIds): ?Produto
    {
        $candidatos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'EMB')
            ->where(function ($q) {
                $q->where('codigo', 'like', 'EMB-CX%')
                    ->orWhere('descricao_fiscal', 'like', '%CAIXA%');
            })
            ->when($excludeIds !== [], fn ($q) => $q->whereNotIn('id', $excludeIds))
            ->orderBy('codigo')
            ->get(['id', 'codigo', 'descricao_fiscal', 'descricao_comercial', 'unidade_interna', 'familia', 'atributos', 'fator_conversao']);

        if ($candidatos->isEmpty()) {
            return null;
        }

        $normMedida = $this->normalize($medida);
        $best = $candidatos->first();
        $bestScore = 1;
        $best->setAttribute('_score', 1);

        if ($normMedida !== '') {
            foreach ($candidatos as $p) {
                $hay = $this->normalize(($p->codigo ?? '').' '.($p->descricao_fiscal ?? ''));
                $score = str_contains($hay, 'CAIXA') ? 2 : 0;
                // Dimensões numéricas da medida
                preg_match_all('/\d+/', $normMedida, $nums);
                foreach ($nums[0] ?? [] as $n) {
                    if (str_contains($hay, $n)) {
                        $score += 3;
                    }
                }
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $p->setAttribute('_score', $score);
                    $best = $p;
                }
            }
        }

        return $best;
    }

    private function qtdeParaUnidade(Produto $produto, float $papelM2, float $metragem): string
    {
        $u = strtoupper(trim((string) ($produto->unidade_interna ?: 'M2')));

        if (in_array($u, ['M2', 'M²'], true)) {
            return PadraoDecimal::roundHalfUp((string) $papelM2, PadraoDecimal::SCALE_QTY);
        }
        if (in_array($u, ['M', 'MT', 'ML'], true) && $metragem > 0) {
            return PadraoDecimal::roundHalfUp((string) $metragem, PadraoDecimal::SCALE_QTY);
        }

        $attrs = is_array($produto->atributos) ? $produto->atributos : [];
        $gramatura = isset($attrs['gramatura_g_m2']) ? (float) $attrs['gramatura_g_m2'] : 0.0;
        if ($u === 'KG' && $gramatura > 0 && $papelM2 > 0) {
            $kg = ($papelM2 * $gramatura) / 1000.0;

            return PadraoDecimal::roundHalfUp((string) $kg, PadraoDecimal::SCALE_QTY);
        }

        // Fallback: usa m² (operador ajusta na requisição se a unidade divergir)
        return PadraoDecimal::roundHalfUp((string) $papelM2, PadraoDecimal::SCALE_QTY);
    }

    /**
     * @return list<string>
     */
    private function tokens(string $text): array
    {
        $norm = $this->normalize($text);
        $parts = preg_split('/[^A-Z0-9]+/', $norm) ?: [];
        $out = [];
        foreach ($parts as $p) {
            if ($p === '' || strlen($p) < 2) {
                continue;
            }
            if (in_array($p, self::STOP, true)) {
                continue;
            }
            $out[] = $p;
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  list<string>  $tokens
     * @return list<string>
     */
    private function expandTokens(array $tokens): array
    {
        $out = $tokens;
        foreach ($tokens as $t) {
            foreach (self::SYNONYMS[$t] ?? [] as $syn) {
                $out[] = $syn;
            }
        }

        return array_values(array_unique($out));
    }

    private function normalize(string $text): string
    {
        $t = mb_strtoupper(trim($text), 'UTF-8');
        $t = strtr($t, [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A',
            'É' => 'E', 'Ê' => 'E',
            'Í' => 'I',
            'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O',
            'Ú' => 'U',
            'Ç' => 'C',
            '²' => '2',
        ]);

        return $t;
    }
}
