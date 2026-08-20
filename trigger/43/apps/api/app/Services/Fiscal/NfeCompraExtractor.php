<?php

namespace App\Services\Fiscal;

use SimpleXMLElement;

/**
 * Extrai cabeçalho + itens + parcelas + impostos (cópia fiel) de NF-e 55.
 * BL-037/038/048 — não valida assinatura/SEFAZ nem escrituração.
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
     *   dest_ie: ?string,
     *   dest_uf: ?string,
     *   nat_op: ?string,
     *   id_dest: ?string,
     *   fin_nfe: ?string,
     *   protocolo: array{n_prot: ?string, c_stat: ?string, dh_recbto: ?string},
     *   vencimento_sugerido: ?string,
     *   valor_nf: ?string,
     *   totais: array<string, ?string>,
     *   parcelas: list<array{n_dup: ?string, vencimento: string, valor: string}>,
     *   itens: list<array<string, mixed>>
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

        $dest = $this->child($inf, 'dest');
        $enderDest = $this->child($dest, 'enderDest');

        $totais = $this->extractTotais($inf);
        $parcelas = $this->extractParcelas($inf);

        return [
            'chave_nfe' => $base['chave_nfe'],
            'modelo' => $base['modelo'],
            'numero' => $numero,
            'serie' => $serie,
            'data_emissao' => $dataEmissao,
            'nat_op' => $this->nullable($this->text($ide, 'natOp')),
            'id_dest' => $this->nullable($this->text($ide, 'idDest')),
            'fin_nfe' => $this->nullable($this->text($ide, 'finNFe')),
            'emit' => $base['emit'],
            'dest_cnpj' => $base['dest_cnpj'],
            'dest_cpf' => $base['dest_cpf'],
            'dest_ie' => $this->nullable($this->text($dest, 'IE')),
            'dest_uf' => $this->upper($this->text($enderDest, 'UF')),
            'protocolo' => $this->extractProtocolo($xml),
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
            'v_pis' => $this->nullable($this->text($icmsTot, 'vPIS')),
            'v_cofins' => $this->nullable($this->text($icmsTot, 'vCOFINS')),
            'v_bc' => $this->nullable($this->text($icmsTot, 'vBC')),
            'v_bc_st' => $this->nullable($this->text($icmsTot, 'vBCST')),
            'v_seg' => $this->nullable($this->text($icmsTot, 'vSeg')),
            'v_ii' => $this->nullable($this->text($icmsTot, 'vII')),
            'v_ipi_devol' => $this->nullable($this->text($icmsTot, 'vIPIDevol')),
            'v_fcp' => $this->nullable($this->text($icmsTot, 'vFCP')),
            'v_fcp_st' => $this->nullable($this->text($icmsTot, 'vFCPST')),
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
     * @return list<array<string, mixed>>
     */
    private function extractItens(SimpleXMLElement $inf): array
    {
        $itens = [];
        $n = 0;

        foreach ($this->detNodes($inf) as $child) {
            $item = $this->extractDetItem($child, ++$n);
            if ($item !== null) {
                $itens[] = $item;
            }
        }

        return $itens;
    }

    /**
     * @return list<SimpleXMLElement>
     */
    private function detNodes(SimpleXMLElement $inf): array
    {
        $out = [];
        foreach ($inf->children() as $child) {
            if (strcasecmp($child->getName(), 'det') === 0) {
                $out[] = $child;
            }
        }
        if ($out !== []) {
            return $out;
        }
        foreach ($inf->children('http://www.portalfiscal.inf.br/nfe') as $child) {
            if (strcasecmp($child->getName(), 'det') === 0) {
                $out[] = $child;
            }
        }

        return $out;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractDetItem(SimpleXMLElement $det, int $fallbackN): ?array
    {
        $prod = $this->child($det, 'prod');
        if ($prod === null) {
            return null;
        }

        $cProd = trim((string) ($this->text($prod, 'cProd') ?? ''));
        if ($cProd === '') {
            return null;
        }

        $attrs = $det->attributes();
        $nItemAttr = isset($attrs['nItem']) ? (int) $attrs['nItem'] : 0;
        $nItemChild = (int) ($this->text($det, 'nItem') ?? 0);
        $nItem = $nItemAttr > 0 ? $nItemAttr : ($nItemChild > 0 ? $nItemChild : $fallbackN);

        $impostos = $this->extractImpostos($det);

        return [
            'n_item' => $nItem,
            'c_prod' => $cProd,
            'x_prod' => $this->nullable($this->text($prod, 'xProd')),
            'ncm' => $this->digits($this->text($prod, 'NCM')),
            'cest' => $this->digits($this->text($prod, 'CEST')),
            'u_com' => $this->upper($this->text($prod, 'uCom')),
            'q_com' => $this->decimalOrZero($this->text($prod, 'qCom')),
            'v_un_com' => $this->decimalOrZero($this->text($prod, 'vUnCom')),
            'v_prod' => $this->decimalOrZero($this->text($prod, 'vProd')),
            'u_trib' => $this->upper($this->text($prod, 'uTrib')),
            'q_trib' => $this->nullable($this->text($prod, 'qTrib')),
            'cfop' => $this->digits($this->text($prod, 'CFOP')),
            'v_frete' => $this->nullable($this->text($prod, 'vFrete')),
            'v_desc' => $this->nullable($this->text($prod, 'vDesc')),
            'v_outro' => $this->nullable($this->text($prod, 'vOutro')),
            'orig' => $impostos['orig'],
            'cst_icms' => $impostos['cst_icms'],
            'csosn' => $impostos['csosn'],
            'v_bc' => $impostos['v_bc'],
            'p_icms' => $impostos['p_icms'],
            'v_icms' => $impostos['v_icms'],
            'v_bc_st' => $impostos['v_bc_st'],
            'v_icms_st' => $impostos['v_icms_st'],
            'cst_ipi' => $impostos['cst_ipi'],
            'p_ipi' => $impostos['p_ipi'],
            'v_ipi' => $impostos['v_ipi'],
            'cst_pis' => $impostos['cst_pis'],
            'p_pis' => $impostos['p_pis'],
            'v_pis' => $impostos['v_pis'],
            'cst_cofins' => $impostos['cst_cofins'],
            'p_cofins' => $impostos['p_cofins'],
            'v_cofins' => $impostos['v_cofins'],
            'impostos' => $impostos['raw'],
            'rastros' => $this->extractRastros($prod),
        ];
    }

    /**
     * Cópia fiel do grupo imposto (PADRAO §5.4 — sem recálculo).
     *
     * @return array<string, mixed>
     */
    private function extractImpostos(SimpleXMLElement $det): array
    {
        $empty = [
            'orig' => null,
            'cst_icms' => null,
            'csosn' => null,
            'v_bc' => null,
            'p_icms' => null,
            'v_icms' => null,
            'v_bc_st' => null,
            'v_icms_st' => null,
            'cst_ipi' => null,
            'p_ipi' => null,
            'v_ipi' => null,
            'cst_pis' => null,
            'p_pis' => null,
            'v_pis' => null,
            'cst_cofins' => null,
            'p_cofins' => null,
            'v_cofins' => null,
            'raw' => null,
        ];

        $imposto = $this->child($det, 'imposto');
        if ($imposto === null) {
            return $empty;
        }

        $icmsGrp = $this->firstTaxGroup($this->child($imposto, 'ICMS'), []);
        $ipiGrp = $this->firstTaxGroup($this->child($imposto, 'IPI'), ['cEnq', 'clEnq', 'CNPJProd', 'cSelo', 'qSelo']);
        $pisGrp = $this->firstTaxGroup($this->child($imposto, 'PIS'), []);
        $cofinsGrp = $this->firstTaxGroup($this->child($imposto, 'COFINS'), []);

        $cstIcms = $this->nullable($this->text($icmsGrp, 'CST'));
        $csosn = $this->nullable($this->text($icmsGrp, 'CSOSN'));

        $raw = [
            'icms' => $this->elementMap($icmsGrp),
            'ipi' => $this->elementMap($ipiGrp),
            'pis' => $this->elementMap($pisGrp),
            'cofins' => $this->elementMap($cofinsGrp),
        ];

        return [
            'orig' => $this->nullable($this->text($icmsGrp, 'orig')),
            'cst_icms' => $cstIcms,
            'csosn' => $csosn,
            'v_bc' => $this->nullable($this->text($icmsGrp, 'vBC')),
            'p_icms' => $this->nullable($this->text($icmsGrp, 'pICMS')),
            'v_icms' => $this->nullable($this->text($icmsGrp, 'vICMS')),
            'v_bc_st' => $this->nullable($this->text($icmsGrp, 'vBCST')),
            'v_icms_st' => $this->nullable($this->text($icmsGrp, 'vICMSST')),
            'cst_ipi' => $this->nullable($this->text($ipiGrp, 'CST')),
            'p_ipi' => $this->nullable($this->text($ipiGrp, 'pIPI')),
            'v_ipi' => $this->nullable($this->text($ipiGrp, 'vIPI')),
            'cst_pis' => $this->nullable($this->text($pisGrp, 'CST')),
            'p_pis' => $this->nullable($this->text($pisGrp, 'pPIS')),
            'v_pis' => $this->nullable($this->text($pisGrp, 'vPIS')),
            'cst_cofins' => $this->nullable($this->text($cofinsGrp, 'CST')),
            'p_cofins' => $this->nullable($this->text($cofinsGrp, 'pCOFINS')),
            'v_cofins' => $this->nullable($this->text($cofinsGrp, 'vCOFINS')),
            'raw' => $raw === ['icms' => null, 'ipi' => null, 'pis' => null, 'cofins' => null] ? null : $raw,
        ];
    }

    /**
     * @param  list<string>  $skipNames
     */
    private function firstTaxGroup(?SimpleXMLElement $parent, array $skipNames): ?SimpleXMLElement
    {
        if ($parent === null) {
            return null;
        }

        $skip = array_map('strtolower', $skipNames);
        foreach ([$parent->children(), $parent->children('http://www.portalfiscal.inf.br/nfe')] as $children) {
            foreach ($children as $child) {
                if (in_array(strtolower($child->getName()), $skip, true)) {
                    continue;
                }

                return $child;
            }
        }

        return null;
    }

    /**
     * @return array<string, string>|null
     */
    private function elementMap(?SimpleXMLElement $node): ?array
    {
        if ($node === null) {
            return null;
        }

        $out = [];
        foreach ([$node->children(), $node->children('http://www.portalfiscal.inf.br/nfe')] as $children) {
            foreach ($children as $child) {
                $name = $child->getName();
                $value = trim((string) $child);
                if ($name !== '' && $value !== '' && ! isset($out[$name])) {
                    $out[$name] = $value;
                }
            }
            if ($out !== []) {
                break;
            }
        }

        return $out === [] ? null : $out;
    }

    /**
     * @return array{n_prot: ?string, c_stat: ?string, dh_recbto: ?string}
     */
    private function extractProtocolo(SimpleXMLElement $root): array
    {
        $empty = ['n_prot' => null, 'c_stat' => null, 'dh_recbto' => null];
        $prot = $this->child($root, 'protNFe')
            ?? $this->child($this->child($root, 'nfeProc'), 'protNFe')
            ?? $this->child($root, 'infProt');
        $inf = $this->child($prot, 'infProt') ?? $prot;
        if ($inf === null) {
            return $empty;
        }

        return [
            'n_prot' => $this->nullable($this->text($inf, 'nProt')),
            'c_stat' => $this->nullable($this->text($inf, 'cStat')),
            'dh_recbto' => $this->nullable($this->text($inf, 'dhRecbto')),
        ];
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
