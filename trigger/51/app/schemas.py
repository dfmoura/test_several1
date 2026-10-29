from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    contexto: str = Field(default="formular_demanda", max_length=64)


class SessionOut(BaseModel):
    session_id: str
    reply: str


class MessageIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    session_id: str
    reply: str


class FinalizeOut(BaseModel):
    session_id: str
    descricao: str


class MensagemTrecho(BaseModel):
    autor: str = Field(default="", max_length=32)
    corpo: str = Field(default="", max_length=500)


class DesdobrarIn(BaseModel):
    codigo: str = Field(default="", max_length=40)
    titulo: str = Field(default="", max_length=300)
    descricao: str = Field(default="", max_length=8000)
    objetivo: str = Field(default="", max_length=4000)
    sistema_atual: str = Field(default="", max_length=1000)
    mensagens: list[MensagemTrecho] = Field(default_factory=list, max_length=12)


class EtapaOut(BaseModel):
    ordem: int
    titulo: str
    resultado: str = ""
    aceite: str = ""


class PropostaDraftOut(BaseModel):
    descricao_funcional: str
    incluso: str
    nao_incluso: str
    criterios_aceite: str
    etapas: list[EtapaOut]
