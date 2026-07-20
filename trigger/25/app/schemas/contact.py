from pydantic import BaseModel, Field


class ContactProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    relation: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=500)


class ContactProfileOut(BaseModel):
    phone: str
    name: str | None = None
    relation: str | None = None
    notes: str | None = None
