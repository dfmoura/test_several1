from fastapi import APIRouter, Depends

from app.api.deps import get_market_service
from app.integrations.market import all_assets
from app.schemas.market import AssetOut, MarketQuoteOut
from app.services.market_service import MarketService

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/assets", response_model=list[AssetOut])
async def list_assets() -> list[AssetOut]:
    return [
        AssetOut(
            key=asset.key,
            name=asset.name,
            category=asset.category,
            provider=asset.provider,
            symbol=asset.symbol,
        )
        for asset in all_assets()
    ]


@router.get("/quote/{asset_key}", response_model=MarketQuoteOut)
async def get_quote(
    asset_key: str,
    market: MarketService = Depends(get_market_service),
) -> MarketQuoteOut:
    quote = await market.get_quote_by_key(asset_key)
    return MarketQuoteOut.model_validate(quote, from_attributes=True)
