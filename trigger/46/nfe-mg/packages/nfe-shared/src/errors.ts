export class NfeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'NfeError';
  }
}

export class SefazError extends NfeError {
  constructor(
    message: string,
    code: string,
    statusCode: number,
    public readonly cStat?: string,
    details?: unknown,
  ) {
    super(message, code, statusCode, details);
    this.name = 'SefazError';
  }
}

export class NotFoundError extends NfeError {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends NfeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends NfeError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
  }
}

export class CertificadoError extends NfeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CERTIFICADO_ERROR', 503, details);
    this.name = 'CertificadoError';
  }
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  errors?: unknown;
}

export function toProblemDetails(error: unknown, instance?: string): ProblemDetails {
  if (error instanceof NfeError) {
    return {
      type: `https://nfe.local/errors/${error.code}`,
      title: error.name,
      status: error.statusCode,
      detail: error.message,
      instance,
      code: error.code,
      errors: error.details,
    };
  }
  return {
    type: 'https://nfe.local/errors/INTERNAL',
    title: 'Internal Server Error',
    status: 500,
    detail: error instanceof Error ? error.message : 'Erro interno',
    instance,
    code: 'INTERNAL_ERROR',
  };
}
