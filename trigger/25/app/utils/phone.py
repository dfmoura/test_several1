import re


def normalize_phone(raw: str) -> str:
    """Extract digits from WhatsApp JID / phone string."""
    if not raw:
        return ""
    # remoteJid like 5511999999999@s.whatsapp.net
    local = raw.split("@")[0]
    digits = re.sub(r"\D", "", local)
    return digits


def is_group_jid(raw: str) -> bool:
    return "@g.us" in (raw or "")


def is_status_broadcast(raw: str) -> bool:
    return "status@broadcast" in (raw or "")
