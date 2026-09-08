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
     *   dest_nome: ?string,
     *   dest_email: ?string,
     *   nat_op: ?string,
     *   id_dest: ?string,
     *   fin_nfe: ?string,
     *   protocolo: array{n_prot: ?string, c_stat: ?string, dh_recbto: ?string},
     *   vencimento_sugerido: ?string,
     *   valor_nf: ?string,
     *   totais: array<string, ?string>,
     *   parcelas: list<array{n_dup: ?string, vencimento: string, valor: string}>,
     *   itens: list<array<string, mixed>>,
     *   resp_tec: ?array<string, mixed>,
     *   inf_adic: ?array<string, mixed>,
     *   transporte: ?array<string, mixed>,
     *   pag: ?array<string, mixed>,
     *   fat: ?array<string, mixed>,
     *   ide_extra: ?array<string, mixed>
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
            'dest_nome' => $this->nullable($this->text($dest, 'xNome')),
            'dest_email' => $this->nullable($this->text($dest, 'email')),
            'protocolo' => $this->extractProtocolo($xml),
            'vencimento_sugerido' => $parcelas[0]['vencimento'] ?? null,
            'valor_nf' => $totais['v_nf'],
            'totais' => $totais,
            'parcelas' => $parcelas,
            'itens' => $this->extractItens($inf),
            'resp_tec' => $this->extractRespTec($inf, $xml),
            'inf_adic' => $this->extractInfAdic($inf),
            'transporte' => $this->extractTransporte($inf),
            'pag' => $this->extractPag($inf),
            'fat' => $this->extractFat($inf),
            'ide_extra' => $this->extractIdeExtra($ide),
        ];
    }

    /**
     * infRespTec (NT 2018.005) — cópia fiel. Procura em infNFe e, por robustez,
     * como irmão de infNFe (alguns ERPs emitem fora do schema).
     *
     * @return array<string, mixed>|null
     */
    private function extractRespTec(SimpleXMLElement $inf, SimpleXMLElement $root): ?array
    {
        $node = $this->child($inf, 'infRespTec') ?? $this->findRespTecForaInfNFe($root);
        if ($node === null) {
            return null;
        }

        $out = [
            'cnpj' => $this->digits($this->text($node, 'CNPJ')),
            'x_contato' => $this->nullable($this->text($node, 'xContato')),
            'email' => $this->nullable($this->text($node, 'email')),
            'fone' => $this->digits($this->text($node, 'fone')),
            'id_csrt' => $this->nullable($this->text($node, 'idCSRT')),
            'hash_csrt' => $this->nullable($this->text($node, 'hashCSRT')),
        ];

        return $this->allNull($out) ? null : $out;
    }

    private function findRespTecForaInfNFe(SimpleXMLElement $root): ?SimpleXMLElement
    {
        $nfe = $this->child($root, 'NFe')
            ?? $this->child($this->child($root, 'nfeProc'), 'NFe')
            ?? $root;
        $node = $this->child($nfe, 'infRespTec');
        if ($node !== null) {
            return $node;
        }

        try {
            $root->registerXPathNamespace('n', 'http://www.portalfiscal.inf.br/nfe');
            $found = $root->xpath('//n:infRespTec|//*[local-name()="infRespTec"]');
            if (is_array($found) && isset($found[0]) && $found[0] instanceof SimpleXMLElement) {
                return $found[0];
            }
        } catch (\Throwable) {
            // fallthrough
        }

        return null;
    }

    /**
     * infAdic — infCpl / infAdFisco / obsCont / obsFisco (cópia fiel, sem parse de texto livre).
     *
     * @return array<string, mixed>|null
     */
    private function extractInfAdic(SimpleXMLElement $inf): ?array
    {
        $adic = $this->child($inf, 'infAdic');
        if ($adic === null) {
            return null;
        }

        $out = [
            'inf_cpl' => $this->nullable($this->text($adic, 'infCpl')),
            'inf_ad_fisco' => $this->nullable($this->text($adic, 'infAdFisco')),
            'obs_cont' => $this->extractObsLista($adic, 'obsCont'),
            'obs_fisco' => $this->extractObsLista($adic, 'obsFisco'),
        ];

        if ($out['inf_cpl'] === null && $out['inf_ad_fisco'] === null
            && $out['obs_cont'] === [] && $out['obs_fisco'] === []) {
            return null;
        }

        return $out;
    }

    /**
     * @return list<array{x_campo: ?string, x_texto: ?string}>
     */
    private function extractObsLista(SimpleXMLElement $adic, string $tag): array
    {
        $out = [];
        foreach ($this->namedChildren($adic, $tag) as $obs) {
            $attrs = $obs->attributes();
            $xCampo = isset($attrs['xCampo'])
                ? $this->nullable((string) $attrs['xCampo'])
                : $this->nullable($this->text($obs, 'xCampo'));
            $xTexto = $this->nullable($this->text($obs, 'xTexto'));
            if ($xCampo === null && $xTexto === null) {
                continue;
            }
            $out[] = [
                'x_campo' => $xCampo,
                'x_texto' => $xTexto,
            ];
        }

        return $out;
    }

    /**
     * transp — modal, transportadora, veículo e volumes (peso/espécie/lacres).
     * Cópia fiel do XML; não lança estoque.
     *
     * @return array<string, mixed>|null
     */
    private function extractTransporte(SimpleXMLElement $inf): ?array
    {
        $transp = $this->child($inf, 'transp');
        if ($transp === null) {
            return null;
        }

        $transportaNode = $this->child($transp, 'transporta');
        $transporta = null;
        if ($transportaNode !== null) {
            $transporta = [
                'cnpj' => $this->digits($this->text($transportaNode, 'CNPJ')),
                'cpf' => $this->digits($this->text($transportaNode, 'CPF')),
                'ie' => $this->nullable($this->text($transportaNode, 'IE')),
                'nome' => $this->nullable($this->text($transportaNode, 'xNome')),
                'endereco' => $this->nullable($this->text($transportaNode, 'xEnder')),
                'municipio' => $this->nullable($this->text($transportaNode, 'xMun')),
                'uf' => $this->upper($this->text($transportaNode, 'UF')),
            ];
            if ($this->allNull($transporta)) {
                $transporta = null;
            }
        }

        $veiculo = $this->extractVeiculo($this->child($transp, 'veicTransp'));
        $reboques = [];
        foreach ($this->namedChildren($transp, 'reboque') as $reb) {
            $row = $this->extractVeiculo($reb);
            if ($row !== null) {
                $reboques[] = $row;
            }
        }

        $vols = [];
        foreach ($this->namedChildren($transp, 'vol') as $vol) {
            $lacres = [];
            foreach ($this->namedChildren($vol, 'lacres') as $lacre) {
                $nLacre = $this->nullable($this->text($lacre, 'nLacre'));
                if ($nLacre !== null) {
                    $lacres[] = ['n_lacre' => $nLacre];
                }
            }
            $row = [
                'q_vol' => $this->nullable($this->text($vol, 'qVol')),
                'esp' => $this->nullable($this->text($vol, 'esp')),
                'marca' => $this->nullable($this->text($vol, 'marca')),
                'n_vol' => $this->nullable($this->text($vol, 'nVol')),
                'peso_l' => $this->nullable($this->text($vol, 'pesoL')),
                'peso_b' => $this->nullable($this->text($vol, 'pesoB')),
                'lacres' => $lacres,
            ];
            $semVol = $row['q_vol'] === null && $row['esp'] === null && $row['marca'] === null
                && $row['n_vol'] === null && $row['peso_l'] === null && $row['peso_b'] === null
                && $lacres === [];
            if (! $semVol) {
                $vols[] = $row;
            }
        }

        $out = [
            'mod_frete' => $this->nullable($this->text($transp, 'modFrete')),
            'transporta' => $transporta,
            'veiculo' => $veiculo,
            'reboque' => $reboques,
            'vagao' => $this->nullable($this->text($transp, 'vagao')),
            'balsa' => $this->nullable($this->text($transp, 'balsa')),
            'vol' => $vols,
        ];

        if ($out['mod_frete'] === null && $transporta === null && $veiculo === null
            && $reboques === [] && $out['vagao'] === null && $out['balsa'] === null && $vols === []) {
            return null;
        }

        return $out;
    }

    /**
     * @return array{placa: ?string, uf: ?string, rntc: ?string}|null
     */
    private function extractVeiculo(?SimpleXMLElement $node): ?array
    {
        if ($node === null) {
            return null;
        }

        $out = [
            'placa' => $this->upper($this->text($node, 'placa')),
            'uf' => $this->upper($this->text($node, 'UF')),
            'rntc' => $this->nullable($this->text($node, 'RNTC')),
        ];

        return $this->allNull($out) ? null : $out;
    }

    /**
     * pag / detPag — forma e indicador (à vista / a prazo).
     *
     * @return array<string, mixed>|null
     */
    private function extractPag(SimpleXMLElement $inf): ?array
    {
        $pag = $this->child($inf, 'pag');
        if ($pag === null) {
            return null;
        }

        $dets = [];
        foreach ($this->namedChildren($pag, 'detPag') as $det) {
            $row = [
                'ind_pag' => $this->nullable($this->text($det, 'indPag')),
                't_pag' => $this->nullable($this->text($det, 'tPag')),
                'v_pag' => $this->nullable($this->text($det, 'vPag')),
                'x_pag' => $this->nullable($this->text($det, 'xPag')),
            ];
            if (! $this->allNull($row)) {
                $dets[] = $row;
            }
        }

        $vTroco = $this->nullable($this->text($pag, 'vTroco'));
        if ($dets === [] && $vTroco === null) {
            return null;
        }

        return [
            'det_pag' => $dets,
            'v_troco' => $vTroco,
        ];
    }

    /**
     * cobr/fat — totais da fatura (nFat / vOrig / vDesc / vLiq). Parcelas já vão em dup.
     *
     * @return array<string, mixed>|null
     */
    private function extractFat(SimpleXMLElement $inf): ?array
    {
        $fat = $this->child($this->child($inf, 'cobr'), 'fat');
        if ($fat === null) {
            return null;
        }

        $out = [
            'n_fat' => $this->nullable($this->text($fat, 'nFat')),
            'v_orig' => $this->nullable($this->text($fat, 'vOrig')),
            'v_desc' => $this->nullable($this->text($fat, 'vDesc')),
            'v_liq' => $this->nullable($this->text($fat, 'vLiq')),
        ];

        return $this->allNull($out) ? null : $out;
    }

    /**
     * ide complementar útil na conferência (saída / previsão de entrega).
     *
     * @return array<string, mixed>|null
     */
    private function extractIdeExtra(?SimpleXMLElement $ide): ?array
    {
        if ($ide === null) {
            return null;
        }

        $out = [
            'dh_sai_ent' => $this->nullable($this->text($ide, 'dhSaiEnt')),
            'd_prev_entrega' => $this->toDate($this->nullable($this->text($ide, 'dPrevEntrega'))),
            'tp_nf' => $this->nullable($this->text($ide, 'tpNF')),
            'tp_emis' => $this->nullable($this->text($ide, 'tpEmis')),
        ];

        return $this->allNull($out) ? null : $out;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function allNull(array $row): bool
    {
        foreach ($row as $v) {
            if ($v !== null && $v !== '' && $v !== []) {
                return false;
            }
        }

        return true;
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

        $ibsTot = $this->extractIbsCbsTotais($total);

        return array_merge([
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
        ], $ibsTot);
    }

    /**
     * Totais IBSCBSTot (reforma tributária) — cópia fiel, sem recálculo.
     *
     * @return array<string, ?string>
     */
    private function extractIbsCbsTotais(?SimpleXMLElement $total): array
    {
        $empty = [
            'v_bc_ibs_cbs' => null,
            'v_ibs' => null,
            'v_cbs' => null,
            'v_ibs_uf' => null,
            'v_ibs_mun' => null,
        ];
        if ($total === null) {
            return $empty;
        }

        $ibsTot = $this->child($total, 'IBSCBSTot');
        if ($ibsTot === null) {
            return $empty;
        }

        $gIbs = $this->child($ibsTot, 'gIBS');
        $gCbs = $this->child($ibsTot, 'gCBS');
        $gUf = $this->child($gIbs, 'gIBSUF');
        $gMun = $this->child($gIbs, 'gIBSMun');

        return [
            'v_bc_ibs_cbs' => $this->nullable($this->text($ibsTot, 'vBCIBSCBS')),
            'v_ibs' => $this->nullable($this->text($gIbs, 'vIBS'))
                ?? $this->nullable($this->text($ibsTot, 'vIBS')),
            'v_cbs' => $this->nullable($this->text($gCbs, 'vCBS'))
                ?? $this->nullable($this->text($ibsTot, 'vCBS')),
            'v_ibs_uf' => $this->nullable($this->text($gUf, 'vIBSUF')),
            'v_ibs_mun' => $this->nullable($this->text($gMun, 'vIBSMun')),
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
        $xProd = $this->nullable($this->text($prod, 'xProd'));
        $infAdProd = $this->nullable($this->text($det, 'infAdProd'));
        $qCom = $this->decimalOrZero($this->text($prod, 'qCom'));
        $rastros = $this->extractRastros($prod);
        // Alguns emitentes não usam prod/rastro e colocam o lote em infAdProd / xProd.
        if ($rastros === []) {
            $rastros = $this->rastrosFromInformacaoProduto($infAdProd, $xProd, $qCom);
        }

        return [
            'n_item' => $nItem,
            'c_prod' => $cProd,
            'x_prod' => $xProd,
            'ncm' => $this->digits($this->text($prod, 'NCM')),
            'cest' => $this->digits($this->text($prod, 'CEST')),
            'u_com' => $this->upper($this->text($prod, 'uCom')),
            'q_com' => $qCom,
            'v_un_com' => $this->decimalOrZero($this->text($prod, 'vUnCom')),
            'v_prod' => $this->decimalOrZero($this->text($prod, 'vProd')),
            'u_trib' => $this->upper($this->text($prod, 'uTrib')),
            'q_trib' => $this->nullable($this->text($prod, 'qTrib')),
            'cfop' => $this->digits($this->text($prod, 'CFOP')),
            'v_frete' => $this->nullable($this->text($prod, 'vFrete')),
            'v_desc' => $this->nullable($this->text($prod, 'vDesc')),
            'v_outro' => $this->nullable($this->text($prod, 'vOutro')),
            // Pedido do comprador na NF (prod/xPed · prod/nItemPed) + FCI (prod/nFCI).
            'x_ped' => $this->nullable($this->text($prod, 'xPed')),
            'n_item_ped' => $this->nullable($this->text($prod, 'nItemPed')),
            'n_fci' => $this->normalizeFci($this->nullable($this->text($prod, 'nFCI'))),
            'inf_ad_prod' => $infAdProd,
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
            'cst_ibs_cbs' => $impostos['cst_ibs_cbs'],
            'c_class_trib' => $impostos['c_class_trib'],
            'v_bc_ibs_cbs' => $impostos['v_bc_ibs_cbs'],
            'v_ibs' => $impostos['v_ibs'],
            'v_cbs' => $impostos['v_cbs'],
            'p_cbs' => $impostos['p_cbs'],
            'p_ibs_uf' => $impostos['p_ibs_uf'],
            'v_ibs_uf' => $impostos['v_ibs_uf'],
            'p_ibs_mun' => $impostos['p_ibs_mun'],
            'v_ibs_mun' => $impostos['v_ibs_mun'],
            'impostos' => $impostos['raw'],
            'rastros' => $rastros,
        ];
    }

    /**
     * nFCI: UUID canônico em maiúsculas (como no XML SEFAZ), sem espaços.
     */
    private function normalizeFci(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $v = strtoupper(trim($raw));

        return $v === '' ? null : $v;
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
            'cst_ibs_cbs' => null,
            'c_class_trib' => null,
            'v_bc_ibs_cbs' => null,
            'v_ibs' => null,
            'v_cbs' => null,
            'p_cbs' => null,
            'p_ibs_uf' => null,
            'v_ibs_uf' => null,
            'p_ibs_mun' => null,
            'v_ibs_mun' => null,
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
        $ibs = $this->extractIbsCbsItem($imposto);

        $cstIcms = $this->nullable($this->text($icmsGrp, 'CST'));
        $csosn = $this->nullable($this->text($icmsGrp, 'CSOSN'));

        $raw = [
            'icms' => $this->elementMap($icmsGrp),
            'ipi' => $this->elementMap($ipiGrp),
            'pis' => $this->elementMap($pisGrp),
            'cofins' => $this->elementMap($cofinsGrp),
            'ibscbs' => $ibs['raw'],
        ];

        $rawEmpty = $raw === [
            'icms' => null,
            'ipi' => null,
            'pis' => null,
            'cofins' => null,
            'ibscbs' => null,
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
            'cst_ibs_cbs' => $ibs['cst_ibs_cbs'],
            'c_class_trib' => $ibs['c_class_trib'],
            'v_bc_ibs_cbs' => $ibs['v_bc_ibs_cbs'],
            'v_ibs' => $ibs['v_ibs'],
            'v_cbs' => $ibs['v_cbs'],
            'p_cbs' => $ibs['p_cbs'],
            'p_ibs_uf' => $ibs['p_ibs_uf'],
            'v_ibs_uf' => $ibs['v_ibs_uf'],
            'p_ibs_mun' => $ibs['p_ibs_mun'],
            'v_ibs_mun' => $ibs['v_ibs_mun'],
            'raw' => $rawEmpty ? null : $raw,
        ];
    }

    /**
     * Grupo IBSCBS do item (CST / cClassTrib / gIBSCBS) — cópia fiel.
     *
     * @return array<string, mixed>
     */
    private function extractIbsCbsItem(SimpleXMLElement $imposto): array
    {
        $empty = [
            'cst_ibs_cbs' => null,
            'c_class_trib' => null,
            'v_bc_ibs_cbs' => null,
            'v_ibs' => null,
            'v_cbs' => null,
            'p_cbs' => null,
            'p_ibs_uf' => null,
            'v_ibs_uf' => null,
            'p_ibs_mun' => null,
            'v_ibs_mun' => null,
            'raw' => null,
        ];

        $ibs = $this->child($imposto, 'IBSCBS');
        if ($ibs === null) {
            return $empty;
        }

        $g = $this->child($ibs, 'gIBSCBS');
        $gCbs = $this->child($g, 'gCBS');
        $gUf = $this->child($g, 'gIBSUF');
        $gMun = $this->child($g, 'gIBSMun');

        $cst = $this->nullable($this->text($ibs, 'CST'));
        $cClass = $this->nullable($this->text($ibs, 'cClassTrib'));
        $vBc = $this->nullable($this->text($g, 'vBC'));
        $vIbs = $this->nullable($this->text($g, 'vIBS'));
        $pCbs = $this->nullable($this->text($gCbs, 'pCBS'));
        $vCbs = $this->nullable($this->text($gCbs, 'vCBS'));
        $pUf = $this->nullable($this->text($gUf, 'pIBSUF'));
        $vUf = $this->nullable($this->text($gUf, 'vIBSUF'));
        $pMun = $this->nullable($this->text($gMun, 'pIBSMun'));
        $vMun = $this->nullable($this->text($gMun, 'vIBSMun'));

        $raw = [
            'CST' => $cst,
            'cClassTrib' => $cClass,
            'gIBSCBS' => $g === null ? null : [
                'vBC' => $vBc,
                'vIBS' => $vIbs,
                'gCBS' => $this->elementMap($gCbs),
                'gIBSUF' => $this->elementMap($gUf),
                'gIBSMun' => $this->elementMap($gMun),
            ],
        ];

        return [
            'cst_ibs_cbs' => $cst,
            'c_class_trib' => $cClass,
            'v_bc_ibs_cbs' => $vBc,
            'v_ibs' => $vIbs,
            'v_cbs' => $vCbs,
            'p_cbs' => $pCbs,
            'p_ibs_uf' => $pUf,
            'v_ibs_uf' => $vUf,
            'p_ibs_mun' => $pMun,
            'v_ibs_mun' => $vMun,
            'raw' => $raw,
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
     * @return list<array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string, fonte: string}>
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
                    'fonte' => 'rastro',
                ];
            }
            if ($out !== []) {
                break;
            }
        }

        return $out;
    }

    /**
     * Fallback quando o emitente coloca o lote em infAdProd / xProd (sem prod/rastro).
     * Conservador: só códigos explícitos rotulados como lote/nLote — não inventa a partir de FCI/texto livre.
     *
     * @return list<array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string, fonte: string}>
     */
    private function rastrosFromInformacaoProduto(?string $infAdProd, ?string $xProd, string $qCom): array
    {
        $blob = trim(implode(' ', array_filter([$infAdProd, $xProd], static fn ($v) => is_string($v) && trim($v) !== '')));
        if ($blob === '') {
            return [];
        }

        $codigos = [];
        $patterns = [
            '/\b(?:n[º°o.]?\s*)?(?:do\s+)?lotes?\s*[:=\-]?\s*([A-Z0-9][A-Z0-9.\-\/_]{1,40})/iu',
            '/\bnLote\s*[:=\-]?\s*([A-Z0-9][A-Z0-9.\-\/_]{1,40})/iu',
        ];
        foreach ($patterns as $pattern) {
            if (! preg_match_all($pattern, $blob, $m)) {
                continue;
            }
            foreach ($m[1] as $raw) {
                $codigo = $this->normalizeLoteCodigo($raw);
                if ($codigo === null) {
                    continue;
                }
                $codigos[$codigo] = true;
            }
        }

        if ($codigos === []) {
            return [];
        }

        $lista = array_keys($codigos);
        $n = count($lista);
        $out = [];
        if ($n === 1) {
            $out[] = [
                'codigo' => $lista[0],
                'qtde' => $qCom,
                'data_fabricacao' => null,
                'data_validade' => null,
                'fonte' => 'inf_ad_prod',
            ];

            return $out;
        }

        // Vários lotes no texto sem qtde individual: qtde 0 — humano confere no assist.
        foreach ($lista as $codigo) {
            $out[] = [
                'codigo' => $codigo,
                'qtde' => '0',
                'data_fabricacao' => null,
                'data_validade' => null,
                'fonte' => 'inf_ad_prod',
            ];
        }

        return $out;
    }

    private function normalizeLoteCodigo(string $raw): ?string
    {
        $codigo = trim($raw);
        $codigo = rtrim($codigo, '.,;:)');
        if ($codigo === '' || strlen($codigo) < 2) {
            return null;
        }
        // Evita capturar UUID de FCI / tokens fiscais.
        if (preg_match('/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i', $codigo)) {
            return null;
        }
        if (preg_match('/^(CBS|IBS|ICMS|IPI|PIS|COFINS|FCI|NCM|CFOP)$/i', $codigo)) {
            return null;
        }

        return $codigo;
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
