from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx

# Cotação mensal do Bitcoin em BRL. Fonte primária: Binance (par BTCBRL, klines
# mensais com histórico completo, gratuito e sem chave). Fallback: CoinGecko
# (gratuito, mas o plano público só cobre os últimos 365 dias).
BINANCE_KLINES_URLS = (
    "https://api.binance.com/api/v3/klines",
    "https://data-api.binance.vision/api/v3/klines",
)
COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range"
CACHE_TTL = timedelta(hours=6)


@dataclass(frozen=True)
class BitcoinMonthlyPrices:
    """Preço de fechamento mensal do Bitcoin em BRL, chave YYYY-MM."""

    prices: dict[str, Decimal]

    @property
    def available(self) -> bool:
        return len(self.prices) >= 2

    def latest_return_pct(self) -> float:
        periods = sorted(self.prices)
        if len(periods) < 2:
            return 0.0
        last = self.prices[periods[-1]]
        prev = self.prices[periods[-2]]
        if prev <= 0:
            return 0.0
        return float((last / prev - Decimal("1")) * Decimal("100"))


class BitcoinBenchmarkProvider:
    """Preços mensais do Bitcoin (BRL) para o benchmark da carteira."""

    def __init__(self) -> None:
        self._cache: dict[tuple[str, str], tuple[datetime, BitcoinMonthlyPrices]] = {}

    async def get_monthly_prices(
        self,
        start_period: str,
        end_period: str,
    ) -> BitcoinMonthlyPrices:
        cache_key = (start_period, end_period)
        cached = self._cache.get(cache_key)
        now = datetime.now(timezone.utc)
        if cached and now - cached[0] < CACHE_TTL:
            return cached[1]

        start = self._period_to_date(start_period, day=1) - timedelta(days=45)
        end = self._period_to_date(end_period, day=1) + timedelta(days=40)

        prices = await self._fetch_binance(start, end)
        if len(prices) < 2:
            coingecko = await self._fetch_coingecko(start, end)
            # Mantém o histórico da Binance e completa lacunas recentes.
            coingecko.update(prices)
            prices = coingecko

        result = BitcoinMonthlyPrices(prices=prices)
        self._cache[cache_key] = (now, result)
        return result

    async def _fetch_binance(self, start: date, end: date) -> dict[str, Decimal]:
        start_ms = int(datetime(start.year, start.month, start.day, tzinfo=timezone.utc).timestamp() * 1000)
        end_ms = int(datetime(end.year, end.month, end.day, tzinfo=timezone.utc).timestamp() * 1000)
        params = {
            "symbol": "BTCBRL",
            "interval": "1M",
            "startTime": start_ms,
            "endTime": end_ms,
            "limit": 1000,
        }
        for url in BINANCE_KLINES_URLS:
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.get(url, params=params)
                    if response.status_code != 200:
                        continue
                    payload = response.json()
                    if not isinstance(payload, list):
                        continue
                    prices: dict[str, Decimal] = {}
                    for kline in payload:
                        # kline: [openTime, open, high, low, close, ...]
                        if not isinstance(kline, list) or len(kline) < 5:
                            continue
                        open_time_ms, close = kline[0], kline[4]
                        if close is None:
                            continue
                        moment = datetime.fromtimestamp(int(open_time_ms) / 1000, tz=timezone.utc)
                        prices[moment.strftime("%Y-%m")] = Decimal(str(close))
                    if len(prices) >= 2:
                        return prices
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, InvalidOperation):
                continue
        return {}

    async def _fetch_coingecko(self, start: date, end: date) -> dict[str, Decimal]:
        params = {
            "vs_currency": "brl",
            "from": int(datetime(start.year, start.month, start.day, tzinfo=timezone.utc).timestamp()),
            "to": int(datetime(end.year, end.month, end.day, tzinfo=timezone.utc).timestamp()),
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(COINGECKO_URL, params=params)
                if response.status_code != 200:
                    return {}
                payload = response.json()
                series = payload.get("prices") or []
                # Usa o último preço observado em cada mês (fechamento mensal).
                prices: dict[str, Decimal] = {}
                for entry in series:
                    if not isinstance(entry, list) or len(entry) < 2:
                        continue
                    ts_ms, value = entry[0], entry[1]
                    if value is None:
                        continue
                    moment = datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc)
                    period = moment.strftime("%Y-%m")
                    prices[period] = Decimal(str(value))
                return prices
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, InvalidOperation):
            return {}

    @staticmethod
    def _period_to_date(period: str, *, day: int) -> date:
        year, month = period.split("-")
        return date(int(year), int(month), day)
