from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import httpx

from app.core.config import get_settings
from app.domain.market_models import IntradayPricePoint
from app.domain.ticker_type import normalize_ticker

SAO_PAULO = ZoneInfo("America/Sao_Paulo")


class QuoteProvider:
    """Cotação spot e intraday via brapi.dev (gratuito) com fallback Yahoo Finance."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def get_quotes(self, tickers: list[str]) -> dict[str, Decimal]:
        if not tickers:
            return {}

        unique = sorted(set(tickers))
        quotes: dict[str, Decimal] = {}

        brapi_quotes = await self._fetch_brapi(unique)
        quotes.update(brapi_quotes)

        missing = [t for t in unique if t not in quotes]
        if missing:
            yahoo_quotes = await self._fetch_yahoo(missing)
            quotes.update(yahoo_quotes)

        return quotes

    async def get_intraday(self, ticker: str) -> list[IntradayPricePoint]:
        symbol = normalize_ticker(ticker)
        points = await self._fetch_brapi_intraday(symbol)
        if not points:
            points = await self._fetch_yahoo_intraday(symbol)
        return points

    async def _fetch_brapi(self, tickers: list[str]) -> dict[str, Decimal]:
        result: dict[str, Decimal] = {}
        chunk_size = self.settings.brapi_chunk_size
        headers = {}
        if self.settings.brapi_token:
            headers["Authorization"] = f"Bearer {self.settings.brapi_token}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            for i in range(0, len(tickers), chunk_size):
                chunk = ",".join(tickers[i : i + chunk_size])
                url = f"https://brapi.dev/api/quote/{chunk}"
                try:
                    response = await client.get(url, headers=headers)
                    if response.status_code != 200:
                        continue
                    payload = response.json()
                    for item in payload.get("results", []):
                        symbol = item.get("symbol")
                        price = item.get("regularMarketPrice")
                        if symbol and price is not None:
                            result[symbol] = Decimal(str(price))
                except httpx.HTTPError:
                    continue
        return result

    async def _fetch_yahoo(self, tickers: list[str]) -> dict[str, Decimal]:
        result: dict[str, Decimal] = {}
        async with httpx.AsyncClient(timeout=20.0) as client:
            for ticker in tickers:
                symbol = f"{ticker}.SA"
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                try:
                    response = await client.get(
                        url,
                        headers={"User-Agent": "Mozilla/5.0"},
                    )
                    if response.status_code != 200:
                        continue
                    payload = response.json()
                    meta = payload["chart"]["result"][0]["meta"]
                    price = meta.get("regularMarketPrice")
                    if price is not None:
                        result[ticker] = Decimal(str(price))
                except (httpx.HTTPError, KeyError, IndexError, TypeError):
                    continue
        return result

    async def _fetch_brapi_intraday(self, ticker: str) -> list[IntradayPricePoint]:
        headers = {}
        if self.settings.brapi_token:
            headers["Authorization"] = f"Bearer {self.settings.brapi_token}"

        url = f"https://brapi.dev/api/quote/{ticker}"
        params = {"range": "1d", "interval": "5m"}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code != 200:
                    return []
                payload = response.json()
                results = payload.get("results") or []
                if not results:
                    return []
                historical = results[0].get("historicalDataPrice") or []
                points: list[IntradayPricePoint] = []
                today = datetime.now(SAO_PAULO).date()
                for item in historical:
                    ts = item.get("date")
                    close = item.get("close")
                    if ts is None or close is None:
                        continue
                    traded_at = datetime.fromtimestamp(int(ts), tz=timezone.utc).astimezone(
                        SAO_PAULO
                    )
                    if traded_at.date() != today:
                        continue
                    points.append(
                        IntradayPricePoint(
                            traded_at=traded_at.replace(tzinfo=None),
                            price=Decimal(str(close)),
                        )
                    )
                points.sort(key=lambda p: p.traded_at)
                return points
        except (httpx.HTTPError, KeyError, TypeError, ValueError):
            return []

    async def _fetch_yahoo_intraday(self, ticker: str) -> list[IntradayPricePoint]:
        symbol = f"{ticker}.SA"
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {"interval": "5m", "range": "1d"}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    url,
                    params=params,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                if response.status_code != 200:
                    return []
                payload = response.json()
                result = payload["chart"]["result"][0]
                timestamps = result.get("timestamp") or []
                closes = result["indicators"]["quote"][0].get("close") or []
                points: list[IntradayPricePoint] = []
                today = datetime.now(SAO_PAULO).date()
                for ts, close in zip(timestamps, closes):
                    if close is None:
                        continue
                    traded_at = datetime.fromtimestamp(int(ts), tz=timezone.utc).astimezone(
                        SAO_PAULO
                    )
                    if traded_at.date() != today:
                        continue
                    points.append(
                        IntradayPricePoint(
                            traded_at=traded_at.replace(tzinfo=None),
                            price=Decimal(str(close)),
                        )
                    )
                points.sort(key=lambda p: p.traded_at)
                return points
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            return []

