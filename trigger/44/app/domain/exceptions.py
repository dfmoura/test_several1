class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Não autorizado"):
        super().__init__("unauthorized", message, 401)


class ForbiddenError(AppError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, 403)


class NotFoundError(AppError):
    def __init__(self, message: str = "Não encontrado"):
        super().__init__("not_found", message, 404)


class ConflictError(AppError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, 409)


class RateLimitError(AppError):
    def __init__(self, message: str = "Limite de envio excedido"):
        super().__init__("rate_limited", message, 429)


class PermanentSendError(AppError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, 422)


class TransientSendError(AppError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, 503)
