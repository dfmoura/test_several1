from __future__ import annotations

import hashlib
import shutil
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.movement_importer import MovementImporter
from app.domain.models import ComparisonMeta, Movement, PortfolioSummary, TickerDashboard, TimelinePoint
from app.domain.position_calculator import PositionCalculator
from app.domain.savings_comparator import (
    DEFAULT_SAVINGS_MONTHLY_RATE,
    DEFAULT_SELIC_MONTHLY_RATE,
)
from app.infrastructure.b3_parser import B3MovementParser
from app.domain.transfer_resolver import apply_transfer_resolution
from app.infrastructure.bcb_benchmark_provider import BcbBenchmarkProvider, BenchmarkMonthlyRates
from app.infrastructure.bitcoin_benchmark_provider import (
    BitcoinBenchmarkProvider,
    BitcoinMonthlyPrices,
)
from app.infrastructure.database import ImportBatchORM, MovementORM
from app.infrastructure.quote_provider import QuoteProvider


@dataclass
class ImportResult:
    batch_id: int
    imported: int
    duplicates: int
    total_movements: int
    tickers: list[str]


class PortfolioService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.parser = B3MovementParser()
        self.calculator = PositionCalculator()
        self.quote_provider = QuoteProvider()
        self.bcb_provider = BcbBenchmarkProvider()
        self.bitcoin_provider = BitcoinBenchmarkProvider()

    def import_xlsx(self, file_path: str, original_name: str) -> ImportResult:
        file_hash = self._file_hash(file_path)
        existing = self.session.scalar(
            select(ImportBatchORM).where(ImportBatchORM.file_hash == file_hash)
        )
        if existing:
            movements = self._load_domain_movements()
            tickers = sorted({m.ticker for m in movements})
            return ImportResult(
                batch_id=existing.id,
                imported=0,
                duplicates=existing.row_count + existing.duplicate_count,
                total_movements=len(movements),
                tickers=tickers,
            )

        parsed = self.parser.parse_file(file_path)
        batch = ImportBatchORM(
            filename=original_name,
            file_hash=file_hash,
            row_count=0,
            duplicate_count=0,
        )
        self.session.add(batch)
        self.session.flush()

        importer = MovementImporter(self.session)
        imported, duplicates = importer.persist(parsed, batch.id)

        batch.row_count = imported
        batch.duplicate_count = duplicates
        self.session.commit()

        all_movements = self._load_domain_movements()
        tickers = sorted({m.ticker for m in all_movements})
        return ImportResult(
            batch_id=batch.id,
            imported=imported,
            duplicates=duplicates,
            total_movements=len(all_movements),
            tickers=tickers,
        )

    async def get_dashboard(self) -> PortfolioSummary:
        movements = self._load_domain_movements()
        positions = self.calculator.calculate_positions(movements)
        company_names = self._company_names(movements)

        active_tickers = [
            ticker
            for ticker, pos in positions.items()
            if pos.quantity > 0 or pos.total_income > 0 or pos.total_invested > 0
        ]
        quotes = await self.quote_provider.get_quotes(active_tickers)

        cards: list[TickerDashboard] = []
        total_invested = Decimal("0")
        total_liquidated = Decimal("0")
        total_income = Decimal("0")

        for ticker in sorted(active_tickers):
            pos = positions[ticker]
            price = quotes.get(ticker)
            market_value = (pos.quantity * price) if price is not None else None
            dividends_12m = self.calculator.dividends_12m_per_share(movements, ticker)
            yield_ratio = (
                dividends_12m / price
                if price is not None and price > 0
                else None
            )

            cards.append(
                TickerDashboard(
                    ticker=ticker,
                    company_name=company_names.get(ticker, ticker),
                    quantity=pos.quantity,
                    avg_cost=pos.avg_cost,
                    total_invested=pos.total_invested,
                    total_liquidated=pos.total_liquidated,
                    total_income=pos.total_income,
                    current_price=price,
                    market_value=market_value,
                    dividends_12m=dividends_12m,
                    yield_ratio=yield_ratio,
                )
            )
            total_invested += pos.total_invested
            total_liquidated += pos.total_liquidated
            total_income += pos.total_income

        cards.sort(key=lambda c: c.total_income, reverse=True)
        return PortfolioSummary(
            total_invested=total_invested,
            total_liquidated=total_liquidated,
            total_income=total_income,
            tickers=cards,
        )

    async def get_ticker_timeline(
        self, ticker: str
    ) -> tuple[list[TimelinePoint], ComparisonMeta]:
        movements = self._load_domain_movements()
        normalized = ticker.upper()
        ticker_movements = [m for m in movements if m.ticker == normalized]
        rates = await self._benchmark_rates_for(ticker_movements)
        bitcoin_prices = await self._bitcoin_prices_for(ticker_movements)
        quotes = await self.quote_provider.get_quotes([normalized])
        current_price = quotes.get(normalized)
        points = self.calculator.build_timeline(
            movements,
            normalized,
            current_price=current_price,
            savings_monthly_rate=rates.savings,
            selic_monthly_rate=rates.selic,
            bitcoin_monthly_prices=bitcoin_prices.prices,
        )
        return points, self._comparison_meta(points, rates, bitcoin_prices)

    async def get_portfolio_comparison(self) -> tuple[list, ComparisonMeta]:
        movements = self._load_domain_movements()
        positions = self.calculator.calculate_positions(movements)
        active_tickers = [
            ticker
            for ticker, pos in positions.items()
            if pos.quantity > 0 or pos.total_income > 0 or pos.total_invested > 0
        ]
        rates = await self._benchmark_rates_for(movements)
        bitcoin_prices = await self._bitcoin_prices_for(movements)
        quotes = await self.quote_provider.get_quotes(active_tickers)
        points = self.calculator.build_portfolio_timeline(
            movements,
            current_prices=quotes,
            savings_monthly_rate=rates.savings,
            selic_monthly_rate=rates.selic,
            bitcoin_monthly_prices=bitcoin_prices.prices,
        )
        return points, self._comparison_meta(points, rates, bitcoin_prices)

    async def _benchmark_rates_for(self, movements: list[Movement]) -> BenchmarkMonthlyRates:
        if not movements:
            return BenchmarkMonthlyRates(
                savings={},
                selic={},
            )
        start_period = min(m.trade_date for m in movements).strftime("%Y-%m")
        end_period = max(m.trade_date for m in movements).strftime("%Y-%m")
        return await self.bcb_provider.get_monthly_rates(start_period, end_period)

    async def _bitcoin_prices_for(self, movements: list[Movement]) -> BitcoinMonthlyPrices:
        if not movements:
            return BitcoinMonthlyPrices(prices={})
        start_period = min(m.trade_date for m in movements).strftime("%Y-%m")
        end_period = max(m.trade_date for m in movements).strftime("%Y-%m")
        return await self.bitcoin_provider.get_monthly_prices(start_period, end_period)

    @staticmethod
    def _comparison_meta(
        points: list,
        rates: BenchmarkMonthlyRates,
        bitcoin_prices: BitcoinMonthlyPrices,
    ) -> ComparisonMeta:
        savings_advantage = Decimal("0")
        selic_advantage = Decimal("0")
        bitcoin_advantage = Decimal("0")
        if points:
            last = points[-1]
            savings_advantage = last.asset_patrimony - last.savings_patrimony
            selic_advantage = last.asset_patrimony - last.selic_patrimony
            if bitcoin_prices.available:
                bitcoin_advantage = last.asset_patrimony - last.bitcoin_patrimony
        return ComparisonMeta(
            savings_advantage=savings_advantage,
            selic_advantage=selic_advantage,
            savings_monthly_rate_pct=rates.latest_pct(rates.savings, DEFAULT_SAVINGS_MONTHLY_RATE),
            selic_monthly_rate_pct=rates.latest_pct(rates.selic, DEFAULT_SELIC_MONTHLY_RATE),
            bitcoin_advantage=bitcoin_advantage,
            bitcoin_monthly_rate_pct=bitcoin_prices.latest_return_pct(),
            bitcoin_available=bitcoin_prices.available,
        )

    def has_ticker(self, ticker: str) -> bool:
        movements = self._load_domain_movements()
        return any(m.ticker == ticker.upper() for m in movements)

    def list_imports(self) -> list[ImportBatchORM]:
        return list(
            self.session.scalars(
                select(ImportBatchORM).order_by(ImportBatchORM.imported_at.desc())
            )
        )

    def _load_domain_movements(self) -> list[Movement]:
        rows = self.session.scalars(select(MovementORM).order_by(MovementORM.trade_date)).all()
        movements = [self._to_domain(row) for row in rows]
        return apply_transfer_resolution(movements)

    @staticmethod
    def _company_names(movements: list[Movement]) -> dict[str, str]:
        names: dict[str, str] = {}
        for movement in movements:
            if movement.ticker not in names:
                names[movement.ticker] = B3MovementParser.company_name(movement.product)
        return names

    @staticmethod
    def _file_hash(file_path: str) -> str:
        digest = hashlib.sha256()
        with open(file_path, "rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _to_domain(row: MovementORM) -> Movement:
        from app.domain.movement_classifier import classify_movement
        from app.domain.value_objects import IncomeType, MovementKind

        kind, income_type = classify_movement(row.movement_label, row.direction)
        if income_type is None and row.income_type:
            income_type = IncomeType(row.income_type)

        return Movement(
            trade_date=row.trade_date,
            kind=kind,
            ticker=row.ticker,
            product=row.product,
            institution=row.institution,
            direction=row.direction,
            movement_label=row.movement_label,
            quantity=Decimal(row.quantity),
            unit_price=Decimal(row.unit_price) if row.unit_price is not None else None,
            total_value=Decimal(row.total_value) if row.total_value is not None else None,
            income_type=income_type,
            external_key=row.external_key,
        )

    @staticmethod
    def store_upload(upload_path: Path, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(upload_path, destination)
