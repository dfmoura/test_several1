import type { Endereco } from '@nfse/domain';
import {
  escapeXml,
  extractBlock,
  extractDpsInner,
  extractTag,
  formatDhEmiBr,
  nfseInfId,
  NS,
} from './xml-utils.js';
import type { EnderecoNacional } from './nfse-parser.js';
import { buildEmitenteContatoXml, buildEmitenteEnderNacXml } from './address-xml.js';

function toEndereco(end: EnderecoNacional): Endereco | undefined {
  if (!end.logradouro && !end.cep && !end.codigoMunicipio) return undefined;
  return {
    logradouro: end.logradouro ?? 'NÃO INFORMADO',
    numero: end.numero ?? 'S/N',
    complemento: end.complemento,
    bairro: end.bairro ?? 'NÃO INFORMADO',
    codigoMunicipio: end.codigoMunicipio ?? '0000000',
    uf: end.uf ?? '',
    cep: end.cep ?? '00000000',
  };
}

export interface NfseBuildParams {
  signedDpsXml: string;
  chaveAcesso: string;
  nNfse: string;
  nDFSe: string;
  xLocEmi: string;
  xLocPrestacao: string;
  xLocIncid: string;
  xTribNac: string;
  xNBS?: string;
  valores: {
    vLiq: number;
    vServico: number;
    vBC?: number;
    pAliqAplic?: number;
    vISSQN?: number;
  };
  emit: {
    cnpj: string;
    razaoSocial: string;
    inscricaoMunicipal?: string;
    email?: string;
    telefone?: string;
    endereco?: EnderecoNacional;
  };
}

export class NfseXmlBuilder {
  build(params: NfseBuildParams): string {
    const dhProc = formatDhEmiBr();
    const dpsInner = extractDpsInner(params.signedDpsXml);
    const tpAmb = extractTag(params.signedDpsXml, 'tpAmb') ?? '2';
    const infId = nfseInfId(params.chaveAcesso);

    const imXml = params.emit.inscricaoMunicipal
      ? `\n      <IM>${escapeXml(params.emit.inscricaoMunicipal)}</IM>`
      : '';

    const endereco = params.emit.endereco ? toEndereco(params.emit.endereco) : undefined;
    const enderecoXml = endereco ? `\n${buildEmitenteEnderNacXml(endereco)}` : '';
    const contatoXml = buildEmitenteContatoXml(params.emit.email, params.emit.telefone);
    const contatoBlock = contatoXml ? `\n${contatoXml}` : '';

    const valoresXml = [
      params.valores.vBC !== undefined ? `      <vBC>${params.valores.vBC.toFixed(2)}</vBC>` : '',
      params.valores.pAliqAplic !== undefined
        ? `      <pAliqAplic>${params.valores.pAliqAplic.toFixed(2)}</pAliqAplic>`
        : '',
      params.valores.vISSQN !== undefined ? `      <vISSQN>${params.valores.vISSQN.toFixed(2)}</vISSQN>` : '',
      `      <vLiq>${params.valores.vLiq.toFixed(2)}</vLiq>`,
      `      <vServico>${params.valores.vServico.toFixed(2)}</vServico>`,
    ]
      .filter(Boolean)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="${NS}" versao="1.00">
  <infNFSe Id="${infId}">
    <chNFSe>${params.chaveAcesso}</chNFSe>
    <nNFSe>${escapeXml(params.nNfse)}</nNFSe>
    <xLocEmi>${escapeXml(params.xLocEmi)}</xLocEmi>
    <xLocPrestacao>${escapeXml(params.xLocPrestacao)}</xLocPrestacao>
    <xLocIncid>${escapeXml(params.xLocIncid)}</xLocIncid>
    <xTribNac>${escapeXml(params.xTribNac)}</xTribNac>${params.xNBS ? `\n    <xNBS>${escapeXml(params.xNBS)}</xNBS>` : ''}
    <verAplic>NFSE-NACIONAL-1.0.0</verAplic>
    <ambGer>${tpAmb}</ambGer>
    <tpEmis>1</tpEmis>
    <procEmi>1</procEmi>
    <cStat>100</cStat>
    <dhProc>${dhProc}</dhProc>
    <nDFSe>${escapeXml(params.nDFSe)}</nDFSe>
    <emit>
      <CNPJ>${params.emit.cnpj}</CNPJ>
      <xNome>${escapeXml(params.emit.razaoSocial)}</xNome>${imXml}${enderecoXml}${contatoBlock}
    </emit>
    <valores>
${valoresXml}
    </valores>
    <DPS versao="1.01">
${dpsInner}
    </DPS>
  </infNFSe>
</NFSe>`;
  }
}

export function extractDpsEmissionMeta(dpsXml: string) {
  const valorServico = Number(extractTag(dpsXml, 'vServ') ?? '0');
  const pAliqTag = extractTag(dpsXml, 'pAliq');
  const pAliq = pAliqTag !== undefined && pAliqTag !== '' ? Number(pAliqTag) : undefined;
  const vBCTag = extractTag(dpsXml, 'vBC');
  const vBC = vBCTag !== undefined && vBCTag !== '' ? Number(vBCTag) : undefined;
  const vISSQNTag = extractTag(dpsXml, 'vISSQN');
  const vISSQN =
    vISSQNTag !== undefined && vISSQNTag !== ''
      ? Number(vISSQNTag)
      : pAliq !== undefined && vBC !== undefined
        ? Math.round(vBC * (pAliq / 100) * 100) / 100
        : undefined;

  const prestBlock = extractBlock(dpsXml, 'prest') ?? '';
  const tomadorEndereco = extractTomadorEndereco(dpsXml);

  return {
    cnpjPrestador: extractTag(prestBlock, 'CNPJ') ?? extractTag(dpsXml, 'CNPJ') ?? '',
    razaoSocial: extractTag(prestBlock, 'xNome') ?? '',
    inscricaoMunicipal: extractTag(prestBlock, 'IM'),
    prestadorEmail: extractTag(prestBlock, 'email'),
    prestadorTelefone: extractTag(prestBlock, 'fone'),
    codigoMunicipio: extractTag(dpsXml, 'cLocEmi') ?? extractTag(dpsXml, 'cLocPrestacao') ?? '',
    codigoMunicipioIncidencia: extractTag(dpsXml, 'cLocPrestacao') ?? extractTag(dpsXml, 'cLocEmi') ?? '',
    codigoTributacaoNacional: extractTag(dpsXml, 'cTribNac') ?? '',
    codigoNbs: extractTag(dpsXml, 'cNBS') ?? '',
    descricaoServico: extractTag(dpsXml, 'xDescServ') ?? '',
    numeroDps: extractTag(dpsXml, 'nDPS') ?? '1',
    serie: extractTag(dpsXml, 'serie') ?? '00001',
    tpAmb: extractTag(dpsXml, 'tpAmb') ?? '2',
    valorServico,
    pAliq,
    vISSQN,
    vBC,
    vLiq: valorServico,
    tomadorEndereco,
  };
}

function extractTomadorEndereco(dpsXml: string) {
  const endBlock = dpsXml.match(/<toma>[\s\S]*?<end>([\s\S]*?)<\/end>/);
  if (!endBlock) return undefined;
  const block = endBlock[1]!;
  const logradouro = extractTag(block, 'xLgr');
  const numero = extractTag(block, 'nro');
  const complemento = extractTag(block, 'xCpl');
  const bairro = extractTag(block, 'xBairro');
  const codigoMunicipio = extractTag(block, 'cMun');
  const uf = extractTag(block, 'UF');
  const cep = extractTag(block, 'CEP');
  if (!logradouro && !cep && !codigoMunicipio) return undefined;
  return { logradouro, numero, complemento, bairro, codigoMunicipio, uf, cep };
}
