from __future__ import annotations

import pytest

from app.config import clear_settings_cache, get_settings
from app.domain.exceptions import ForbiddenError
from app.services.account import (
    REGISTRATION_CLOSED_MSG,
    AccountService,
    registration_allowed,
)


def test_registration_open_always_allows():
    assert registration_allowed("open", 0)
    assert registration_allowed("open", 99)


def test_registration_bootstrap_only_first_account():
    assert registration_allowed("bootstrap", 0)
    assert not registration_allowed("bootstrap", 1)


def test_registration_closed_never_allows():
    assert not registration_allowed("closed", 0)
    assert not registration_allowed("closed", 1)


def test_unknown_mode_is_denied_by_helper():
    assert not registration_allowed("weird", 0)


def test_settings_code_defaults_without_dotenv(monkeypatch):
    """Defaults da classe (sem .env): saas/open — o hub privado vem do .env do projeto."""
    from app.config.settings import Settings

    monkeypatch.delenv("DEPLOYMENT_MODE", raising=False)
    monkeypatch.delenv("REGISTRATION_MODE", raising=False)
    monkeypatch.delenv("BILLING_AUTO_ACTIVATE", raising=False)
    clear_settings_cache()
    try:
        settings = Settings(_env_file=None)
        assert settings.deployment_mode == "saas"
        assert settings.registration_mode_normalized == "open"
        assert settings.billing_auto_activate is False
        assert settings.is_private_deployment is False
    finally:
        clear_settings_cache()


def test_project_env_is_private_hub():
    """Este projeto opera como hub privado do operador (.env / .env.example)."""
    clear_settings_cache()
    try:
        settings = get_settings()
        assert settings.is_private_deployment is True
        assert settings.registration_mode_normalized == "bootstrap"
        assert settings.billing_auto_activate is True
    finally:
        clear_settings_cache()


def test_settings_private_production_shape(monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MODE", "private")
    monkeypatch.setenv("REGISTRATION_MODE", "bootstrap")
    monkeypatch.setenv("BILLING_AUTO_ACTIVATE", "true")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://zap.example.com")
    clear_settings_cache()
    try:
        settings = get_settings()
        assert settings.is_private_deployment is True
        assert settings.registration_mode_normalized == "bootstrap"
        assert settings.billing_auto_activate is True
        assert settings.is_production is True
        assert settings.cors_origins == ["https://zap.example.com"]
    finally:
        clear_settings_cache()


def test_production_hides_openapi(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://zap.example.com")
    clear_settings_cache()
    try:
        from app.main import create_app

        app = create_app()
        assert app.docs_url is None
        assert app.redoc_url is None
        assert app.openapi_url is None
    finally:
        clear_settings_cache()


def test_caddyfile_blocks_public_evolution_webhook():
    from pathlib import Path

    text = Path("deploy/Caddyfile").read_text(encoding="utf-8")
    assert "evolution_public" in text
    assert "/v1/webhooks/evolution" in text


@pytest.mark.asyncio
async def test_register_respects_bootstrap_gate():
    svc = AccountService.__new__(AccountService)

    class Accounts:
        async def count(self):
            return 1

    svc.accounts = Accounts()

    class Frozen:
        registration_mode_normalized = "bootstrap"
        billing_auto_activate = False

    import app.services.account as account_mod

    original = account_mod.get_settings
    account_mod.get_settings = lambda: Frozen()
    try:
        with pytest.raises(ForbiddenError) as ei:
            await svc.register("Op", "op@example.com", "password1")
        assert ei.value.code == "registration_closed"
        assert REGISTRATION_CLOSED_MSG in ei.value.message
    finally:
        account_mod.get_settings = original
