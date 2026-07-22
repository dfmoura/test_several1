import re
import unicodedata
from dataclasses import dataclass, field

from app.schemas.market import AssetCategory


@dataclass(frozen=True)
class Asset:
    """Static description of a tradable asset and how to reach it.

    Adding coverage is intentionally cheap: append one entry here and the
    resolver, cache and prompt injection pick it up automatically.
    """

    key: str
    name: str
    category: AssetCategory
    provider: str
    symbol: str
    aliases: tuple[str, ...] = field(default_factory=tuple)


# Currencies use Frankfurter (ECB reference rates, free, no key). The quote
# currency is resolved at runtime from settings.market_base_currency, so the
# symbol here is just the foreign ISO code.
_CURRENCIES: tuple[Asset, ...] = (
    Asset("usd", "Dólar", AssetCategory.CURRENCY, "frankfurter", "USD",
          ("dolar", "dólar", "dolares", "dólares", "usd", "us$")),
    Asset("eur", "Euro", AssetCategory.CURRENCY, "frankfurter", "EUR",
          ("euro", "euros", "eur")),
    Asset("gbp", "Libra", AssetCategory.CURRENCY, "frankfurter", "GBP",
          ("libra", "libras", "gbp", "esterlina")),
    Asset("jpy", "Iene", AssetCategory.CURRENCY, "frankfurter", "JPY",
          ("iene", "ienes", "jpy")),
    Asset("chf", "Franco suíço", AssetCategory.CURRENCY, "frankfurter", "CHF",
          ("franco suico", "franco suíço", "chf")),
    Asset("cad", "Dólar canadense", AssetCategory.CURRENCY, "frankfurter", "CAD",
          ("dolar canadense", "cad")),
    Asset("aud", "Dólar australiano", AssetCategory.CURRENCY, "frankfurter", "AUD",
          ("dolar australiano", "aud")),
    Asset("cny", "Yuan", AssetCategory.CURRENCY, "frankfurter", "CNY",
          ("yuan", "renminbi", "cny")),
)

# Commodity futures + crypto use Yahoo Finance (free, no key). "=F" symbols are
# the front-month futures contracts.
_COMMODITIES: tuple[Asset, ...] = (
    Asset("gold", "Ouro (futuro)", AssetCategory.FUTURE, "yahoo", "GC=F",
          ("ouro", "gold")),
    Asset("silver", "Prata (futuro)", AssetCategory.FUTURE, "yahoo", "SI=F",
          ("prata", "silver")),
    Asset("copper", "Cobre (futuro)", AssetCategory.FUTURE, "yahoo", "HG=F",
          ("cobre", "copper")),
    Asset("wti", "Petróleo WTI (futuro)", AssetCategory.FUTURE, "yahoo", "CL=F",
          ("petroleo", "petróleo", "wti", "crude", "oil")),
    Asset("brent", "Petróleo Brent (futuro)", AssetCategory.FUTURE, "yahoo", "BZ=F",
          ("brent",)),
    Asset("natgas", "Gás natural (futuro)", AssetCategory.FUTURE, "yahoo", "NG=F",
          ("gas natural", "gás natural", "natural gas")),
    Asset("corn", "Milho (futuro)", AssetCategory.FUTURE, "yahoo", "ZC=F",
          ("milho", "corn")),
    Asset("soybean", "Soja (futuro)", AssetCategory.FUTURE, "yahoo", "ZS=F",
          ("soja", "soybean")),
    Asset("coffee", "Café (futuro)", AssetCategory.FUTURE, "yahoo", "KC=F",
          ("cafe", "café", "coffee")),
    Asset("sugar", "Açúcar (futuro)", AssetCategory.FUTURE, "yahoo", "SB=F",
          ("acucar", "açúcar", "sugar")),
    Asset("wheat", "Trigo (futuro)", AssetCategory.FUTURE, "yahoo", "ZW=F",
          ("trigo", "wheat")),
    Asset("cattle", "Boi gordo (futuro)", AssetCategory.FUTURE, "yahoo", "LE=F",
          ("boi gordo", "boi", "cattle")),
)

_CRYPTO: tuple[Asset, ...] = (
    Asset("bitcoin", "Bitcoin", AssetCategory.CRYPTO, "yahoo", "BTC-USD",
          ("bitcoin", "btc")),
    Asset("ethereum", "Ethereum", AssetCategory.CRYPTO, "yahoo", "ETH-USD",
          ("ethereum", "ether", "eth")),
)

ASSET_CATALOG: tuple[Asset, ...] = _CURRENCIES + _COMMODITIES + _CRYPTO

_BY_KEY: dict[str, Asset] = {asset.key: asset for asset in ASSET_CATALOG}


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def get_asset(key: str) -> Asset | None:
    return _BY_KEY.get(key.lower())


def all_assets() -> tuple[Asset, ...]:
    return ASSET_CATALOG


def detect_assets(text: str, *, limit: int = 4) -> list[Asset]:
    """Return catalog assets mentioned in free text (accent-insensitive).

    Single-word aliases match on word boundaries to avoid false positives;
    multi-word aliases match as substrings.
    """
    haystack = _normalize(text)
    if not haystack:
        return []

    matched: list[Asset] = []
    for asset in ASSET_CATALOG:
        for alias in asset.aliases:
            needle = _normalize(alias)
            if " " in needle:
                hit = needle in haystack
            else:
                hit = re.search(rf"\b{re.escape(needle)}\b", haystack) is not None
            if hit:
                matched.append(asset)
                break
        if len(matched) >= limit:
            break
    return matched
