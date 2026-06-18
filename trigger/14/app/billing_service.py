"""Emissão de cobranças Inter e atualização de licenças no Supabase."""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from sqlalchemy.orm import Session
from app.database import InterBillingConfig, get_registered_app_row
from app.inter_client import InterClient, InterClientError
from app.cnpj_lookup import CnpjLookupError
from app.billing_schedule import DEFAULT_EMIT_AHEAD_DAYS, build_billing_schedule
from app.license_helpers import enrich_license_pagador
from app.supabase_client import SupabaseClient

RENEWAL_DAYS = 32
BILLING_TABLE = "billing_charges"
LICENSES_TABLE = "licenses"


class BillingError(Exception):
    pass


def normalize_license_key(raw: str) -> str:
    return raw.strip().upper().replace(" ", "")


def normalize_digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def format_date_utc(d: date) -> str:
    return d.isoformat()


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def build_seu_numero(charge_type: str, license_key: str) -> str:
    """seuNumero da Inter: máximo 15 caracteres."""
    prefix = "I" if charge_type == "INITIAL" else "M"
    compact = normalize_license_key(license_key).replace("-", "")
    if charge_type == "INITIAL":
        return f"{prefix}{compact}"[:15]
    ymd = date.today().strftime("%y%m%d")
    return f"{prefix}{ymd}{compact}"[:15]


def is_inter_paid(situacao: str | None, valor_recebido: float | None, valor_nominal: float | None) -> bool:
    s = (situacao or "").upper().strip()
    if s:
        if "CANCEL" in s:
            return False
        if any(k in s for k in ("RECEBIDO", "RECEBIDA", "LIQUIDADO", "LIQUIDADA", "QUITADO", "QUITADA")):
            return True
        if s in ("PAGO", "PAGA") or "PAGAMENTO CONFIRMADO" in s or "PAGAMENTO EFETUADO" in s:
            return True
    rec = valor_recebido
    nom = valor_nominal
    if rec is not None and nom is not None and nom >= 0.01:
        return rec >= nom - 0.02
    return False


def is_inter_cancelled(situacao: str | None) -> bool:
    """Inter costuma retornar BAIXADO (não só CANCELADO) após cancelamento."""
    s = (situacao or "").upper().strip()
    if not s:
        return False
    return any(k in s for k in ("CANCEL", "BAIXAD", "BAIXA"))


def is_inter_expired(situacao: str | None) -> bool:
    s = (situacao or "").upper()
    return any(k in s for k in ("EXPIR", "VENCID", "ATRASAD"))


def extract_cobranca_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """Normaliza resposta GET cobrança ou callback webhook (plano ou aninhado)."""
    cob = payload.get("cobranca") if isinstance(payload.get("cobranca"), dict) else payload
    boleto = payload.get("boleto") if isinstance(payload.get("boleto"), dict) else {}
    pix = payload.get("pix") if isinstance(payload.get("pix"), dict) else {}

    situacao = (
        cob.get("situacao")
        or payload.get("situacao")
        or boleto.get("situacao")
    )
    valor_nominal = cob.get("valorNominal") or payload.get("valorNominal")
    valor_recebido = cob.get("valorTotalRecebido")

    return {
        "codigo_solicitacao": cob.get("codigoSolicitacao") or payload.get("codigoSolicitacao"),
        "seu_numero": cob.get("seuNumero") or payload.get("seuNumero"),
        "situacao": situacao,
        "valor_nominal": valor_nominal,
        "valor_recebido": valor_recebido,
        "data_vencimento": cob.get("dataVencimento"),
        "pix_copia_cola": pix.get("pixCopiaECola") or pix.get("emv"),
        "linha_digitavel": boleto.get("linhaDigitavel"),
        "paid": is_inter_paid(situacao, valor_recebido, valor_nominal),
        "cancelled": is_inter_cancelled(situacao),
        "expired": is_inter_expired(situacao),
    }


class BillingService:
    def __init__(
        self,
        *,
        inter: InterClient,
        config: InterBillingConfig,
        supabase: SupabaseClient,
        db: Session,
    ):
        self.inter = inter
        self.config = config
        self.supabase = supabase
        self.db = db

    def _pricing_for_license(self, license_row: dict[str, Any]) -> tuple[float, float]:
        app_id = str(license_row.get("app_id") or "").strip().lower()
        if not app_id:
            raise BillingError("Licença sem app_id. Informe o app na licença antes de emitir cobrança.")
        row = get_registered_app_row(self.db, app_id)
        if not row:
            raise BillingError(
                f"app_id '{app_id}' não está cadastrado. Cadastre o app e configure os valores de cobrança."
            )
        valor_impl = round(float(row.valor_implantacao), 2)
        valor_mensal = round(float(row.valor_mensalidade), 2)
        return valor_impl, valor_mensal

    async def get_billing_schedule(
        self,
        *,
        emit_ahead_days: int = DEFAULT_EMIT_AHEAD_DAYS,
        include_ok: bool = True,
        only_active: bool = False,
    ) -> dict[str, Any]:
        licenses = await self._rest_get(
            LICENSES_TABLE,
            {"select": "*", "order": "valido_ate.asc.nullslast", "limit": "500"},
        )
        open_charges = await self._rest_get(
            BILLING_TABLE,
            {
                "select": "id,license_key,charge_type,status,data_vencimento,valor_nominal,created_at",
                "status": "eq.EMITIDA",
                "order": "created_at.desc",
                "limit": "500",
            },
        )
        pricing: dict[str, tuple[float, float]] = {}
        for lic in licenses:
            app_id = str(lic.get("app_id") or "").strip().lower()
            if not app_id or app_id in pricing:
                continue
            try:
                pricing[app_id] = self._pricing_for_license(lic)
            except BillingError:
                pricing[app_id] = (0.0, 0.0)

        return build_billing_schedule(
            licenses,
            open_charges,
            pricing,
            emit_ahead_days=emit_ahead_days,
            include_ok=include_ok,
            only_active=only_active,
        )

    async def list_charges(self, license_key: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, str] = {
            "select": "*",
            "order": "created_at.desc",
            "limit": "100",
        }
        if license_key:
            params["license_key"] = f"eq.{normalize_license_key(license_key)}"
        return await self._rest_get(BILLING_TABLE, params)

    async def create_initial_charge(self, license_key: str) -> dict[str, Any]:
        key = normalize_license_key(license_key)
        license_row = await self._ensure_license_pagador(await self._fetch_license(key))
        if license_row.get("implantacao_paga"):
            raise BillingError("Implantação já está paga para esta licença.")
        await self._ensure_no_open_charge(key, "INITIAL")

        valor_impl, valor_mensal = self._pricing_for_license(license_row)
        valor_total = round(valor_impl + valor_mensal, 2)
        if valor_total <= 0:
            raise BillingError(
                f"Configure valores de implantação e mensalidade para o app '{license_row.get('app_id')}'."
            )

        vencimento = date.today() + timedelta(days=int(self.config.dias_vencimento))
        seu_numero = build_seu_numero("INITIAL", key)
        descricao = f"Implantação + 1ª mensalidade — {key}"

        codigo = await self._emit_inter_charge(
            license_row=license_row,
            seu_numero=seu_numero,
            valor=valor_total,
            vencimento=vencimento,
            descricao=descricao,
        )
        detalhe = self.inter.get_cobranca(codigo)
        fields = extract_cobranca_fields(detalhe)

        row = {
            "license_key": key,
            "charge_type": "INITIAL",
            "seu_numero": seu_numero,
            "codigo_solicitacao": codigo,
            "valor_nominal": valor_total,
            "valor_implantacao": valor_impl,
            "valor_mensalidade": valor_mensal,
            "data_vencimento": format_date_utc(vencimento),
            "status": "EMITIDA",
            "inter_situacao": fields.get("situacao"),
            "pix_copia_cola": fields.get("pix_copia_cola"),
            "linha_digitavel": fields.get("linha_digitavel"),
            "inter_payload": detalhe,
        }
        created = await self._rest_post(BILLING_TABLE, row)
        return created[0] if created else row

    async def create_monthly_charge(self, license_key: str) -> dict[str, Any]:
        key = normalize_license_key(license_key)
        license_row = await self._ensure_license_pagador(await self._fetch_license(key))
        if not license_row.get("implantacao_paga"):
            raise BillingError("Emita e confirme a cobrança inicial antes da mensalidade.")
        await self._ensure_no_open_charge(key, "MONTHLY")

        _, valor_mensal = self._pricing_for_license(license_row)
        if valor_mensal <= 0:
            raise BillingError(
                f"Configure o valor da mensalidade para o app '{license_row.get('app_id')}'."
            )

        vencimento = date.today() + timedelta(days=int(self.config.dias_vencimento))
        seu_numero = build_seu_numero("MONTHLY", key)
        descricao = f"Mensalidade licença — {key}"

        codigo = await self._emit_inter_charge(
            license_row=license_row,
            seu_numero=seu_numero,
            valor=valor_mensal,
            vencimento=vencimento,
            descricao=descricao,
        )
        detalhe = self.inter.get_cobranca(codigo)
        fields = extract_cobranca_fields(detalhe)

        row = {
            "license_key": key,
            "charge_type": "MONTHLY",
            "seu_numero": seu_numero,
            "codigo_solicitacao": codigo,
            "valor_nominal": valor_mensal,
            "valor_implantacao": None,
            "valor_mensalidade": valor_mensal,
            "data_vencimento": format_date_utc(vencimento),
            "status": "EMITIDA",
            "inter_situacao": fields.get("situacao"),
            "pix_copia_cola": fields.get("pix_copia_cola"),
            "linha_digitavel": fields.get("linha_digitavel"),
            "inter_payload": detalhe,
        }
        created = await self._rest_post(BILLING_TABLE, row)
        return created[0] if created else row

    async def sync_charge_status(self, charge_id: str) -> dict[str, Any]:
        charge = await self._fetch_charge_by_id(charge_id)
        codigo = charge.get("codigo_solicitacao")
        if not codigo:
            raise BillingError("Cobrança sem codigo_solicitacao.")
        if not (self.config.conta_corrente or "").strip():
            raise BillingError(
                "Configure a conta corrente no painel Inter (conta+dígito, sem hífen, ex.: 538375221)."
            )
        detalhe = self.inter.get_cobranca(str(codigo))
        return await self._apply_inter_detail(charge, detalhe)

    async def cancel_charge(
        self,
        charge_id: str,
        motivo: str = "Cancelamento solicitado pelo emissor",
    ) -> dict[str, Any]:
        charge = await self._fetch_charge_by_id(charge_id)
        status = str(charge.get("status") or "EMITIDA")
        if status != "EMITIDA":
            raise BillingError(f"Só é possível cancelar cobrança EMITIDA (atual: {status}).")
        codigo = charge.get("codigo_solicitacao")
        if not codigo:
            raise BillingError("Cobrança sem codigo_solicitacao.")
        if not (self.config.conta_corrente or "").strip():
            raise BillingError(
                "Configure a conta corrente no painel Inter — obrigatória para cancelar na API."
            )
        try:
            self.inter.cancelar_cobranca(str(codigo), motivo)
        except InterClientError as exc:
            raise BillingError(str(exc)) from exc

        detalhe: dict[str, Any] = {}
        fields: dict[str, Any] = {}
        for attempt in range(5):
            detalhe = self.inter.get_cobranca(str(codigo))
            fields = extract_cobranca_fields(detalhe)
            if fields.get("cancelled"):
                break
            if attempt < 4:
                await asyncio.sleep(2)

        updated = await self._apply_inter_detail(charge, detalhe)
        if str(updated.get("status")) != "CANCELADA":
            situacao = fields.get("situacao") or updated.get("inter_situacao") or "?"
            raise BillingError(
                f"Inter ainda não confirmou cancelamento (situação: {situacao}). "
                "Aguarde 1–2 minutos e clique Sync. Confira também a conta corrente no painel Inter."
            )
        return updated

    async def handle_webhook_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        fields = extract_cobranca_fields(payload)
        codigo = fields.get("codigo_solicitacao")
        seu_numero = fields.get("seu_numero")

        charge = None
        if codigo:
            charge = await self._fetch_charge_by_codigo(str(codigo))
        if not charge and seu_numero:
            charge = await self._fetch_charge_by_seu_numero(str(seu_numero))
        if not charge:
            return {"ignored": True, "reason": "charge_not_found", "codigo": codigo}

        updated = await self._apply_inter_detail(charge, payload)
        return {"ok": True, "charge_id": updated.get("id"), "status": updated.get("status")}

    async def _apply_inter_detail(
        self,
        charge: dict[str, Any],
        inter_payload: dict[str, Any],
    ) -> dict[str, Any]:
        fields = extract_cobranca_fields(inter_payload)
        status = str(charge.get("status") or "EMITIDA")
        if fields["paid"]:
            status = "PAGA"
        elif fields["cancelled"]:
            status = "CANCELADA"
        elif fields["expired"]:
            status = "EXPIRADA"

        patch: dict[str, Any] = {
            "inter_situacao": fields.get("situacao"),
            "status": status,
            "inter_payload": inter_payload,
        }
        if fields.get("pix_copia_cola"):
            patch["pix_copia_cola"] = fields["pix_copia_cola"]
        if fields.get("linha_digitavel"):
            patch["linha_digitavel"] = fields["linha_digitavel"]
        if status == "PAGA" and not charge.get("paid_at"):
            patch["paid_at"] = datetime.now(timezone.utc).isoformat()

        updated_rows = await self._rest_patch(BILLING_TABLE, str(charge["id"]), patch)
        updated = updated_rows[0] if updated_rows else {**charge, **patch}

        if status == "PAGA" and not charge.get("license_updated"):
            await self._renew_license(str(charge["license_key"]), str(charge.get("charge_type", "")))
            license_updated_rows = await self._rest_patch(
                BILLING_TABLE,
                str(charge["id"]),
                {"license_updated": True},
            )
            if license_updated_rows:
                updated = license_updated_rows[0]

        return updated

    async def _renew_license(self, license_key: str, charge_type: str) -> None:
        row = await self._fetch_license(license_key)
        today = date.today()
        current_end = parse_date(row.get("valido_ate")) or today
        base = current_end if current_end > today else today
        new_end = base + timedelta(days=RENEWAL_DAYS)

        patch: dict[str, Any] = {
            "ativa": True,
            "valido_ate": format_date_utc(new_end),
        }
        if charge_type == "INITIAL" or not row.get("implantacao_paga"):
            patch["implantacao_paga"] = True

        await self._rest_patch_license(license_key, patch)

    async def _emit_inter_charge(
        self,
        *,
        license_row: dict[str, Any],
        seu_numero: str,
        valor: float,
        vencimento: date,
        descricao: str,
    ) -> str:
        pagador = self._build_pagador(license_row)
        body = {
            "seuNumero": seu_numero[:15],
            "valorNominal": valor,
            "dataVencimento": format_date_utc(vencimento),
            "numDiasAgenda": 60,
            "formasRecebimento": ["BOLETO", "PIX"],
            "mensagem": {"linha1": descricao[:78]},
            "pagador": pagador,
        }
        try:
            result = self.inter.emitir_cobranca(body)
        except InterClientError as exc:
            raise BillingError(str(exc)) from exc
        codigo = result.get("codigoSolicitacao")
        if not codigo:
            raise BillingError("Inter não retornou codigoSolicitacao.")
        return str(codigo)

    def _build_pagador(self, license_row: dict[str, Any]) -> dict[str, Any]:
        cnpj_raw = str(license_row.get("cnpj") or "")
        cpf_cnpj = normalize_digits(cnpj_raw)
        if len(cpf_cnpj) not in (11, 14):
            raise BillingError("Licença precisa de CPF/CNPJ válido (11 ou 14 dígitos).")
        tipo_pessoa = "JURIDICA" if len(cpf_cnpj) == 14 else "FISICA"

        nome = (
            license_row.get("pagador_nome")
            or license_row.get("condominio_nome")
            or license_row.get("license_key")
        )
        endereco = license_row.get("pagador_endereco") or self.config.pagador_endereco
        cidade = license_row.get("pagador_cidade") or self.config.pagador_cidade
        uf = license_row.get("pagador_uf") or self.config.pagador_uf or "MG"
        cep_raw = license_row.get("pagador_cep") or self.config.pagador_cep
        cep = normalize_digits(str(cep_raw)).zfill(8)[:8]

        if not str(endereco).strip() or str(endereco).strip().lower() == "a informar":
            raise BillingError(
                "Dados do pagador incompletos. Informe o CNPJ na licença para buscar o endereço."
            )
        if not str(cidade).strip() or not str(uf).strip() or len(cep) != 8:
            raise BillingError("Cidade, UF e CEP do pagador são obrigatórios na licença.")

        return {
            "cpfCnpj": cpf_cnpj,
            "tipoPessoa": tipo_pessoa,
            "nome": str(nome)[:100],
            "endereco": str(endereco)[:80],
            "cidade": str(cidade)[:60],
            "uf": str(uf)[:2].upper(),
            "cep": cep,
        }

    async def _ensure_license_pagador(self, license_row: dict[str, Any]) -> dict[str, Any]:
        try:
            enriched = await enrich_license_pagador(license_row, required=True)
        except CnpjLookupError as exc:
            raise BillingError(str(exc)) from exc

        patch = {
            key: enriched[key]
            for key in (
                "pagador_nome",
                "pagador_endereco",
                "pagador_cidade",
                "pagador_uf",
                "pagador_cep",
                "condominio_nome",
                "cnpj",
            )
            if enriched.get(key) and enriched.get(key) != license_row.get(key)
        }
        merged = {**license_row, **enriched}
        if patch:
            pagador_patch = {k: v for k, v in patch.items() if k.startswith("pagador_")}
            other_patch = {k: v for k, v in patch.items() if not k.startswith("pagador_")}
            if other_patch:
                await self._rest_patch_license(str(enriched["license_key"]), other_patch)
                merged.update(other_patch)
            if pagador_patch:
                try:
                    await self._rest_patch_license(str(enriched["license_key"]), pagador_patch)
                    merged.update(pagador_patch)
                except BillingError as exc:
                    if "PGRST204" not in str(exc) and "pagador_" not in str(exc):
                        raise
        return merged

    async def _fetch_license(self, license_key: str) -> dict[str, Any]:
        rows = await self._rest_get(
            LICENSES_TABLE,
            {"select": "*", "license_key": f"eq.{license_key}", "limit": "1"},
        )
        if not rows:
            raise BillingError(f"Licença '{license_key}' não encontrada.")
        return rows[0]

    async def _ensure_no_open_charge(self, license_key: str, charge_type: str) -> None:
        rows = await self._rest_get(
            BILLING_TABLE,
            {
                "select": "id,status,charge_type",
                "license_key": f"eq.{license_key}",
                "charge_type": f"eq.{charge_type}",
                "status": "eq.EMITIDA",
                "limit": "1",
            },
        )
        if rows:
            raise BillingError(
                f"Já existe cobrança {charge_type} em aberto para esta licença. "
                "Use Sync ou aguarde pagamento antes de emitir outra."
            )

    async def _fetch_charge_by_id(self, charge_id: str) -> dict[str, Any]:
        rows = await self._rest_get(
            BILLING_TABLE,
            {"select": "*", "id": f"eq.{charge_id}", "limit": "1"},
        )
        if not rows:
            raise BillingError("Cobrança não encontrada.")
        return rows[0]

    async def _fetch_charge_by_codigo(self, codigo: str) -> dict[str, Any] | None:
        rows = await self._rest_get(
            BILLING_TABLE,
            {"select": "*", "codigo_solicitacao": f"eq.{codigo}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def _fetch_charge_by_seu_numero(self, seu_numero: str) -> dict[str, Any] | None:
        rows = await self._rest_get(
            BILLING_TABLE,
            {"select": "*", "seu_numero": f"eq.{seu_numero}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def _rest_patch_license(self, license_key: str, data: dict[str, Any]) -> list[dict[str, Any]]:
        url = f"{self.supabase.base_url}/rest/v1/{LICENSES_TABLE}"
        headers = {**self.supabase.headers, "Prefer": "return=representation"}
        params = {"license_key": f"eq.{license_key}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.patch(url, headers=headers, params=params, json=data)
            response.raise_for_status()
            return response.json()

    async def _rest_get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        url = f"{self.supabase.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=self.supabase.headers, params=params)
            if response.status_code == 404:
                if table == BILLING_TABLE:
                    raise BillingError(
                        "Tabela billing_charges não existe. Execute migrations/20260609000000_billing_charges.sql"
                    )
                response.raise_for_status()
            response.raise_for_status()
            return response.json()

    async def _rest_post(self, table: str, data: dict[str, Any]) -> list[dict[str, Any]]:
        url = f"{self.supabase.base_url}/rest/v1/{table}"
        headers = {**self.supabase.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=data)
            if response.status_code == 404 or (
                response.status_code == 400 and "billing_charges" in response.text
            ):
                raise BillingError(
                    "Tabela billing_charges não existe. Execute migrations/20260609000000_billing_charges.sql"
                )
            if response.status_code == 409:
                raise BillingError("seuNumero já utilizado. Tente novamente ou sincronize cobranças pendentes.")
            response.raise_for_status()
            return response.json()

    async def _rest_patch(
        self,
        table: str,
        row_id: str,
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        url = f"{self.supabase.base_url}/rest/v1/{table}"
        headers = {**self.supabase.headers, "Prefer": "return=representation"}
        params = {"id": f"eq.{row_id}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.patch(url, headers=headers, params=params, json=data)
            response.raise_for_status()
            return response.json()
