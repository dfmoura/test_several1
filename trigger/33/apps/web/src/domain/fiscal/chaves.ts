/**
 * Chaves e IDs fiscais (NF-e 44 dígitos, DPS / chave NFS-e Nacional).
 */

import { digits } from "./defaults";

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

/** Chave NF-e 44 dígitos (UF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + DV). */
export function montarChaveNfe(opts: {
  cUF?: string;
  cnpj: string;
  serie: number;
  numero: number;
  dhEmi?: Date;
  tpEmis?: string;
  cNF?: string;
}): { chave: string; cNF: string; cDV: string } {
  const cUF = opts.cUF || "31";
  const d = opts.dhEmi || new Date();
  const aamm =
    String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const mod = "55";
  const serie = String(opts.serie).padStart(3, "0").slice(-3);
  const nNF = String(opts.numero).padStart(9, "0").slice(-9);
  const tpEmis = opts.tpEmis || "1";
  const cNF = (opts.cNF || String(Math.floor(Math.random() * 1e8)).padStart(8, "0")).slice(
    0,
    8,
  );
  const base = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV = String(dvModulo11(base));
  return { chave: base + cDV, cNF, cDV };
}

/**
 * Id DPS no padrão nacional (42 dígitos após "DPS"):
 * cMun(7) + tipoInsc(1) + CNPJ(14) + serie(5) + nDPS(15)
 */
export function montarIdDps(opts: {
  codigoMunicipio: string;
  cnpj: string;
  serie: number | string;
  numeroDps: number | string;
  tipoInscricao?: "1" | "2";
}): string {
  const mun = (opts.codigoMunicipio || "3170206").padStart(7, "0").slice(0, 7);
  const tipo = opts.tipoInscricao || "1";
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const serie = String(opts.serie).padStart(5, "0").slice(-5);
  const nDps = String(opts.numeroDps).replace(/\D/g, "").padStart(15, "0").slice(-15);
  return `DPS${mun}${tipo}${cnpj}${serie}${nDps}`;
}

/** Chave de acesso NFS-e Nacional (~50 dígitos), no padrão dos modelos. */
export function montarChaveNfse(opts: {
  codigoMunicipio: string;
  cnpj: string;
  numero: number;
  dhEmi?: Date;
}): string {
  const mun = (opts.codigoMunicipio || "3170206").padStart(7, "0").slice(0, 7);
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const n = String(opts.numero).padStart(13, "0").slice(-13);
  const d = opts.dhEmi || new Date();
  const aamm =
    String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const seq = String(Date.now()).slice(-10).padStart(10, "0");
  return `${mun}2${cnpj}${n}${aamm}${seq}`.slice(0, 50);
}
