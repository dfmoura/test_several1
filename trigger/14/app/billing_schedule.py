"""Agenda operacional de cobranças — priorização sem alterar emissão existente."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

RENEWAL_DAYS = 32
GRACE_DAYS = 7
DEFAULT_EMIT_AHEAD_DAYS = 21


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None

URGENCY_ORDER = {
    "expired": 0,
    "critical": 1,
    "due_soon": 2,
    "waiting": 3,
    "needs_initial": 4,
    "ok": 5,
}

ACTION_LABELS = {
    "emit_initial": "Emitir cobrança inicial",
    "follow_initial": "Aguardando pagamento (inicial)",
    "emit_monthly": "Emitir mensalidade",
    "follow_monthly": "Aguardando pagamento (mensalidade)",
    "ok": "Em dia",
    "inactive": "Licença inativa",
}


def format_date_br(d: date | None) -> str | None:
    if not d:
        return None
    return d.strftime("%d/%m/%Y")


def build_open_charge_index(charges: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, Any]]]:
    """license_key -> cobrança EMITIDA mais recente por tipo."""
    index: dict[str, dict[str, dict[str, Any]]] = {}
    for charge in charges:
        if str(charge.get("status") or "").upper() != "EMITIDA":
            continue
        key = str(charge.get("license_key") or "").strip().upper()
        if not key:
            continue
        charge_type = str(charge.get("charge_type") or "").upper()
        if charge_type not in ("INITIAL", "MONTHLY"):
            continue
        bucket = index.setdefault(key, {})
        existing = bucket.get(charge_type)
        if not existing or str(charge.get("created_at") or "") > str(existing.get("created_at") or ""):
            bucket[charge_type] = charge
    return {k: v for k, v in ((key, charges_by_type) for key, charges_by_type in index.items())}


def pick_open_charge(
    open_by_key: dict[str, dict[str, dict[str, Any]]],
    license_key: str,
    *,
    implantacao_paga: bool,
) -> dict[str, Any] | None:
    bucket = open_by_key.get(license_key.upper(), {})
    if not implantacao_paga:
        return bucket.get("INITIAL") or bucket.get("MONTHLY")
    return bucket.get("MONTHLY") or bucket.get("INITIAL")


def compute_schedule_item(
    license_row: dict[str, Any],
    *,
    open_charges: dict[str, dict[str, dict[str, Any]]],
    pricing: dict[str, tuple[float, float]],
    today: date | None = None,
    emit_ahead_days: int = DEFAULT_EMIT_AHEAD_DAYS,
) -> dict[str, Any]:
    today = today or date.today()
    emit_ahead_days = max(1, int(emit_ahead_days))

    license_key = str(license_row.get("license_key") or "").strip().upper()
    app_id = str(license_row.get("app_id") or "").strip().lower()
    implantacao_paga = bool(license_row.get("implantacao_paga"))
    ativa = license_row.get("ativa") is not False

    valido_ate = parse_date(license_row.get("valido_ate"))
    grace_until = valido_ate + timedelta(days=GRACE_DAYS) if valido_ate else None
    emit_recommended_by = (
        valido_ate - timedelta(days=emit_ahead_days) if valido_ate else None
    )

    days_until_expiry = (valido_ate - today).days if valido_ate else None
    days_until_grace_end = (grace_until - today).days if grace_until else None

    valor_impl, valor_mensal = pricing.get(app_id, (0.0, 0.0))
    open_charge = pick_open_charge(
        open_charges,
        license_key,
        implantacao_paga=implantacao_paga,
    )

    if not ativa:
        urgency = "ok"
        action = "inactive"
        charge_type_next = None
        estimated_value = None
        should_emit_now = False
    elif open_charge:
        urgency = "waiting"
        charge_type = str(open_charge.get("charge_type") or "").upper()
        action = "follow_initial" if charge_type == "INITIAL" else "follow_monthly"
        charge_type_next = charge_type
        estimated_value = round(float(open_charge.get("valor_nominal") or 0), 2)
        should_emit_now = False
    elif not implantacao_paga:
        urgency = "needs_initial"
        action = "emit_initial"
        charge_type_next = "INITIAL"
        estimated_value = round(valor_impl + valor_mensal, 2)
        should_emit_now = True
    elif grace_until and today > grace_until:
        urgency = "expired"
        action = "emit_monthly"
        charge_type_next = "MONTHLY"
        estimated_value = round(valor_mensal, 2)
        should_emit_now = True
    elif valido_ate and today > valido_ate:
        urgency = "critical"
        action = "emit_monthly"
        charge_type_next = "MONTHLY"
        estimated_value = round(valor_mensal, 2)
        should_emit_now = True
    elif valido_ate and days_until_expiry is not None and days_until_expiry <= 7:
        urgency = "critical"
        action = "emit_monthly"
        charge_type_next = "MONTHLY"
        estimated_value = round(valor_mensal, 2)
        should_emit_now = True
    elif emit_recommended_by and today >= emit_recommended_by:
        urgency = "due_soon"
        action = "emit_monthly"
        charge_type_next = "MONTHLY"
        estimated_value = round(valor_mensal, 2)
        should_emit_now = True
    else:
        urgency = "ok"
        action = "ok"
        charge_type_next = "MONTHLY"
        estimated_value = round(valor_mensal, 2)
        should_emit_now = False

    action_hint = ACTION_LABELS[action]
    if action == "ok" and emit_recommended_by and emit_recommended_by > today:
        action_hint = f"Em dia — emitir a partir de {format_date_br(emit_recommended_by)}"

    open_summary = None
    if open_charge:
        open_summary = {
            "id": open_charge.get("id"),
            "charge_type": open_charge.get("charge_type"),
            "status": open_charge.get("status"),
            "data_vencimento": open_charge.get("data_vencimento"),
            "valor_nominal": open_charge.get("valor_nominal"),
        }

    return {
        "license_key": license_key,
        "condominio_nome": license_row.get("condominio_nome") or license_row.get("pagador_nome"),
        "app_id": app_id or None,
        "implantacao_paga": implantacao_paga,
        "ativa": ativa,
        "valido_ate": valido_ate.isoformat() if valido_ate else None,
        "grace_until": grace_until.isoformat() if grace_until else None,
        "emit_recommended_by": emit_recommended_by.isoformat() if emit_recommended_by else None,
        "days_until_expiry": days_until_expiry,
        "days_until_grace_end": days_until_grace_end,
        "renewal_days": RENEWAL_DAYS,
        "urgency": urgency,
        "action": action,
        "action_label": action_hint,
        "should_emit_now": should_emit_now,
        "charge_type_next": charge_type_next,
        "estimated_value": estimated_value,
        "open_charge": open_summary,
    }


def build_billing_schedule(
    licenses: list[dict[str, Any]],
    open_charges: list[dict[str, Any]],
    pricing: dict[str, tuple[float, float]],
    *,
    today: date | None = None,
    emit_ahead_days: int = DEFAULT_EMIT_AHEAD_DAYS,
    include_ok: bool = True,
    only_active: bool = False,
) -> dict[str, Any]:
    today = today or date.today()
    open_index = build_open_charge_index(open_charges)

    items: list[dict[str, Any]] = []
    for row in licenses:
        if only_active and row.get("ativa") is False:
            continue
        item = compute_schedule_item(
            row,
            open_charges=open_index,
            pricing=pricing,
            today=today,
            emit_ahead_days=emit_ahead_days,
        )
        if not include_ok and item["urgency"] == "ok" and item["action"] == "ok":
            continue
        items.append(item)

    items.sort(
        key=lambda it: (
            URGENCY_ORDER.get(it["urgency"], 99),
            it["days_until_expiry"] if it["days_until_expiry"] is not None else 9999,
            it["license_key"],
        )
    )

    summary = {
        "total": len(items),
        "expired": sum(1 for it in items if it["urgency"] == "expired"),
        "critical": sum(1 for it in items if it["urgency"] == "critical"),
        "due_soon": sum(1 for it in items if it["urgency"] == "due_soon"),
        "waiting": sum(1 for it in items if it["urgency"] == "waiting"),
        "needs_initial": sum(1 for it in items if it["urgency"] == "needs_initial"),
        "ok": sum(1 for it in items if it["urgency"] == "ok"),
        "should_emit_now": sum(1 for it in items if it["should_emit_now"]),
    }

    return {
        "today": today.isoformat(),
        "emit_ahead_days": emit_ahead_days,
        "grace_days": GRACE_DAYS,
        "renewal_days": RENEWAL_DAYS,
        "summary": summary,
        "items": items,
    }
