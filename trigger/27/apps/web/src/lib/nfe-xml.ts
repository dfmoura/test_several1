/** Parse e validação básica de XML NFe (entrada de compra). */

export type NfeItemParsed = {
  numeroItem: number;
  codigoXml: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  ean: string | null;
};

export type NfeParsed = {
  chave: string | null;
  numero: string | null;
  serie: string | null;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  destinatarioCnpj: string | null;
  valorTotal: number | null;
  dataEmissao: Date | null;
  itens: NfeItemParsed[];
};

function digits(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  return d || null;
}

function num(s: string | null): number {
  if (!s) return 0;
  return Number(s.replace(",", ".")) || 0;
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return m?.[1]?.trim() || null;
}

/** Parse NFe / procNFe XML (parser leve por regex — suficiente para homologação). */
export function parseNfeXml(xml: string): NfeParsed {
  const chave =
    digits(xml.match(/Id="NFe(\d{44})"/i)?.[1] || tag(xml, "chNFe")) || null;
  const numero = tag(xml, "nNF");
  const serie = tag(xml, "serie");

  const emitBlock = xml.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] || "";
  const destBlock = xml.match(/<dest>([\s\S]*?)<\/dest>/)?.[1] || "";
  const emitenteCnpj = digits(tag(emitBlock, "CNPJ") || tag(emitBlock, "CPF"));
  const emitenteNome = tag(emitBlock, "xNome");
  const destinatarioCnpj = digits(tag(destBlock, "CNPJ") || tag(destBlock, "CPF"));

  const vNF = tag(xml, "vNF");
  const dhEmi = tag(xml, "dhEmi") || tag(xml, "dEmi");

  const itens: NfeItemParsed[] = [];
  const detRe = /<det[^>]*nItem="(\d+)"[^>]*>([\s\S]*?)<\/det>/gi;
  let m: RegExpExecArray | null;
  while ((m = detRe.exec(xml))) {
    const block = m[2];
    const g = (t: string) => tag(block, t);
    const eanRaw = g("cEAN");
    itens.push({
      numeroItem: Number(m[1]),
      codigoXml: g("cProd"),
      descricao: g("xProd") || `Item ${m[1]}`,
      ncm: g("NCM"),
      cfop: g("CFOP"),
      unidade: g("uCom"),
      quantidade: num(g("qCom")),
      valorUnitario: num(g("vUnCom")),
      valorTotal: num(g("vProd")),
      ean: !eanRaw || eanRaw === "SEM GTIN" ? null : eanRaw,
    });
  }

  return {
    chave,
    numero,
    serie,
    emitenteCnpj,
    emitenteNome,
    destinatarioCnpj,
    valorTotal: vNF ? num(vNF) : null,
    dataEmissao: dhEmi ? new Date(dhEmi) : null,
    itens,
  };
}

export function validateNfeAgainstEmpresa(parsed: NfeParsed, empresaCnpj: string): string[] {
  const errors: string[] = [];
  if (!parsed.chave || parsed.chave.length !== 44) {
    errors.push("Chave de acesso inválida ou ausente (44 dígitos)");
  }
  if (!parsed.itens.length) {
    errors.push("NFe sem itens");
  }
  const dest = parsed.destinatarioCnpj;
  const emp = empresaCnpj.replace(/\D/g, "");
  if (dest && dest !== emp) {
    errors.push(`CNPJ destinatário (${dest}) difere da empresa (${emp})`);
  }
  if (!dest) {
    errors.push("CNPJ do destinatário não encontrado no XML");
  }
  return errors;
}
