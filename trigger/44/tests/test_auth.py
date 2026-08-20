from __future__ import annotations

import pytest

from app.core.security import generate_api_key
from app.domain.enums import SenderStatus
from app.domain.exceptions import ForbiddenError, PermanentSendError, TransientSendError, UnauthorizedError
from app.services.auth import SenderAuthService


class FakeSender:
    def __init__(self, status: str, key_hash: str, prefix: str):
        self.id = "snd_test"
        self.account_id = "acc_test"
        self.status = status
        self.api_key_hash = key_hash
        self.api_key_prefix = prefix
        self.channel = "whatsapp_business"


class FakeSub:
    def __init__(self, active: bool = True):
        self.status = "active" if active else "canceled"
        self.current_period_end = None


@pytest.mark.asyncio
async def test_auth_rejects_paused():
    plaintext, key_hash, prefix = generate_api_key()
    sender = FakeSender(SenderStatus.PAUSED.value, key_hash, prefix)

    class Repo:
        async def find_by_prefix(self, _p):
            return [sender]

        async def list_all(self):
            return [sender]

    class Subs:
        async def get_for_account(self, _id):
            return FakeSub(True)

    svc = SenderAuthService.__new__(SenderAuthService)
    svc.repo = Repo()
    svc.subs = Subs()

    class Billing:
        def is_active(self, sub):
            return sub is not None and sub.status == "active"

    svc.billing = Billing()

    with pytest.raises(ForbiddenError) as ei:
        await svc.authenticate(plaintext, for_send=True)
    assert ei.value.code == "sender_paused"


@pytest.mark.asyncio
async def test_auth_rejects_inactive_subscription():
    plaintext, key_hash, prefix = generate_api_key()
    sender = FakeSender(SenderStatus.ACTIVE.value, key_hash, prefix)

    class Repo:
        async def find_by_prefix(self, _p):
            return [sender]

        async def list_all(self):
            return [sender]

    class Subs:
        async def get_for_account(self, _id):
            return FakeSub(False)

    svc = SenderAuthService.__new__(SenderAuthService)
    svc.repo = Repo()
    svc.subs = Subs()

    class Billing:
        def is_active(self, sub):
            return False

    svc.billing = Billing()

    with pytest.raises(ForbiddenError) as ei:
        await svc.authenticate(plaintext, for_send=True)
    assert ei.value.code == "subscription_inactive"


@pytest.mark.asyncio
async def test_auth_rejects_bad_key():
    svc = SenderAuthService.__new__(SenderAuthService)
    with pytest.raises(UnauthorizedError):
        await svc.authenticate("not-a-key", for_send=True)


def test_permanent_vs_transient():
    assert PermanentSendError("x", "y").status_code == 422
    assert TransientSendError("x", "y").status_code == 503
