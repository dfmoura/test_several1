from app.config import Settings, get_settings
from app.core.exceptions import MarketDataError
from app.core.logging import get_logger
from app.integrations.market.base import MarketDataProvider
from app.integrations.market.catalog import Asset, detect_assets, get_asset
from app.integrations.market.factory import MarketProviderFactory
from app.memory.redis_client import RedisClient, get_redis
from app.schemas.market import MarketQuote

logger = get_logger(__name__)


class MarketService:
    """Orchestrates market data: catalog → cached provider fetch → prompt block.

    Providers are created lazily and reused. A short Redis TTL keeps us well
    inside the free tiers' rate limits; if Redis is unavailable we simply fetch
    live (fail-open) instead of breaking the reply.
    """

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        redis_client: RedisClient | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._redis = redis_client or get_redis()
        self._providers: dict[str, MarketDataProvider] = {}

    def _provider(self, name: str) -> MarketDataProvider:
        if name not in self._providers:
            self._providers[name] = MarketProviderFactory.create(name, self._settings)
        return self._providers[name]

    def _cache_key(self, asset: Asset) -> str:
        base = self._settings.market_base_currency.upper()
        return f"market:{asset.provider}:{asset.symbol}:{base}"

    async def get_quote(self, asset: Asset) -> MarketQuote:
        key = self._cache_key(asset)

        try:
            cached = await self._redis.get_json(key)
        except Exception:
            cached = None
        if cached:
            return MarketQuote.model_validate(cached)

        quote = await self._provider(asset.provider).fetch(asset)

        try:
            await self._redis.set_json(
                key,
                quote.model_dump(mode="json"),
                ttl=self._settings.market_cache_ttl,
            )
        except Exception:
            logger.debug("market_cache_write_skipped", key=key)

        return quote

    async def get_quote_by_key(self, asset_key: str) -> MarketQuote:
        asset = get_asset(asset_key)
        if asset is None:
            raise MarketDataError(
                f"Unknown asset: {asset_key}",
                details={"asset_key": asset_key},
            )
        return await self.get_quote(asset)

    async def quotes_for_text(self, text: str) -> list[MarketQuote]:
        """Detect assets mentioned in text and return their quotes (fail-open)."""
        assets = detect_assets(text, limit=self._settings.market_max_assets)
        quotes: list[MarketQuote] = []
        for asset in assets:
            try:
                quotes.append(await self.get_quote(asset))
            except Exception:
                logger.warning("market_quote_skipped", asset=asset.key)
        return quotes

    @staticmethod
    def format_for_prompt(quotes: list[MarketQuote]) -> str:
        if not quotes:
            return ""
        lines = "\n".join(f"- {q.to_prompt_line()}" for q in quotes)
        return (
            "Cotações de mercado agora (dados reais, podem ter atraso de alguns "
            "minutos). Use SOMENTE estes valores se o usuário perguntar sobre "
            "preços/câmbio; não invente cotações:\n"
            f"{lines}"
        )

    async def close(self) -> None:
        for provider in self._providers.values():
            await provider.close()
        self._providers.clear()
