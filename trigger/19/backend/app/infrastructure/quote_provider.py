from __future__ import annotations

from decimal import Decimal

import httpx

from app.core.config import get_settings


class QuoteProvider:
    """Cotação spot via brapi.dev (gratuito) com fallback Yahoo Finance."""

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
