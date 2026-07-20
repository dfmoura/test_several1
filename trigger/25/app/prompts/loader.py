from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent


class PromptLoader:
    """Load prompt fragments from text files (not hardcoded)."""

    def __init__(self, prompts_dir: Path | None = None) -> None:
        self._dir = prompts_dir or PROMPTS_DIR

    def _read(self, filename: str) -> str:
        path = self._dir / filename
        if not path.exists():
            logger.warning("prompt_file_missing", file=str(path))
            return ""
        return path.read_text(encoding="utf-8").strip()

    def build_system_prompt(
        self,
        *,
        owner_name: str | None = None,
        user_name: str | None = None,
        summary: str = "",
        contact_profile: str = "",
    ) -> str:
        settings = get_settings()
        name = owner_name or settings.owner_name

        system = self._read("system.txt").format(owner_name=name)
        assistant = self._read("assistant.txt")
        personality = self._read("personality.txt")

        parts = [system, assistant, personality]

        if user_name:
            parts.append(f"Você está conversando com: {user_name}.")
        if contact_profile:
            parts.append(contact_profile)
        if summary:
            parts.append(f"Resumo recente da conversa:\n{summary}")

        return "\n\n".join(p for p in parts if p)


@lru_cache
def get_prompt_loader() -> PromptLoader:
    return PromptLoader()
