from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    database: str
    redis: str
    ai_provider: str
