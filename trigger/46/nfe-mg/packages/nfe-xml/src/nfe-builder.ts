import type { Crt, Emitente, EmitirNfeInput, Endereco, NfeItemInput } from '@nfe/domain';
import { HOMOLOG_DEST_NOME, money, qty, round2 } from '@nfe/domain';
import { escapeXml, formatDhEmiBr, nfeInfId, NS_NFE, digits } from './xml-utils.js';

export interface NfeBuildParams {
  chaveAcesso: string;
  cNF: string;
  cDV: string;
  serie: number;
  numero: number;
  emitente: Emitente;
  input: EmitirNfeInput;
  tpAmb: '1' | '2';
  dhEmi?: Date;
  verProc?: string;
}

function enderXml(tag: string, end: Endereco, telefone?: string): string {
  const fone = telefone ? `\n        <fone>${digits(telefone)}</fone>` : '';
  const compl = end.complemento ? `\n        <xCpl>${escapeXml(end.complemento)}</xCpl>` : '';
  return `      <${tag}>
        <xLgr>${escapeXml(end.logradouro)}</xLgr>
        <nro>${escapeXml(end.numero)}</nro>${compl}
        <xBairro>${escapeXml(end.bairro)}</xBairro>
        <cMun>${digits(end.codigoMunicipio, 7)}</cMun>
        <xMun>${escapeXml(end.municipio)}</xMun>
        <UF>${escapeXml(end.uf)}</UF>
        <CEP>${digits(end.cep, 8)}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>${fone}
      </${tag}>`;
}

function destDocXml(tipo: 'PF' | 'PJ' | 'EX', cpfCnpj: string): string {
  if (tipo === 'EX') {
    return `        <idEstrangeiro>${escapeXml(cpfCnpj)}</idEstrangeiro>`;
  }
  const d = digits(cpfCnpj);
  return tipo === 'PJ' ? `        <CNPJ>${d}</CNPJ>` : `        <CPF>${d}</CPF>`;
}

function icmsXml(item: NfeItemInput, crt: Crt): string {
  const orig = item.origem ?? '0';
  if (crt === '1' || crt === '2') {
    const csosn = item.csosn ?? '102';
    return `          <ICMS>
            <ICMSSN102>
              <orig>${orig}</orig>
              <CSOSN>${csosn}</CSOSN>
            </ICMSSN102>
          </ICMS>`;
  }
  const cst = item.cst ?? '00';
  if (cst === '00') {
    const vProd = round2(item.quantidade * item.valorUnitario);
    return `          <ICMS>
            <ICMS00>
              <orig>${orig}</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>${money(vProd)}</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>${money(round2(vProd * 0.18))}</vICMS>
            </ICMS00>
          </ICMS>`;
  }
  return `          <ICMS>
            <ICMS40>
              <orig>${orig}</orig>
              <CST>${cst}</CST>
            </ICMS40>
          </ICMS>`;
}

function itemXml(item: NfeItemInput, nItem: number, crt: Crt, tpAmb: '1' | '2'): string {
  const vProd = round2(item.quantidade * item.valorUnitario);
  const descricao =
    tpAmb === '2' && nItem === 1
      ? HOMOLOG_DEST_NOME
      : item.descricao;
  const cest = item.cest ? `\n          <CEST>${digits(item.cest, 7)}</CEST>` : '';

  return `      <det nItem="${nItem}">
        <prod>
          <cProd>${escapeXml(item.codigo)}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${escapeXml(descricao.slice(0, 120))}</xProd>
          <NCM>${digits(item.ncm, 8)}</NCM>${cest}
          <CFOP>${item.cfop}</CFOP>
          <uCom>${escapeXml(item.unidade)}</uCom>
          <qCom>${qty(item.quantidade)}</qCom>
          <vUnCom>${item.valorUnitario.toFixed(4)}</vUnCom>
          <vProd>${money(vProd)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${escapeXml(item.unidade)}</uTrib>
          <qTrib>${qty(item.quantidade)}</qTrib>
          <vUnTrib>${item.valorUnitario.toFixed(4)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>0.00</vTotTrib>
${icmsXml(item, crt)}
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>`;
}

function idDest(emitUf: string, destUf: string): string {
  if (emitUf === destUf) return '1';
  if (destUf === 'EX') return '3';
  return '2';
}

export class NfeBuilder {
  build(params: NfeBuildParams): string {
    const {
      chaveAcesso, cNF, cDV, serie, numero, emitente, input, tpAmb,
    } = params;
    const dhEmi = formatDhEmiBr(params.dhEmi);
    const infId = nfeInfId(chaveAcesso);
    const destNome = tpAmb === '2' ? HOMOLOG_DEST_NOME : input.destinatario.razaoSocial;
    const vProd = round2(input.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0));
    const crt = emitente.crt;
    let vICMS = 0;
    if (crt === '3') {
      vICMS = round2(
        input.itens
          .filter((i) => (i.cst ?? '00') === '00')
          .reduce((s, i) => s + i.quantidade * i.valorUnitario * 0.18, 0),
      );
    }
    const dest = input.destinatario;
    const ieXml =
      dest.indIEDest === '1' && dest.inscricaoEstadual
        ? `\n        <IE>${digits(dest.inscricaoEstadual)}</IE>`
        : dest.indIEDest === '2'
          ? '\n        <IE>ISENTO</IE>'
          : '';
    const emailXml = dest.email ? `\n        <email>${escapeXml(dest.email)}</email>` : '';
    const infAdic = input.informacoesAdicionais
      ? `\n    <infAdic>\n      <infCpl>${escapeXml(input.informacoesAdicionais)}</infCpl>\n    </infAdic>`
      : '';
    const fantasia = emitente.nomeFantasia
      ? `\n        <xFant>${escapeXml(emitente.nomeFantasia)}</xFant>`
      : '';
    const ieEmit = digits(emitente.inscricaoEstadual);

    const dets = input.itens.map((item, i) => itemXml(item, i + 1, crt, tpAmb)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="${NS_NFE}">
  <infNFe Id="${infId}" versao="4.00">
    <ide>
      <cUF>31</cUF>
      <cNF>${digits(cNF, 8)}</cNF>
      <natOp>${escapeXml(input.naturezaOperacao.slice(0, 60))}</natOp>
      <mod>55</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>${idDest(emitente.endereco.uf, dest.endereco.uf)}</idDest>
      <cMunFG>${digits(emitente.endereco.codigoMunicipio, 7)}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>${tpAmb}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>${input.indFinal ?? '1'}</indFinal>
      <indPres>${input.indPres ?? '1'}</indPres>
      <procEmi>0</procEmi>
      <verProc>${escapeXml(params.verProc ?? 'NFeMG/1.0.0')}</verProc>
    </ide>
    <emit>
      <CNPJ>${digits(emitente.cnpj, 14)}</CNPJ>
      <xNome>${escapeXml(emitente.razaoSocial)}</xNome>${fantasia}
${enderXml('enderEmit', emitente.endereco, emitente.telefone)}
      <IE>${ieEmit}</IE>
      <CRT>${crt}</CRT>
    </emit>
    <dest>
${destDocXml(dest.tipo, dest.cpfCnpj)}
      <xNome>${escapeXml(destNome)}</xNome>
${enderXml('enderDest', dest.endereco, dest.telefone)}
      <indIEDest>${dest.indIEDest}</indIEDest>${ieXml}${emailXml}
    </dest>
${dets}
    <total>
      <ICMSTot>
        <vBC>${crt === '3' ? money(vProd) : '0.00'}</vBC>
        <vICMS>${money(vICMS)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${money(vProd)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${money(vProd)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${input.modFrete ?? '9'}</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>0</indPag>
        <tPag>01</tPag>
        <vPag>${money(vProd)}</vPag>
      </detPag>
    </pag>${infAdic}
  </infNFe>
</NFe>`;
  }
}

export function wrapEnviNFe(nfeXml: string, idLote: string, indSinc: '0' | '1' = '1'): string {
  const inner = nfeXml.replace(/^<\?xml[^>]*>\s*/i, '').trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe xmlns="${NS_NFE}" versao="4.00">
  <idLote>${idLote}</idLote>
  <indSinc>${indSinc}</indSinc>
  ${inner}
</enviNFe>`;
}

export function wrapProcNFe(nfeXml: string, nProt: string, dhRecbto: string, cStat = '100', xMotivo = 'Autorizado o uso da NF-e'): string {
  const inner = nfeXml.replace(/^<\?xml[^>]*>\s*/i, '').trim();
  const infId = nfeXml.match(/Id="(NFe\d{44})"/)?.[1] ?? '';
  const chave = infId.replace(/^NFe/, '');
  const tpAmb = nfeXml.match(/<tpAmb>(\d)<\/tpAmb>/)?.[1] ?? '2';
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="${NS_NFE}" versao="4.00">
  ${inner}
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${tpAmb}</tpAmb>
      <verAplic>NFeMG-MOCK</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dhRecbto}</dhRecbto>
      <nProt>${nProt}</nProt>
      <digVal>MOCK</digVal>
      <cStat>${cStat}</cStat>
      <xMotivo>${escapeXml(xMotivo)}</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}
