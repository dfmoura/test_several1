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
  if (cnpj.length !== 14) return '***';
  return `${cnpj.slice(0, 2)}******${cnpj.slice(-2)}`;
}

export function maskCpf(cpf: string): string {
  if (cpf.length !== 11) return '***';
  return `***${cpf.slice(-2)}`;
}
