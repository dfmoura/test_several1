import { extractTag } from './xml-utils.js';

export interface EnderecoParsed {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  fone?: string;
}

export interface NfeParsed {
  chaveAcesso: string;
  serie: string;
  numero: string;
  naturezaOperacao: string;
  dhEmi: string;
  tpAmb: string;
  tpNF: string;
  modFrete: string;
  emitCnpj: string;
  emitNome: string;
  emitFantasia?: string;
  emitIE: string;
  emitEndereco: string;
  emitEnder: EnderecoParsed;
  destDoc: string;
  destNome: string;
  destIE?: string;
  destEndereco: string;
  destEnder: EnderecoParsed;
  valorNf: string;
  valorProd: string;
  vBC: string;
  vICMS: string;
  vIPI: string;
  vPIS: string;
  vCOFINS: string;
  vDesc: string;
  vFrete: string;
  infCpl?: string;
  nProt?: string;
  situacao?: string;
  itens: Array<{
    nItem: string;
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
    valorTotal: string;
  }>;
}


export function parseNfeXml(xml: string, chaveFallback?: string): NfeParsed {
  const infId = xml.match(/Id="NFe(\d{44})"/)?.[1];
  const dets = [...xml.matchAll(/<det nItem="(\d+)"[\s\S]*?<\/det>/gi)];

  const itens = dets.map((m) => {
    const block = m[0]!;
    return {
      nItem: m[1] ?? '1',
      codigo: extractTag(block, 'cProd') ?? '',
      descricao: extractTag(block, 'xProd') ?? '',
      ncm: extractTag(block, 'NCM') ?? '',
      cfop: extractTag(block, 'CFOP') ?? '',
      unidade: extractTag(block, 'uCom') ?? '',
      quantidade: extractTag(block, 'qCom') ?? '',
      valorUnitario: extractTag(block, 'vUnCom') ?? '',
      valorTotal: extractTag(block, 'vProd') ?? '',
    };
  });

  const emitBlock = xml.match(/<emit>[\s\S]*?<\/emit>/i)?.[0] ?? '';
  const destBlock = xml.match(/<dest>[\s\S]*?<\/dest>/i)?.[0] ?? '';
  const enderEmit = emitBlock.match(/<enderEmit>[\s\S]*?<\/enderEmit>/i)?.[0] ?? '';
  const enderDest = destBlock.match(/<enderDest>[\s\S]*?<\/enderDest>/i)?.[0] ?? '';

  const parseEnder = (b: string): EnderecoParsed => ({
    logradouro: extractTag(b, 'xLgr') ?? '',
    numero: extractTag(b, 'nro') ?? '',
    complemento: extractTag(b, 'xCpl') ?? undefined,
    bairro: extractTag(b, 'xBairro') ?? '',
    municipio: extractTag(b, 'xMun') ?? '',
    uf: extractTag(b, 'UF') ?? '',
    cep: extractTag(b, 'CEP') ?? '',
    fone: extractTag(b, 'fone') ?? undefined,
  });

  const fmtEnd = (e: EnderecoParsed) =>
    [e.logradouro, e.numero, e.complemento, e.bairro, e.municipio, e.uf, e.cep]
      .filter(Boolean)
      .join(', ');

  const icmsTot = xml.match(/<ICMSTot>[\s\S]*?<\/ICMSTot>/i)?.[0] ?? '';
  const emitEnder = parseEnder(enderEmit);
  const destEnder = parseEnder(enderDest);

  return {
    chaveAcesso: infId ?? chaveFallback ?? '',
    serie: extractTag(xml, 'serie') ?? '',
    numero: extractTag(xml, 'nNF') ?? '',
    naturezaOperacao: extractTag(xml, 'natOp') ?? '',
    dhEmi: extractTag(xml, 'dhEmi') ?? '',
    tpAmb: extractTag(xml, 'tpAmb') ?? '2',
    tpNF: extractTag(xml, 'tpNF') ?? '1',
    modFrete: extractTag(xml, 'modFrete') ?? '9',
    emitCnpj: extractTag(emitBlock, 'CNPJ') ?? '',
    emitNome: extractTag(emitBlock, 'xNome') ?? '',
    emitFantasia: extractTag(emitBlock, 'xFant') ?? undefined,
    emitIE: extractTag(emitBlock, 'IE') ?? '',
    emitEndereco: fmtEnd(emitEnder),
    emitEnder,
    destDoc: extractTag(destBlock, 'CNPJ') ?? extractTag(destBlock, 'CPF') ?? '',
    destNome: extractTag(destBlock, 'xNome') ?? '',
    destIE: extractTag(destBlock, 'IE') ?? undefined,
    destEndereco: fmtEnd(destEnder),
    destEnder,
    valorNf: extractTag(icmsTot, 'vNF') ?? extractTag(xml, 'vNF') ?? '0.00',
    valorProd: extractTag(icmsTot, 'vProd') ?? '0.00',
    vBC: extractTag(icmsTot, 'vBC') ?? '0.00',
    vICMS: extractTag(icmsTot, 'vICMS') ?? '0.00',
    vIPI: extractTag(icmsTot, 'vIPI') ?? '0.00',
    vPIS: extractTag(icmsTot, 'vPIS') ?? '0.00',
    vCOFINS: extractTag(icmsTot, 'vCOFINS') ?? '0.00',
    vDesc: extractTag(icmsTot, 'vDesc') ?? '0.00',
    vFrete: extractTag(icmsTot, 'vFrete') ?? '0.00',
    infCpl: extractTag(xml, 'infCpl') ?? undefined,
    nProt: extractTag(xml, 'nProt'),
    itens,
  };
}
