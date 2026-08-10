from __future__ import annotations

import pytest

from app.domain.enums import MessageStatus, SenderStatus
from app.domain.exceptions import ForbiddenError, PermanentSendError, TransientSendError
from app.services.auth import SenderAuthService


class FakeSender:
    def __init__(self, status: str, key_hash: str = "x"):
        self.id = "snd_test"
        self.status = status
        self.api_key_hash = key_hash
        self.api_key_prefix = "zpg_live_ab12…"


@pytest.mark.asyncio
async def test_auth_rejects_paused(monkeypatch):
    from app.core.security import generate_api_key, verify_api_key

    plaintext, key_hash, prefix = generate_api_key()
    sender = FakeSender(SenderStatus.PAUSED.value, key_hash)
    sender.api_key_prefix = prefix

    class Repo:
        async def find_by_prefix(self, _p):
            return [sender]

        async def list_all(self):
            return [sender]

    svc = SenderAuthService.__new__(SenderAuthService)
    svc.repo = Repo()

    with pytest.raises(ForbiddenError) as ei:
        await svc.authenticate(plaintext, for_send=True)
    assert ei.value.code == "sender_paused"


def test_permanent_vs_transient():
    assert PermanentSendError("x", "y").status_code == 422
    assert TransientSendError("x", "y").status_code == 503


def test_message_state_machine_values():
    flow = [
        MessageStatus.QUEUED,
        MessageStatus.PROCESSING,
        MessageStatus.SENT,
    ]
    assert [s.value for s in flow] == ["queued", "processing", "sent"]
    assert MessageStatus.DEAD.value == "dead"
