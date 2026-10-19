from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.passwords import hash_senha, verificar_senha
from app.cnpj import cnpj_valido, somente_digitos
from app.config import (
    FILIAL_MAX_ATIVOS,
    FILIAL_MAX_GESTOR,
    MASTER_MAX_ADMIN,
    MASTER_MAX_ATIVOS,
    PAPEIS_FILIAL,
    PAPEIS_MASTER,
    settings,
)
from app.models import AuditoriaAcesso, Filial, Sessao, Usuario
from app.tempo import agora_utc


class ErroRegra(Exception):
    def __init__(self, mensagem: str, status: int = 400) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status


@dataclass(frozen=True)
class Principal:
    usuario_id: uuid.UUID
    username: str
    papel: str
    filial_id: uuid.UUID | None
    filial_situacao: str | None

    @property
    def master(self) -> bool:
        return self.papel in PAPEIS_MASTER


def auditar(
    db: Session,
    evento: str,
    detalhe: str = "",
    *,
    usuario_id: uuid.UUID | None = None,
    filial_id: uuid.UUID | None = None,
) -> None:
    db.add(
        AuditoriaAcesso(
            instante=agora_utc(),
            usuario_id=usuario_id,
            filial_id=filial_id,
            evento=evento,
            detalhe=detalhe[:500],
        )
    )


def _username(valor: str) -> str:
    nome = (valor or "").strip().lower()
    if len(nome) < 3 or len(nome) > 80:
        raise ErroRegra("Usuário deve ter entre 3 e 80 caracteres.")
    if not all(c.isalnum() or c in "._-" for c in nome):
        raise ErroRegra("Usuário: use apenas letras, números, ponto, hífen ou underscore.")
    return nome


def _ativos(db: Session, *, filial_id: uuid.UUID | None, papel: str | None = None) -> int:
    q = select(func.count()).select_from(Usuario).where(Usuario.ativo.is_(True))
    if filial_id is None:
        q = q.where(Usuario.filial_id.is_(None))
    else:
        q = q.where(Usuario.filial_id == filial_id)
    if papel is not None:
        q = q.where(Usuario.papel == papel)
    return int(db.scalar(q) or 0)


def _checar_teto(db: Session, papel: str, filial_id: uuid.UUID | None) -> None:
    if papel in PAPEIS_MASTER:
        if _ativos(db, filial_id=None) >= MASTER_MAX_ATIVOS:
            raise ErroRegra(
                f"Limite de contas master atingido (máximo {MASTER_MAX_ATIVOS}).",
                status=409,
            )
        if papel == "master_admin" and _ativos(db, filial_id=None, papel="master_admin") >= MASTER_MAX_ADMIN:
            raise ErroRegra(
                f"Limite de master_admin atingido (máximo {MASTER_MAX_ADMIN}).",
                status=409,
            )
        return
    if _ativos(db, filial_id=filial_id) >= FILIAL_MAX_ATIVOS:
        raise ErroRegra(
            f"Limite de contas ativas da filial atingido (máximo {FILIAL_MAX_ATIVOS}).",
            status=409,
        )
    if papel == "filial_gestor" and _ativos(db, filial_id=filial_id, papel="filial_gestor") >= FILIAL_MAX_GESTOR:
        raise ErroRegra("A filial já tem um gestor ativo.", status=409)


def criar_usuario(
    db: Session,
    *,
    username: str,
    senha: str,
    papel: str,
    filial_id: uuid.UUID | None,
    autor: Principal | None = None,
) -> Usuario:
    if papel not in PAPEIS_FILIAL | PAPEIS_MASTER:
        raise ErroRegra("Papel inválido.")
    if papel in PAPEIS_MASTER and filial_id is not None:
        raise ErroRegra("Conta master não pertence a uma filial.")
    if papel in PAPEIS_FILIAL and filial_id is None:
        raise ErroRegra("Conta de filial exige a filial da sessão.")
    nome = _username(username)
    if db.scalar(select(Usuario).where(Usuario.username == nome)):
        raise ErroRegra("Já existe um usuário com este nome.", status=409)
    _checar_teto(db, papel, filial_id)
    try:
        senha_hash = hash_senha(senha)
    except ValueError as exc:
        raise ErroRegra(str(exc)) from exc
    usuario = Usuario(
        username=nome,
        senha_hash=senha_hash,
        papel=papel,
        ativo=True,
        filial_id=filial_id,
        criado_em=agora_utc(),
    )
    db.add(usuario)
    db.flush()
    auditar(
        db,
        "criacao_usuario",
        nome,
        usuario_id=autor.usuario_id if autor else usuario.id,
        filial_id=filial_id,
    )
    db.commit()
    db.refresh(usuario)
    return usuario


def desativar_usuario(db: Session, usuario_id: uuid.UUID, *, autor: Principal) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None or (autor.filial_id and usuario.filial_id != autor.filial_id):
        raise ErroRegra("Usuário não encontrado.", status=404)
    if autor.papel == "filial_gestor" and usuario.filial_id != autor.filial_id:
        raise ErroRegra("Usuário não encontrado.", status=404)
    if not usuario.ativo:
        return usuario
    if usuario.papel == "master_admin" and _ativos(db, filial_id=None, papel="master_admin") <= 1:
        raise ErroRegra("Não é possível desativar o único master_admin ativo.", status=409)
    usuario.ativo = False
    usuario.desativado_em = agora_utc()
    for sessao in db.scalars(select(Sessao).where(Sessao.usuario_id == usuario.id)).all():
        db.delete(sessao)
    auditar(db, "desativacao_usuario", usuario.username, usuario_id=autor.usuario_id, filial_id=usuario.filial_id)
    db.commit()
    db.refresh(usuario)
    return usuario


def listar_usuarios_filial(db: Session, filial_id: uuid.UUID) -> list[Usuario]:
    return list(
        db.scalars(
            select(Usuario)
            .where(Usuario.filial_id == filial_id)
            .order_by(Usuario.username)
        ).all()
    )


def listar_usuarios_master(db: Session) -> list[Usuario]:
    return list(
        db.scalars(
            select(Usuario).where(Usuario.filial_id.is_(None)).order_by(Usuario.username)
        ).all()
    )


def vagas_filial(db: Session, filial_id: uuid.UUID) -> dict:
    usados = _ativos(db, filial_id=filial_id)
    return {"usados": usados, "teto": FILIAL_MAX_ATIVOS, "restantes": max(0, FILIAL_MAX_ATIVOS - usados)}


def criar_filial(
    db: Session,
    *,
    nome: str,
    cnpj: str,
    municipio: str,
    uf: str,
    codigo_ibge: int,
    autor: Principal,
) -> Filial:
    digitos = somente_digitos(cnpj)
    if not cnpj_valido(digitos):
        raise ErroRegra("CNPJ da filial inválido.")
    # O CNPJ da filial identifica a OSC. Não é o CNPJ do órgão público.
    if db.scalar(select(Filial).where(Filial.cnpj == digitos)):
        raise ErroRegra("Já existe uma filial com este CNPJ.", status=409)
    uf_limpa = (uf or "").strip().upper()
    if len(uf_limpa) != 2 or not uf_limpa.isalpha():
        raise ErroRegra("UF inválida.")
    if codigo_ibge < 1_000_000 or codigo_ibge > 9_999_999:
        raise ErroRegra("Código IBGE inválido.")
    if not (nome or "").strip() or not (municipio or "").strip():
        raise ErroRegra("Nome e município são obrigatórios.")
    agora = agora_utc()
    filial = Filial(
        nome=nome.strip(),
        cnpj=digitos,
        municipio=municipio.strip(),
        uf=uf_limpa,
        codigo_ibge=codigo_ibge,
        situacao="ativa",
        cnpj_conferencia_pendente=True,
        criada_em=agora,
        atualizada_em=agora,
    )
    db.add(filial)
    db.flush()
    auditar(db, "criacao_filial", digitos, usuario_id=autor.usuario_id, filial_id=filial.id)
    db.commit()
    db.refresh(filial)
    return filial


def definir_situacao(db: Session, filial_id: uuid.UUID, situacao: str, *, autor: Principal) -> Filial:
    if situacao not in {"ativa", "suspensa"}:
        raise ErroRegra("Situação inválida.")
    filial = db.get(Filial, filial_id)
    if filial is None:
        raise ErroRegra("Filial não encontrada.", status=404)
    filial.situacao = situacao
    filial.atualizada_em = agora_utc()
    evento = "suspensao_filial" if situacao == "suspensa" else "reativacao_filial"
    auditar(db, evento, filial.cnpj, usuario_id=autor.usuario_id, filial_id=filial.id)
    db.commit()
    db.refresh(filial)
    return filial


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _sessao_valida(sessao: Sessao, agora) -> bool:
    if sessao.expira_em <= agora:
        return False
    limite = timedelta(minutes=settings.session_idle_minutos)
    return sessao.ultimo_acesso_em + limite >= agora


def autenticar(db: Session, username: str, senha: str) -> Usuario:
    nome = (username or "").strip().lower()
    usuario = db.scalar(select(Usuario).where(Usuario.username == nome))
    if usuario is None or not verificar_senha(senha, usuario.senha_hash):
        auditar(db, "falha_login", nome)
        db.commit()
        raise ErroRegra("Usuário ou senha inválidos.", status=401)
    if not usuario.ativo:
        raise ErroRegra("Conta desativada.", status=403)
    if usuario.filial_id is not None:
        filial = db.get(Filial, usuario.filial_id)
        if filial is None or filial.situacao != "ativa":
            raise ErroRegra("Filial suspensa.", status=403)
    return usuario


def criar_sessao(db: Session, usuario: Usuario, *, substituir: bool) -> str:
    agora = agora_utc()
    ativas = [
        s
        for s in db.scalars(select(Sessao).where(Sessao.usuario_id == usuario.id)).all()
        if _sessao_valida(s, agora)
    ]
    if ativas and not substituir:
        raise ErroRegra(
            "Já existe uma sessão ativa nesta conta.",
            status=409,
        )
    for sessao in db.scalars(select(Sessao).where(Sessao.usuario_id == usuario.id)).all():
        db.delete(sessao)
    token = secrets.token_urlsafe(32)
    db.add(
        Sessao(
            usuario_id=usuario.id,
            token_hash=_hash_token(token),
            criada_em=agora,
            ultimo_acesso_em=agora,
            expira_em=agora + timedelta(days=settings.session_dias),
        )
    )
    auditar(db, "login", usuario.username, usuario_id=usuario.id, filial_id=usuario.filial_id)
    db.commit()
    return token


def principal_por_token(db: Session, token: str | None) -> Principal | None:
    if not token:
        return None
    sessao = db.scalar(select(Sessao).where(Sessao.token_hash == _hash_token(token)))
    if sessao is None:
        return None
    agora = agora_utc()
    if not _sessao_valida(sessao, agora):
        db.delete(sessao)
        db.commit()
        return None
    usuario = db.get(Usuario, sessao.usuario_id)
    if usuario is None or not usuario.ativo:
        db.delete(sessao)
        db.commit()
        return None
    situacao = None
    if usuario.filial_id is not None:
        filial = db.get(Filial, usuario.filial_id)
        situacao = filial.situacao if filial else "suspensa"
        if situacao != "ativa":
            return None
    sessao.ultimo_acesso_em = agora
    db.commit()
    return Principal(
        usuario_id=usuario.id,
        username=usuario.username,
        papel=usuario.papel,
        filial_id=usuario.filial_id,
        filial_situacao=situacao,
    )


def encerrar_token(db: Session, token: str | None) -> None:
    if not token:
        return
    sessao = db.scalar(select(Sessao).where(Sessao.token_hash == _hash_token(token)))
    if sessao is not None:
        db.delete(sessao)
        db.commit()


def garantir_bootstrap(db: Session) -> Usuario | None:
    if db.scalar(select(func.count()).select_from(Usuario)):
        return None
    if not settings.bootstrap_usuario or not settings.bootstrap_senha:
        return None
    return criar_usuario(
        db,
        username=settings.bootstrap_usuario,
        senha=settings.bootstrap_senha,
        papel="master_admin",
        filial_id=None,
    )
