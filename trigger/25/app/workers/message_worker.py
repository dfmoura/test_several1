import asyncio
from collections.abc import Coroutine
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class MessageWorker:
    """Background task runner for non-blocking webhook acknowledgements."""

    def __init__(self) -> None:
        self._tasks: set[asyncio.Task[Any]] = set()

    def enqueue(self, coro: Coroutine[Any, Any, Any]) -> None:
        task = asyncio.create_task(self._run(coro))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run(self, coro: Coroutine[Any, Any, Any]) -> None:
        try:
            await coro
        except Exception:
            logger.exception("background_task_failed")

    async def drain(self) -> None:
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)


message_worker = MessageWorker()
