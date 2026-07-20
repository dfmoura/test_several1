"""Format durable per-contact facts for the system prompt."""

MAX_RELATION_LEN = 64
MAX_NOTES_LEN = 500


def format_contact_profile(
    *,
    relation: str | None = None,
    notes: str | None = None,
) -> str:
    """Return a short prompt block, or empty string when there is nothing useful."""
    parts: list[str] = []

    relation_clean = (relation or "").strip()
    if relation_clean:
        parts.append(f"- Relação: {relation_clean[:MAX_RELATION_LEN]}")

    notes_clean = (notes or "").strip()
    if notes_clean:
        parts.append(f"- Notas: {notes_clean[:MAX_NOTES_LEN]}")

    if not parts:
        return ""

    return "Sobre este contato:\n" + "\n".join(parts)
