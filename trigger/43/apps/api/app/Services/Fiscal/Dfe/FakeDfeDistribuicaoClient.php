<?php

namespace App\Services\Fiscal\Dfe;

/**
 * Driver de ensaio/teste — não fala com SEFAZ.
 * Primeira chamada (ultNSU=0) devolve 1 resumo do ano corrente; depois cStat 137.
 */
final class FakeDfeDistribuicaoClient implements DfeDistribuicaoClient
{
    public function distNsu(
        string $cnpj,
        string $cUfAutor,
        string $ultNsu,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado {
        $ult = ltrim($ultNsu, '0');
        if ($ult === '' || $ult === '0') {
            $ano = (int) now()->year;
            $chave = str_pad($cUfAutor, 2, '0', STR_PAD_LEFT)
                .sprintf('%02d%02d', $ano % 100, (int) now()->month)
                .str_pad(preg_replace('/\D/', '', $cnpj) ?: '0', 14, '0', STR_PAD_LEFT)
                .'551'
                .str_pad('1', 9, '0', STR_PAD_LEFT)
                .'1'
                .str_pad('1', 8, '0', STR_PAD_LEFT)
                .'0';
            // chave sintética 44 (DV não precisa ser válido no fake)
            $chave = substr($chave.str_repeat('0', 44), 0, 44);

            $xml = '<?xml version="1.0" encoding="UTF-8"?>'
                .'<resNFe xmlns="http://www.portalfiscal.inf.br/nfe">'
                .'<chNFe>'.$chave.'</chNFe>'
                .'<CNPJ>12345678000199</CNPJ>'
                .'<xNome>Fornecedor Fake DF-e</xNome>'
                .'<dhEmi>'.$ano.'-'.sprintf('%02d', (int) now()->month).'-15T10:00:00-03:00</dhEmi>'
                .'<tpNF>1</tpNF>'
                .'<vNF>250.75</vNF>'
                .'<cSitNFe>1</cSitNFe>'
                .'</resNFe>';

            return new DfeDistribuicaoResultado(
                cStat: '138',
                xMotivo: 'Documento localizado (fake)',
                ultNsu: '000000000000001',
                maxNsu: '000000000000001',
                documentos: [
                    new DfeDocZip('000000000000001', 'resNFe_v1.01.xsd', $xml),
                ],
            );
        }

        return new DfeDistribuicaoResultado(
            cStat: '137',
            xMotivo: 'Nenhum documento localizado (fake)',
            ultNsu: str_pad($ultNsu, 15, '0', STR_PAD_LEFT),
            maxNsu: str_pad($ultNsu, 15, '0', STR_PAD_LEFT),
            documentos: [],
        );
    }

    public function consChNFe(
        string $cnpj,
        string $cUfAutor,
        string $chave,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado {
        $chave = preg_replace('/\D/', '', $chave) ?? '';
        $chave = str_pad(substr($chave, 0, 44), 44, '0', STR_PAD_LEFT);
        $ano = (int) now()->year;
        $mes = sprintf('%02d', (int) now()->month);
        $dest = str_pad(preg_replace('/\D/', '', $cnpj) ?: '0', 14, '0', STR_PAD_LEFT);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .'<NFe><infNFe Id="NFe'.$chave.'" versao="4.00">'
            .'<ide><cUF>'.$cUfAutor.'</cUF><natOp>Compra fake</natOp><mod>55</mod><serie>1</serie>'
            .'<nNF>1</nNF><dhEmi>'.$ano.'-'.$mes.'-15T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest>'
            .'<cMunFG>3106200</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>'.$tpAmb.'</tpAmb>'
            .'<finNFe>1</finNFe><indFinal>0</indFinal><indPres>1</indPres></ide>'
            .'<emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Fake DF-e</xNome>'
            .'<enderEmit><xLgr>Rua</xLgr><nro>1</nro><xBairro>Centro</xBairro><cMun>3106200</cMun>'
            .'<xMun>Belo Horizonte</xMun><UF>MG</UF><CEP>30110000</CEP></enderEmit>'
            .'<IE>123</IE><CRT>3</CRT></emit>'
            .'<dest><CNPJ>'.$dest.'</CNPJ><xNome>Destinatario Fake</xNome>'
            .'<enderDest><xLgr>Rua</xLgr><nro>2</nro><xBairro>Centro</xBairro><cMun>3106200</cMun>'
            .'<xMun>Belo Horizonte</xMun><UF>MG</UF><CEP>30110000</CEP></enderDest></dest>'
            .'<det nItem="1"><prod><cProd>SKU-1</cProd><cEAN>SEM GTIN</cEAN><xProd>Insumo fake</xProd>'
            .'<NCM>39201099</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>10.0000</qCom>'
            .'<vUnCom>25.0750</vUnCom><vProd>250.75</vProd><cEANTrib>SEM GTIN</cEANTrib>'
            .'<uTrib>UN</uTrib><qTrib>10.0000</qTrib><vUnTrib>25.0750</vUnTrib><indTot>1</indTot></prod>'
            .'<imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>0.00</vBC>'
            .'<pICMS>0.00</pICMS><vICMS>0.00</vICMS></ICMS00></ICMS></imposto></det>'
            .'<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>'
            .'<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST>'
            .'<vFCPSTRet>0.00</vFCPSTRet><vProd>250.75</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg>'
            .'<vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>'
            .'<vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>250.75</vNF>'
            .'<vTotTrib>0.00</vTotTrib></ICMSTot></total>'
            .'<transp><modFrete>9</modFrete></transp>'
            .'</infNFe></NFe>'
            .'<protNFe versao="4.00"><infProt><tpAmb>'.$tpAmb.'</tpAmb><chNFe>'.$chave.'</chNFe>'
            .'<dhRecbto>'.$ano.'-'.$mes.'-15T10:05:00-03:00</dhRecbto><nProt>123</nProt>'
            .'<digVal>abc</digVal><cStat>100</cStat><xMotivo>Autorizado (fake)</xMotivo></infProt></protNFe>'
            .'</nfeProc>';

        return new DfeDistribuicaoResultado(
            cStat: '138',
            xMotivo: 'Documento localizado por chave (fake)',
            ultNsu: '000000000000001',
            maxNsu: '000000000000001',
            documentos: [
                new DfeDocZip('000000000000001', 'procNFe_v4.00.xsd', $xml),
            ],
        );
    }
}
