from pydantic import BaseModel, Field


class EvolutionSendTextPayload(BaseModel):
    number: str
    text: str = Field(min_length=1)


class EvolutionSendResponse(BaseModel):
    key: dict | None = None
    status: str | None = None

    model_config = {"extra": "allow"}
