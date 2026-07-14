export class NfseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'NfseError';
  }
}

export class GovApiError extends NfseError {
  constructor(
    message: string,
    code: string,
    statusCode: number,
    public readonly govCodigo?: string,
    details?: unknown,
  ) {
    super(message, code, statusCode, details);
    this.name = 'GovApiError';
  }
}

export class NotFoundError extends NfseError {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends NfseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends NfseError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
  }
}

export class CertificadoError extends NfseError {
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
  if (error instanceof NfseError) {
    return {
      type: `https://nfse.local/errors/${error.code}`,
      title: error.name,
      status: error.statusCode,
      detail: error.message,
      instance,
      code: error.code,
      errors: error.details,
    };
  }
  return {
    type: 'https://nfse.local/errors/INTERNAL',
    title: 'Internal Server Error',
    status: 500,
    detail: error instanceof Error ? error.message : 'Erro interno',
    instance,
    code: 'INTERNAL_ERROR',
  };
}
