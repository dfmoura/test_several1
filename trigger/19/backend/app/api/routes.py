from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.schemas import (
    DashboardResponse,
    ImportBatchResponse,
    ImportResponse,
    MarketDividendPointResponse,
    MarketPricePointResponse,
    MarketTickerDetailResponse,
    MarketTickerRequest,
    MarketTickerRowResponse,
    PortfolioComparisonResponse,
    PortfolioComparisonPointResponse,
    TickerCardResponse,
    TickerDetailResponse,
    TimelinePointResponse,
    decimal_to_float,
)
from app.application.market_service import MarketService
from app.application.portfolio_service import PortfolioService
from app.core.config import get_settings
from app.domain.market_models import MarketTickerDetail, MarketTickerRow
from app.infrastructure.database import SessionLocal

router = APIRouter(prefix="/api/v1")


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_service(db: Session = Depends(get_db)) -> PortfolioService:
    return PortfolioService(db)


def get_market_service(db: Session = Depends(get_db)) -> MarketService:
    return MarketService(db)


def _market_row_response(row: MarketTickerRow) -> MarketTickerRowResponse:
    return MarketTickerRowResponse(
        ticker=row.ticker,
        company_name=row.company_name,
        current_price=decimal_to_float(row.current_price),
        previous_price=decimal_to_float(row.previous_price),
        price_direction=row.price_direction,
        dividends_12m=float(row.dividends_12m),
        yield_ratio=decimal_to_float(row.yield_ratio),
        history_synced_at=row.history_synced_at.isoformat() if row.history_synced_at else None,
        intraday_synced_at=(
            row.intraday_synced_at.isoformat() if row.intraday_synced_at else None
        ),
    )


def _market_detail_response(detail: MarketTickerDetail) -> MarketTickerDetailResponse:
    return MarketTickerDetailResponse(
        ticker=detail.ticker,
        company_name=detail.company_name,
        current_price=decimal_to_float(detail.current_price),
        previous_price=decimal_to_float(detail.previous_price),
        price_direction=detail.price_direction,
        dividends_12m=float(detail.dividends_12m),
        yield_ratio=decimal_to_float(detail.yield_ratio),
        dividends_total=float(detail.dividends_total),
        historical_low=decimal_to_float(detail.historical_low),
        historical_avg=decimal_to_float(detail.historical_avg),
        historical_high=decimal_to_float(detail.historical_high),
        price_series=[
            MarketPricePointResponse(
                timestamp=point.timestamp,
                label=point.label,
                segment=point.segment,
                price=decimal_to_float(point.price),
                low=decimal_to_float(point.low),
                avg=decimal_to_float(point.avg),
                high=decimal_to_float(point.high),
            )
            for point in detail.price_series
        ],
        dividend_series=[
            MarketDividendPointResponse(
                date=point.date,
                label=point.label,
                unit_value=float(point.unit_value),
                cumulative_unit_value=float(point.cumulative_unit_value),
                corporate_action=point.corporate_action,
            )
            for point in detail.dividend_series
        ],
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/imports", response_model=ImportResponse)
async def import_movements(
    file: UploadFile = File(...),
    service: PortfolioService = Depends(get_service),
) -> ImportResponse:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Envie um arquivo XLSX da B3.")

    settings = get_settings()
    suffix = Path(file.filename).suffix or ".xlsx"
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    stored_path = Path(settings.upload_dir) / stored_name

    content = await file.read()
    stored_path.write_bytes(content)

    result = service.import_xlsx(str(stored_path), file.filename)
    return ImportResponse(
        batch_id=result.batch_id,
        imported=result.imported,
        duplicates=result.duplicates,
        total_movements=result.total_movements,
        tickers=result.tickers,
    )


@router.get("/imports", response_model=list[ImportBatchResponse])
def list_imports(service: PortfolioService = Depends(get_service)) -> list[ImportBatchResponse]:
    batches = service.list_imports()
    return [
        ImportBatchResponse(
            id=batch.id,
            filename=batch.filename,
            imported_at=batch.imported_at.isoformat(),
            row_count=batch.row_count,
            duplicate_count=batch.duplicate_count,
        )
        for batch in batches
    ]


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(service: PortfolioService = Depends(get_service)) -> DashboardResponse:
    summary = await service.get_dashboard()
    return DashboardResponse(
        total_invested=float(summary.total_invested),
        total_liquidated=float(summary.total_liquidated),
        total_income=float(summary.total_income),
        net_invested=float(summary.total_invested - summary.total_liquidated),
        tickers=[
            TickerCardResponse(
                ticker=card.ticker,
                company_name=card.company_name,
                quantity=float(card.quantity),
                avg_cost=float(card.avg_cost),
                total_invested=float(card.total_invested),
                total_liquidated=float(card.total_liquidated),
                total_income=float(card.total_income),
                current_price=decimal_to_float(card.current_price),
                market_value=decimal_to_float(card.market_value),
                dividends_12m=float(card.dividends_12m),
                yield_ratio=decimal_to_float(card.yield_ratio),
            )
            for card in summary.tickers
        ],
    )


@router.get("/portfolio/comparison", response_model=PortfolioComparisonResponse)
async def portfolio_comparison(
    service: PortfolioService = Depends(get_service),
) -> PortfolioComparisonResponse:
    points, meta = await service.get_portfolio_comparison()
    return PortfolioComparisonResponse(
        comparison_advantage=float(meta.savings_advantage),
        selic_advantage=float(meta.selic_advantage),
        savings_monthly_rate_pct=meta.savings_monthly_rate_pct,
        selic_monthly_rate_pct=meta.selic_monthly_rate_pct,
        bitcoin_advantage=float(meta.bitcoin_advantage),
        bitcoin_monthly_rate_pct=meta.bitcoin_monthly_rate_pct,
        bitcoin_available=meta.bitcoin_available,
        timeline=[
            PortfolioComparisonPointResponse(
                period=point.period,
                asset_patrimony=float(point.asset_patrimony),
                savings_patrimony=float(point.savings_patrimony),
                selic_patrimony=float(point.selic_patrimony),
                bitcoin_patrimony=float(point.bitcoin_patrimony),
            )
            for point in points
        ],
    )


@router.get("/tickers/{ticker}/timeline", response_model=TickerDetailResponse)
async def ticker_timeline(
    ticker: str,
    service: PortfolioService = Depends(get_service),
) -> TickerDetailResponse:
    if not service.has_ticker(ticker):
        raise HTTPException(status_code=404, detail="Ticker não encontrado.")

    points, meta = await service.get_ticker_timeline(ticker)
    if not points:
        raise HTTPException(status_code=404, detail="Ticker não encontrado.")

    return TickerDetailResponse(
        ticker=ticker.upper(),
        comparison_advantage=float(meta.savings_advantage),
        selic_advantage=float(meta.selic_advantage),
        savings_monthly_rate_pct=meta.savings_monthly_rate_pct,
        selic_monthly_rate_pct=meta.selic_monthly_rate_pct,
        bitcoin_advantage=float(meta.bitcoin_advantage),
        bitcoin_monthly_rate_pct=meta.bitcoin_monthly_rate_pct,
        bitcoin_available=meta.bitcoin_available,
        timeline=[
            TimelinePointResponse(
                period=point.period,
                invested=float(point.invested),
                liquidated=float(point.liquidated),
                income=float(point.income),
                cumulative_invested=float(point.cumulative_invested),
                cumulative_liquidated=float(point.cumulative_liquidated),
                cumulative_income=float(point.cumulative_income),
                invested_quantity=float(point.invested_quantity),
                liquidated_quantity=float(point.liquidated_quantity),
                income_quantity=float(point.income_quantity),
                position_quantity=float(point.position_quantity),
                invested_unit_price=decimal_to_float(point.invested_unit_price),
                liquidated_unit_price=decimal_to_float(point.liquidated_unit_price),
                income_unit_price=decimal_to_float(point.income_unit_price),
                avg_purchase_unit_price=decimal_to_float(point.avg_purchase_unit_price),
                income_avg_purchase_unit_price=decimal_to_float(
                    point.income_avg_purchase_unit_price
                ),
                asset_patrimony=float(point.asset_patrimony),
                savings_patrimony=float(point.savings_patrimony),
                selic_patrimony=float(point.selic_patrimony),
                bitcoin_patrimony=float(point.bitcoin_patrimony),
            )
            for point in points
        ],
    )


@router.get("/market/tickers", response_model=list[MarketTickerRowResponse])
async def list_market_tickers(
    service: MarketService = Depends(get_market_service),
) -> list[MarketTickerRowResponse]:
    rows = await service.list_tickers(refresh_intraday=True)
    return [_market_row_response(row) for row in rows]


@router.post("/market/tickers", response_model=MarketTickerRowResponse)
async def add_market_ticker(
    body: MarketTickerRequest,
    service: MarketService = Depends(get_market_service),
) -> MarketTickerRowResponse:
    try:
        row = await service.add_ticker(body.ticker)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Falha ao carregar dados de mercado: {exc}",
        ) from exc
    return _market_row_response(row)


@router.get("/market/tickers/{ticker}", response_model=MarketTickerDetailResponse)
async def get_market_ticker(
    ticker: str,
    service: MarketService = Depends(get_market_service),
) -> MarketTickerDetailResponse:
    try:
        detail = await service.get_ticker_detail(ticker)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _market_detail_response(detail)


@router.delete("/market/tickers/{ticker}")
async def delete_market_ticker(
    ticker: str,
    service: MarketService = Depends(get_market_service),
) -> dict[str, str]:
    try:
        service.remove_ticker(ticker)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "removed", "ticker": ticker.upper()}


@router.post("/market/tickers/{ticker}/refresh", response_model=MarketTickerRowResponse)
async def refresh_market_ticker(
    ticker: str,
    service: MarketService = Depends(get_market_service),
) -> MarketTickerRowResponse:
    try:
        row = await service.refresh_intraday(ticker)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _market_row_response(row)
