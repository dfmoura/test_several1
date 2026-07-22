from datetime import datetime

from pydantic import BaseModel, Field


class ContactProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    relation: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=500)
    lead_status: str | None = Field(default=None, max_length=32)
    lead_segment: str | None = Field(default=None, max_length=120)
    lead_system: str | None = Field(default=None, max_length=120)
    lead_need: str | None = Field(default=None, max_length=500)
    lead_next_step: str | None = Field(default=None, max_length=200)


class ContactProfileOut(BaseModel):
    phone: str
    name: str | None = None
    relation: str | None = None
    notes: str | None = None
    lead_status: str | None = None
    lead_segment: str | None = None
    lead_system: str | None = None
    lead_need: str | None = None
    lead_next_step: str | None = None
    lead_updated_at: datetime | None = None
