from __future__ import annotations

import json
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message as AioMessage
from aio_pika.abc import AbstractChannel, AbstractRobustConnection

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

EXCHANGE_SEND = "zap.send"
EXCHANGE_DLX = "zap.send.dlx"
EXCHANGE_RETRY = "zap.send.retry"

RETRY_BACKOFF = (15, 45, 120, 300, 900)


def queue_name(sender_id: str) -> str:
    return f"q.sender.{sender_id}"


def dlq_name(sender_id: str) -> str:
    return f"q.sender.{sender_id}.dlq"


def routing_key(sender_id: str) -> str:
    return f"sender.{sender_id}"


def retry_queue_name(sender_id: str, attempt: int) -> str:
    return f"q.sender.{sender_id}.retry.{attempt}"


async def connect_rabbitmq(url: str | None = None) -> AbstractRobustConnection:
    settings = get_settings()
    return await aio_pika.connect_robust(
        url or settings.rabbitmq_url,
        timeout=15,
    )


async def declare_topology(channel: AbstractChannel) -> None:
    await channel.declare_exchange(
        EXCHANGE_SEND, ExchangeType.TOPIC, durable=True
    )
    await channel.declare_exchange(
        EXCHANGE_DLX, ExchangeType.TOPIC, durable=True
    )
    await channel.declare_exchange(
        EXCHANGE_RETRY, ExchangeType.TOPIC, durable=True
    )


async def declare_sender_queues(
    channel: AbstractChannel, sender_id: str
) -> None:
    """Declare main queue + DLQ + per-attempt retry TTL queues for a sender."""
    await declare_topology(channel)
    rk = routing_key(sender_id)
    main_q = queue_name(sender_id)
    dead_q = dlq_name(sender_id)

    dlq = await channel.declare_queue(
        dead_q,
        durable=True,
        arguments={"x-queue-type": "classic"},
    )
    await dlq.bind(EXCHANGE_DLX, routing_key=rk)

    queue = await channel.declare_queue(
        main_q,
        durable=True,
        arguments={
            "x-dead-letter-exchange": EXCHANGE_DLX,
            "x-dead-letter-routing-key": rk,
        },
    )
    await queue.bind(EXCHANGE_SEND, routing_key=rk)

    settings = get_settings()
    backoffs = settings.retry_backoff_seconds or RETRY_BACKOFF
    for i, ttl_sec in enumerate(backoffs, start=1):
        rq_name = retry_queue_name(sender_id, i)
        # Messages expire from retry queue → dead-letter back to main exchange
        retry_q = await channel.declare_queue(
            rq_name,
            durable=True,
            arguments={
                "x-message-ttl": int(ttl_sec) * 1000,
                "x-dead-letter-exchange": EXCHANGE_SEND,
                "x-dead-letter-routing-key": rk,
            },
        )
        await retry_q.bind(EXCHANGE_RETRY, routing_key=f"{rk}.retry.{i}")


class QueuePublisher:
    def __init__(self, connection: AbstractRobustConnection):
        self._connection = connection
        self._channel: AbstractChannel | None = None

    async def connect(self) -> None:
        self._channel = await self._connection.channel()
        await declare_topology(self._channel)

    async def close(self) -> None:
        if self._channel and not self._channel.is_closed:
            await self._channel.close()

    async def ensure_sender(self, sender_id: str) -> None:
        assert self._channel is not None
        await declare_sender_queues(self._channel, sender_id)

    async def publish_send(
        self, sender_id: str, payload: dict[str, Any]
    ) -> None:
        assert self._channel is not None
        await self.ensure_sender(sender_id)
        exchange = await self._channel.get_exchange(EXCHANGE_SEND)
        body = json.dumps(payload).encode("utf-8")
        await exchange.publish(
            AioMessage(
                body=body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                message_id=payload.get("message_id"),
            ),
            routing_key=routing_key(sender_id),
        )
        logger.info(
            "published_send",
            sender_id=sender_id,
            message_id=payload.get("message_id"),
        )

    async def publish_retry(
        self, sender_id: str, payload: dict[str, Any], attempt: int
    ) -> None:
        assert self._channel is not None
        await self.ensure_sender(sender_id)
        exchange = await self._channel.get_exchange(EXCHANGE_RETRY)
        body = json.dumps(payload).encode("utf-8")
        await exchange.publish(
            AioMessage(
                body=body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                message_id=payload.get("message_id"),
            ),
            routing_key=f"{routing_key(sender_id)}.retry.{attempt}",
        )
        logger.info(
            "published_retry",
            sender_id=sender_id,
            message_id=payload.get("message_id"),
            attempt=attempt,
        )

    async def publish_dead(
        self, sender_id: str, payload: dict[str, Any]
    ) -> None:
        assert self._channel is not None
        await self.ensure_sender(sender_id)
        exchange = await self._channel.get_exchange(EXCHANGE_DLX)
        body = json.dumps(payload).encode("utf-8")
        await exchange.publish(
            AioMessage(
                body=body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                message_id=payload.get("message_id"),
            ),
            routing_key=routing_key(sender_id),
        )

    async def queue_stats(self, sender_ids: list[str]) -> list[dict[str, Any]]:
        assert self._channel is not None
        stats: list[dict[str, Any]] = []
        for sid in sender_ids:
            await self.ensure_sender(sid)
            try:
                q = await self._channel.declare_queue(
                    queue_name(sid), durable=True, passive=True
                )
                dlq = await self._channel.declare_queue(
                    dlq_name(sid), durable=True, passive=True
                )
                stats.append(
                    {
                        "sender_id": sid,
                        "queue": queue_name(sid),
                        "ready": q.declaration_result.message_count,
                        "consumers": q.declaration_result.consumer_count,
                        "dlq_ready": dlq.declaration_result.message_count,
                    }
                )
            except Exception as exc:
                stats.append(
                    {
                        "sender_id": sid,
                        "queue": queue_name(sid),
                        "error": str(exc),
                    }
                )
        return stats
