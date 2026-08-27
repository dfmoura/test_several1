import pino from 'pino';

export function createLogger(service: string, level = 'info') {
  return pino({
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;

export function maskCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return '***';
  return `${d.slice(0, 2)}******${d.slice(-2)}`;
}

export function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return `***${d.slice(-2)}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
