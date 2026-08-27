import { ValidationError } from '@nfe/shared';

const CUF_MG = '31';
const MODELO_NFE = '55';

/** Dígito verificador módulo 11 (pesos 2–9 da direita para a esquerda). */
export function modulo11(base: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
  return String(dv);
}

export interface ChaveAcessoParams {
  cUF?: string;
  aamm: string;
  cnpj: string;
  modelo?: string;
  serie: number;
  numero: number;
  tpEmis?: string;
  cNF: string;
}

/**
 * Chave de acesso NF-e — 44 dígitos:
 * cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
 */
export function gerarChaveAcesso(params: ChaveAcessoParams): string {
  const cUF = params.cUF ?? CUF_MG;
  const cnpj = params.cnpj.replace(/\D/g, '').padStart(14, '0');
  const modelo = (params.modelo ?? MODELO_NFE).padStart(2, '0');
  const serie = String(params.serie).padStart(3, '0');
  const nNF = String(params.numero).padStart(9, '0');
  const tpEmis = params.tpEmis ?? '1';
  const cNF = params.cNF.replace(/\D/g, '').padStart(8, '0').slice(0, 8);
  const aamm = params.aamm.replace(/\D/g, '').padStart(4, '0').slice(0, 4);

  if (cnpj.length !== 14) throw new ValidationError('CNPJ inválido para chave de acesso');
  if (!/^\d{4}$/.test(aamm)) throw new ValidationError('AAMM inválido para chave de acesso');

  const base = `${cUF}${aamm}${cnpj}${modelo}${serie}${nNF}${tpEmis}${cNF}`;
  if (base.length !== 43) {
    throw new ValidationError(`Base da chave deve ter 43 dígitos, obteve ${base.length}`);
  }
  return base + modulo11(base);
}

export function validarChaveAcesso(chave: string): boolean {
  const d = chave.replace(/\D/g, '');
  if (d.length !== 44) return false;
  return modulo11(d.slice(0, 43)) === d[43];
}

export function parseChaveAcesso(chave: string): {
  cUF: string;
  aamm: string;
  cnpj: string;
  modelo: string;
  serie: number;
  numero: number;
  tpEmis: string;
  cNF: string;
  cDV: string;
} {
  const d = chave.replace(/\D/g, '');
  if (d.length !== 44) throw new ValidationError('Chave de acesso deve ter 44 dígitos');
  return {
    cUF: d.slice(0, 2),
    aamm: d.slice(2, 6),
    cnpj: d.slice(6, 20),
    modelo: d.slice(20, 22),
    serie: Number(d.slice(22, 25)),
    numero: Number(d.slice(25, 34)),
    tpEmis: d.slice(34, 35),
    cNF: d.slice(35, 43),
    cDV: d.slice(43, 44),
  };
}

export function gerarCNF(): string {
  return String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0');
}

export function aammFromDate(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}
