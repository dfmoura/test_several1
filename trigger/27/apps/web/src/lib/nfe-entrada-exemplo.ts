/**
 * Gera NFe de entrada de homologação a partir dos itens reais do PedidoCompra.
 * Cada geração usa chave/número únicos — evita "XML já importado" em retestes.
 */

import { digits as dig } from "@/lib/fiscal-emissao";

export type ItemExemploEntrada = {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  ncm?: string | null;
  valorUnitario?: number;
};

export type BuildNfeEntradaExemploOpts = {
  pedidoCompraNumero: number;
  empresa: {
    cnpj: string;
    razaoSocial: string;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    codigoMunicipioIbge?: string | null;
  };
  itens: ItemExemploEntrada[];
  /** Força chave (testes); senão gera única. */
  chave?: string;
  numeroNf?: number;
  emitidoEm?: Date;
};

const PRECO_PADRAO: Record<string, number> = {
  M2: 3.8,
  UN: 2.5,
  KG: 12,
};

const NCM_PADRAO: Record<string, string> = {
  PAPEL: "39199090",
  ACAB: "39199090",
  TUB: "48229000",
  CAIXA: "48191000",
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

function dvModulo11(base: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv >= 10) return 0;
  return dv;
}

function montarChaveUnica(opts: {
  cnpjEmitente: string;
  serie: number;
  numero: number;
  dhEmi: Date;
}): string {
  const cUF = "31";
  const aamm =
    String(opts.dhEmi.getFullYear()).slice(2) +
    String(opts.dhEmi.getMonth() + 1).padStart(2, "0");
  const cnpj = dig(opts.cnpjEmitente).padStart(14, "0").slice(0, 14);
  const mod = "55";
  const serie = String(opts.serie).padStart(3, "0").slice(-3);
  const nNF = String(opts.numero).padStart(9, "0").slice(-9);
  const tpEmis = "1";
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, "0").slice(0, 8);
  const base = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  return base + String(dvModulo11(base));
}

function ncmFor(codigo: string, fallback?: string | null): string {
  if (fallback && /^\d{8}$/.test(fallback)) return fallback;
  const c = codigo.toUpperCase();
  if (c.includes("CAIXA")) return NCM_PADRAO.CAIXA;
  if (c.includes("TUB")) return NCM_PADRAO.TUB;
  if (c.includes("ACAB") || c.includes("COLD") || c.includes("VERNIZ")) {
    return NCM_PADRAO.ACAB;
  }
  if (c.includes("PAPEL") || c.includes("BOPP")) return NCM_PADRAO.PAPEL;
  return "39199090";
}

function precoUnit(unidade: string, qtd: number, informado?: number): number {
  if (informado && informado > 0) return Math.round(informado * 10000) / 10000;
  const base = PRECO_PADRAO[unidade.toUpperCase()] ?? 3.5;
  // leve variação por quantidade para parecer nota real
  const fator = qtd > 50 ? 0.95 : 1;
  return Math.round(base * fator * 10000) / 10000;
}

/** XML NFe entrada homologação — espelha itens do PC, chave sempre nova. */
export function buildNfeEntradaExemploXml(opts: BuildNfeEntradaExemploOpts): {
  xml: string;
  chave: string;
  numero: number;
  valorTotal: number;
} {
  if (!opts.itens.length) {
    throw Object.assign(new Error("Pedido de compra sem itens para gerar XML"), {
      status: 400,
    });
  }

  const agora = opts.emitidoEm || new Date();
  const numero =
    opts.numeroNf ||
    Number(
      `${opts.pedidoCompraNumero}${String(Date.now()).slice(-5)}`.slice(0, 9),
    );
  const serie = 1;
  const cnpjEmit = "11222333000181";
  const chave =
    opts.chave ||
    montarChaveUnica({
      cnpjEmitente: cnpjEmit,
      serie,
      numero,
      dhEmi: agora,
    });
  const cNF = chave.slice(35, 43);
  const cDV = chave.slice(-1);
  const mun = opts.empresa.codigoMunicipioIbge || "3170206";
  const destCnpj = dig(opts.empresa.cnpj).padStart(14, "0");

  const lines = opts.itens.map((it, idx) => {
    const qtd = Number(it.quantidade);
    const vu = precoUnit(it.unidade, qtd, it.valorUnitario);
    const vt = Math.round(qtd * vu * 100) / 100;
    const ncm = ncmFor(it.codigo, it.ncm);
    const q = qtd.toFixed(4);
    const vuStr = vu.toFixed(4);
    const vtStr = vt.toFixed(2);
    return {
      idx: idx + 1,
      codigo: it.codigo || `ITEM${idx + 1}`,
      descricao: (it.descricao || it.codigo).toUpperCase(),
      unidade: (it.unidade || "UN").toUpperCase(),
      ncm,
      q,
      vuStr,
      vtStr,
      vt,
    };
  });

  const valorTotal = Math.round(lines.reduce((s, l) => s + l.vt, 0) * 100) / 100;
  const vTot = valorTotal.toFixed(2);
  const dh = isoBr(agora);
  const resumoItens = lines
    .map((l) => `${l.codigo} ${Number(l.q)} ${l.unidade}`)
    .join(" · ");

  const dets = lines
    .map(
      (l) => `      <det nItem="${l.idx}">
        <prod>
          <cProd>${esc(l.codigo)}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${esc(l.descricao)}</xProd>
          <NCM>${l.ncm}</NCM>
          <CFOP>5102</CFOP>
          <uCom>${esc(l.unidade)}</uCom>
          <qCom>${l.q}</qCom>
          <vUnCom>${l.vuStr}</vUnCom>
          <vProd>${l.vtStr}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${esc(l.unidade)}</uTrib>
          <qTrib>${l.q}</qTrib>
          <vUnTrib>${l.vuStr}</vUnTrib>
          <indTot>1</indTot>
          <xPed>${opts.pedidoCompraNumero}</xPed>
          <nItemPed>${l.idx}</nItemPed>
        </prod>
        <imposto>
          <ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>0.00</vBC><pICMS>0.00</pICMS><vICMS>0.00</vICMS></ICMS00></ICMS>
          <PIS><PISNT><CST>07</CST></PISNT></PIS>
          <COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>
        </imposto>
      </det>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  NFe de entrada (homologação) gerada para Pedido de Compra #${opts.pedidoCompraNumero}
  Itens: ${resumoItens}
  Chave única nesta geração — pode reimportar sem conflito de duplicidade.
  Destinatário CNPJ ${destCnpj}
-->
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>${cNF}</cNF>
        <natOp>Venda de mercadoria para industrializacao</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${dh}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${mun}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${cDV}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>9</indPres>
        <procEmi>0</procEmi>
        <verProc>OrcamentoFlexo_homolog</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjEmit}</CNPJ>
        <xNome>INSUMOS GRAFICOS HOMOL LTDA</xNome>
        <xFant>Insumos Homolog</xFant>
        <enderEmit>
          <xLgr>AVENIDA DOS FORNECEDORES</xLgr>
          <nro>450</nro>
          <xBairro>DISTRITO INDUSTRIAL</xBairro>
          <cMun>3170206</cMun>
          <xMun>Uberlandia</xMun>
          <UF>MG</UF>
          <CEP>38400100</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderEmit>
        <IE>0623456789012</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${destCnpj}</CNPJ>
        <xNome>${esc(opts.empresa.razaoSocial)}</xNome>
        <enderDest>
          <xLgr>${esc(opts.empresa.logradouro || "NAO INFORMADO")}</xLgr>
          <nro>${esc(opts.empresa.numero || "S/N")}</nro>
          <xBairro>${esc(opts.empresa.bairro || "CENTRO")}</xBairro>
          <cMun>${mun}</cMun>
          <xMun>${esc(opts.empresa.cidade || "Uberlandia")}</xMun>
          <UF>${esc(opts.empresa.uf || "MG")}</UF>
          <CEP>${dig(opts.empresa.cep) || "00000000"}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
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
          <vProd>${vTot}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${vTot}</vNF>
        </ICMSTot>
      </total>
      <transp><modFrete>9</modFrete></transp>
      <pag><detPag><tPag>15</tPag><vPag>${vTot}</vPag></detPag></pag>
      <infAdic>
        <infCpl>Homologacao — entrada estoque Pedido Compra #${opts.pedidoCompraNumero}. Gerado sob demanda com chave unica.</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>OrcamentoFlexo_homolog</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dh}</dhRecbto>
      <nProt>131${String(numero).padStart(12, "0").slice(-12)}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
`;

  return { xml, chave, numero, valorTotal };
}
