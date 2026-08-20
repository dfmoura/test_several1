from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.ids import new_id
from app.core.security import (
    create_access_token,
    hash_secret,
    verify_secret,
)
from app.domain.enums import AccountStatus
from app.domain.exceptions import ConflictError, UnauthorizedError
from app.models import Account
from app.repositories import AccountRepository, AuditRepository


class AccountService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.accounts = AccountRepository(session)
        self.audit = AuditRepository(session)

    async def register(self, name: str, email: str, password: str) -> tuple[Account, str]:
        email_n = email.lower().strip()
        existing = await self.accounts.find_by_email(email_n)
        if existing:
            raise ConflictError("email_taken", "Este e-mail já possui conta")
        account = Account(
            id=new_id("acc"),
            name=name.strip(),
            email=email_n,
            password_hash=hash_secret(password),
            status=AccountStatus.ACTIVE.value,
        )
        await self.accounts.create(account)
        await self.audit.log("account_register", account_id=account.id)
        return account, create_access_token(account.id)

    async def login(self, email: str, password: str) -> tuple[Account, str]:
        account = await self.accounts.find_by_email(email.lower().strip())
        if not account or not verify_secret(password, account.password_hash):
            raise UnauthorizedError("E-mail ou senha inválidos")
        if account.status != AccountStatus.ACTIVE.value:
            raise UnauthorizedError("Conta suspensa")
        await self.audit.log("account_login", account_id=account.id)
        return account, create_access_token(account.id)

    async def get(self, account_id: str) -> Account:
        account = await self.accounts.get(account_id)
        if not account:
            raise UnauthorizedError("Sessão inválida")
        if account.status != AccountStatus.ACTIVE.value:
            raise UnauthorizedError("Conta suspensa")
        return account


def token_out(account: Account, token: str) -> dict:
    return {
        "access_token": token,
        "token_type": "bearer",
        "account_id": account.id,
        "name": account.name,
        "email": account.email,
    }


def public_base() -> str:
    return get_settings().public_base_url.rstrip("/")
