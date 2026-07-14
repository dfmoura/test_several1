from __future__ import annotations

import base64
import json
import re
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

# Alinhado à coluna market_dividends.value_cash (Numeric(18, 8))
VALUE_CASH_QUANTUM = Decimal("0.00000001")

import httpx

from app.domain.market_models import CompanyIdentity, DividendEvent
from app.domain.ticker_type import normalize_ticker, ticker_type_stock

BASE_URL = (
    "https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall"
)


class B3DividendProvider:
    """Proventos e identidade da empresa via listedCompaniesProxy (padrão trigger/16)."""

    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    async def resolve_company(self, ticker: str) -> CompanyIdentity:
        symbol = normalize_ticker(ticker)
        payload = await self._get_initial_companies(symbol)
        results = payload.get("results") or []
        if not results:
            raise ValueError(f"Ticker '{symbol}' não encontrado na B3.")

        row = results[0]
        trading_name = re.sub(r"[/.]", "", str(row.get("tradingName") or "")).strip()
        company_name = str(row.get("companyName") or trading_name or symbol).strip()
        if not trading_name:
            raise ValueError(f"Ticker '{symbol}' sem tradingName na B3.")

        return CompanyIdentity(
            ticker=symbol,
            company_name=company_name,
            trading_name=trading_name,
            type_stock=ticker_type_stock(symbol),
        )

    async def fetch_dividends(
        self,
        trading_name: str,
        type_stock: str | None,
    ) -> list[DividendEvent]:
        page = 1
        page_size = 100
        total_pages = 1
        events: list[DividendEvent] = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while page <= total_pages:
                params = {
                    "language": "pt-br",
                    "pageNumber": page,
                    "pageSize": page_size,
                    "tradingName": trading_name,
                }
                payload = await self._company_call(client, "GetListedCashDividends", params)
                page_meta = payload.get("page") or {}
                total_pages = int(page_meta.get("totalPages") or 1)
                for item in payload.get("results") or []:
                    event = self._parse_event(item)
                    if event is None:
                        continue
                    if type_stock and event.type_stock != type_stock:
                        continue
                    events.append(event)
                page += 1

        return self._dedupe(events)

    async def _get_initial_companies(self, company: str) -> dict:
        params = {
            "language": "pt-br",
            "pageNumber": 1,
            "pageSize": 20,
            "company": company,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            return await self._company_call(client, "GetInitialCompanies", params)

    async def _company_call(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        params: dict,
    ) -> dict:
        token = base64.b64encode(
            json.dumps(params, separators=(",", ":")).encode("utf-8")
        ).decode("ascii")
        url = f"{BASE_URL}/{endpoint}/{token}"
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

    def _parse_event(self, item: dict) -> DividendEvent | None:
        value_cash = self._parse_br_decimal(item.get("valueCash"))
        if value_cash is None:
            return None

        ex_date = self._parse_date(
            item.get("lastDateTimePriorEx") or item.get("lastDatePriorEx")
        )
        if ex_date is None:
            return None

        approval = self._parse_date(item.get("dateApproval"))
        closing = self._parse_br_decimal(item.get("closingPricePriorExDate"))
        return DividendEvent(
            ex_date=ex_date,
            approval_date=approval,
            corporate_action=str(item.get("corporateAction") or "").strip() or "PROVENTO",
            type_stock=str(item.get("typeStock") or "").strip().upper(),
            value_cash=self._quantize_value_cash(value_cash),
            closing_price_prior_ex=closing,
        )

    @staticmethod
    def _dedupe(events: list[DividendEvent]) -> list[DividendEvent]:
        seen: set[tuple] = set()
        unique: list[DividendEvent] = []
        for event in events:
            value_cash = B3DividendProvider._quantize_value_cash(event.value_cash)
            key = (
                event.ex_date,
                event.corporate_action,
                event.type_stock,
                value_cash,
            )
            if key in seen:
                continue
            seen.add(key)
            if event.value_cash != value_cash:
                event.value_cash = value_cash
            unique.append(event)
        unique.sort(key=lambda e: e.ex_date)
        return unique

    @staticmethod
    def _quantize_value_cash(value: Decimal) -> Decimal:
        return value.quantize(VALUE_CASH_QUANTUM, rounding=ROUND_HALF_UP)

    @staticmethod
    def _parse_br_decimal(value: object) -> Decimal | None:
        if value is None or value == "":
            return None
        if isinstance(value, (int, float, Decimal)):
            try:
                return Decimal(str(value))
            except InvalidOperation:
                return None
        text = str(value).strip()
        if "," in text:
            text = text.replace(".", "").replace(",", ".")
        try:
            return Decimal(text)
        except InvalidOperation:
            return None

    @staticmethod
    def _parse_date(value: object) -> date | None:
        if value is None or value == "":
            return None
        text = str(value).strip()
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(text[:19] if "T" in text else text, fmt).date()
            except ValueError:
                continue
        return None
