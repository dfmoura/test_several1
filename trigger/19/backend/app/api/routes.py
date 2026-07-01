from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.schemas import (
    DashboardResponse,
    ImportBatchResponse,
    ImportResponse,
    PortfolioComparisonResponse,
    PortfolioComparisonPointResponse,
    TickerCardResponse,
    TickerDetailResponse,
    TimelinePointResponse,
    decimal_to_float,
)
from app.application.portfolio_service import PortfolioService
from app.core.config import get_settings
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
        cdi_advantage=float(meta.cdi_advantage),
        savings_monthly_rate_pct=meta.savings_monthly_rate_pct,
        cdi_monthly_rate_pct=meta.cdi_monthly_rate_pct,
        timeline=[
            PortfolioComparisonPointResponse(
                period=point.period,
                asset_patrimony=float(point.asset_patrimony),
                savings_patrimony=float(point.savings_patrimony),
                cdi_patrimony=float(point.cdi_patrimony),
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
        cdi_advantage=float(meta.cdi_advantage),
        savings_monthly_rate_pct=meta.savings_monthly_rate_pct,
        cdi_monthly_rate_pct=meta.cdi_monthly_rate_pct,
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
                asset_patrimony=float(point.asset_patrimony),
                savings_patrimony=float(point.savings_patrimony),
                cdi_patrimony=float(point.cdi_patrimony),
            )
            for point in points
        ],
    )
