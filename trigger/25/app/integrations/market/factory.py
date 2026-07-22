from app.config import Settings, get_settings
from app.core.exceptions import MarketDataError
from app.core.logging import get_logger
from app.integrations.market.base import MarketDataProvider
from app.integrations.market.frankfurter_provider import FrankfurterProvider
from app.integrations.market.yahoo_provider import YahooFinanceProvider

logger = get_logger(__name__)


class MarketProviderFactory:
    """Factory Pattern — create market data providers by name.

    Register a new provider here and expose it through the catalog to extend
    coverage without touching the service layer.
    """

    _registry: dict[str, type[MarketDataProvider]] = {
        "frankfurter": FrankfurterProvider,
        "yahoo": YahooFinanceProvider,
    }

    @classmethod
    def create(cls, name: str, settings: Settings | None = None) -> MarketDataProvider:
        cfg = settings or get_settings()
        provider_cls = cls._registry.get(name)
        if provider_cls is None:
            raise MarketDataError(f"Unknown market provider: {name}")
        logger.info("market_provider_selected", provider=name)
        return provider_cls(cfg)

    @classmethod
    def available(cls) -> list[str]:
        return list(cls._registry)
