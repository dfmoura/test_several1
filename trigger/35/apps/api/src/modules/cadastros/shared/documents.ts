import { AppError } from '../../shared/errors/app-error.js';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(base: string, factors: number[]): number {
  const sum = base.split('').reduce((acc, d, i) => acc + Number(d) * factors[i]!, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function assertCnpjOrCpf(raw: string | null | undefined, tipoPessoa: 'PJ' | 'PF' | 'ESTRANGEIRO') {
  if (!raw) return null;
  const digits = onlyDigits(raw);
  if (tipoPessoa === 'ESTRANGEIRO') return digits || null;

  if (tipoPessoa === 'PF') {
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
      throw new AppError('CPF_INVALIDO', 'CPF inválido', 400);
    }
    const d1 = checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = checkDigit(digits.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (digits !== digits.slice(0, 9) + String(d1) + String(d2)) {
      throw new AppError('CPF_INVALIDO', 'CPF inválido', 400);
    }
    return digits;
  }

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    throw new AppError('CNPJ_INVALIDO', 'CNPJ inválido', 400);
  }
  const d1 = checkDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(digits.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (digits !== digits.slice(0, 12) + String(d1) + String(d2)) {
    throw new AppError('CNPJ_INVALIDO', 'CNPJ inválido', 400);
  }
  return digits;
}

export function avaliarCadastroFiscalCompleto(input: {
  ehProspect: boolean;
  tipoPessoa: 'PJ' | 'PF' | 'ESTRANGEIRO';
  cnpjCpf: string | null;
  indIEDest: 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE' | null;
  inscricaoEstadual: string | null;
  temEnderecoFiscal: boolean;
}): boolean {
  if (input.ehProspect) return false;
  if (!input.cnpjCpf) return false;
  if (!input.temEnderecoFiscal) return false;
  if (!input.indIEDest) return false;
  if (input.indIEDest === 'CONTRIBUINTE' && !input.inscricaoEstadual) return false;
  return true;
}
