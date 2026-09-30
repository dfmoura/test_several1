<?php

namespace App\Services\Fiscal\Sefaz;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\FaturamentoItem;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Services\Fiscal\FiscalSaidaDefaults;
use App\Services\Fiscal\NfeIbsCbs;
use App\Services\Fiscal\NfeItemTexto;
use App\Services\Fiscal\FiscalSaidaTransporte;
use App\Services\Fiscal\NfeChaveAcesso;
use App\Services\Fiscal\NfePaQtdeModalidade;
use App\Services\Producao\PaEmbalagemService;
use App\Support\PadraoDecimal;

/**
 * Monta XML NF-e 4.00 (infNFe) a partir do FAT — sem JSON Focus.
 */
final class NfeXmlBuilder
{
    public function __construct(
        private readonly PaEmbalagemService $embalagem,
        private readonly FiscalSaidaTransporte $transporte,
        private readonly NfePaQtdeModalidade $qtdeModo,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $itens
     * @param  array{serie: int, numero: int}  $num
     * @return array{xml: string, chave: string, cnf: string}
     */
    public function montar(
        Empresa $empresa,
        Parceiro $dest,
        Faturamento $fat,
        array $itens,
        array $num,
        int $tpAmb,
    ): array {
        $ufEmp = strtoupper(trim((string) $empresa->uf));
        $ufDest = strtoupper(trim((string) $dest->uf));
        $familia = (string) ($itens[0]['familia_fiscal'] ?? 'PA-ETQ');
        $cnpjEmp = str_pad(preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '0', 14, '0', STR_PAD_LEFT);
        $docDest = preg_replace('/\D/', '', (string) $dest->cnpj_cpf) ?: '';
        $ieDest = (string) (ParceiroFiscalRules::normalizeIe($dest->ie) ?? '');
        $indIe = (int) ($dest->ind_ie_dest ?: ParceiroFiscalRules::deriveIndIeDest($ieDest));
        $valor = $this->soma($itens);
        $agoraSp = now()->timezone('America/Sao_Paulo');
        $dhEmi = $agoraSp->format('Y-m-d\TH:i:sP');
        $cNF = str_pad((string) random_int(1, 99999999), 8, '0', STR_PAD_LEFT);
        $serie = (int) $num['serie'];
        $nnf = (int) $num['numero'];
        $chave = NfeChaveAcesso::montar([
            'uf' => $ufEmp,
            'cnpj' => $cnpjEmp,
            'modelo' => '55',
            'serie' => $serie,
            'numero' => $nnf,
            'tipo_emissao' => 1,
            'codigo_numerico' => (int) $cNF,
            'ano' => (int) $agoraSp->year,
            'mes' => (int) $agoraSp->month,
        ]);

        $fat->loadMissing(['transportador', 'titulos', 'pedido']);
        $pedido = $fat->pedido_id
            ? ($fat->pedido ?? Pedido::query()->find((int) $fat->pedido_id))
            : null;
        $embs = $pedido instanceof Pedido
            ? $this->embalagem->confirmadasDoPedido($empresa, $pedido)
            : collect();
        $volTransp = $pedido instanceof Pedido
            ? $this->embalagem->volumesTransportePedido($empresa, $pedido)
            : null;
        $modoQtde = $this->qtdeModo->efetivo($fat, $empresa, $pedido instanceof Pedido ? $pedido : null);
        $ecoCpl = $this->embalagem->textoFiscalEco($embs);
        $modFrete = $this->modFrete($fat);
        $idDest = $ufEmp === $ufDest ? 1 : 2;
        $cMunFG = preg_replace('/\D/', '', (string) $empresa->ibge) ?: '0000000';
        $natOp = $this->esc(FiscalSaidaDefaults::natureza($familia));

        $dets = '';
        $n = 0;
        $ibsTot = ['vbc' => '0.00', 'vuf' => '0.00', 'vmun' => '0.00', 'vibs' => '0.00', 'vcbs' => '0.00'];
        $vNfTot = '0.00';
        foreach ($itens as $linha) {
            $n++;
            $aplicado = $this->qtdeModo->aplicarItem($linha, $embs, $modoQtde);
            $linha = $aplicado['linha'];
            $embTexto = $aplicado['inf_ad'];
            $produto = $this->produtoDaLinha($linha);
            $qtde = PadraoDecimal::roundHalfUp((string) $linha['qtde'], PadraoDecimal::SCALE_QTY);
            $bruto = PadraoDecimal::roundHalfUp((string) $linha['valor'], PadraoDecimal::SCALE_MONEY);
            // vUnCom derivado de vProd/qCom para passar cStat 629 (q*u ≈ vProd)
            $unit = $this->vUnComCompativel($qtde, $bruto);
            $un = strtoupper(trim((string) ($linha['unidade'] ?: $produto?->unidade_comercial ?: 'UN')));
            $cfop = FiscalSaidaDefaults::cfopSaida(
                (string) ($linha['familia_fiscal'] ?? $familia),
                $ufEmp,
                $ufDest,
                $produto?->cfop_saida_padrao
            );
            $ncm = $this->ncm($produto);
            $csosn = $produto?->csosn ?: FiscalSaidaDefaults::CSOSN_SIMPLES;
            $cstPis = $produto?->cst_pis ?: FiscalSaidaDefaults::CST_PIS;
            $cstCofins = $produto?->cst_cofins ?: FiscalSaidaDefaults::CST_COFINS;
            $origem = (int) ($produto?->origem ?? 0);
            $cProd = $this->esc($produto?->codigo ?: 'FAT'.$n);
            $xProd = $this->esc(NfeItemTexto::xProd(
                $produto?->descricao_fiscal,
                (string) ($linha['descricao_pedido'] ?? $linha['descricao'] ?? ''),
                $produto?->codigo
            ));
            $infAd = $embTexto ? '<infAdProd>'.$this->esc(mb_substr($embTexto, 0, 500)).'</infAdProd>' : '';
            $cest = preg_replace('/\D/', '', (string) ($produto?->cest ?? '')) ?: '';
            $cestXml = $cest !== '' ? '<CEST>'.$cest.'</CEST>' : '';
            $ean = preg_replace('/\D/', '', (string) ($produto?->gtin ?? '')) ?: '';
            $cEAN = $ean !== '' ? $ean : 'SEM GTIN';

            $ibs = $this->ibsCbsItem($produto, $bruto);
            $ibsTot['vbc'] = $this->soma2($ibsTot['vbc'], $ibs['vbc']);
            $ibsTot['vuf'] = $this->soma2($ibsTot['vuf'], $ibs['vuf']);
            $ibsTot['vmun'] = $this->soma2($ibsTot['vmun'], $ibs['vmun']);
            $ibsTot['vibs'] = $this->soma2($ibsTot['vibs'], $ibs['vibs']);
            $ibsTot['vcbs'] = $this->soma2($ibsTot['vcbs'], $ibs['vcbs']);
            // vItem = vProd + IBS + CBS (por fora). Soma dos vItem = vNFTot.
            $vItem = $this->soma2($bruto, $this->soma2($ibs['vibs'], $ibs['vcbs']));
            $vNfTot = $this->soma2($vNfTot, $vItem);

            $dets .= '<det nItem="'.$n.'">'
                .'<prod>'
                .'<cProd>'.$cProd.'</cProd>'
                .'<cEAN>'.$cEAN.'</cEAN>'
                .'<xProd>'.$xProd.'</xProd>'
                .'<NCM>'.$ncm.'</NCM>'
                .$cestXml
                .'<CFOP>'.$cfop.'</CFOP>'
                .'<uCom>'.$this->esc($un).'</uCom>'
                .'<qCom>'.$qtde.'</qCom>'
                .'<vUnCom>'.$unit.'</vUnCom>'
                .'<vProd>'.$bruto.'</vProd>'
                .'<cEANTrib>'.$cEAN.'</cEANTrib>'
                .'<uTrib>'.$this->esc($un).'</uTrib>'
                .'<qTrib>'.$qtde.'</qTrib>'
                .'<vUnTrib>'.$unit.'</vUnTrib>'
                .'<indTot>1</indTot>'
                .'</prod>'
                .'<imposto>'
                .$this->icmsXml($empresa, $origem, $csosn)
                .'<PIS><PISOutr><CST>'.$cstPis.'</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>'
                .'<COFINS><COFINSOutr><CST>'.$cstCofins.'</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>'
                .$ibs['xml']
                .'</imposto>'
                .$infAd
                .'<vItem>'.$vItem.'</vItem>'
                .'</det>';
        }

        $destXml = $this->destXml($dest, $docDest, $ieDest, $indIe, $ufDest, $tpAmb);
        $emitXml = $this->emitXml($empresa, $cnpjEmp, $ufEmp);
        $transpXml = $this->transpXml($fat, $modFrete, $volTransp);
        $pagXml = $this->pagXml($fat, $valor);
        $infCpl = $this->infAdicionais($fat, $ecoCpl);

        $infNFe = '<infNFe Id="NFe'.$chave.'" versao="4.00">'
            .'<ide>'
            .'<cUF>'.NfeChaveAcesso::cuf($ufEmp).'</cUF>'
            .'<cNF>'.$cNF.'</cNF>'
            .'<natOp>'.$natOp.'</natOp>'
            .'<mod>55</mod>'
            .'<serie>'.$serie.'</serie>'
            .'<nNF>'.$nnf.'</nNF>'
            .'<dhEmi>'.$dhEmi.'</dhEmi>'
            .'<tpNF>1</tpNF>'
            .'<idDest>'.$idDest.'</idDest>'
            .'<cMunFG>'.$cMunFG.'</cMunFG>'
            .'<tpImp>1</tpImp>'
            .'<tpEmis>1</tpEmis>'
            .'<cDV>'.substr($chave, -1).'</cDV>'
            .'<tpAmb>'.$tpAmb.'</tpAmb>'
            .'<finNFe>1</finNFe>'
            .'<indFinal>'.$this->indFinal($dest, $indIe).'</indFinal>'
            .'<indPres>'.FiscalSaidaDefaults::PRESENCA_COMPRADOR.'</indPres>'
            .'<procEmi>0</procEmi>'
            .'<verProc>FLEXOERP</verProc>'
            .'</ide>'
            .$emitXml
            .$destXml
            .$dets
            .'<total><ICMSTot>'
            .'<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>'
            .'<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>'
            .'<vProd>'.$valor.'</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>'
            .'<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>'
            .'<vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>'.$valor.'</vNF>'
            .'</ICMSTot>'
            .$this->ibsCbsTotXml($ibsTot)
            .'<vNFTot>'.$vNfTot.'</vNFTot>'
            .'</total>'
            .$transpXml
            .$pagXml
            .($infCpl !== '' ? '<infAdic><infCpl>'.$this->esc($infCpl).'</infCpl></infAdic>' : '')
            .'</infNFe>';

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<NFe xmlns="http://www.portalfiscal.inf.br/nfe">'.$infNFe.'</NFe>';

        return ['xml' => $xml, 'chave' => $chave, 'cnf' => $cNF];
    }

    /**
     * IBS/CBS do item — LC 214, ano-teste 2026: IBS UF 0,1% · IBS mun 0% · CBS 0,9%.
     * Não entra em vNF. CST/cClassTrib do SKU quando preenchidos.
     *
     * @return array{xml: string, vbc: string, vuf: string, vmun: string, vibs: string, vcbs: string}
     */
    private function ibsCbsItem(?Produto $produto, string $vProd): array
    {
        $cst = preg_replace('/\D/', '', (string) ($produto?->cst_cbs ?? '')) ?: '000';
        $cst = str_pad(substr($cst, 0, 3), 3, '0', STR_PAD_LEFT);
        $classe = preg_replace('/\D/', '', (string) ($produto?->cclass_trib ?? '')) ?: '';
        if (strlen($classe) !== 6 || ! str_starts_with($classe, $cst)) {
            $classe = $cst.'001';
        }

        $calc = NfeIbsCbs::calcular($vProd, $produto?->aliquota_cbs);
        $pUf = $calc['p_uf'];
        $pMun = $calc['p_mun'];
        $pCbs = $calc['p_cbs'];
        $vBc = $calc['vbc'];
        $vUf = $calc['vuf'];
        $vMun = $calc['vmun'];
        $vIbs = $calc['vibs'];
        $vCbs = $calc['vcbs'];

        $xml = '<IBSCBS>'
            .'<CST>'.$cst.'</CST>'
            .'<cClassTrib>'.$classe.'</cClassTrib>'
            .'<gIBSCBS>'
            .'<vBC>'.$vBc.'</vBC>'
            .'<gIBSUF><pIBSUF>'.$pUf.'</pIBSUF><vIBSUF>'.$vUf.'</vIBSUF></gIBSUF>'
            .'<gIBSMun><pIBSMun>'.$pMun.'</pIBSMun><vIBSMun>'.$vMun.'</vIBSMun></gIBSMun>'
            .'<vIBS>'.$vIbs.'</vIBS>'
            .'<gCBS><pCBS>'.$pCbs.'</pCBS><vCBS>'.$vCbs.'</vCBS></gCBS>'
            .'</gIBSCBS>'
            .'</IBSCBS>';

        return [
            'xml' => $xml,
            'vbc' => $vBc,
            'vuf' => $vUf,
            'vmun' => $vMun,
            'vibs' => $vIbs,
            'vcbs' => $vCbs,
        ];
    }

    /**
     * @param  array{vbc: string, vuf: string, vmun: string, vibs: string, vcbs: string}  $tot
     */
    private function ibsCbsTotXml(array $tot): string
    {
        $z = '0.00';

        return '<IBSCBSTot>'
            .'<vBCIBSCBS>'.$tot['vbc'].'</vBCIBSCBS>'
            .'<gIBS>'
            .'<gIBSUF><vDif>'.$z.'</vDif><vDevTrib>'.$z.'</vDevTrib><vIBSUF>'.$tot['vuf'].'</vIBSUF></gIBSUF>'
            .'<gIBSMun><vDif>'.$z.'</vDif><vDevTrib>'.$z.'</vDevTrib><vIBSMun>'.$tot['vmun'].'</vIBSMun></gIBSMun>'
            .'<vIBS>'.$tot['vibs'].'</vIBS>'
            .'<vCredPres>'.$z.'</vCredPres><vCredPresCondSus>'.$z.'</vCredPresCondSus>'
            .'</gIBS>'
            .'<gCBS>'
            .'<vDif>'.$z.'</vDif><vDevTrib>'.$z.'</vDevTrib><vCBS>'.$tot['vcbs'].'</vCBS>'
            .'<vCredPres>'.$z.'</vCredPres><vCredPresCondSus>'.$z.'</vCredPresCondSus>'
            .'</gCBS>'
            .'</IBSCBSTot>';
    }

    private function soma2(string $a, string $b): string
    {
        return $this->money(bcadd($a, $b, 8));
    }

    private function money(string $n): string
    {
        return PadraoDecimal::roundHalfUp($n, PadraoDecimal::SCALE_MONEY);
    }

    /**
     * CSOSN só com CRT 1 ou 4. CRT 2/3 usa CST (cStat 591 se mandar CSOSN).
     */
    private function icmsXml(Empresa $empresa, int $origem, string $csosn): string
    {
        $crt = (int) ($empresa->crt ?? 1);
        if (in_array($crt, [1, 4], true)) {
            $cod = preg_replace('/\D/', '', $csosn) ?: FiscalSaidaDefaults::CSOSN_SIMPLES;
            if (! in_array($cod, ['102', '103', '300', '400'], true)) {
                $cod = FiscalSaidaDefaults::CSOSN_SIMPLES;
            }

            return '<ICMS><ICMSSN102><orig>'.$origem.'</orig><CSOSN>'.$cod.'</CSOSN></ICMSSN102></ICMS>';
        }

        return '<ICMS><ICMS40><orig>'.$origem.'</orig><CST>40</CST></ICMS40></ICMS>';
    }

    /** cStat 696 — não contribuinte (indIEDest 9) é consumidor final. */
    private function indFinal(Parceiro $dest, int $indIe): string
    {
        if ($indIe === 9 || $dest->consumidor_final) {
            return '1';
        }

        return '0';
    }

    private function emitXml(Empresa $empresa, string $cnpj, string $uf): string
    {
        $ie = preg_replace('/\D/', '', (string) $empresa->ie) ?: '';
        $crt = (int) ($empresa->crt ?? 1);

        return '<emit>'
            .'<CNPJ>'.$cnpj.'</CNPJ>'
            .'<xNome>'.$this->esc(mb_substr((string) $empresa->razao_social, 0, 60)).'</xNome>'
            .($empresa->nome_fantasia ? '<xFant>'.$this->esc(mb_substr((string) $empresa->nome_fantasia, 0, 60)).'</xFant>' : '')
            .'<enderEmit>'
            .'<xLgr>'.$this->esc((string) $empresa->logradouro).'</xLgr>'
            .'<nro>'.$this->esc((string) ($empresa->numero ?: 'S/N')).'</nro>'
            .($empresa->complemento ? '<xCpl>'.$this->esc((string) $empresa->complemento).'</xCpl>' : '')
            .'<xBairro>'.$this->esc((string) $empresa->bairro).'</xBairro>'
            .'<cMun>'.(preg_replace('/\D/', '', (string) $empresa->ibge) ?: '0000000').'</cMun>'
            .'<xMun>'.$this->esc((string) $empresa->municipio).'</xMun>'
            .'<UF>'.$uf.'</UF>'
            .'<CEP>'.str_pad(preg_replace('/\D/', '', (string) $empresa->cep) ?: '0', 8, '0', STR_PAD_LEFT).'</CEP>'
            .'<cPais>1058</cPais><xPais>Brasil</xPais>'
            .'</enderEmit>'
            .($ie !== '' ? '<IE>'.$ie.'</IE>' : '')
            .'<CRT>'.$crt.'</CRT>'
            .'</emit>';
    }

    private function destXml(Parceiro $dest, string $doc, string $ie, int $indIe, string $uf, int $tpAmb = 1): string
    {
        $docTag = strlen($doc) === 11 ? '<CPF>'.$doc.'</CPF>' : '<CNPJ>'.str_pad($doc, 14, '0', STR_PAD_LEFT).'</CNPJ>';
        $ieXml = '';
        if (ParceiroFiscalRules::isIeNumerica($ie)) {
            $ieXml = '<IE>'.preg_replace('/\D/', '', (string) $ie).'</IE>';
        }
        // cStat 596 — SEFAZ exige este xNome literal em homologação (tpAmb=2)
        $xNome = $tpAmb === 2
            ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
            : $this->esc(mb_substr((string) $dest->razao_social, 0, 60));

        return '<dest>'
            .$docTag
            .'<xNome>'.$xNome.'</xNome>'
            .'<enderDest>'
            .'<xLgr>'.$this->esc((string) $dest->logradouro).'</xLgr>'
            .'<nro>'.$this->esc((string) ($dest->numero ?: 'S/N')).'</nro>'
            .($dest->complemento ? '<xCpl>'.$this->esc((string) $dest->complemento).'</xCpl>' : '')
            .'<xBairro>'.$this->esc((string) $dest->bairro).'</xBairro>'
            .'<cMun>'.(preg_replace('/\D/', '', (string) $dest->ibge) ?: '0000000').'</cMun>'
            .'<xMun>'.$this->esc((string) $dest->municipio).'</xMun>'
            .'<UF>'.$uf.'</UF>'
            .'<CEP>'.str_pad(preg_replace('/\D/', '', (string) $dest->cep) ?: '0', 8, '0', STR_PAD_LEFT).'</CEP>'
            .'<cPais>1058</cPais><xPais>Brasil</xPais>'
            .'</enderDest>'
            .'<indIEDest>'.$indIe.'</indIEDest>'
            .$ieXml
            .(($dest->email_xml ?: $dest->email) ? '<email>'.$this->esc((string) ($dest->email_xml ?: $dest->email)).'</email>' : '')
            .'</dest>';
    }

    /**
     * @param  array{quantidade: int|string, especie: string}|null  $vol
     */
    private function transpXml(Faturamento $fat, int $modFrete, ?array $vol): string
    {
        $xml = '<transp><modFrete>'.$modFrete.'</modFrete>';
        $par = $fat->transportador;
        if ($par !== null) {
            $doc = preg_replace('/\D/', '', (string) $par->cnpj_cpf) ?: '';
            $ie = preg_replace('/\D/', '', (string) ($par->ie ?? '')) ?: '';
            $xml .= '<transporta>';
            if (strlen($doc) === 14) {
                $xml .= '<CNPJ>'.$doc.'</CNPJ>';
            } elseif (strlen($doc) === 11) {
                $xml .= '<CPF>'.$doc.'</CPF>';
            }
            $xml .= '<xNome>'.$this->esc(mb_substr((string) $par->razao_social, 0, 60)).'</xNome>';
            if ($ie !== '') {
                $xml .= '<IE>'.$ie.'</IE>';
            }
            if ($par->municipio) {
                $xml .= '<xMun>'.$this->esc(mb_substr((string) $par->municipio, 0, 60)).'</xMun>';
            }
            if ($par->uf) {
                $xml .= '<UF>'.strtoupper(trim((string) $par->uf)).'</UF>';
            }
            $xml .= '</transporta>';
        }
        if ($vol) {
            $xml .= '<vol><qVol>'.(int) $vol['quantidade'].'</qVol>'
                .'<esp>'.$this->esc((string) $vol['especie']).'</esp></vol>';
        }
        $xml .= '</transp>';

        return $xml;
    }

    private function pagXml(Faturamento $fat, string $valor): string
    {
        $saldoZero = bccomp((string) $fat->valor_a_cobrar, '0', PadraoDecimal::SCALE_MONEY) <= 0;
        $tPag = FiscalSaidaDefaults::formaPagamentoFocus($fat->forma_pagamento, $saldoZero);
        $indPag = count($fat->titulos ?? []) > 1 ? 1 : 0;

        $tPagPad = str_pad((string) $tPag, 2, '0', STR_PAD_LEFT);
        // NT 2016.002 — tPag=99 exige xPag
        $xPag = $tPagPad === '99' ? '<xPag>Outros</xPag>' : '';

        return '<pag><detPag>'
            .'<indPag>'.$indPag.'</indPag>'
            .'<tPag>'.$tPagPad.'</tPag>'
            .$xPag
            .'<vPag>'.$valor.'</vPag>'
            .'</detPag></pag>';
    }

    private function modFrete(Faturamento $fat): int
    {
        $raw = $fat->mod_frete;
        if ($raw !== null && $raw !== '' && in_array((string) $raw, Faturamento::MOD_FRETES, true)) {
            return (int) $raw;
        }

        return FiscalSaidaDefaults::MODALIDADE_FRETE_SEM;
    }

    private function infAdicionais(Faturamento $fat, ?string $embTexto): string
    {
        $fat->loadMissing('itens');
        $temSetup = false;
        foreach ($fat->itens ?? [] as $i) {
            if (FaturamentoItem::eLinhaDeSetup((string) $i->descricao)) {
                $temSetup = true;
                break;
            }
        }
        $crt = (int) ($fat->empresa?->crt ?? 1);
        $parts = array_filter([
            'FAT '.$fat->codigo,
            $embTexto,
            $temSetup ? 'Valor inclui matriz/clichê e ferramental do job' : null,
            NfeItemTexto::complementoTributos($crt),
        ]);

        return mb_substr(implode(' | ', $parts), 0, 2000);
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     */
    private function soma(array $itens): string
    {
        $v = '0.00';
        foreach ($itens as $i) {
            $v = bcadd($v, (string) $i['valor'], PadraoDecimal::SCALE_MONEY);
        }

        return PadraoDecimal::roundHalfUp($v, PadraoDecimal::SCALE_MONEY);
    }

    /**
     * Unitário tal que round(qCom × vUnCom, 2) === vProd (cStat 629).
     */
    private function vUnComCompativel(string $qCom, string $vProd): string
    {
        if (bccomp($qCom, '0', PadraoDecimal::SCALE_QTY) === 0) {
            return '0.0000000000';
        }
        $scale = PadraoDecimal::SCALE_NF_UNIT;
        $unit = bcdiv($vProd, $qCom, $scale + 4);
        $unit = PadraoDecimal::roundHalfUp($unit, $scale);
        $step = bcpow('10', (string) (-1 * $scale), $scale);
        for ($i = 0; $i < 50; $i++) {
            $calc = PadraoDecimal::roundHalfUp(
                bcmul($qCom, $unit, $scale + 4),
                PadraoDecimal::SCALE_MONEY
            );
            $cmp = bccomp($calc, $vProd, PadraoDecimal::SCALE_MONEY);
            if ($cmp === 0) {
                return $unit;
            }
            $unit = $cmp < 0
                ? bcadd($unit, $step, $scale)
                : bcsub($unit, $step, $scale);
        }

        return $unit;
    }

    private function ncm(?Produto $produto): string
    {
        $ncm = preg_replace('/\D/', '', (string) ($produto?->ncm ?? '')) ?: '';

        return strlen($ncm) === 8 ? $ncm : FiscalSaidaDefaults::NCM_ETIQUETA;
    }

    /**
     * @param  array<string, mixed>  $linha
     */
    private function produtoDaLinha(array $linha): ?Produto
    {
        $p = $linha['produto'] ?? null;

        return $p instanceof Produto ? $p : null;
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
