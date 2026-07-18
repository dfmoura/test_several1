from pydantic import BaseModel, Field


class IncomingMessage(BaseModel):
    phone: str
    name: str | None = None
    text: str
    message_id: str | None = None
    instance: str | None = None
    from_me: bool = False


class WebhookAck(BaseModel):
    status: str = "ok"
    detail: str | None = None


class EvolutionKeyPayload(BaseModel):
    remoteJid: str | None = None
    fromMe: bool | None = False
    id: str | None = None


class EvolutionMessageContent(BaseModel):
    conversation: str | None = None
    extendedTextMessage: dict | None = None


class EvolutionDataPayload(BaseModel):
    key: EvolutionKeyPayload | None = None
    pushName: str | None = None
    message: EvolutionMessageContent | None = None
    messageType: str | None = None


class EvolutionWebhookPayload(BaseModel):
    event: str | None = None
    instance: str | None = None
    data: EvolutionDataPayload | dict | list | None = None
    sender: str | None = None

    model_config = {"extra": "allow"}


class SendTextRequest(BaseModel):
    number: str
    text: str = Field(min_length=1)
