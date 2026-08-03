from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.domain.rbac import permissions_for_role, user_has_any, user_has_perm
from app.models import User

bearer = HTTPBearer(auto_error=False)

DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inválido")
    if not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário bloqueado")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str):
    """Legado: exigir um dos perfis. Preferir require_perms."""

    def _inner(user: CurrentUser) -> User:
        if user.role.value == "ADMIN":
            return user
        if user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Sem permissão para esta operação")
        return user

    return _inner


def require_perms(*perms: str, any_of: bool = False):
    """Exige permissões do PERFIL do usuário (nunca perms soltas no USR)."""

    def _inner(user: CurrentUser) -> User:
        if user.role.value == "ADMIN":
            return user
        ok = user_has_any(user.role, *perms) if any_of else user_has_perm(user.role, *perms)
        if not ok:
            raise HTTPException(
                status_code=403,
                detail="Sem permissão para esta operação (perfil insuficiente)",
            )
        return user

    return _inner


def serialize_user(user: User) -> dict[str, Any]:
    perms = sorted(permissions_for_role(user.role))
    return {
        "id": user.id,
        "email": user.email,
        "nome": user.nome,
        "role": user.role.value,
        "perfil": user.role.value,
        "empresa_id": user.empresa_id,
        "ativo": user.ativo,
        "permissoes": perms,
    }


def money(v: Any) -> str:
    from decimal import Decimal

    if v is None:
        return "0.00"
    return str(Decimal(str(v)).quantize(Decimal("0.01")))
