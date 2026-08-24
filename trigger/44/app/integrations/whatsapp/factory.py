from __future__ import annotations

from app.config import get_settings
from app.integrations.whatsapp.baileys import BaileysWhatsAppProvider
from app.integrations.whatsapp.cloud import CloudWhatsAppProvider
from app.integrations.whatsapp.sandbox import SandboxWhatsAppProvider


def build_whatsapp_provider(kind: str | None = None):
    settings = get_settings()
    selected = (kind or settings.whatsapp_provider or "sandbox").lower()
    if selected == "cloud":
        return CloudWhatsAppProvider()
    if selected == "baileys":
        return BaileysWhatsAppProvider()
    return SandboxWhatsAppProvider()