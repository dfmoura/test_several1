/**
 * Leitura da unidade comercial a partir da quantidade de estoque.
 * ADR-039-UNID-001: 1 comercial = fator × interna. Saldo oficial continua na interna.
 * Uma direção só (interna → comercial). Sem fator válido, não inventa número.
 *
 * Divisão espelha BobinaAreaComercial: bcdiv na escala qtde+6 e half-up na qtde.
 * Sem float.
 */

import { DECIMAL_SCALE } from './format';

const DIV_SCALE = DECIMAL_SCALE.qty + 6;

export type LeituraUnidadeComercial =
  | { kind: 'oculta' }
  | { kind: 'incompleta'; unidadeNome: string }
  | { kind: 'ok'; qtde: string; unidadeNome: string };

type Dec = { neg: boolean; mag: bigint; scale: number };

function normUnidade(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace('M²', 'M2')
    .replace(/\s/g, '');
}

/** Nome curto para a leitura — a sigla oficial permanece no cadastro. */
export function nomeUnidadeLeitura(raw: string | null | undefined): string {
  const u = normUnidade(raw);
  if (u === 'M2') return 'm²';
  if (u === 'M') return 'm';
  if (u === 'KG') return 'kg';
  if (u === 'UN') return 'un';
  if (u === 'RL') return 'rolo';
  if (u === 'MIL') return 'mil';
  if (u === 'PCT') return 'pct';
  if (u === 'CX') return 'cx';
  return u;
}

function unidadesDiferem(comercial: string, interna: string): boolean {
  return comercial !== '' && interna !== '' && comercial !== interna;
}

function parseDecimal(raw: string): Dec | null {
  const s = raw.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;
  const [intPart, frac = ''] = abs.split('.');
  const digits = `${intPart}${frac}`.replace(/^0+(?=\d)/, '');
  const mag = BigInt(digits === '' ? '0' : digits);
  return { neg: neg && mag !== 0n, mag, scale: frac.length };
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

/** Truncamento para zero, como bcdiv. */
function divTrunc(a: Dec, b: Dec, outScale: number): Dec | null {
  if (b.mag === 0n) return null;
  const num = a.mag * pow10(b.scale + outScale);
  const den = b.mag * pow10(a.scale);
  return { neg: a.neg !== b.neg, mag: num / den, scale: outScale };
}

/** Half-up na escala pedida — mesmo passo de PadraoDecimal::roundHalfUp. */
function roundHalfUp(d: Dec, scale: number): string {
  let mag = d.mag;
  let sc = d.scale;
  if (sc < scale) {
    mag *= pow10(scale - sc);
    sc = scale;
  } else if (sc > scale) {
    const drop = sc - scale;
    mag = (mag + 5n * pow10(drop - 1)) / pow10(drop);
    sc = scale;
  }
  const neg = d.neg && mag !== 0n;
  const digits = mag.toString().padStart(sc + 1, '0');
  const intPart = digits.slice(0, digits.length - sc) || '0';
  const frac = sc > 0 ? digits.slice(digits.length - sc) : '';
  const body = frac.length ? `${intPart}.${frac}` : intPart;
  return neg ? `-${body}` : body;
}

/**
 * Equivalente comercial da quantidade de estoque.
 * `unidadeDaQtde` é a unidade do número (no AJU gravado, a unidade congelada).
 * `unidadeDoFator` é a interna atual do cadastro — se divergir, a ponte não vale.
 */
export function leituraUnidadeComercial(input: {
  qtdeInterna: string | number | null | undefined;
  unidadeDaQtde?: string | null;
  unidadeComercial?: string | null;
  fatorConversao?: string | null;
  unidadeDoFator?: string | null;
}): LeituraUnidadeComercial {
  const comercial = normUnidade(input.unidadeComercial);
  const daQtde = normUnidade(input.unidadeDaQtde);
  const doFator = normUnidade(input.unidadeDoFator ?? input.unidadeDaQtde);
  if (!unidadesDiferem(comercial, daQtde) || (doFator !== '' && doFator !== daQtde)) {
    return { kind: 'oculta' };
  }

  const bruto = String(input.qtdeInterna ?? '').trim();
  if (bruto === '') return { kind: 'oculta' };
  const qtde = parseDecimal(bruto);
  if (!qtde) return { kind: 'oculta' };

  const unidadeNome = nomeUnidadeLeitura(comercial);
  const fator = parseDecimal(String(input.fatorConversao ?? ''));
  if (!fator || fator.neg || fator.mag === 0n) {
    return { kind: 'incompleta', unidadeNome };
  }

  const quot = divTrunc(qtde, fator, DIV_SCALE);
  if (!quot) return { kind: 'incompleta', unidadeNome };
  return { kind: 'ok', qtde: roundHalfUp(quot, DECIMAL_SCALE.qty), unidadeNome };
}
