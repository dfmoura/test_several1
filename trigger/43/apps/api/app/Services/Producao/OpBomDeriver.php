<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoPapel;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Support\CaixaMedida;
use App\Support\InsumoEscolhaRelacao;
use App\Support\PadraoDecimal;
use InvalidArgumentException;

/**
 * Deriva BOM leve da OP a partir do snapshot do PED/ORC (estudo 32 PRODUCAO §2.2).
 * Papel e acabamento com SKU no snapshot nascem nessa bobina. Sem SKU, o grupo
 * do catálogo deixa a escolha para a OP. Não baixa estoque.
 */
class OpBomDeriver
{

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
     *     produto_id: int|null,
     *     grupo_id?: int|null,
     *     qtde: string,
     *     unidade: string,
     *     componente: string,
     *     origem_texto: string,
     *     match_score: int
     *   }>,
     *   nao_casados: list<array{componente: string, origem_texto: string, motivo: string, qtde?: string, unidade?: string, metragem?: string|null}>,
     *   guia: list<array{componente: string, origem_texto: string, qtde: string, unidade: string}>
     * }
     */
    public function diagnostico(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        $ctx = $this->contextoSnapshot($pedido, $item);

        $out = [];
        $naoCasados = [];
        $usedProdutoIds = [];

        if ($ctx['papel'] !== '' && $ctx['papel_m2'] > 0) {
            $papelSku = $this->produtoDoSnapshot($empresa, $ctx['papel_produto_id']);
            if ($ctx['papel_produto_id'] > 0 && $papelSku) {
                $out[] = [
                    'produto_id' => (int) $papelSku->id,
                    'grupo_id' => $papelSku->grupo_id ? (int) $papelSku->grupo_id : null,
                    'qtde' => $this->qtdeSnapshot($ctx['papel_m2']),
                    'unidade' => 'M2',
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'match_score' => 10,
                ];
                $usedProdutoIds[] = (int) $papelSku->id;
            } elseif ($ctx['papel_produto_id'] > 0) {
                $naoCasados[] = [
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'qtde' => $this->qtdeSnapshot($ctx['papel_m2']),
                    'unidade' => 'M2',
                    'metragem' => $ctx['metragem'] > 0 ? $this->qtdeSnapshot($ctx['metragem']) : null,
                    'motivo' => 'Papel escolhido no orçamento não está ativo nesta empresa.',
                ];
            } else {
            $grupoId = $this->grupoDoCatalogo($empresa, 'papel', $ctx['papel']);
            if ($grupoId) {
                $out[] = [
                    'produto_id' => null,
                    'grupo_id' => $grupoId,
                    'qtde' => $this->qtdeSnapshot($ctx['papel_m2']),
                    'unidade' => 'M2',
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'match_score' => 0,
                ];
            } else {
                $naoCasados[] = [
                    'componente' => 'PAPEL',
                    'origem_texto' => $ctx['papel'],
                    'qtde' => $this->qtdeSnapshot($ctx['papel_m2']),
                    'unidade' => 'M2',
                    'metragem' => $ctx['metragem'] > 0 ? $this->qtdeSnapshot($ctx['metragem']) : null,
                    'motivo' => 'Papel do orçamento sem grupo de matéria-prima no catálogo.',
                ];
            }
            }
        }

        if ($ctx['tubete'] !== '' && $ctx['rolos'] > 0) {
            $rotuloTubete = $ctx['tubete_rotulo'] !== '' ? $ctx['tubete_rotulo'] : $ctx['tubete'];
            $qtdeTubete = $this->qtdeTubetes($ctx);
            $tubeteSku = $this->produtoDoSnapshot($empresa, $ctx['tubete_produto_id']);
            if ($ctx['tubete_produto_id'] > 0 && ! $tubeteSku) {
                $naoCasados[] = [
                    'componente' => 'TUBETE',
                    'origem_texto' => $rotuloTubete,
                    'qtde' => $qtdeTubete,
                    'unidade' => 'UN',
                    'motivo' => 'Tubete escolhido no orçamento não está ativo nesta empresa.',
                ];
            } else {
                $match = $tubeteSku ?: $this->matchTubete($empresa, $ctx['tubete'], $usedProdutoIds);
                if ($match) {
                    $out[] = [
                        'produto_id' => (int) $match->id,
                        'qtde' => $qtdeTubete,
                        'unidade' => (string) ($match->unidade_interna ?: 'UN'),
                        'componente' => 'TUBETE',
                        'origem_texto' => $rotuloTubete,
                        'match_score' => $tubeteSku ? 10 : (int) ($match->getAttribute('_score') ?? 0),
                    ];
                    $usedProdutoIds[] = (int) $match->id;
                } else {
                    $naoCasados[] = [
                        'componente' => 'TUBETE',
                        'origem_texto' => $rotuloTubete,
                        'qtde' => $qtdeTubete,
                        'unidade' => 'UN',
                        'motivo' => 'Nenhum SKU de tubete (EMB) casado nesta empresa.',
                    ];
                }
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
                    'qtde' => $this->qtdeSnapshot($ctx['caixas']),
                    'unidade' => 'UN',
                    'motivo' => 'Nenhum SKU de caixa (EMB) cadastrado nesta empresa.',
                ];
            }
        }

        if ($ctx['acab_m2'] > 0 && ($ctx['acabamento_produto_id'] > 0 || $this->acabamentoConsomeBobina($ctx['acabamento']))) {
            $acabSku = $this->produtoDoSnapshot($empresa, $ctx['acabamento_produto_id']);
            if ($ctx['acabamento_produto_id'] > 0 && $acabSku) {
                $out[] = [
                    'produto_id' => (int) $acabSku->id,
                    'grupo_id' => $acabSku->grupo_id ? (int) $acabSku->grupo_id : null,
                    'qtde' => $this->qtdeSnapshot($ctx['acab_m2']),
                    'unidade' => 'M2',
                    'componente' => 'ACABAMENTO',
                    'origem_texto' => $ctx['acabamento'],
                    'match_score' => 10,
                ];
            } elseif ($ctx['acabamento_produto_id'] > 0) {
                $naoCasados[] = [
                    'componente' => 'ACABAMENTO',
                    'origem_texto' => $ctx['acabamento'],
                    'qtde' => $this->qtdeSnapshot($ctx['acab_m2']),
                    'unidade' => 'M2',
                    'motivo' => 'Acabamento escolhido no orçamento não está ativo nesta empresa.',
                ];
            } else {
                $grupoId = $this->grupoDoCatalogo($empresa, 'acabamento', $ctx['acabamento']);
                if ($grupoId) {
                    $out[] = [
                        'produto_id' => null,
                        'grupo_id' => $grupoId,
                        'qtde' => $this->qtdeSnapshot($ctx['acab_m2']),
                        'unidade' => 'M2',
                        'componente' => 'ACABAMENTO',
                        'origem_texto' => $ctx['acabamento'],
                        'match_score' => 0,
                    ];
                }
            }
        }

        return [
            'linhas' => $out,
            'nao_casados' => $naoCasados,
            'guia' => $this->apontamentosGuia($ctx),
        ];
    }

    /**
     * Tinta e acabamento da guia, sem SKU. A saída de estoque não nasce aqui.
     *
     * @return list<array{componente: string, origem_texto: string, qtde: string, unidade: string}>
     */
    public function guiaApontada(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        return $this->diagnostico($empresa, $pedido, $item)['guia'];
    }

    /**
     * Etiqueta com papel no snapshot só fecha depois que esse papel saiu da prateleira.
     */
    public function exigeSaidaDePapel(Pedido $pedido, PedidoItem $item): bool
    {
        if (strtoupper((string) $item->necessidade) !== PedidoItem::NEC_PRODUCAO) {
            return false;
        }
        $ctx = $this->contextoSnapshot($pedido, $item);

        return $ctx['papel'] !== '' && $ctx['papel_m2'] > 0;
    }

    /**
     * @return array{
     *   papel: string,
     *   papel_produto_id: int,
     *   tubete: string,
     *   tubete_rotulo: string,
     *   tubete_produto_id: int,
     *   cores: string,
     *   acabamento: string,
     *   acabamento_produto_id: int,
     *   papel_m2: float,
     *   tinta_m2: float,
     *   acab_m2: float,
     *   metragem: float,
     *   rolos: float,
     *   quantidade: int,
     *   etiq_por_rolo: int,
     *   caixas: float,
     *   caixa_medida: string
     * }
     */
    private function contextoSnapshot(Pedido $pedido, PedidoItem $item): array
    {
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $espec = is_array($item->especificacao) ? $item->especificacao : [];
        $faixaPedido = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        // Cabeçalho guarda a faixa do 1º item (compat N=1). Cada linha traz a sua.
        $faixa = array_key_exists('faixa', $espec) && is_array($espec['faixa'])
            ? $espec['faixa']
            : $faixaPedido;

        $papel = trim((string) ($espec['papel'] ?? $input['papel'] ?? ''));
        $tubete = trim((string) ($espec['tubete'] ?? $input['tubete'] ?? ''));
        $tubeteRotulo = trim((string) ($espec['tubete_rotulo'] ?? $input['tubete_rotulo'] ?? ''));
        $cores = trim((string) ($espec['cores'] ?? $input['cores'] ?? ''));
        $acabamento = trim((string) ($espec['acabamento'] ?? $input['acabamento'] ?? ''));

        $m2 = (float) ($faixa['m2'] ?? 0);
        $perdaAcerto = (float) ($faixa['perda_acerto'] ?? 0);
        $perdaBobina = (float) ($faixa['perda_bobina_m2'] ?? 0);
        $perdaTroca = (float) ($faixa['perda_papel_troca_produto'] ?? 0);
        $perdaAcab = (float) ($faixa['perda_acabamento'] ?? 0);

        return [
            'papel' => $papel,
            'papel_produto_id' => (int) ($espec['papel_produto_id'] ?? $input['papel_produto_id'] ?? 0),
            'tubete' => $tubete,
            'tubete_rotulo' => $tubeteRotulo,
            'tubete_produto_id' => (int) ($espec['tubete_produto_id'] ?? $input['tubete_produto_id'] ?? 0),
            'cores' => $cores,
            'acabamento' => $acabamento,
            'acabamento_produto_id' => (int) ($espec['acabamento_produto_id'] ?? $input['acabamento_produto_id'] ?? 0),
            'papel_m2' => $m2 + $perdaAcerto + $perdaBobina + $perdaTroca,
            'tinta_m2' => $m2 + $perdaAcerto,
            'acab_m2' => $m2 + $perdaAcerto + $perdaAcab,
            'metragem' => (float) ($faixa['metragem'] ?? 0),
            'rolos' => (float) ($faixa['rolos'] ?? 0),
            'quantidade' => $this->inteiroContagem($faixa['quantidade'] ?? $item->qtde_pedida ?? null),
            'etiq_por_rolo' => $this->inteiroContagem($espec['etiq_por_rolo'] ?? $input['etiq_por_rolo'] ?? null),
            'caixas' => (float) ($faixa['qtde_caixas'] ?? 0),
            'caixa_medida' => trim((string) ($faixa['caixa_medida'] ?? '')),
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return list<array{componente: string, origem_texto: string, qtde: string, unidade: string}>
     */
    private function apontamentosGuia(array $ctx): array
    {
        $out = [];
        $cores = trim((string) ($ctx['cores'] ?? ''));
        if ($cores !== '' && $cores !== '0' && $cores !== '—') {
            $out[] = [
                'componente' => 'TINTA',
                'origem_texto' => $cores.' cor(es)',
                'qtde' => $this->qtdeSnapshot((float) $ctx['tinta_m2']),
                'unidade' => 'M2',
            ];
        }

        $acab = trim((string) ($ctx['acabamento'] ?? ''));
        if ($acab !== '' && preg_match('/^sem\s/i', $acab) !== 1) {
            $out[] = [
                'componente' => 'ACABAMENTO',
                'origem_texto' => $acab,
                'qtde' => $this->qtdeSnapshot((float) $ctx['acab_m2']),
                'unidade' => 'M2',
            ];
        }

        return $out;
    }

    private function qtdeSnapshot(float $qtde): string
    {
        return PadraoDecimal::roundHalfUp((string) $qtde, PadraoDecimal::SCALE_QTY);
    }

    /**
     * Tubete é peça. O rolo comercial (qtd ÷ etiq/rolo) pode ser fração;
     * a ordem leva o teto: o último rolo parcial ainda usa um tubete inteiro.
     *
     * @param  array{quantidade: int, etiq_por_rolo: int, rolos: float}  $ctx
     */
    private function qtdeTubetes(array $ctx): string
    {
        $q = (int) $ctx['quantidade'];
        $etiq = (int) $ctx['etiq_por_rolo'];
        if ($q > 0 && $etiq > 0) {
            $n = intdiv($q, $etiq) + ($q % $etiq > 0 ? 1 : 0);

            return PadraoDecimal::roundHalfUp((string) $n, PadraoDecimal::SCALE_QTY);
        }

        return $this->qtdePecasDeRolos((float) $ctx['rolos']);
    }

    /**
     * Teto do rolo gravado, quando a quantidade e a etiqueta por rolo não estão no pedido.
     * Folga de 1e-6 para ruído de float não criar um tubete a mais.
     */
    private function qtdePecasDeRolos(float $rolos): string
    {
        if ($rolos <= 0) {
            return PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
        }
        $base = (int) floor($rolos + 1e-6);
        $n = ($rolos - $base) > 1e-6 ? $base + 1 : $base;
        if ($n < 1) {
            $n = 1;
        }

        return PadraoDecimal::roundHalfUp((string) $n, PadraoDecimal::SCALE_QTY);
    }

    private function inteiroContagem(mixed $value): int
    {
        if ($value === null || $value === '' || is_bool($value)) {
            return 0;
        }
        try {
            $canonical = PadraoDecimal::parse($value);
        } catch (InvalidArgumentException) {
            return 0;
        }
        if ($canonical === null || str_starts_with($canonical, '-')) {
            return 0;
        }
        $trunc = bcadd($canonical, '0', 0);
        if (bccomp($canonical, $trunc, PadraoDecimal::SCALE_QTY) !== 0) {
            return 0;
        }
        if (bccomp($trunc, '0', 0) <= 0 || bccomp($trunc, (string) PHP_INT_MAX, 0) === 1) {
            return 0;
        }

        return (int) $trunc;
    }

    /**
     * Grupo de matéria-prima marcado no catálogo. Nome exato. Sem ler o texto para achar SKU.
     */
    private function grupoDoCatalogo(Empresa $empresa, string $tipo, string $nome): ?int
    {
        $nome = OrcamentoCatalogo::norm($nome);
        if ($nome === '' || preg_match('/^sem\s/i', $nome) === 1) {
            return null;
        }
        if ($tipo === 'acabamento' && mb_strtoupper($nome, 'UTF-8') === 'REBOBINAÇÃO') {
            return null;
        }

        $query = $tipo === 'acabamento'
            ? OrcCatalogoAcabamento::query()
            : OrcCatalogoPapel::query();

        $grupoId = $query
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->where('nome', $nome)
            ->value('grupo_id');

        return $grupoId ? (int) $grupoId : null;
    }

    private function acabamentoConsomeBobina(string $nome): bool
    {
        $nome = OrcamentoCatalogo::norm($nome);
        if ($nome === '' || preg_match('/^sem\s/i', $nome) === 1) {
            return false;
        }

        return mb_strtoupper($nome, 'UTF-8') !== 'REBOBINAÇÃO';
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

        $best = null;
        $bestScore = 0;
        $aprovada = InsumoEscolhaRelacao::rotuloMedidaCaixa($medida);
        foreach ($candidatos as $p) {
            $attrs = is_array($p->atributos) ? $p->atributos : null;
            $porMedida = CaixaMedida::casaAtributos($attrs, $medida);
            if ($porMedida === false) {
                continue;
            }
            if ($porMedida === true) {
                $score = 30;
            } else {
                $texto = trim(($p->codigo ?? '').' '.($p->descricao_fiscal ?? '').' '.($p->descricao_comercial ?? ''));
                if (! InsumoEscolhaRelacao::caixaCompativel($medida, $texto)) {
                    continue;
                }
                $rotulo = InsumoEscolhaRelacao::rotuloMedidaCaixa($medida, $texto);
                $score = $rotulo !== null && $rotulo === $aprovada ? 20 : 10;
            }
            if ($score <= $bestScore) {
                continue;
            }
            $bestScore = $score;
            $p->setAttribute('_score', $score);
            $best = $p;
        }

        return $best;
    }

    private function produtoDoSnapshot(Empresa $empresa, int $id): ?Produto
    {
        if ($id < 1) {
            return null;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->where('situacao', 'ATIVO')
            ->first(['id', 'codigo', 'descricao_fiscal', 'descricao_comercial', 'unidade_interna', 'familia', 'grupo_id', 'atributos', 'fator_conversao']);
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
