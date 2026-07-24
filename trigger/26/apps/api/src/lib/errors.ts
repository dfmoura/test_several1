export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(entity: string): AppError {
  return new AppError(`${entity} não encontrado(a).`, 404, "NOT_FOUND");
}

export function conflict(message: string): AppError {
  return new AppError(message, 409, "CONFLICT");
}

export function forbidden(message: string): AppError {
  return new AppError(message, 403, "FORBIDDEN");
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400, "BAD_REQUEST");
}

export function unauthorized(message = "Não autorizado."): AppError {
  return new AppError(message, 401, "UNAUTHORIZED");
}
