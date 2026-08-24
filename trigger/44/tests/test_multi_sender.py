from __future__ import annotations

import pytest

from app.domain.enums import OnboardingStep, SenderStatus
from app.domain.exceptions import AppError
from app.schemas import SenderConnectIn, SenderPairIn
from app.services.billing import onboarding_step, pick_sender_for_docs


class _Sender:
    def __init__(self, id: str, status: str, label: str | None = None):
        self.id = id
        self.status = status
        self.label = label


def test_onboarding_ready_when_any_sender_active():
    rows = [
        _Sender("a", SenderStatus.PENDING_PAIR.value),
        _Sender("b", SenderStatus.ACTIVE.value),
    ]
    assert onboarding_step(True, senders=rows) == OnboardingStep.READY.value


def test_onboarding_connect_when_none_active():
    rows = [_Sender("a", SenderStatus.PENDING_PAIR.value)]
    assert onboarding_step(True, senders=rows) == OnboardingStep.CONNECT.value


def test_pick_sender_prefers_id_then_active():
    rows = [
        _Sender("old", SenderStatus.ACTIVE.value, "loja-1"),
        _Sender("new", SenderStatus.ACTIVE.value, "loja-2"),
        _Sender("pending", SenderStatus.PENDING_PAIR.value),
    ]
    assert pick_sender_for_docs(rows, preferred_id="new").id == "new"
    assert pick_sender_for_docs(rows).status == SenderStatus.ACTIVE.value


def test_pair_schema_accepts_multi_sender_flags():
    body = SenderPairIn(
        name="loja centro",
        business_confirmed=True,
        label="sistema-x/cliente-1",
        as_new=True,
    )
    assert body.as_new is True
    assert body.label == "sistema-x/cliente-1"


def test_connect_schema_accepts_sender_id_and_as_new():
    body = SenderConnectIn(
        name="loja",
        phone="5534999999999",
        business_confirmed=True,
        sender_id="snd_abc",
        as_new=False,
        label="unidade-2",
    )
    assert body.sender_id == "snd_abc"
    assert body.label == "unidade-2"


@pytest.mark.asyncio
async def test_pair_requires_sender_id_when_many_exist():
    from app.services.sender import SenderService

    svc = SenderService.__new__(SenderService)

    class Repo:
        async def list_for_account(self, _account_id):
            return [
                _Sender("s1", SenderStatus.ACTIVE.value),
                _Sender("s2", SenderStatus.ACTIVE.value),
            ]

        async def get_for_account(self, _account_id, _sender_id):
            return None

    class Billing:
        async def require_active(self, _account_id):
            return True

    class Settings:
        pairing_enabled = True

    svc.senders = Repo()
    svc.billing = Billing()
    svc.settings = Settings()

    class Account:
        id = "acc_1"

    with pytest.raises(AppError) as ei:
        await svc.pair(
            Account(),
            name="novo",
            business_confirmed=True,
            as_new=False,
        )
    assert ei.value.code == "sender_required"
