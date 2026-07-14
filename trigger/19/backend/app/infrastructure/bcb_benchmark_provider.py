from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx

from app.domain.savings_comparator import (
    DEFAULT_SAVINGS_MONTHLY_RATE,
    DEFAULT_SELIC_MONTHLY_RATE,
)

# Séries SGS do Banco Central (valores em % a.m.).
SERIES_SELIC = 4391  # Selic acumulada no mês
SERIES_SAVINGS = 196  # Rentabilidade mensal da poupança

BCB_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
CACHE_TTL = timedelta(hours=6)


@dataclass(frozen=True)
class BenchmarkMonthlyRates:
    """Taxas mensais como fração (ex.: 0.0112 = 1,12% a.m.), chave YYYY-MM."""

    savings: dict[str, Decimal]
    selic: dict[str, Decimal]

    def latest_pct(self, series: dict[str, Decimal], default: Decimal) -> float:
        if not series:
            return float(default * Decimal("100"))
        period = max(series)
        return float(series[period] * Decimal("100"))


class BcbBenchmarkProvider:
    """Taxas mensais de poupança e Selic via API SGS do Banco Central."""

    def __init__(self) -> None:
        self._cache: dict[tuple[str, str], tuple[datetime, BenchmarkMonthlyRates]] = {}

    async def get_monthly_rates(
        self,
        start_period: str,
        end_period: str,
    ) -> BenchmarkMonthlyRates:
        cache_key = (start_period, end_period)
        cached = self._cache.get(cache_key)
        now = datetime.now(timezone.utc)
        if cached and now - cached[0] < CACHE_TTL:
            return cached[1]

        start = self._period_to_date(start_period, day=1)
        # Margem para o BCB publicar o mês corrente e o anterior.
        end = self._period_to_date(end_period, day=1) + timedelta(days=40)
        start = start - timedelta(days=40)

        data_inicial = start.strftime("%d/%m/%Y")
        data_final = end.strftime("%d/%m/%Y")

        savings, selic = await self._fetch_all(data_inicial, data_final)
        rates = BenchmarkMonthlyRates(
            savings=savings or self._constant_series(start_period, end_period, DEFAULT_SAVINGS_MONTHLY_RATE),
            selic=selic or self._constant_series(start_period, end_period, DEFAULT_SELIC_MONTHLY_RATE),
        )
        # Preenche meses sem publicação com a última taxa conhecida (ou default).
        rates = BenchmarkMonthlyRates(
            savings=self._fill_gaps(rates.savings, start_period, end_period, DEFAULT_SAVINGS_MONTHLY_RATE),
            selic=self._fill_gaps(rates.selic, start_period, end_period, DEFAULT_SELIC_MONTHLY_RATE),
        )
        self._cache[cache_key] = (now, rates)
        return rates

    async def _fetch_all(
        self,
        data_inicial: str,
        data_final: str,
    ) -> tuple[dict[str, Decimal], dict[str, Decimal]]:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                savings = await self._fetch_series(client, SERIES_SAVINGS, data_inicial, data_final)
                selic = await self._fetch_series(client, SERIES_SELIC, data_inicial, data_final)
            return savings, selic
        except Exception:
            return {}, {}

    async def _fetch_series(
        self,
        client: httpx.AsyncClient,
        code: int,
        data_inicial: str,
        data_final: str,
    ) -> dict[str, Decimal]:
        url = BCB_BASE_URL.format(code=code)
        params = {
            "formato": "json",
            "dataInicial": data_inicial,
            "dataFinal": data_final,
        }
        try:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return {}
            payload = response.json()
            if not isinstance(payload, list):
                return {}
            rates: dict[str, Decimal] = {}
            for item in payload:
                period = self._parse_period(item.get("data"))
                rate = self._parse_rate_pct(item.get("valor"))
                if period is None or rate is None:
                    continue
                rates[period] = rate
            return rates
        except Exception:
            return {}

    @staticmethod
    def _parse_period(raw: object) -> str | None:
        if not isinstance(raw, str) or not raw:
            return None
        try:
            day, month, year = raw.split("/")
            return f"{int(year):04d}-{int(month):02d}"
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _parse_rate_pct(raw: object) -> Decimal | None:
        if raw is None:
            return None
        try:
            # API devolve percentual (ex.: "1.12" = 1,12% a.m.).
            return (Decimal(str(raw).replace(",", ".")) / Decimal("100")).quantize(
                Decimal("0.0000001")
            )
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _period_to_date(period: str, *, day: int) -> date:
        year, month = period.split("-")
        return date(int(year), int(month), day)

    @staticmethod
    def _constant_series(start_period: str, end_period: str, rate: Decimal) -> dict[str, Decimal]:
        periods = BcbBenchmarkProvider._iter_periods(start_period, end_period)
        return {period: rate for period in periods}

    @staticmethod
    def _fill_gaps(
        rates: dict[str, Decimal],
        start_period: str,
        end_period: str,
        default: Decimal,
    ) -> dict[str, Decimal]:
        prior = [period for period in rates if period < start_period]
        last = rates[max(prior)] if prior else default
        filled: dict[str, Decimal] = {}
        for period in BcbBenchmarkProvider._iter_periods(start_period, end_period):
            if period in rates:
                last = rates[period]
            filled[period] = last
        return filled

    @staticmethod
    def _iter_periods(start_period: str, end_period: str) -> list[str]:
        start = BcbBenchmarkProvider._period_to_date(start_period, day=1)
        end = BcbBenchmarkProvider._period_to_date(end_period, day=1)
        periods: list[str] = []
        cursor = start
        while cursor <= end:
            periods.append(cursor.strftime("%Y-%m"))
            if cursor.month == 12:
                cursor = date(cursor.year + 1, 1, 1)
            else:
                cursor = date(cursor.year, cursor.month + 1, 1)
        return periods
