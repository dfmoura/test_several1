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


def format_lead_context(
    *,
    segment: str | None = None,
    system: str | None = None,
    need: str | None = None,
    next_step: str | None = None,
    status: str | None = None,
) -> str:
    """Return what we already know about the lead so the agent does not re-ask."""
    fields = [
        ("Segmento", segment),
        ("Sistema atual", system),
        ("Necessidade", need),
        ("Próximo passo", next_step),
        ("Status", status),
    ]
    parts = [f"- {label}: {value.strip()}" for label, value in fields if (value or "").strip()]
    if not parts:
        return ""

    return (
        "O que você já sabe deste possível cliente (não pergunte de novo o que já está aqui):\n"
        + "\n".join(parts)
    )
