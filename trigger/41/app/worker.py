from __future__ import annotations

import asyncio
import json
import signal

import redis.asyncio as redis
from aio_pika import IncomingMessage
from aio_pika.abc import AbstractRobustConnection

from app.config import get_settings
from app.core.database import async_session_factory
from app.core.logging import get_logger, setup_logging
from app.integrations.evolution import EvolutionClient
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
    evolution: EvolutionClient,
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
            dispatch = DispatchService(
                session, evolution, publisher, rate_limiter
            )
            await dispatch.process_job(payload)


async def _consume_sender(
    connection: AbstractRobustConnection,
    sender_id: str,
    evolution: EvolutionClient,
    publisher: QueuePublisher,
    rate_limiter: RateLimiter,
    prefetch: int,
) -> None:
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=prefetch)
    await declare_sender_queues(channel, sender_id)
    queue = await channel.declare_queue(queue_name(sender_id), durable=True)

    async def handler(msg: IncomingMessage) -> None:
        await _on_message(msg, evolution, publisher, rate_limiter)

    await queue.consume(handler)
    logger.info("consuming_sender_queue", sender_id=sender_id, queue=queue_name(sender_id))
    await _shutdown.wait()
    await channel.close()


async def run_worker() -> None:
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("worker_starting", prefetch=settings.worker_prefetch)

    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    rate_limiter = RateLimiter(redis_client)
    evolution = EvolutionClient()
    connection = await connect_rabbitmq()
    publisher = QueuePublisher(connection)
    await publisher.connect()

    consumers: list[asyncio.Task] = []
    known: set[str] = set()

    async def refresh_consumers() -> None:
        nonlocal consumers, known
        async with async_session_factory() as session:
            senders = await SenderRepository(session).list_all()
        for sender in senders:
            if sender.id in known:
                continue
            # Skip revoked — still declare queue but no need to special-case
            task = asyncio.create_task(
                _consume_sender(
                    connection,
                    sender.id,
                    evolution,
                    publisher,
                    rate_limiter,
                    settings.worker_prefetch,
                )
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
            try:
                await asyncio.wait_for(_shutdown.wait(), timeout=10.0)
            except TimeoutError:
                continue
    finally:
        for task in consumers:
            task.cancel()
        await asyncio.gather(*consumers, return_exceptions=True)
        await publisher.close()
        await connection.close()
        await evolution.close()
        await redis_client.aclose()
        logger.info("worker_stopped")


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
