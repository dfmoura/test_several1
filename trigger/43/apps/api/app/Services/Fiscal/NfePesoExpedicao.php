<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\PaEmbalagem;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Support\CaixaMedida;
use App\Support\InsumoEscolhaRelacao;
use App\Support\PadraoDecimal;
use App\Support\ProdutoAtributos;
use Illuminate\Support\Collection;

/**
 * Peso do volume na NF-e de saída (kg, 3 casas).
 *
 * Líquido da etiqueta = m² travado da faixa × gramatura de expedição.
 * O default é 160 g/m² (0,16 kg/m²), o conjunto que viaja. A gramatura
 * de estoque do papel não entra nesta conta, nem o consumo da OP.
 *
 * Bruto = líquido + tubetes + caixas da embalagem confirmada.
 * Peça com peso_kg no SKU usa esse quilo. Sem ele, a caixa sai da
 * área do papelão e o tubete da casca (diâmetro, parede, comprimento).
 * Sem líquido, a nota não leva peso — tara sozinha não vira pesoL/pesoB.
 */
final class NfePesoExpedicao
{
    /** 0,16 kg/m². */
    public const GRAMATURA_PADRAO_G_M2 = '160';

    /** Papelão ondulado parede simples. */
    public const CHAPA_CAIXA_G_M2 = '550';

    /** Papelão do tubete. */
    public const DENSIDADE_TUBETE_KG_M3 = '750';

    private const PI = '3.141592653589793';

    /** Comprimento cadastrado abaixo disto não tem unidade confiável. */
    private const COMPRIMENTO_MIN_MM = '20';

    /**
     * @param  iterable<int, PaEmbalagem>  $embalagens
     * @return array{peso_liquido: ?string, peso_bruto: ?string}
     */
    public function doPedido(Empresa $empresa, Pedido $pedido, iterable $embalagens): array
    {
        $pedido->loadMissing('itens');
        $produtos = $this->produtos($empresa, $pedido, $embalagens);

        return $this->calcular(
            $this->linhas($pedido, $produtos),
            $this->embalagens($pedido, $embalagens, $produtos),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $linhas
     * @param  list<array<string, mixed>>  $embalagens
     * @return array{peso_liquido: ?string, peso_bruto: ?string}
     */
    public function calcular(array $linhas, array $embalagens): array
    {
        $liquido = '0';
        $tem = false;
        foreach ($linhas as $linha) {
            $parcela = $this->kgLinha($linha);
            if ($parcela === null) {
                continue;
            }
            $liquido = bcadd($liquido, $parcela, 8);
            $tem = true;
        }
        if (! $tem || bccomp($liquido, '0', 8) <= 0) {
            return ['peso_liquido' => null, 'peso_bruto' => null];
        }

        $tara = '0';
        foreach ($embalagens as $volume) {
            $tara = bcadd($tara, $this->tara($volume), 8);
        }

        return [
            'peso_liquido' => $this->formatarKg($liquido),
            'peso_bruto' => $this->formatarKg(bcadd($liquido, $tara, 8)),
        ];
    }

    /**
     * @param  iterable<int, PaEmbalagem>  $embalagens
     * @return Collection<int, Produto>
     */
    private function produtos(Empresa $empresa, Pedido $pedido, iterable $embalagens): Collection
    {
        $ids = [];
        foreach ($pedido->itens as $item) {
            $espec = is_array($item->especificacao) ? $item->especificacao : [];
            foreach (['papel_produto_id', 'produto_id', 'tubete_produto_id'] as $chave) {
                $id = (int) ($espec[$chave] ?? 0);
                if ($id > 0) {
                    $ids[] = $id;
                }
            }
            if ((int) $item->produto_pa_id > 0) {
                $ids[] = (int) $item->produto_pa_id;
            }
        }
        foreach ($embalagens as $emb) {
            if ($emb instanceof PaEmbalagem && (int) $emb->caixa_produto_id > 0) {
                $ids[] = (int) $emb->caixa_produto_id;
            }
        }
        if ($ids === []) {
            return new Collection;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('id', array_values(array_unique($ids)))
            ->get()
            ->keyBy('id');
    }

    /**
     * @param  Collection<int, Produto>  $produtos
     * @return list<array<string, mixed>>
     */
    private function linhas(Pedido $pedido, Collection $produtos): array
    {
        $producao = [];
        $out = [];
        foreach ($pedido->itens as $item) {
            if (! $item instanceof PedidoItem) {
                continue;
            }
            $espec = is_array($item->especificacao) ? $item->especificacao : [];
            $necessidade = (string) ($item->necessidade ?: ($espec['necessidade'] ?? ''));
            if (strtoupper($necessidade) === PedidoItem::NEC_SERVICO) {
                continue;
            }
            if (PedidoItem::isRevenda($necessidade)) {
                $out[] = $this->linhaRevenda($item, $espec, $produtos);

                continue;
            }
            if (strtoupper($necessidade) !== PedidoItem::NEC_PRODUCAO) {
                continue;
            }
            $producao[] = $item;
        }

        $snapshot = $this->m2Unico($pedido, count($producao));
        foreach ($producao as $item) {
            $espec = is_array($item->especificacao) ? $item->especificacao : [];
            $faixa = is_array($espec['faixa'] ?? null) ? $espec['faixa'] : [];
            $m2 = $this->positivo($faixa['m2'] ?? null) ?? $snapshot;
            $papel = $produtos->get((int) ($espec['papel_produto_id'] ?? 0));
            $out[] = [
                'tipo' => 'etiqueta',
                'm2' => $m2,
                'gramatura_g_m2' => $this->atributo($papel, ProdutoAtributos::GRAMATURA_EXPEDICAO),
            ];
        }

        return $out;
    }

    /**
     * m² do cabeçalho só quando há uma etiqueta e o item não trouxe a faixa.
     */
    private function m2Unico(Pedido $pedido, int $qtdeProducao): ?string
    {
        if ($qtdeProducao !== 1) {
            return null;
        }
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];

        return $this->positivo($faixa['m2'] ?? null);
    }

    /**
     * @param  array<string, mixed>  $espec
     * @param  Collection<int, Produto>  $produtos
     * @return array<string, mixed>
     */
    private function linhaRevenda(PedidoItem $item, array $espec, Collection $produtos): array
    {
        $id = (int) ($item->produto_pa_id ?: ($espec['produto_id'] ?? 0));
        $produto = $produtos->get($id);
        $unidade = strtoupper(trim((string) ($item->unidade ?: ($espec['unidade'] ?? ''))));

        return [
            'tipo' => 'revenda',
            'qtde' => $this->positivo($item->qtde_faturavel) ?? $this->positivo($item->qtde_pedida),
            'unidade' => $unidade,
            'peso_unitario_kg' => $this->atributo($produto, ProdutoAtributos::PESO_KG),
        ];
    }

    /**
     * @param  iterable<int, PaEmbalagem>  $embalagens
     * @param  Collection<int, Produto>  $produtos
     * @return list<array<string, mixed>>
     */
    private function embalagens(Pedido $pedido, iterable $embalagens, Collection $produtos): array
    {
        $out = [];
        foreach ($embalagens as $emb) {
            if (! $emb instanceof PaEmbalagem) {
                continue;
            }
            if ((int) $emb->qtde_bobinas < 1 && (int) $emb->qtde_caixas < 1) {
                continue;
            }
            $item = $this->itemDaEmbalagem($pedido, $emb);
            $espec = $item && is_array($item->especificacao) ? $item->especificacao : [];
            $tubete = $produtos->get((int) ($espec['tubete_produto_id'] ?? 0));
            $caixa = $produtos->get((int) $emb->caixa_produto_id);
            $medida = $caixa ? CaixaMedida::fromAtributos(is_array($caixa->atributos) ? $caixa->atributos : null) : null;
            $comprimento = $this->atributo($tubete, 'comprimento');
            if ($comprimento !== null && bccomp($comprimento, self::COMPRIMENTO_MIN_MM, 4) < 0) {
                $comprimento = null;
            }

            $out[] = [
                'qtde_bobinas' => (int) $emb->qtde_bobinas,
                'qtde_caixas' => (int) $emb->qtde_caixas,
                'tubete' => (string) ($emb->tubete ?: ($espec['tubete'] ?? '')),
                'peso_tubete_kg' => $this->atributo($tubete, ProdutoAtributos::PESO_KG),
                'diametro_pol' => $this->textoAtributo($tubete, 'diametro_pol'),
                'espessura_mm' => $this->atributo($tubete, 'espessura_mm'),
                'comprimento_mm' => $comprimento,
                'largura_bobina_mm' => $this->larguraBobinaMm($espec),
                'peso_caixa_kg' => $this->atributo($caixa, ProdutoAtributos::PESO_KG),
                'caixa_comp_mm' => $medida[CaixaMedida::COMP] ?? null,
                'caixa_larg_mm' => $medida[CaixaMedida::LARG] ?? null,
                'caixa_alt_mm' => $medida[CaixaMedida::ALT] ?? null,
            ];
        }

        return $out;
    }

    private function itemDaEmbalagem(Pedido $pedido, PaEmbalagem $emb): ?PedidoItem
    {
        if ((int) $emb->pedido_item_id > 0) {
            $hit = $pedido->itens->first(
                fn ($item) => $item instanceof PedidoItem && (int) $item->id === (int) $emb->pedido_item_id
            );

            return $hit instanceof PedidoItem ? $hit : null;
        }
        if ($pedido->itens->count() === 1) {
            $unico = $pedido->itens->first();

            return $unico instanceof PedidoItem ? $unico : null;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $espec
     */
    private function larguraBobinaMm(array $espec): ?string
    {
        $cm = $this->positivo($espec['largura_cm'] ?? null);
        if ($cm === null) {
            return null;
        }
        $colunas = (int) ($espec['coluna_rebobinacao'] ?? 1);
        if ($colunas < 1) {
            $colunas = 1;
        }

        return bcmul(bcmul($cm, (string) $colunas, 6), '10', 4);
    }

    /**
     * @param  array<string, mixed>  $linha
     */
    private function kgLinha(array $linha): ?string
    {
        if (($linha['tipo'] ?? '') === 'revenda') {
            $qtde = $this->positivo($linha['qtde'] ?? null);
            if ($qtde === null) {
                return null;
            }
            if (strtoupper((string) ($linha['unidade'] ?? '')) === 'KG') {
                return $qtde;
            }
            $unit = $this->positivo($linha['peso_unitario_kg'] ?? null);
            if ($unit === null) {
                return null;
            }

            return bcmul($qtde, $unit, 8);
        }

        if (($linha['tipo'] ?? '') !== 'etiqueta') {
            return null;
        }
        $m2 = $this->positivo($linha['m2'] ?? null);
        if ($m2 === null) {
            return null;
        }
        $gramatura = $this->positivo($linha['gramatura_g_m2'] ?? null) ?? self::GRAMATURA_PADRAO_G_M2;

        return bcdiv(bcmul($m2, $gramatura, 8), '1000', 8);
    }

    /**
     * @param  array<string, mixed>  $volume
     */
    private function tara(array $volume): string
    {
        $tara = '0';
        $bobinas = (int) ($volume['qtde_bobinas'] ?? 0);
        $caixas = (int) ($volume['qtde_caixas'] ?? 0);
        $tubete = $this->kgUmTubete($volume);
        if ($tubete !== null && $bobinas > 0) {
            $tara = bcadd($tara, bcmul((string) $bobinas, $tubete, 8), 8);
        }
        $caixa = $this->kgUmaCaixa($volume);
        if ($caixa !== null && $caixas > 0) {
            $tara = bcadd($tara, bcmul((string) $caixas, $caixa, 8), 8);
        }

        return $tara;
    }

    /**
     * @param  array<string, mixed>  $volume
     */
    private function kgUmTubete(array $volume): ?string
    {
        $peso = $this->positivo($volume['peso_tubete_kg'] ?? null);
        if ($peso !== null) {
            return $peso;
        }
        $nome = (string) ($volume['diametro_pol'] ?? '');
        if ($nome === '') {
            $nome = (string) ($volume['tubete'] ?? '');
        }
        $idMm = $this->diametroInternoMm($nome);
        $parede = $this->positivo($volume['espessura_mm'] ?? null) ?? $this->paredePadraoMm($nome);
        $comprimento = $this->positivo($volume['comprimento_mm'] ?? null);
        if ($comprimento === null || bccomp($comprimento, self::COMPRIMENTO_MIN_MM, 4) < 0) {
            $comprimento = $this->positivo($volume['largura_bobina_mm'] ?? null);
        }
        if ($idMm === null || $parede === null || $comprimento === null) {
            return null;
        }
        if (bccomp($comprimento, self::COMPRIMENTO_MIN_MM, 4) < 0) {
            return null;
        }

        return $this->kgCasca($idMm, $parede, $comprimento);
    }

    /**
     * @param  array<string, mixed>  $volume
     */
    private function kgUmaCaixa(array $volume): ?string
    {
        $peso = $this->positivo($volume['peso_caixa_kg'] ?? null);
        if ($peso !== null) {
            return $peso;
        }
        $comp = $this->positivo($volume['caixa_comp_mm'] ?? null);
        $larg = $this->positivo($volume['caixa_larg_mm'] ?? null);
        $alt = $this->positivo($volume['caixa_alt_mm'] ?? null);
        if ($comp === null || $larg === null || $alt === null) {
            return null;
        }
        $faces = bcadd(
            bcadd(bcmul($comp, $larg, 4), bcmul($comp, $alt, 4), 4),
            bcmul($larg, $alt, 4),
            4
        );
        $areaM2 = bcdiv(bcmul('2', $faces, 4), '1000000', 8);

        return bcdiv(bcmul($areaM2, self::CHAPA_CAIXA_G_M2, 8), '1000', 8);
    }

    private function kgCasca(string $idMm, string $paredeMm, string $comprimentoMm): string
    {
        $idM = bcdiv($idMm, '1000', 8);
        $paredeM = bcdiv($paredeMm, '1000', 8);
        $compM = bcdiv($comprimentoMm, '1000', 8);
        $medio = bcadd($idM, $paredeM, 8);
        $volume = bcmul(bcmul(bcmul(self::PI, $medio, 8), $paredeM, 8), $compM, 8);

        return bcmul($volume, self::DENSIDADE_TUBETE_KG_M3, 8);
    }

    private function diametroInternoMm(string $nome): ?string
    {
        return match (InsumoEscolhaRelacao::chavePolegada($nome)) {
            '1' => '25.4',
            '1.5' => '38.1',
            '3' => '76.2',
            default => null,
        };
    }

    private function paredePadraoMm(string $nome): ?string
    {
        return match (InsumoEscolhaRelacao::chavePolegada($nome)) {
            '1', '1.5' => '2',
            '3' => '3',
            default => null,
        };
    }

    private function atributo(?Produto $produto, string $chave): ?string
    {
        $attrs = is_array($produto?->atributos) ? $produto->atributos : [];

        return $this->positivo($attrs[$chave] ?? null);
    }

    private function textoAtributo(?Produto $produto, string $chave): ?string
    {
        $attrs = is_array($produto?->atributos) ? $produto->atributos : [];
        $texto = trim((string) ($attrs[$chave] ?? ''));

        return $texto !== '' ? $texto : null;
    }

    private function positivo(mixed $raw): ?string
    {
        if (is_int($raw)) {
            return $raw > 0 ? (string) $raw : null;
        }
        if (is_float($raw)) {
            if ($raw <= 0) {
                return null;
            }
            $raw = rtrim(rtrim(sprintf('%.6F', $raw), '0'), '.');
        }
        if (! is_string($raw)) {
            return null;
        }
        try {
            $n = PadraoDecimal::parse(trim($raw));
        } catch (\InvalidArgumentException) {
            return null;
        }
        if ($n === null || bccomp($n, '0', 6) <= 0) {
            return null;
        }

        return $n;
    }

    private function formatarKg(string $kg): ?string
    {
        if (bccomp($kg, '0', 6) <= 0) {
            return null;
        }
        $fmt = PadraoDecimal::roundHalfUp($kg, 3);

        return bccomp($fmt, '0', 3) > 0 ? $fmt : null;
    }
}
