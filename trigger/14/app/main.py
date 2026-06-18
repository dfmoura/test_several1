from pathlib import Path
from typing import Any

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.billing_service import BillingError
from app.inter_client import InterClientError, clear_inter_oauth_cache, normalize_conta_corrente
from app.database import (
    DEFAULT_VALOR_IMPLANTACAO,
    DEFAULT_VALOR_MENSALIDADE,
    INTER_DIR,
    InterBillingConfig,
    RegisteredApp,
    SupabaseConfig,
    get_db,
    get_registered_app_row,
    init_db,
    registered_app_to_dict,
)
from app.inter_config import (
    build_billing_service,
    build_inter_client,
    cert_path,
    empty_inter_config_dict,
    ensure_webhook_token,
    get_inter_config_row,
    inter_config_to_dict,
    webhook_callback_url,
)
from app.cnpj_lookup import CnpjLookupError, fetch_cnpj_pagador
from app.license_helpers import enrich_license_pagador, finalize_license_create, generate_next_license_key
from app.schema import (
    ValidationError,
    filter_to_schema,
    list_tables,
    parse_table_schema,
    supabase_error_hint,
    validate_row,
)
from app.supabase_client import SupabaseClient

app = FastAPI(title="Trigger TI — Licenças & Cobranças")
STATIC_DIR = Path(__file__).parent / "static"


class ConfigIn(BaseModel):
    url: str
    service_role_key: str


class ConfigOut(BaseModel):
    url: str
    configured: bool


class RowIn(BaseModel):
    data: dict[str, Any]


class AppIn(BaseModel):
    app_id: str
    valor_implantacao: float = Field(default=DEFAULT_VALOR_IMPLANTACAO, ge=0)
    valor_mensalidade: float = Field(default=DEFAULT_VALOR_MENSALIDADE, ge=0)


class AppPricingIn(BaseModel):
    valor_implantacao: float = Field(ge=0)
    valor_mensalidade: float = Field(ge=0)


class InterConfigIn(BaseModel):
    client_id: str
    client_secret: str = ""
    conta_corrente: str = ""
    sandbox: bool = False
    scopes: str = "boleto-cobranca.read boleto-cobranca.write"
    webhook_public_url: str = ""
    webhook_token: str = ""
    dias_vencimento: int = Field(default=7, ge=1, le=60)
    pagador_endereco: str = "A informar"
    pagador_cidade: str = "Belo Horizonte"
    pagador_uf: str = "MG"
    pagador_cep: str = "30130000"


class LicenseKeyIn(BaseModel):
    license_key: str


def billing_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, BillingError):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, InterClientError):
        return HTTPException(status_code=502, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, httpx.HTTPStatusError):
        return HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    if isinstance(exc, FileNotFoundError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=502, detail=str(exc))


def get_or_create_inter_config(db: Session) -> InterBillingConfig:
    row = get_inter_config_row(db)
    if row:
        return row
    row = InterBillingConfig(id=1)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_client(db: Session) -> SupabaseClient:
    config = db.query(SupabaseConfig).filter(SupabaseConfig.id == 1).first()
    if not config:
        raise HTTPException(status_code=400, detail="Configure as credenciais do Supabase primeiro.")
    return SupabaseClient(config.url, config.service_role_key)


async def get_table_schema(client: SupabaseClient, table: str):
    try:
        openapi = await client.get_openapi()
        return parse_table_schema(openapi, table)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc


def normalize_app_id(value: str) -> str:
    app_id = value.strip().lower()
    if not app_id:
        raise HTTPException(status_code=422, detail=["Informe o nome do app."])
    if not app_id.replace("_", "").isalnum():
        raise HTTPException(
            status_code=422,
            detail=["app_id deve conter apenas letras, números e underscore."],
        )
    return app_id


def list_registered_apps(db: Session) -> list[dict[str, Any]]:
    rows = db.query(RegisteredApp).order_by(RegisteredApp.app_id).all()
    return [registered_app_to_dict(row) for row in rows]


def list_registered_app_ids(db: Session) -> list[str]:
    return [row.app_id for row in db.query(RegisteredApp).order_by(RegisteredApp.app_id).all()]


def ensure_registered_app_id(db: Session, data: dict[str, Any]) -> None:
    if "app_id" not in data or data["app_id"] in (None, ""):
        return
    app_id = str(data["app_id"]).strip().lower()
    registered = list_registered_app_ids(db)
    if app_id not in registered:
        raise HTTPException(
            status_code=422,
            detail=[f"app_id '{app_id}' não está cadastrado. Cadastre o app antes de usar."],
        )


def handle_validation(mode: str, schema, data: dict[str, Any]) -> dict[str, Any]:
    try:
        return validate_row(schema, data, mode)  # type: ignore[arg-type]
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors) from exc


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config", response_model=ConfigOut)
def get_config(db: Session = Depends(get_db)):
    config = db.query(SupabaseConfig).filter(SupabaseConfig.id == 1).first()
    if not config:
        return ConfigOut(url="", configured=False)
    return ConfigOut(url=config.url, configured=True)


@app.post("/api/config")
def save_config(body: ConfigIn, db: Session = Depends(get_db)):
    config = db.query(SupabaseConfig).filter(SupabaseConfig.id == 1).first()
    if config:
        config.url = body.url.rstrip("/")
        config.service_role_key = body.service_role_key
    else:
        config = SupabaseConfig(id=1, url=body.url.rstrip("/"), service_role_key=body.service_role_key)
        db.add(config)
    db.commit()
    return {"ok": True}


@app.post("/api/config/test")
async def test_config(body: ConfigIn):
    client = SupabaseClient(body.url, body.service_role_key)
    try:
        ok = await client.test_connection()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Falha na conexão: {exc}") from exc
    if not ok:
        raise HTTPException(status_code=400, detail="Não foi possível conectar ao Supabase.")
    return {"ok": True}


@app.get("/api/apps")
def get_apps(db: Session = Depends(get_db)):
    return {"apps": list_registered_apps(db)}


@app.post("/api/apps")
def create_app(body: AppIn, db: Session = Depends(get_db)):
    app_id = normalize_app_id(body.app_id)
    exists = db.query(RegisteredApp).filter(RegisteredApp.app_id == app_id).first()
    if exists:
        raise HTTPException(status_code=409, detail=f"App '{app_id}' já está cadastrado.")
    row = RegisteredApp(
        app_id=app_id,
        valor_implantacao=body.valor_implantacao,
        valor_mensalidade=body.valor_mensalidade,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return registered_app_to_dict(row)


@app.patch("/api/apps/{app_id}")
def update_app_pricing(app_id: str, body: AppPricingIn, db: Session = Depends(get_db)):
    app_id = normalize_app_id(app_id)
    row = get_registered_app_row(db, app_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' não encontrado.")
    row.valor_implantacao = body.valor_implantacao
    row.valor_mensalidade = body.valor_mensalidade
    db.commit()
    db.refresh(row)
    return registered_app_to_dict(row)


@app.delete("/api/apps/{app_id}")
def delete_app(app_id: str, db: Session = Depends(get_db)):
    app_id = normalize_app_id(app_id)
    row = db.query(RegisteredApp).filter(RegisteredApp.app_id == app_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' não encontrado.")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/api/tables")
async def get_tables(db: Session = Depends(get_db)):
    client = get_client(db)
    try:
        openapi = await client.get_openapi()
        return {"tables": list_tables(openapi)}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/tables/{table}/schema")
async def get_schema(table: str, db: Session = Depends(get_db)):
    client = get_client(db)
    schema = await get_table_schema(client, table)
    return schema.to_dict()


@app.get("/api/tables/{table}")
async def list_rows(
    table: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    client = get_client(db)
    schema = await get_table_schema(client, table)
    order = f"{schema.primary_key}.desc"
    try:
        rows = await client.list_rows(table, limit=limit, offset=offset, order=order)
        try:
            total = await client.count_rows(table)
        except httpx.HTTPError:
            total = len(rows)
        return {"rows": rows, "total": total, "limit": limit, "offset": offset, "schema": schema.to_dict()}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/cnpj/{cnpj}")
async def lookup_cnpj(cnpj: str):
    try:
        return await fetch_cnpj_pagador(cnpj)
    except CnpjLookupError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/licenses/next-key")
async def next_license_key(db: Session = Depends(get_db)):
    client = get_client(db)
    try:
        license_key = await generate_next_license_key(client)
        return {"license_key": license_key}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/tables/{table}")
async def create_row(table: str, body: RowIn, db: Session = Depends(get_db)):
    client = get_client(db)
    schema = await get_table_schema(client, table)
    cleaned = handle_validation("create", schema, body.data)
    ensure_registered_app_id(db, cleaned)
    if table.lower() == "licenses":
        try:
            cleaned = await finalize_license_create(client, cleaned)
        except CnpjLookupError as exc:
            raise HTTPException(status_code=422, detail=[str(exc)]) from exc
        cleaned = filter_to_schema(cleaned, schema)
    try:
        created = await client.create_row(table, cleaned)
        return {"rows": created}
    except httpx.HTTPStatusError as exc:
        hint = supabase_error_hint(exc.response.text)
        detail = hint or exc.response.text
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.patch("/api/tables/{table}/{row_id}")
async def update_row(table: str, row_id: str, body: RowIn, db: Session = Depends(get_db)):
    client = get_client(db)
    schema = await get_table_schema(client, table)
    cleaned = handle_validation("update", schema, body.data)
    if not cleaned:
        raise HTTPException(status_code=422, detail=["Informe ao menos um campo para atualizar."])
    ensure_registered_app_id(db, cleaned)
    if table.lower() == "licenses" and "cnpj" in cleaned:
        try:
            cleaned = await enrich_license_pagador(cleaned, required=True, force=True)
        except CnpjLookupError as exc:
            raise HTTPException(status_code=422, detail=[str(exc)]) from exc
        cleaned = filter_to_schema(cleaned, schema)
    try:
        updated = await client.update_row(table, schema.primary_key, row_id, cleaned)
        return {"rows": updated}
    except httpx.HTTPStatusError as exc:
        hint = supabase_error_hint(exc.response.text)
        detail = hint or exc.response.text
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.delete("/api/tables/{table}/{row_id}")
async def delete_row(table: str, row_id: str, db: Session = Depends(get_db)):
    client = get_client(db)
    schema = await get_table_schema(client, table)
    try:
        await client.delete_row(table, schema.primary_key, row_id)
        return {"ok": True}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/inter/config")
def get_inter_config(db: Session = Depends(get_db)):
    row = get_inter_config_row(db)
    if not row:
        return empty_inter_config_dict()
    return inter_config_to_dict(row)


@app.post("/api/inter/config")
def save_inter_config(body: InterConfigIn, db: Session = Depends(get_db)):
    row = get_or_create_inter_config(db)
    row.client_id = body.client_id.strip()
    if body.client_secret.strip():
        row.client_secret = body.client_secret.strip()
    conta_raw = body.conta_corrente.strip()
    if conta_raw:
        conta_norm = normalize_conta_corrente(conta_raw)
        if not conta_norm:
            raise HTTPException(
                status_code=422,
                detail=[
                    "Conta corrente inválida. Use só números, sem hífen "
                    "(ex.: 538375221 em vez de 53837522-1)."
                ],
            )
        row.conta_corrente = conta_norm
    else:
        row.conta_corrente = None
    row.sandbox = body.sandbox
    row.scopes = body.scopes.strip() or "boleto-cobranca.read boleto-cobranca.write"
    row.webhook_public_url = body.webhook_public_url.strip()
    if body.webhook_token.strip():
        row.webhook_token = body.webhook_token.strip()
    row.dias_vencimento = body.dias_vencimento
    row.pagador_endereco = body.pagador_endereco.strip()
    row.pagador_cidade = body.pagador_cidade.strip()
    row.pagador_uf = body.pagador_uf.strip().upper()[:2]
    row.pagador_cep = body.pagador_cep.strip()
    ensure_webhook_token(row, db)
    db.commit()
    clear_inter_oauth_cache()
    return {"ok": True}


@app.post("/api/inter/config/upload-cert")
async def upload_inter_cert(
    cert: UploadFile = File(...),
    key: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = get_or_create_inter_config(db)
    cert_name = "trigger_ti.crt"
    key_name = "trigger_ti.key"
    cert_bytes = await cert.read()
    key_bytes = await key.read()
    if not cert_bytes or not key_bytes:
        raise HTTPException(status_code=422, detail="Arquivos certificado e chave são obrigatórios.")
    (INTER_DIR / cert_name).write_bytes(cert_bytes)
    (INTER_DIR / key_name).write_bytes(key_bytes)
    row.cert_filename = cert_name
    row.key_filename = key_name
    db.commit()
    return {"ok": True, "cert_filename": cert_name, "key_filename": key_name}


@app.post("/api/inter/config/test")
def test_inter_config(db: Session = Depends(get_db)):
    row = get_inter_config_row(db)
    if not row:
        raise HTTPException(status_code=400, detail="Configure o Inter antes de testar.")
    try:
        client = build_inter_client(row)
        return client.ping()
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.get("/api/inter/webhook/info")
def inter_webhook_info(request: Request, db: Session = Depends(get_db)):
    row = get_inter_config_row(db)
    if not row:
        raise HTTPException(status_code=400, detail="Configure o Inter primeiro.")
    ensure_webhook_token(row, db)
    callback = webhook_callback_url(row, str(request.base_url).rstrip("/"))
    registered = None
    try:
        registered = build_inter_client(row).get_webhook()
    except Exception:
        registered = None
    return {
        "callback_url": callback,
        "registered": registered,
        "webhook_public_url": row.webhook_public_url,
    }


@app.post("/api/inter/webhook/register")
def register_inter_webhook(request: Request, db: Session = Depends(get_db)):
    row = get_inter_config_row(db)
    if not row:
        raise HTTPException(status_code=400, detail="Configure o Inter primeiro.")
    ensure_webhook_token(row, db)
    callback = webhook_callback_url(row, str(request.base_url).rstrip("/"))
    try:
        client = build_inter_client(row)
        result = client.register_webhook(callback)
        return {"ok": True, "callback_url": callback, "result": result}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.post("/api/inter/webhook")
async def inter_webhook(
    request: Request,
    token: str = Query(default=""),
    db: Session = Depends(get_db),
):
    row = get_inter_config_row(db)
    if not row or not row.webhook_token:
        raise HTTPException(status_code=503, detail="Webhook não configurado.")
    if token != row.webhook_token:
        raise HTTPException(status_code=401, detail="Token inválido.")

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="JSON inválido.") from exc

    service = build_billing_service(db)
    items = payload if isinstance(payload, list) else [payload]
    results = []
    for item in items:
        if isinstance(item, dict):
            results.append(await service.handle_webhook_payload(item))
    return {"ok": True, "results": results}


@app.get("/api/billing/schedule")
async def billing_schedule(
    emit_ahead_days: int = Query(default=21, ge=7, le=60),
    include_ok: bool = Query(default=True),
    only_active: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    try:
        service = build_billing_service(db)
        return await service.get_billing_schedule(
            emit_ahead_days=emit_ahead_days,
            include_ok=include_ok,
            only_active=only_active,
        )
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.get("/api/billing/charges")
async def list_billing_charges(
    license_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        service = build_billing_service(db)
        return {"charges": await service.list_charges(license_key)}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.post("/api/billing/charges/initial")
async def create_initial_billing_charge(body: LicenseKeyIn, db: Session = Depends(get_db)):
    try:
        service = build_billing_service(db)
        charge = await service.create_initial_charge(body.license_key)
        return {"charge": charge}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.post("/api/billing/charges/monthly")
async def create_monthly_billing_charge(body: LicenseKeyIn, db: Session = Depends(get_db)):
    try:
        service = build_billing_service(db)
        charge = await service.create_monthly_charge(body.license_key)
        return {"charge": charge}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.post("/api/billing/charges/{charge_id}/sync")
async def sync_billing_charge(charge_id: str, db: Session = Depends(get_db)):
    try:
        service = build_billing_service(db)
        charge = await service.sync_charge_status(charge_id)
        return {"charge": charge}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.post("/api/billing/charges/{charge_id}/cancel")
async def cancel_billing_charge(charge_id: str, db: Session = Depends(get_db)):
    try:
        service = build_billing_service(db)
        charge = await service.cancel_charge(charge_id)
        return {"charge": charge}
    except Exception as exc:
        raise billing_http_error(exc) from exc


@app.get("/api/billing/charges/{charge_id}/pdf")
async def billing_charge_pdf(charge_id: str, db: Session = Depends(get_db)):
    try:
        service = build_billing_service(db)
        rows = await service.list_charges()
        charge = next((c for c in rows if str(c.get("id")) == charge_id), None)
        if not charge:
            raise BillingError("Cobrança não encontrada.")
        codigo = charge.get("codigo_solicitacao")
        if not codigo:
            raise BillingError("Cobrança sem codigo_solicitacao.")
        pdf = service.inter.pdf_cobranca(str(codigo))
        return {"pdf_base64": pdf}
    except Exception as exc:
        raise billing_http_error(exc) from exc


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
