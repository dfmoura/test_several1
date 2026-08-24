from __future__ import annotations

from typing import Any

from app.domain.enums import IntakeSource


def outbound_job(
    *,
    message_id: str,
    sender_id: str,
    account_id: str,
    external_id: str,
    source: str = IntakeSource.API.value,
    priority: str = "normal",
) -> dict[str, Any]:
    """Envelope da fila. O worker despacha só pelo sender_id persistido.

    Destino e texto nunca viajam no broker — a fonte da verdade é o Postgres.
    """
    return {
        "message_id": message_id,
        "sender_id": sender_id,
        "account_id": account_id,
        "external_id": external_id,
        "source": source,
        "priority": priority,
    }
