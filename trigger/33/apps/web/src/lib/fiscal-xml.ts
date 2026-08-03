/**
 * XML de saída próximo aos modelos reais em `modelos/nfse` e `modelos/nfe`.
 * Homologação / simulação — sem assinatura digital real (Focus assina em produção).
 */

import type { Empresa } from "@prisma/client";
import { digits, FISCAL_DEFAULTS, montarIdDps } from "@/lib/fiscal-emissao";
import { buildInfCplNfe } from "@/lib/fiscal/textos";

export type ParteFiscal = {
  documento: string | null;
  nome: string;
  ie?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  codigoMunicipioIbge?: string | null;
};

export type EmpresaFiscal = Pick<
  Empresa,
  | "cnpj"
  | "razaoSocial"
  | "nomeFantasia"
  | "inscricaoEstadual"
  | "inscricaoMunicipal"
  | "email"
  | "telefone"
  | "cep"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "uf"
  | "codigoMunicipioIbge"
  | "ambienteFiscal"
>;

export type NfseBuildInput = {
  empresa: EmpresaFiscal;
  tomador: ParteFiscal;
  numero: string;
  serie: string;
  valor: number;
  discriminacao: string;
  cTribNac?: string;
  cNbs?: string;
  chave: string;
  dpsNumero: string;
  nDFSe?: string;
  autorizadoEm?: Date;
};

export type NfeItemBuild = {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  infAdProd?: string | null;
  csosn?: string;
  xPed?: string | null;
  nItemPed?: number | string | null;
};

export type NfeBuildInput = {
  empresa: EmpresaFiscal;
  destinatario: ParteFiscal;
  numero: string;
  serie: string;
  chave: string;
  cNF: string;
  cDV: string;
  naturezaOperacao: string;
  valor: number;
  itens: NfeItemBuild[];
  vencimento?: Date;
  protocolo?: string;
  autorizadoEm?: Date;
  pedidoNumero?: string | number;
  simulado?: boolean;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isoBr(d: Date): string {
  const off = -3 * 60;
  const local = new Date(d.getTime() + off * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}-03:00`;
}

function dateOnly(d: Date): string {
  return isoBr(d).slice(0, 10);
}

const X_TRIB_NAC =
  "Composição gráfica, inclusive confecção de impressos gráficos, fotocomposição, clicheria, zincografia, litografia e fotolitografia, exceto se destinados a posterior operação de comercialização ou industrialização, ainda que incorporados, de qualquer forma, a outra mercadoria que deva ser objeto de posterior circulação, tais como bulas, rótulos, etiquetas, caixas, cartuchos, embalagens e manuais técnicos e de instrução, quando ficarão sujeitos ao ICMS.";

export function buildNfseXml(input: NfseBuildInput): string {
  const cnpj = digits(input.empresa.cnpj);
  const mun = input.empresa.codigoMunicipioIbge || "3170206";
  const ambGer = input.empresa.ambienteFiscal === "PRODUCAO" ? "1" : "2";
  const agora = isoBr(input.autorizadoEm || new Date());
  const tomaDoc = digits(input.tomador.documento);
  const tomaTag =
    tomaDoc.length === 11
      ? `<CPF>${tomaDoc}</CPF>`
      : `<CNPJ>${(tomaDoc || "00000000000000").padStart(14, "0")}</CNPJ>`;
  const v = input.valor.toFixed(2);
  const nDFSe = input.nDFSe || String(10_000_000 + Number(input.numero || 0));
  const idDps = montarIdDps({
    codigoMunicipio: mun,
    cnpj,
    serie: input.serie || FISCAL_DEFAULTS.serieDps,
    numeroDps: input.dpsNumero,
  });
  const tomaEnd =
    input.tomador.cep || input.tomador.logradouro
      ? `<end>
          <endNac>
            <cMun>${input.tomador.codigoMunicipioIbge || mun}</cMun>
            <CEP>${digits(input.tomador.cep) || "00000000"}</CEP>
          </endNac>
          <xLgr>${esc(input.tomador.logradouro || "NAO INFORMADO")}</xLgr>
          <nro>${esc(input.tomador.numero || "S/N")}</nro>
          ${input.tomador.complemento ? `<xCpl>${esc(input.tomador.complemento)}</xCpl>` : ""}
          <xBairro>${esc(input.tomador.bairro || "CENTRO")}</xBairro>
        </end>`
      : "";

  return `<?xml version="1.0" encoding="utf-8"?>
<NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFS${esc(input.chave)}">
    <xLocEmi>${esc(input.empresa.cidade || "Uberlândia")}</xLocEmi>
    <xLocPrestacao>${esc(input.empresa.cidade || "Uberlândia")}</xLocPrestacao>
    <nNFSe>${esc(input.numero)}</nNFSe>
    <cLocIncid>${mun}</cLocIncid>
    <xLocIncid>${esc(input.empresa.cidade || "Uberlândia")}</xLocIncid>
    <xTribNac>${esc(X_TRIB_NAC)}</xTribNac>
    <xNBS>${esc(FISCAL_DEFAULTS.xNbs)}</xNBS>
    <verAplic>OrcamentoFlexo_1.0</verAplic>
    <ambGer>${ambGer}</ambGer>
    <tpEmis>1</tpEmis>
    <procEmi>2</procEmi>
    <cStat>100</cStat>
    <dhProc>${agora}</dhProc>
    <nDFSe>${nDFSe}</nDFSe>
    <emit>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>${esc(input.empresa.razaoSocial)}</xNome>
      <enderNac>
        <xLgr>${esc(input.empresa.logradouro || "")}</xLgr>
        <nro>${esc(input.empresa.numero || "S/N")}</nro>
        <xBairro>${esc(input.empresa.bairro || "")}</xBairro>
        <cMun>${mun}</cMun>
        <UF>${esc(input.empresa.uf || "MG")}</UF>
        <CEP>${digits(input.empresa.cep)}</CEP>
      </enderNac>
      ${input.empresa.inscricaoMunicipal ? `<IM>${digits(input.empresa.inscricaoMunicipal)}</IM>` : ""}
      ${input.empresa.telefone ? `<fone>${digits(input.empresa.telefone)}</fone>` : ""}
      ${input.empresa.email ? `<email>${esc(input.empresa.email)}</email>` : ""}
    </emit>
    <valores><vLiq>${v}</vLiq></valores>
    <DPS versao="1.01">
      <infDPS Id="${idDps}">
        <tpAmb>${ambGer === "1" ? "1" : "2"}</tpAmb>
        <dhEmi>${agora}</dhEmi>
        <verAplic>OrcamentoFlexo_1.0</verAplic>
        <serie>${esc(input.serie)}</serie>
        <nDPS>${esc(String(Number(input.dpsNumero) || input.dpsNumero))}</nDPS>
        <dCompet>${dateOnly(input.autorizadoEm || new Date())}</dCompet>
        <tpEmit>1</tpEmit>
        <cLocEmi>${mun}</cLocEmi>
        <prest>
          <CNPJ>${cnpj}</CNPJ>
          ${input.empresa.inscricaoMunicipal ? `<IM>${digits(input.empresa.inscricaoMunicipal)}</IM>` : ""}
          ${input.empresa.telefone ? `<fone>${digits(input.empresa.telefone)}</fone>` : ""}
          ${input.empresa.email ? `<email>${esc(input.empresa.email)}</email>` : ""}
          <regTrib><opSimpNac>${FISCAL_DEFAULTS.opSimpNac}</opSimpNac><regApTribSN>${FISCAL_DEFAULTS.regApTribSN}</regApTribSN><regEspTrib>${FISCAL_DEFAULTS.regEspTrib}</regEspTrib></regTrib>
        </prest>
        <toma>
          ${tomaTag}
          <xNome>${esc(input.tomador.nome)}</xNome>
          ${tomaEnd}
          ${input.tomador.email ? `<email>${esc(input.tomador.email)}</email>` : ""}
          ${input.tomador.telefone ? `<fone>${digits(input.tomador.telefone)}</fone>` : ""}
        </toma>
        <serv>
          <locPrest><cLocPrestacao>${mun}</cLocPrestacao></locPrest>
          <cServ>
            <cTribNac>${esc(input.cTribNac || FISCAL_DEFAULTS.cTribNac)}</cTribNac>
            <xDescServ>${esc(input.discriminacao)}</xDescServ>
            <cNBS>${esc(input.cNbs || FISCAL_DEFAULTS.cNbs)}</cNBS>
          </cServ>
        </serv>
        <valores>
          <vServPrest><vServ>${v}</vServ></vServPrest>
          <trib>
            <tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>
            <tribFed><piscofins><CST>08</CST><tpRetPisCofins>0</tpRetPisCofins></piscofins></tribFed>
            <totTrib><pTotTribSN>${FISCAL_DEFAULTS.pTotTribSN.toFixed(2)}</pTotTribSN></totTrib>
          </trib>
        </valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>
`;
}

export function buildNfeSaidaXml(input: NfeBuildInput): string {
  const cnpj = digits(input.empresa.cnpj);
  const destDoc = digits(input.destinatario.documento);
  const destIsCpf = destDoc.length === 11;
  const destTag = destIsCpf
    ? `<CPF>${destDoc}</CPF>`
    : `<CNPJ>${(destDoc || "00000000000000").padStart(14, "0")}</CNPJ>`;
  const v = input.valor.toFixed(2);
  const agora = isoBr(input.autorizadoEm || new Date());
  const mun = input.empresa.codigoMunicipioIbge || "3170206";
  const munDest = input.destinatario.codigoMunicipioIbge || mun;
  const amb = input.empresa.ambienteFiscal === "PRODUCAO" ? "1" : "2";
  const venc = input.vencimento || new Date(Date.now() + 28 * 86400000);
  const prot = input.protocolo || `131${String(Date.now()).slice(-12)}`;
  const dhRec = isoBr(input.autorizadoEm || new Date());

  const dets = input.itens
    .map((it, i) => {
      const q = it.quantidade.toFixed(4);
      const vu = it.valorUnitario.toFixed(10);
      const vt = it.valorTotal.toFixed(2);
      const csosn = it.csosn || "102";
      const xPed = it.xPed || (input.pedidoNumero != null ? String(input.pedidoNumero) : null);
      const nItemPed = it.nItemPed != null ? String(it.nItemPed) : String(i + 1);
      return `      <det nItem="${i + 1}">
        <prod>
          <cProd>${esc(it.codigo)}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${esc(it.descricao)}</xProd>
          <NCM>${esc(it.ncm)}</NCM>
          <CFOP>${esc(it.cfop || FISCAL_DEFAULTS.cfopMercadoria)}</CFOP>
          <uCom>${esc(it.unidade)}</uCom>
          <qCom>${q}</qCom>
          <vUnCom>${vu}</vUnCom>
          <vProd>${vt}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${esc(it.unidade)}</uTrib>
          <qTrib>${q}</qTrib>
          <vUnTrib>${vu}</vUnTrib>
          <indTot>1</indTot>
          ${xPed ? `<xPed>${esc(xPed)}</xPed>` : ""}
          ${xPed ? `<nItemPed>${esc(nItemPed)}</nItemPed>` : ""}
        </prod>
        <imposto>
          <vTotTrib>0.00</vTotTrib>
          <ICMS><ICMSSN102><orig>0</orig><CSOSN>${csosn || FISCAL_DEFAULTS.csosn}</CSOSN></ICMSSN102></ICMS>
          <PIS><PISOutr><CST>49</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
          <COFINS><COFINSOutr><CST>49</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
        </imposto>
        ${it.infAdProd ? `<infAdProd>${esc(it.infAdProd)}</infAdProd>` : ""}
      </det>`;
    })
    .join("\n");

  const infCpl = buildInfCplNfe({
    pedidoNumero: input.pedidoNumero || input.numero,
    valorNota: input.valor,
    autorizadoEm: input.autorizadoEm,
    simulado: input.simulado,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${input.chave}" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>${esc(input.cNF)}</cNF>
        <natOp>${esc(input.naturezaOperacao || FISCAL_DEFAULTS.naturezaMercadoria)}</natOp>
        <mod>55</mod>
        <serie>${esc(input.serie)}</serie>
        <nNF>${esc(input.numero)}</nNF>
        <dhEmi>${agora}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${mun}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${esc(input.cDV)}</cDV>
        <tpAmb>${amb}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>OrcamentoFlexo_1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpj}</CNPJ>
        <xNome>${esc(input.empresa.razaoSocial)}</xNome>
        ${input.empresa.nomeFantasia ? `<xFant>${esc(input.empresa.nomeFantasia)}</xFant>` : ""}
        <enderEmit>
          <xLgr>${esc(input.empresa.logradouro || "")}</xLgr>
          <nro>${esc(input.empresa.numero || "S/N")}</nro>
          <xBairro>${esc(input.empresa.bairro || "")}</xBairro>
          <cMun>${mun}</cMun>
          <xMun>${esc(input.empresa.cidade || "")}</xMun>
          <UF>${esc(input.empresa.uf || "MG")}</UF>
          <CEP>${digits(input.empresa.cep)}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          ${input.empresa.telefone ? `<fone>${digits(input.empresa.telefone)}</fone>` : ""}
        </enderEmit>
        ${input.empresa.inscricaoEstadual ? `<IE>${digits(input.empresa.inscricaoEstadual)}</IE>` : "<IE>ISENTO</IE>"}
        <CRT>1</CRT>
      </emit>
      <dest>
        ${destTag}
        <xNome>${esc(input.destinatario.nome)}</xNome>
        <enderDest>
          <xLgr>${esc(input.destinatario.logradouro || "NAO INFORMADO")}</xLgr>
          <nro>${esc(input.destinatario.numero || "S/N")}</nro>
          ${input.destinatario.complemento ? `<xCpl>${esc(input.destinatario.complemento)}</xCpl>` : ""}
          <xBairro>${esc(input.destinatario.bairro || "CENTRO")}</xBairro>
          <cMun>${munDest}</cMun>
          <xMun>${esc(input.destinatario.cidade || input.empresa.cidade || "")}</xMun>
          <UF>${esc(input.destinatario.uf || input.empresa.uf || "MG")}</UF>
          <CEP>${digits(input.destinatario.cep) || "00000000"}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>${input.destinatario.ie ? "1" : "9"}</indIEDest>
        ${input.destinatario.ie ? `<IE>${digits(input.destinatario.ie)}</IE>` : ""}
      </dest>
${dets}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${v}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${v}</vNF>
        </ICMSTot>
      </total>
      <transp><modFrete>9</modFrete></transp>
      <cobr>
        <fat>
          <nFat>${esc(input.numero)}</nFat>
          <vOrig>${v}</vOrig>
          <vDesc>0.00</vDesc>
          <vLiq>${v}</vLiq>
        </fat>
        <dup>
          <nDup>001</nDup>
          <dVenc>${dateOnly(venc)}</dVenc>
          <vDup>${v}</vDup>
        </dup>
      </cobr>
      <pag>
        <detPag>
          <tPag>15</tPag>
          <vPag>${v}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>${esc(infCpl)}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${amb}</tpAmb>
      <verAplic>OrcamentoFlexo_1.0</verAplic>
      <chNFe>${input.chave}</chNFe>
      <dhRecbto>${dhRec}</dhRecbto>
      <nProt>${prot}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
`;
}
