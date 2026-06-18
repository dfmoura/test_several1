"""Configuração e factory da integração Inter Trigger TI."""

from __future__ import annotations

import secrets
from pathlib import Path
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.billing_service import BillingService
from app.database import INTER_DIR, InterBillingConfig, SupabaseConfig
from app.inter_client import InterClient

from app.supabase_client import SupabaseClient


def get_inter_config_row(db: Session) -> InterBillingConfig | None:
    return db.query(InterBillingConfig).filter(InterBillingConfig.id == 1).first()


def cert_path(row: InterBillingConfig) -> Path:
    return INTER_DIR / row.cert_filename if row.cert_filename else INTER_DIR / "trigger_ti.crt"


def key_path(row: InterBillingConfig) -> Path:
    return INTER_DIR / row.key_filename if row.key_filename else INTER_DIR / "trigger_ti.key"


def ensure_webhook_token(row: InterBillingConfig, db: Session) -> None:
    if not row.webhook_token:
        row.webhook_token = secrets.token_urlsafe(32)
        db.commit()


def webhook_callback_url(row: InterBillingConfig, request_base_url: str) -> str:
    base = (row.webhook_public_url.strip() or request_base_url).rstrip("/")
    token = quote(row.webhook_token, safe="")
    return f"{base}/api/inter/webhook?token={token}"


def empty_inter_config_dict() -> dict:
    return {
        "configured": False,
        "client_id": "",
        "conta_corrente": "",
        "sandbox": False,
        "scopes": "boleto-cobranca.read boleto-cobranca.write",
        "webhook_public_url": "",
        "webhook_token_set": False,
        "cert_uploaded": False,
        "dias_vencimento": 7,
        "pagador_endereco": "A informar",
        "pagador_cidade": "Belo Horizonte",
        "pagador_uf": "MG",
        "pagador_cep": "30130000",
    }


def inter_config_to_dict(row: InterBillingConfig) -> dict:
    cert_ok = cert_path(row).is_file() and key_path(row).is_file()
    configured = bool(row.client_id and row.client_secret and cert_ok)
    return {
        "configured": configured,
        "client_id": row.client_id,
        "conta_corrente": row.conta_corrente or "",
        "sandbox": row.sandbox,
        "scopes": row.scopes,
        "webhook_public_url": row.webhook_public_url,
        "webhook_token_set": bool(row.webhook_token),
        "cert_uploaded": cert_ok,
        "dias_vencimento": row.dias_vencimento,
        "pagador_endereco": row.pagador_endereco,
        "pagador_cidade": row.pagador_cidade,
        "pagador_uf": row.pagador_uf,
        "pagador_cep": row.pagador_cep,
    }


def build_inter_client(row: InterBillingConfig) -> InterClient:
    cp = cert_path(row)
    kp = key_path(row)
    if not row.client_id or not row.client_secret:
        raise ValueError("Configure Client ID e Client Secret do Inter.")
    if not cp.is_file() or not kp.is_file():
        raise FileNotFoundError("Certificado não encontrado. Envie .crt + .key antes de testar.")
    return InterClient(
        client_id=row.client_id,
        client_secret=row.client_secret,
        cert_path=str(cp),
        key_path=str(kp),
        conta_corrente=row.conta_corrente,
        sandbox=row.sandbox,
        scopes=row.scopes,
    )


def build_billing_service(db: Session) -> BillingService:
    inter_row = get_inter_config_row(db)
    if not inter_row:
        raise ValueError("Configure o Inter antes de emitir cobranças.")
    supabase_row = db.query(SupabaseConfig).filter(SupabaseConfig.id == 1).first()
    if not supabase_row:
        raise ValueError("Configure as credenciais do Supabase primeiro.")
    inter = build_inter_client(inter_row)
    supabase = SupabaseClient(supabase_row.url, supabase_row.service_role_key)
    return BillingService(inter=inter, config=inter_row, supabase=supabase, db=db)
