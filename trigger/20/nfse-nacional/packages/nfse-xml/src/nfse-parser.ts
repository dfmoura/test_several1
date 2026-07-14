import { DOMParser, type Document, type Element } from '@xmldom/xmldom';
import { extractTag } from './xml-utils.js';

export interface EnderecoNacional {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  codigoMunicipio?: string;
  uf?: string;
  cep?: string;
  nomeMunicipio?: string;
}

export interface NfseDocument {
  chaveAcesso: string;
  situacao?: string;
  versao?: string;
  nNfse?: string;
  nDFSe?: string;
  dhProc?: string;
  dhEmi?: string;
  dCompet?: string;
  tpAmb?: string;
  xLocEmi?: string;
  xLocPrestacao?: string;
  xLocIncid?: string;
  /** Código IBGE do município de incidência do ISSQN (cLocIncid). */
  codigoMunicipioIncidencia?: string;
  /** UF do município de incidência (enriquecido para exibição no DANFSe). */
  ufMunicipioIncidencia?: string;
  xTribNac?: string;
  xNBS?: string;
  prestador: {
    cnpj?: string;
    cpf?: string;
    razaoSocial?: string;
    inscricaoMunicipal?: string;
    email?: string;
    telefone?: string;
    endereco?: EnderecoNacional;
  };
  tomador: {
    cnpj?: string;
    cpf?: string;
    razaoSocial?: string;
    inscricaoMunicipal?: string;
    email?: string;
    telefone?: string;
    endereco?: EnderecoNacional;
  };
  servico: {
    codigoTributacaoNacional?: string;
    codigoTributacaoMunicipal?: string;
    descricao?: string;
    codigoMunicipioPrestacao?: string;
    /** UF do local de prestação (enriquecido para exibição no DANFSe). */
    ufMunicipioPrestacao?: string;
    codigoPaisPrestacao?: string;
    /** País de consumo/resultado da prestação (cPaisConsum). */
    codigoPaisResultado?: string;
    codigoNBS?: string;
    discriminacao?: string;
  };
  regTrib?: {
    opSimpNac?: string;
    regApTribSN?: string;
    regEspTrib?: string;
  };
  tributacao?: {
    tribISSQN?: string;
    tpRetISSQN?: string;
    tpImunidade?: string;
    nBM?: string;
    suspensaoExigibilidade?: string;
    numeroProcessoSuspensao?: string;
    tpRetPisCofins?: string;
    pTotTribSN?: number;
    vTotTribFed?: number;
    vTotTribEst?: number;
    vTotTribMun?: number;
    pTotTribFed?: number;
    pTotTribEst?: number;
    pTotTribMun?: number;
  };
  valores: {
    valorServico: number;
    descontoIncondicionado?: number;
    descontoCondicionado?: number;
    totalDeducoes?: number;
    calculoBM?: number;
    baseCalculo?: number;
    aliquotaIss?: number;
    valorIss?: number;
    valorLiquido?: number;
    valorTotalRetido?: number;
    valorPis?: number;
    valorCofins?: number;
    valorIr?: number;
    valorCsll?: number;
    valorInss?: number;
  };
  dps?: {
    numero?: string;
    serie?: string;
    id?: string;
  };
  chaveSubstituta?: string;
  ibsCbs?: {
    valorTotal?: number;
  };
}

function text(el: Element | null | undefined, tag: string): string | undefined {
  if (!el) return undefined;
  const nodes = el.getElementsByTagName(tag);
  const node = nodes[0];
  return node?.textContent?.trim() || undefined;
}

function num(value?: string): number {
  if (!value) return 0;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Número somente quando a tag existe no XML — sem fallback (layout DANFSe isBlankWhenNull). */
function optionalNum(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function firstByLocalName(root: Document | Element, name: string): Element | null {
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (el.localName === name || el.nodeName === name) return el as Element;
  }
  return null;
}

function childByLocalName(parent: Element | null | undefined, name: string): Element | null {
  if (!parent) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (node?.nodeType === 1) {
      const el = node as Element;
      if (el.localName === name || el.nodeName === name) return el;
    }
  }
  return null;
}

function parseEnderecoNac(container: Element | null | undefined): EnderecoNacional | undefined {
  if (!container) return undefined;
  const enderNac = childByLocalName(container, 'enderNac') ?? childByLocalName(container, 'endNac');
  const end = childByLocalName(container, 'end') ?? container;

  const logradouro = text(end, 'xLgr');
  const numero = text(end, 'nro');
  const complemento = text(end, 'xCpl');
  const bairro = text(end, 'xBairro');
  const codigoMunicipio = text(enderNac, 'cMun') ?? text(end, 'cMun');
  const uf = text(enderNac, 'UF') ?? text(end, 'UF');
  const cep = text(enderNac, 'CEP') ?? text(end, 'CEP');

  if (!logradouro && !numero && !bairro && !codigoMunicipio && !cep) return undefined;
  return { logradouro, numero, complemento, bairro, codigoMunicipio, uf, cep };
}

function chaveFromInfNfse(infNfse: Element | null, xml: string, fallbackChave?: string): string {
  const idAttr = infNfse?.getAttribute('Id');
  if (idAttr) {
    if (idAttr.startsWith('NFS')) return idAttr.slice(3);
    return idAttr;
  }
  return text(infNfse, 'chNFSe') ?? extractTag(xml, 'chNFSe') ?? fallbackChave ?? '';
}

export function parseNfseXml(xml: string, fallbackChave?: string): NfseDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const nfseRoot = firstByLocalName(doc, 'NFSe');

  const infNfse = firstByLocalName(doc, 'infNFSe');
  const infDps = firstByLocalName(doc, 'infDPS');

  const chaveAcesso = chaveFromInfNfse(infNfse, xml, fallbackChave);

  const prestEl = infNfse ? firstByLocalName(infNfse, 'emit') : null;
  const dpsPrest = infDps ? firstByLocalName(infDps, 'prest') : null;
  const regTribEl = dpsPrest ? firstByLocalName(dpsPrest, 'regTrib') : null;
  const toma = infDps ? firstByLocalName(infDps, 'toma') : null;
  const serv = infDps ? firstByLocalName(infDps, 'serv') : null;
  const locPrest = serv ? firstByLocalName(serv, 'locPrest') : null;
  const cServ = serv ? firstByLocalName(serv, 'cServ') : null;
  const infoCompl = serv ? firstByLocalName(serv, 'infoCompl') : null;
  const subst = infDps ? firstByLocalName(infDps, 'subst') : null;

  const valoresNfse = infNfse ? childByLocalName(infNfse, 'valores') : null;
  const valoresDps = infDps ? childByLocalName(infDps, 'valores') : null;
  const vServPrest = valoresDps ? childByLocalName(valoresDps, 'vServPrest') : null;
  const trib = valoresDps ? childByLocalName(valoresDps, 'trib') : null;
  const tribMun = trib ? childByLocalName(trib, 'tribMun') : null;
  const exigSusp = tribMun ? childByLocalName(tribMun, 'exigSusp') : null;
  const tribFed = trib ? childByLocalName(trib, 'tribFed') : null;
  const piscofins = tribFed ? childByLocalName(tribFed, 'piscofins') : null;
  const totTrib = trib ? childByLocalName(trib, 'totTrib') : null;
  const pTotTrib = totTrib ? childByLocalName(totTrib, 'pTotTrib') : null;

  const valorServico =
    num(text(valoresNfse, 'vServico')) ||
    num(text(vServPrest, 'vServ')) ||
    num(extractTag(xml, 'vServ'));

  const pAliq =
    optionalNum(text(valoresNfse, 'pAliqAplic'))
    ?? optionalNum(text(tribMun, 'pAliq'))
    ?? optionalNum(extractTag(xml, 'pAliq'));

  /** BC ISSQN — somente quando vBC consta no XML (NFSe/valores ou DPS/tribMun). Sem fallback para vServ. */
  const baseCalculo =
    optionalNum(text(valoresNfse, 'vBC'))
    ?? optionalNum(text(tribMun, 'vBC'));

  const valorIss =
    optionalNum(text(valoresNfse, 'vISSQN'))
    ?? optionalNum(text(tribMun, 'vISSQN'));

  const valorLiquido = num(text(valoresNfse, 'vLiq')) || valorServico;

  const codigoTributacaoNacional =
    text(cServ, 'cTribNac') ?? text(infNfse, 'cTribNac') ?? extractTag(xml, 'cTribNac');

  const descricaoServico =
    text(cServ, 'xDescServ') ?? text(infNfse, 'xTribNac') ?? extractTag(xml, 'xDescServ');

  const discriminacaoRaw =
    text(infoCompl, 'xInfComp') ?? text(infDps, 'xInfComp') ?? extractTag(xml, 'xInfComp');
  const discriminacao =
    discriminacaoRaw?.trim() &&
    discriminacaoRaw.trim() !== descricaoServico?.trim()
      ? discriminacaoRaw.trim()
      : undefined;

  return {
    chaveAcesso,
    versao: nfseRoot?.getAttribute('versao') ?? undefined,
    nNfse: text(infNfse, 'nNFSe'),
    nDFSe: text(infNfse, 'nDFSe'),
    dhProc: text(infNfse, 'dhProc'),
    dhEmi: text(infDps, 'dhEmi') ?? extractTag(xml, 'dhEmi'),
    dCompet: text(infDps, 'dCompet') ?? extractTag(xml, 'dCompet'),
    tpAmb: text(infDps, 'tpAmb') ?? extractTag(xml, 'tpAmb'),
    xLocEmi: text(infNfse, 'xLocEmi'),
    xLocPrestacao: text(infNfse, 'xLocPrestacao'),
    xLocIncid: text(infNfse, 'xLocIncid'),
    codigoMunicipioIncidencia: text(infNfse, 'cLocIncid') ?? extractTag(xml, 'cLocIncid'),
    xTribNac: text(infNfse, 'xTribNac'),
    xNBS: text(infNfse, 'xNBS'),
    prestador: {
      cnpj: text(prestEl, 'CNPJ') ?? text(dpsPrest, 'CNPJ'),
      cpf: text(prestEl, 'CPF') ?? text(dpsPrest, 'CPF'),
      razaoSocial: text(prestEl, 'xNome') ?? text(dpsPrest, 'xNome'),
      inscricaoMunicipal: text(prestEl, 'IM') ?? text(dpsPrest, 'IM'),
      email: text(prestEl, 'email') ?? text(dpsPrest, 'email'),
      telefone: text(prestEl, 'fone') ?? text(dpsPrest, 'fone'),
      endereco: parseEnderecoNac(prestEl ?? dpsPrest ?? undefined),
    },
    tomador: {
      cnpj: text(toma, 'CNPJ'),
      cpf: text(toma, 'CPF'),
      razaoSocial: text(toma, 'xNome'),
      inscricaoMunicipal: text(toma, 'IM'),
      email: text(toma, 'email'),
      telefone: text(toma, 'fone'),
      endereco: parseEnderecoNac(toma ?? undefined),
    },
    servico: {
      codigoTributacaoNacional,
      codigoTributacaoMunicipal: text(cServ, 'cTribMun'),
      descricao: descricaoServico,
      codigoMunicipioPrestacao: text(locPrest, 'cLocPrestacao') ?? extractTag(xml, 'cLocPrestacao'),
      codigoPaisPrestacao: text(locPrest, 'cPaisPrestacao') ?? extractTag(xml, 'cPaisPrestacao'),
      codigoPaisResultado:
        text(locPrest, 'cPaisConsum')
        ?? text(locPrest, 'cPaisResult')
        ?? extractTag(xml, 'cPaisConsum')
        ?? extractTag(xml, 'cPaisResult'),
      codigoNBS: text(cServ, 'cNBS'),
      discriminacao,
    },
    regTrib: regTribEl
      ? {
          opSimpNac: text(regTribEl, 'opSimpNac'),
          regApTribSN: text(regTribEl, 'regApTribSN'),
          regEspTrib: text(regTribEl, 'regEspTrib'),
        }
      : undefined,
    tributacao: {
      tribISSQN: text(tribMun, 'tribISSQN'),
      tpRetISSQN: text(tribMun, 'tpRetISSQN'),
      tpImunidade: text(tribMun, 'tpImunidade'),
      nBM: text(tribMun, 'nBM'),
      suspensaoExigibilidade: text(exigSusp, 'tpSusp'),
      numeroProcessoSuspensao: text(exigSusp, 'nProcesso'),
      tpRetPisCofins: text(piscofins, 'tpRetPisCofins'),
      pTotTribSN: num(text(totTrib, 'pTotTribSN')) || undefined,
      vTotTribFed: num(text(totTrib, 'vTotTribFed')) || undefined,
      vTotTribEst: num(text(totTrib, 'vTotTribEst')) || undefined,
      vTotTribMun: num(text(totTrib, 'vTotTribMun')) || undefined,
      pTotTribFed: num(text(pTotTrib, 'pTotTribFed')) || undefined,
      pTotTribEst: num(text(pTotTrib, 'pTotTribEst')) || undefined,
      pTotTribMun: num(text(pTotTrib, 'pTotTribMun')) || undefined,
    },
    valores: {
      valorServico,
      descontoIncondicionado: num(text(valoresDps, 'vDescIncond')) || undefined,
      descontoCondicionado: num(text(valoresDps, 'vDescCond')) || undefined,
      totalDeducoes: num(text(valoresDps, 'vDR')) || undefined,
      calculoBM: num(text(valoresNfse, 'vCalcBM')) || undefined,
      baseCalculo,
      aliquotaIss: pAliq,
      valorIss,
      valorLiquido,
      valorTotalRetido: optionalNum(text(valoresNfse, 'vTotalRet')),
      valorPis: optionalNum(text(piscofins, 'vPis')),
      valorCofins: optionalNum(text(piscofins, 'vCofins')),
      valorIr: optionalNum(text(tribFed, 'vRetIRRF')),
      valorCsll: optionalNum(text(tribFed, 'vRetCSLL')),
      valorInss: optionalNum(text(tribFed, 'vRetCP')),
    },
    dps: {
      numero: text(infDps, 'nDPS'),
      serie: text(infDps, 'serie'),
      id: infDps?.getAttribute('Id') ?? undefined,
    },
    chaveSubstituta: text(subst, 'chSubstda'),
  };
}
