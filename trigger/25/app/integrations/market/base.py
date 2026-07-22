from typing import Protocol, runtime_checkable

from app.integrations.market.catalog import Asset
from app.schemas.market import MarketQuote


@runtime_checkable
class MarketDataProvider(Protocol):
    """Abstract market data provider interface.

    Every provider normalizes its upstream payload into a MarketQuote so the
    rest of the system never depends on a specific vendor.
    """

    name: str

    async def fetch(self, asset: Asset) -> MarketQuote: ...

    async def close(self) -> None: ...
