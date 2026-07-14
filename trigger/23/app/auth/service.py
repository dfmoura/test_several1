"""Regras de negócio: usuários, sessões e teto de contas."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.passwords import hash_senha, verificar_senha
from app.config import (
    AUTH_BOOTSTRAP_PASSWORD,
    AUTH_BOOTSTRAP_USERNAME,
    AUTH_SESSION_DIAS,
    MAX_ADMIN,
    MAX_CONSULTA,
)
from app.database import PAPEIS_USUARIO, Sessao, Usuario

PAPEL_ADMIN = "admin"
PAPEL_CONSULTA = "consulta"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuthError(Exception):
    """Erro de regra de autenticação (mensagem segura para a API)."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def max_total_contas() -> int:
    return MAX_ADMIN + MAX_CONSULTA


def contar_por_papel(db: Session, papel: str, *, apenas_ativos: bool = False) -> int:
    q = select(func.count()).select_from(Usuario).where(Usuario.papel == papel)
    if apenas_ativos:
        q = q.where(Usuario.ativo.is_(True))
    return int(db.scalar(q) or 0)


def total_usuarios(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(Usuario)) or 0)


def precisa_bootstrap(db: Session) -> bool:
    return total_usuarios(db) == 0


def limites_atual(db: Session) -> dict:
    """Contagens e vagas — o teto considera apenas contas ativas."""
    n_admin = contar_por_papel(db, PAPEL_ADMIN, apenas_ativos=True)
    n_consulta = contar_por_papel(db, PAPEL_CONSULTA, apenas_ativos=True)
    return {
        "max_admin": MAX_ADMIN,
        "max_consulta": MAX_CONSULTA,
        "max_total": max_total_contas(),
        "admin": n_admin,
        "consulta": n_consulta,
        "total": n_admin + n_consulta,
        "vagas_admin": max(0, MAX_ADMIN - n_admin),
        "vagas_consulta": max(0, MAX_CONSULTA - n_consulta),
    }


def _validar_username(username: str) -> str:
    nome = (username or "").strip().lower()
    if len(nome) < 3 or len(nome) > 80:
        raise AuthError("Usuário deve ter entre 3 e 80 caracteres.")
    if not all(c.isalnum() or c in "._-" for c in nome):
        raise AuthError("Usuário: use apenas letras, números, ponto, hífen ou underscore.")
    return nome


def _validar_papel(papel: str) -> str:
    p = (papel or "").strip().lower()
    if p not in PAPEIS_USUARIO:
        raise AuthError(f"Papel inválido. Use: {', '.join(sorted(PAPEIS_USUARIO))}.")
    return p


def _checar_teto(db: Session, papel: str, *, excluir_id: int | None = None) -> None:
    """Garante teto ao criar ou reativar (contas ativas)."""
    limites = limites_atual(db)
    if excluir_id is not None:
        atual = db.get(Usuario, excluir_id)
        # Já ativo no mesmo papel: não consome vaga adicional.
        if atual and atual.ativo and atual.papel == papel:
            return

    if papel == PAPEL_ADMIN and limites["vagas_admin"] <= 0:
        raise AuthError(
            f"Limite de administradores atingido (máximo {MAX_ADMIN}).",
            status_code=409,
        )
    if papel == PAPEL_CONSULTA and limites["vagas_consulta"] <= 0:
        raise AuthError(
            f"Limite de usuários de consulta atingido (máximo {MAX_CONSULTA}).",
            status_code=409,
        )
    if limites["total"] >= max_total_contas():
        raise AuthError(
            f"Limite total de contas atingido (máximo {max_total_contas()}).",
            status_code=409,
        )


def criar_usuario(
    db: Session,
    *,
    username: str,
    senha: str,
    papel: str,
) -> Usuario:
    nome = _validar_username(username)
    papel_ok = _validar_papel(papel)
    existente = db.scalar(select(Usuario).where(Usuario.username == nome))
    if existente:
        raise AuthError("Já existe um usuário com este nome.", status_code=409)
    _checar_teto(db, papel_ok)
    try:
        senha_h = hash_senha(senha)
    except ValueError as exc:
        raise AuthError(str(exc)) from exc

    user = Usuario(username=nome, senha_hash=senha_h, papel=papel_ok, ativo=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def autenticar(db: Session, username: str, senha: str) -> Usuario:
    nome = (username or "").strip().lower()
    user = db.scalar(select(Usuario).where(Usuario.username == nome))
    if user is None or not verificar_senha(senha, user.senha_hash):
        raise AuthError("Usuário ou senha inválidos.", status_code=401)
    if not user.ativo:
        raise AuthError("Conta desativada. Contate o administrador.", status_code=403)
    return user


MSG_SESSAO_OCUPADA = (
    "Já existe uma sessão ativa com este usuário. "
    "Peça que a pessoa encerre o acesso (sair) ou tente mais tarde. "
    "Se a sessão ficou órfã, o administrador pode liberá-la em Usuários."
)


def purgar_sessoes_expiradas(db: Session, usuario_id: int | None = None) -> int:
    """Remove sessões vencidas (opcionalmente de um usuário). Retorna quantas apagou."""
    agora = _utcnow()
    stmt = select(Sessao).where(Sessao.expira_em < agora)
    if usuario_id is not None:
        stmt = stmt.where(Sessao.usuario_id == usuario_id)
    rows = list(db.scalars(stmt).all())
    for s in rows:
        db.delete(s)
    if rows:
        db.commit()
    return len(rows)


def listar_sessoes_ativas(db: Session, usuario_id: int) -> list[Sessao]:
    """Sessões não expiradas do usuário (após limpeza de vencidas)."""
    purgar_sessoes_expiradas(db, usuario_id)
    agora = _utcnow()
    return list(
        db.scalars(
            select(Sessao)
            .where(Sessao.usuario_id == usuario_id, Sessao.expira_em >= agora)
            .order_by(Sessao.criado_em.asc())
        ).all()
    )


def criar_sessao(
    db: Session,
    usuario: Usuario,
    *,
    token_atual: str | None = None,
) -> Sessao:
    """Cria sessão com política de **uma ativa por usuário**.

    - Se já houver sessão de outra pessoa/dispositivo → 409 (não derruba a ativa).
    - Se ``token_atual`` for a sessão válida deste usuário (mesmo navegador),
      renova e reutiliza — evita bloqueio em reenvio do formulário de login.
    """
    ativas = listar_sessoes_ativas(db, usuario.id)
    token_limpo = (token_atual or "").strip() or None

    if token_limpo:
        propria = next((s for s in ativas if s.token == token_limpo), None)
        if propria is not None:
            agora = _utcnow()
            propria.expira_em = agora + timedelta(days=AUTH_SESSION_DIAS)
            propria.ultimo_acesso = agora
            db.commit()
            db.refresh(propria)
            return propria

    if ativas:
        raise AuthError(MSG_SESSAO_OCUPADA, status_code=409)

    token = secrets.token_urlsafe(32)
    agora = _utcnow()
    sessao = Sessao(
        token=token,
        usuario_id=usuario.id,
        criado_em=agora,
        expira_em=agora + timedelta(days=AUTH_SESSION_DIAS),
        ultimo_acesso=agora,
    )
    db.add(sessao)
    db.commit()
    db.refresh(sessao)
    return sessao


def obter_usuario_por_token(db: Session, token: str | None) -> Usuario | None:
    if not token:
        return None
    sessao = db.scalar(select(Sessao).where(Sessao.token == token))
    if sessao is None:
        return None
    agora = _utcnow()
    if sessao.expira_em < agora:
        db.delete(sessao)
        db.commit()
        return None
    user = db.get(Usuario, sessao.usuario_id)
    if user is None or not user.ativo:
        db.delete(sessao)
        db.commit()
        return None
    sessao.ultimo_acesso = agora
    db.commit()
    return user


def encerrar_sessao(db: Session, token: str | None) -> None:
    if not token:
        return
    sessao = db.scalar(select(Sessao).where(Sessao.token == token))
    if sessao:
        db.delete(sessao)
        db.commit()


def encerrar_sessoes_usuario(db: Session, usuario_id: int) -> None:
    sessoes = db.scalars(select(Sessao).where(Sessao.usuario_id == usuario_id)).all()
    for s in sessoes:
        db.delete(s)
    db.commit()


def listar_usuarios(db: Session) -> list[Usuario]:
    return list(
        db.scalars(select(Usuario).order_by(Usuario.papel.asc(), Usuario.username.asc())).all()
    )


def obter_usuario(db: Session, uid: int) -> Usuario:
    user = db.get(Usuario, uid)
    if user is None:
        raise AuthError("Usuário não encontrado.", status_code=404)
    return user


def atualizar_usuario(
    db: Session,
    uid: int,
    *,
    ativo: bool | None = None,
    nova_senha: str | None = None,
    papel: str | None = None,
) -> Usuario:
    user = obter_usuario(db, uid)

    if papel is not None:
        papel_ok = _validar_papel(papel)
        if papel_ok != user.papel:
            if user.ativo and user.papel == PAPEL_ADMIN and papel_ok != PAPEL_ADMIN:
                ativos_admin = contar_por_papel(db, PAPEL_ADMIN, apenas_ativos=True)
                if ativos_admin <= 1:
                    raise AuthError(
                        "Não é possível alterar o papel do único administrador ativo.",
                        status_code=409,
                    )
            if user.ativo:
                _checar_teto(db, papel_ok)
            user.papel = papel_ok

    if ativo is not None:
        if ativo and not user.ativo:
            _checar_teto(db, user.papel)
        if not ativo and user.ativo and user.papel == PAPEL_ADMIN:
            ativos_admin = contar_por_papel(db, PAPEL_ADMIN, apenas_ativos=True)
            if ativos_admin <= 1:
                raise AuthError(
                    "Não é possível desativar o único administrador ativo.",
                    status_code=409,
                )
        user.ativo = ativo
        if not ativo:
            encerrar_sessoes_usuario(db, user.id)

    if nova_senha is not None:
        try:
            user.senha_hash = hash_senha(nova_senha)
        except ValueError as exc:
            raise AuthError(str(exc)) from exc
        encerrar_sessoes_usuario(db, user.id)

    db.commit()
    db.refresh(user)
    return user


def garantir_bootstrap_env(db: Session) -> Usuario | None:
    """Cria o 1º admin a partir de AUTH_BOOTSTRAP_* se a base estiver vazia."""
    if not precisa_bootstrap(db):
        return None
    if not AUTH_BOOTSTRAP_USERNAME or not AUTH_BOOTSTRAP_PASSWORD:
        return None
    return criar_usuario(
        db,
        username=AUTH_BOOTSTRAP_USERNAME,
        senha=AUTH_BOOTSTRAP_PASSWORD,
        papel=PAPEL_ADMIN,
    )
