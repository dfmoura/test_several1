/** Parser mínimo de NF-e (nfeProc / NFe) — sem dependências XML. */

export type ParsedNfeItem = {
  sequencia: number;
  cProd: string;
  descricao: string;
  ncm: string | null;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
};

export type ParsedNfeCompra = {
  chave44: string;
  numero: string | null;
  serie: string | null;
  emitenteCnpj: string;
  emitenteNome: string | null;
  valorTotal: string;
  emitidaEm: Date | null;
  itens: ParsedNfeItem[];
};

function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = re.exec(xml);
  return m ? m[1].trim() : null;
}

function stripNs(xml: string): string {
  return xml.replace(/<\/?([a-z0-9]+):/gi, '</$1').replace(/<([a-z0-9]+):/gi, '<$1');
}

export function parseNfeCompraXml(raw: string): ParsedNfeCompra {
  const xml = stripNs(raw);
  const infProt = tag(xml, 'infProt') ?? '';
  let chave44 = (tag(infProt, 'chNFe') ?? tag(xml, 'chNFe') ?? '').replace(/\D/g, '');
  if (chave44.length !== 44) {
    const idMatch = /Id="NFe(\d{44})"/i.exec(xml);
    chave44 = idMatch?.[1] ?? '';
  }
  if (chave44.length !== 44) {
    throw new Error('XML sem chave44 válida');
  }

  const emit = tag(xml, 'emit') ?? '';
  const emitenteCnpj = (tag(emit, 'CNPJ') ?? tag(emit, 'CPF') ?? '').replace(/\D/g, '');
  if (!emitenteCnpj) throw new Error('XML sem CNPJ/CPF do emitente');
  const emitenteNome = tag(emit, 'xNome');

  const ide = tag(xml, 'ide') ?? '';
  const numero = tag(ide, 'nNF');
  const serie = tag(ide, 'serie');
  const dhEmi = tag(ide, 'dhEmi');
  const emitidaEm = dhEmi ? new Date(dhEmi) : null;

  const totalBlock = tag(xml, 'ICMSTot') ?? '';
  const valorTotal = tag(totalBlock, 'vNF') ?? tag(xml, 'vNF') ?? '0';

  const itens: ParsedNfeItem[] = [];
  const detRe = /<det\b[^>]*>([\s\S]*?)<\/det>/gi;
  let m: RegExpExecArray | null;
  let seq = 0;
  while ((m = detRe.exec(xml)) !== null) {
    seq += 1;
    const det = m[1];
    const prod = tag(det, 'prod') ?? det;
    const nItem = tag(det, 'nItem');
    itens.push({
      sequencia: nItem ? Number(nItem) : seq,
      cProd: tag(prod, 'cProd') ?? `ITEM-${seq}`,
      descricao: (tag(prod, 'xProd') ?? 'Item').slice(0, 240),
      ncm: tag(prod, 'NCM'),
      unidade: tag(prod, 'uCom') ?? tag(prod, 'uTrib') ?? 'UN',
      quantidade: tag(prod, 'qCom') ?? tag(prod, 'qTrib') ?? '0',
      valorUnitario: tag(prod, 'vUnCom') ?? tag(prod, 'vUnTrib') ?? '0',
      valorTotal: tag(prod, 'vProd') ?? '0',
    });
  }
  if (itens.length === 0) throw new Error('XML sem itens <det>');

  return {
    chave44,
    numero,
    serie,
    emitenteCnpj,
    emitenteNome,
    valorTotal,
    emitidaEm,
    itens,
  };
}
