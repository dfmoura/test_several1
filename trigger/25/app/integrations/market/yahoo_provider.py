from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.core.exceptions import MarketDataError
from app.core.logging import get_logger
from app.integrations.market.catalog import Asset
from app.schemas.market import MarketQuote

logger = get_logger(__name__)


class YahooFinanceProvider:
    """Commodities, futures and crypto from Yahoo Finance (free, no key).

    Uses the public chart endpoint, whose `meta` block carries the last price,
    previous close and quote currency. Data is typically delayed ~15 min.
    """

    name = "yahoo"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.yahoo_base_url.rstrip("/"),
            timeout=settings.market_http_timeout,
            headers={"User-Agent": "Mozilla/5.0 (compatible; whatsapp-ai-agent/1.0)"},
        )

    async def fetch(self, asset: Asset) -> MarketQuote:
        try:
            response = await self._client.get(
                f"/v8/finance/chart/{asset.symbol}",
                params={"interval": "1d", "range": "1d"},
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.error("yahoo_error", symbol=asset.symbol, error=str(exc))
            raise MarketDataError(f"Yahoo request failed: {exc}") from exc

        chart = data.get("chart") or {}
        results = chart.get("result") or []
        if not results:
            raise MarketDataError(
                f"Yahoo returned no data for {asset.symbol}",
                details={"symbol": asset.symbol},
            )

        meta = results[0].get("meta") or {}
        price = meta.get("regularMarketPrice")
        if price is None:
            raise MarketDataError(
                f"Yahoo has no price for {asset.symbol}",
                details={"symbol": asset.symbol},
            )
        price = float(price)

        previous = meta.get("chartPreviousClose") or meta.get("previousClose")
        previous = float(previous) if previous is not None else None

        change: float | None = None
        change_percent: float | None = None
        if previous:
            change = round(price - previous, 4)
            change_percent = round((change / previous) * 100, 2)

        as_of: datetime | None = None
        if ts := meta.get("regularMarketTime"):
            try:
                as_of = datetime.fromtimestamp(int(ts), tz=timezone.utc)
            except (ValueError, OSError):
                as_of = None

        return MarketQuote(
            asset_key=asset.key,
            name=asset.name,
            category=asset.category,
            symbol=asset.symbol,
            price=price,
            currency=str(meta.get("currency") or "USD").upper(),
            change=change,
            change_percent=change_percent,
            previous_close=previous,
            as_of=as_of,
            source="Yahoo Finance",
            delayed=True,
            raw={"exchange": meta.get("fullExchangeName")},
        )

    async def close(self) -> None:
        await self._client.aclose()
