from __future__ import annotations

import asyncio
import json
import signal

import redis.asyncio as redis
from aio_pika import IncomingMessage
from aio_pika.abc import AbstractRobustConnection

from app.config import get_settings
from app.core.crypto import decrypt_secret
from app.core.database import async_session_factory
from app.core.logging import get_logger, setup_logging
from app.domain.enums import SenderStatus, WhatsAppProviderKind
from app.integrations.whatsapp.factory import build_whatsapp_provider
from app.queue.topology import (
    QueuePublisher,
    connect_rabbitmq,
    declare_sender_queues,
    queue_name,
)
from app.repositories import SenderRepository
from app.services.dispatch import DispatchService
from app.services.rate_limit import RateLimiter

logger = get_logger(__name__)

_shutdown = asyncio.Event()


async def _on_message(
    message: IncomingMessage,
    publisher: QueuePublisher,
    rate_limiter: RateLimiter,
) -> None:
    async with message.process(requeue=False):
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except Exception as exc:
            logger.error("invalid_job_payload", error=str(exc))
            return

        async with async_session_factory() as session:
            dispatch = DispatchService(session, publisher, rate_limiter)
            await dispatch.process_job(payload)


async def _consume_sender(
    connection: AbstractRobustConnection,
    sender_id: str,
    publisher: QueuePublisher,
    rate_limiter: RateLimiter,
    prefetch: int,
) -> None:
    try:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=prefetch)
        queue = await declare_sender_queues(channel, sender_id)

        async def handler(msg: IncomingMessage) -> None:
            await _on_message(msg, publisher, rate_limiter)

        await queue.consume(handler)
        logger.info(
            "consuming_sender_queue", sender_id=sender_id, queue=queue_name(sender_id)
        )
        await _shutdown.wait()
        await channel.close()
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("consume_sender_failed", sender_id=sender_id)
        raise


async def _health_pass() -> None:
    """Token Cloud API is persistent; this only flags revoked credentials — never drops a QR session."""
    async with async_session_factory() as session:
        senders = await SenderRepository(session).list_all()
        for sender in senders:
            if sender.status not in (
                SenderStatus.ACTIVE.value,
                SenderStatus.CREDENTIALS_INVALID.value,
            ):
                continue
            if sender.provider != WhatsAppProviderKind.CLOUD.value:
                continue
            token = None
            if sender.access_token_encrypted:
                try:
                    token = decrypt_secret(sender.access_token_encrypted)
                except ValueError:
                    sender.status = SenderStatus.CREDENTIALS_INVALID.value
                    await session.flush()
                    continue
            provider = build_whatsapp_provider(sender.provider)
            try:
                ok = await provider.health(
                    phone_number_id=sender.phone_number_id or "",
                    access_token=token,
                )
            finally:
                await provider.close()
            if ok:
                from datetime import datetime, timezone

                sender.last_healthy_at = datetime.now(timezone.utc)
                if sender.status == SenderStatus.CREDENTIALS_INVALID.value:
                    sender.status = SenderStatus.ACTIVE.value
            else:
                sender.status = SenderStatus.CREDENTIALS_INVALID.value
                logger.warning(
                    "cloud_credentials_invalid",
                    sender_id=sender.id,
                )
        await session.commit()


async def run_worker() -> None:
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("worker_starting", prefetch=settings.worker_prefetch)

    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    rate_limiter = RateLimiter(redis_client)
    publish_conn = await connect_rabbitmq()
    consume_conn = await connect_rabbitmq()
    publisher = QueuePublisher(publish_conn)
    await publisher.connect()

    consumers: list[asyncio.Task] = []
    known: set[str] = set()
    last_health = 0.0

    async def refresh_consumers() -> None:
        nonlocal consumers, known
        async with async_session_factory() as session:
            senders = await SenderRepository(session).list_all()
        for sender in senders:
            if sender.id in known:
                continue
            task = asyncio.create_task(
                _consume_sender(
                    consume_conn,
                    sender.id,
                    publisher,
                    rate_limiter,
                    settings.worker_prefetch,
                )
            )
            task.add_done_callback(
                lambda t, sid=sender.id: logger.error(
                    "consume_task_done_error",
                    sender_id=sid,
                    error=str(t.exception()),
                )
                if not t.cancelled() and t.exception()
                else None
            )
            consumers.append(task)
            known.add(sender.id)
            logger.info("worker_bound_sender", sender_id=sender.id)

    def _handle_signal(*_: object) -> None:
        logger.info("worker_shutdown_signal")
        _shutdown.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _handle_signal)
        except NotImplementedError:
            pass

    try:
        while not _shutdown.is_set():
            try:
                await refresh_consumers()
            except Exception as exc:
                logger.error("refresh_consumers_error", error=str(exc))
            now = loop.time()
            if now - last_health >= settings.credential_health_interval_seconds:
                try:
                    await _health_pass()
                    last_health = now
                except Exception as exc:
                    logger.error("health_pass_error", error=str(exc))
            try:
                await asyncio.wait_for(_shutdown.wait(), timeout=10.0)
            except TimeoutError:
                continue
    finally:
        for task in consumers:
            task.cancel()
        await asyncio.gather(*consumers, return_exceptions=True)
        await publisher.close()
        await publish_conn.close()
        await consume_conn.close()
        await redis_client.aclose()
        logger.info("worker_stopped")


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
