<?php

namespace App\Services\Fiscal;

use SimpleXMLElement;

/**
 * Extrai cabeçalho + itens + parcelas (dup) + totais de NF-e 55 para assistência de entrada.
 * BL-037/038 — não valida assinatura/SEFAZ.
 */
class NfeCompraExtractor extends NfeEmitenteExtractor
{
    /**
     * @return array{
     *   chave_nfe: ?string,
     *   modelo: ?string,
     *   numero: ?string,
     *   serie: ?string,
     *   data_emissao: ?string,
     *   emit: array<string, mixed>,
     *   dest_cnpj: ?string,
     *   dest_cpf: ?string,
     *   vencimento_sugerido: ?string,
     *   valor_nf: ?string,
     *   totais: array{
     *     v_nf: ?string,
     *     v_prod: ?string,
     *     v_ipi: ?string,
     *     v_icms: ?string,
     *     v_frete: ?string,
     *     v_desc: ?string,
     *     v_outro: ?string,
     *     v_st: ?string
     *   },
     *   parcelas: list<array{n_dup: ?string, vencimento: string, valor: string}>,
     *   itens: list<array{
     *     n_item: int,
     *     c_prod: string,
     *     x_prod: ?string,
     *     ncm: ?string,
     *     u_com: ?string,
     *     q_com: string,
     *     v_un_com: string,
     *     v_prod: string,
     *     cfop: ?string,
     *     rastros: list<array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string}>
     *   }>
     * }
     */
    public function extractCompra(string $xmlContent): array
    {
        $xml = $this->loadXml($xmlContent);
        $inf = $this->findInfNFe($xml);
        if ($inf === null) {
            throw new \InvalidArgumentException('XML não contém infNFe (NF-e inválida ou formato não suportado).');
        }

        $base = $this->extract($xmlContent);

        $ide = $this->child($inf, 'ide');
        $numero = $this->nullable($this->text($ide, 'nNF'));
        $serie = $this->nullable($this->text($ide, 'serie'));
        $dhEmi = $this->nullable($this->text($ide, 'dhEmi'))
            ?? $this->nullable($this->text($ide, 'dEmi'));
        $dataEmissao = $this->toDate($dhEmi);

        $totais = $this->extractTotais($inf);
        $parcelas = $this->extractParcelas($inf);

        return [
            'chave_nfe' => $base['chave_nfe'],
            'modelo' => $base['modelo'],
            'numero' => $numero,
            'serie' => $serie,
            'data_emissao' => $dataEmissao,
            'emit' => $base['emit'],
            'dest_cnpj' => $base['dest_cnpj'],
            'dest_cpf' => $base['dest_cpf'],
            'vencimento_sugerido' => $parcelas[0]['vencimento'] ?? null,
            'valor_nf' => $totais['v_nf'],
            'totais' => $totais,
            'parcelas' => $parcelas,
            'itens' => $this->extractItens($inf),
        ];
    }

    /**
     * @return array{
     *   v_nf: ?string,
     *   v_prod: ?string,
     *   v_ipi: ?string,
     *   v_icms: ?string,
     *   v_frete: ?string,
     *   v_desc: ?string,
     *   v_outro: ?string,
     *   v_st: ?string
     * }
     */
    private function extractTotais(SimpleXMLElement $inf): array
    {
        $total = $this->child($inf, 'total');
        $icmsTot = $this->child($total, 'ICMSTot');

        return [
            'v_nf' => $this->nullable($this->text($icmsTot, 'vNF')),
            'v_prod' => $this->nullable($this->text($icmsTot, 'vProd')),
            'v_ipi' => $this->nullable($this->text($icmsTot, 'vIPI')),
            'v_icms' => $this->nullable($this->text($icmsTot, 'vICMS')),
            'v_frete' => $this->nullable($this->text($icmsTot, 'vFrete')),
            'v_desc' => $this->nullable($this->text($icmsTot, 'vDesc')),
            'v_outro' => $this->nullable($this->text($icmsTot, 'vOutro')),
            'v_st' => $this->nullable($this->text($icmsTot, 'vST')),
        ];
    }

    /**
     * @return list<array{n_dup: ?string, vencimento: string, valor: string}>
     */
    private function extractParcelas(SimpleXMLElement $inf): array
    {
        $cobr = $this->child($inf, 'cobr');
        if ($cobr === null) {
            return [];
        }

        $parcelas = [];
        foreach ([$cobr->children(), $cobr->children('http://www.portalfiscal.inf.br/nfe')] as $children) {
            foreach ($children as $dup) {
                if (strcasecmp($dup->getName(), 'dup') !== 0) {
                    continue;
                }
                $venc = $this->toDate($this->nullable($this->text($dup, 'dVenc')));
                $valor = $this->decimalOrZero($this->text($dup, 'vDup'));
                if ($venc === null || bccomp($valor, '0', 2) <= 0) {
                    continue;
                }
                $nDup = $this->nullable($this->text($dup, 'nDup'));
                $parcelas[] = [
                    'n_dup' => $nDup,
                    'vencimento' => $venc,
                    'valor' => $this->money($valor),
                ];
            }
            if ($parcelas !== []) {
                break;
            }
        }

        usort($parcelas, function (array $a, array $b): int {
            $byDate = strcmp($a['vencimento'], $b['vencimento']);
            if ($byDate !== 0) {
                return $byDate;
            }

            return strcmp((string) ($a['n_dup'] ?? ''), (string) ($b['n_dup'] ?? ''));
        });

        return $parcelas;
    }

    /**
     * @return list<array{
     *   n_item: int,
     *   c_prod: string,
     *   x_prod: ?string,
     *   ncm: ?string,
     *   u_com: ?string,
     *   q_com: string,
     *   v_un_com: string,
     *   v_prod: string,
     *   cfop: ?string,
     *   rastros: list<array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string}>
     * }>
     */
    private function extractItens(SimpleXMLElement $inf): array
    {
        $itens = [];
        $n = 0;

        foreach ($inf->children() as $child) {
            if (strcasecmp($child->getName(), 'det') !== 0) {
                continue;
            }
            $prod = $this->child($child, 'prod');
            if ($prod === null) {
                continue;
            }

            $n++;
            $attrs = $child->attributes();
            $nItemAttr = isset($attrs['nItem']) ? (int) $attrs['nItem'] : 0;
            $nItemChild = (int) ($this->text($child, 'nItem') ?? 0);
            $nItem = $nItemAttr > 0 ? $nItemAttr : ($nItemChild > 0 ? $nItemChild : $n);

            $cProd = trim((string) ($this->text($prod, 'cProd') ?? ''));
            if ($cProd === '') {
                continue;
            }

            $itens[] = [
                'n_item' => $nItem,
                'c_prod' => $cProd,
                'x_prod' => $this->nullable($this->text($prod, 'xProd')),
                'ncm' => $this->digits($this->text($prod, 'NCM')),
                'u_com' => $this->upper($this->text($prod, 'uCom')),
                'q_com' => $this->decimalOrZero($this->text($prod, 'qCom')),
                'v_un_com' => $this->decimalOrZero($this->text($prod, 'vUnCom')),
                'v_prod' => $this->decimalOrZero($this->text($prod, 'vProd')),
                'cfop' => $this->digits($this->text($prod, 'CFOP')),
                'rastros' => $this->extractRastros($prod),
            ];
        }

        if ($itens === []) {
            foreach ($inf->children('http://www.portalfiscal.inf.br/nfe') as $child) {
                if (strcasecmp($child->getName(), 'det') !== 0) {
                    continue;
                }
                $prod = $this->child($child, 'prod');
                if ($prod === null) {
                    continue;
                }
                $n++;
                $attrs = $child->attributes();
                $nItem = isset($attrs['nItem']) ? (int) $attrs['nItem'] : $n;
                $cProd = trim((string) ($this->text($prod, 'cProd') ?? ''));
                if ($cProd === '') {
                    continue;
                }
                $itens[] = [
                    'n_item' => $nItem,
                    'c_prod' => $cProd,
                    'x_prod' => $this->nullable($this->text($prod, 'xProd')),
                    'ncm' => $this->digits($this->text($prod, 'NCM')),
                    'u_com' => $this->upper($this->text($prod, 'uCom')),
                    'q_com' => $this->decimalOrZero($this->text($prod, 'qCom')),
                    'v_un_com' => $this->decimalOrZero($this->text($prod, 'vUnCom')),
                    'v_prod' => $this->decimalOrZero($this->text($prod, 'vProd')),
                    'cfop' => $this->digits($this->text($prod, 'CFOP')),
                    'rastros' => $this->extractRastros($prod),
                ];
            }
        }

        return $itens;
    }

    /**
     * @return list<array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string}>
     */
    private function extractRastros(SimpleXMLElement $prod): array
    {
        $out = [];
        foreach ([$prod->children(), $prod->children('http://www.portalfiscal.inf.br/nfe')] as $children) {
            foreach ($children as $rastro) {
                if (strcasecmp($rastro->getName(), 'rastro') !== 0) {
                    continue;
                }
                $codigo = $this->nullable($this->text($rastro, 'nLote'));
                if ($codigo === null || $codigo === '') {
                    continue;
                }
                $out[] = [
                    'codigo' => $codigo,
                    'qtde' => $this->decimalOrZero($this->text($rastro, 'qLote')),
                    'data_fabricacao' => $this->toDate($this->nullable($this->text($rastro, 'dFab'))),
                    'data_validade' => $this->toDate($this->nullable($this->text($rastro, 'dVal'))),
                ];
            }
            if ($out !== []) {
                break;
            }
        }

        return $out;
    }

    private function toDate(?string $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $raw, $m)) {
            return $m[1];
        }

        return null;
    }

    private function decimalOrZero(?string $value): string
    {
        if ($value === null || trim($value) === '') {
            return '0';
        }

        return trim(str_replace(',', '.', $value));
    }

    private function money(string $value): string
    {
        return bcadd($value, '0', 2);
    }
}
