from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ConversationContext(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    summary: str = ""
    state: dict = Field(default_factory=dict)
