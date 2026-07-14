from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.market_models import (
    MarketDividendPoint,
    MarketPricePoint,
    MarketTickerDetail,
    MarketTickerRow,
)
from app.domain.ticker_type import normalize_ticker
from app.infrastructure.b3_dividend_provider import B3DividendProvider
from app.infrastructure.b3_price_history_provider import B3PriceHistoryProvider
from app.infrastructure.database import (
    MarketDividendORM,
    MarketIntradayORM,
    MarketPriceHistoryORM,
    MarketWatchlistORM,
)
from app.infrastructure.quote_provider import QuoteProvider


class MarketService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.settings = get_settings()
        self.dividend_provider = B3DividendProvider()
        self.price_history_provider = B3PriceHistoryProvider()
        self.quote_provider = QuoteProvider()

    async def add_ticker(self, ticker: str) -> MarketTickerRow:
        symbol = normalize_ticker(ticker)
        if not symbol:
            raise ValueError("Informe um ticker válido.")

        existing = self.session.scalar(
            select(MarketWatchlistORM).where(MarketWatchlistORM.ticker == symbol)
        )
        if existing:
            await self.refresh_intraday(symbol)
            return self._build_row(existing)

        try:
            company = await self.dividend_provider.resolve_company(symbol)
            watch = MarketWatchlistORM(
                ticker=symbol,
                company_name=company.company_name,
                trading_name=company.trading_name,
                type_stock=company.type_stock,
            )
            self.session.add(watch)
            self.session.flush()

            await self._sync_history(watch)
            await self._sync_intraday(watch)
            self.session.commit()
            self.session.refresh(watch)
            return self._build_row(watch)
        except Exception:
            self.session.rollback()
            raise

    async def list_tickers(self, refresh_intraday: bool = True) -> list[MarketTickerRow]:
        watches = list(
            self.session.scalars(
                select(MarketWatchlistORM).order_by(MarketWatchlistORM.ticker)
            )
        )
        if refresh_intraday and watches:
            for watch in watches:
                try:
                    await self._sync_intraday(watch)
                except Exception:
                    continue
            self.session.commit()

        return [self._build_row(watch) for watch in watches]

    async def get_ticker_detail(self, ticker: str) -> MarketTickerDetail:
        symbol = normalize_ticker(ticker)
        watch = self.session.scalar(
            select(MarketWatchlistORM).where(MarketWatchlistORM.ticker == symbol)
        )
        if watch is None:
            raise LookupError(f"Ticker '{symbol}' não está no mercado.")

        await self._sync_intraday(watch)
        self.session.commit()
        self.session.refresh(watch)

        history = list(
            self.session.scalars(
                select(MarketPriceHistoryORM)
                .where(MarketPriceHistoryORM.ticker == symbol)
                .order_by(MarketPriceHistoryORM.trade_date)
            )
        )
        intraday = list(
            self.session.scalars(
                select(MarketIntradayORM)
                .where(
                    MarketIntradayORM.ticker == symbol,
                    MarketIntradayORM.session_date == date.today(),
                )
                .order_by(MarketIntradayORM.traded_at)
            )
        )
        dividends = list(
            self.session.scalars(
                select(MarketDividendORM)
                .where(MarketDividendORM.ticker == symbol)
                .order_by(MarketDividendORM.ex_date)
            )
        )

        current_price, previous_price, direction = self._price_context(symbol, history, intraday)
        dividends_12m = self._dividends_12m(dividends)
        dividends_total = sum((d.value_cash for d in dividends), Decimal("0"))
        yield_ratio = (
            dividends_12m / current_price
            if current_price is not None and current_price > 0
            else None
        )

        historical_low = min((h.low_price for h in history), default=None)
        historical_high = max((h.high_price for h in history), default=None)
        historical_avg = (
            sum((h.avg_price for h in history), Decimal("0")) / Decimal(len(history))
            if history
            else None
        )

        return MarketTickerDetail(
            ticker=symbol,
            company_name=watch.company_name,
            current_price=current_price,
            previous_price=previous_price,
            price_direction=direction,
            dividends_12m=dividends_12m,
            yield_ratio=yield_ratio,
            dividends_total=dividends_total,
            historical_low=historical_low,
            historical_avg=historical_avg,
            historical_high=historical_high,
            price_series=self._build_price_series(history, intraday),
            dividend_series=self._build_dividend_series(dividends),
        )

    def remove_ticker(self, ticker: str) -> None:
        symbol = normalize_ticker(ticker)
        watch = self.session.scalar(
            select(MarketWatchlistORM).where(MarketWatchlistORM.ticker == symbol)
        )
        if watch is None:
            raise LookupError(f"Ticker '{symbol}' não está no mercado.")

        self.session.execute(
            delete(MarketPriceHistoryORM).where(MarketPriceHistoryORM.ticker == symbol)
        )
        self.session.execute(
            delete(MarketIntradayORM).where(MarketIntradayORM.ticker == symbol)
        )
        self.session.execute(
            delete(MarketDividendORM).where(MarketDividendORM.ticker == symbol)
        )
        self.session.delete(watch)
        self.session.commit()

    async def refresh_intraday(self, ticker: str) -> MarketTickerRow:
        symbol = normalize_ticker(ticker)
        watch = self.session.scalar(
            select(MarketWatchlistORM).where(MarketWatchlistORM.ticker == symbol)
        )
        if watch is None:
            raise LookupError(f"Ticker '{symbol}' não está no mercado.")
        await self._sync_intraday(watch)
        self.session.commit()
        self.session.refresh(watch)
        return self._build_row(watch)

    async def refresh_history(self, ticker: str) -> MarketTickerRow:
        symbol = normalize_ticker(ticker)
        watch = self.session.scalar(
            select(MarketWatchlistORM).where(MarketWatchlistORM.ticker == symbol)
        )
        if watch is None:
            raise LookupError(f"Ticker '{symbol}' não está no mercado.")
        await self._sync_history(watch)
        await self._sync_intraday(watch)
        self.session.commit()
        self.session.refresh(watch)
        return self._build_row(watch)

    async def _sync_history(self, watch: MarketWatchlistORM) -> None:
        year_end = date.today().year
        year_start = year_end - self.settings.market_history_years + 1

        bars = await self.price_history_provider.fetch_history(
            watch.ticker, year_start, year_end
        )
        self.session.execute(
            delete(MarketPriceHistoryORM).where(
                MarketPriceHistoryORM.ticker == watch.ticker
            )
        )
        for bar in bars:
            self.session.add(
                MarketPriceHistoryORM(
                    ticker=watch.ticker,
                    trade_date=bar.trade_date,
                    open_price=bar.open_price,
                    high_price=bar.high_price,
                    low_price=bar.low_price,
                    avg_price=bar.avg_price,
                    close_price=bar.close_price,
                )
            )

        dividends = await self.dividend_provider.fetch_dividends(
            watch.trading_name,
            watch.type_stock,
        )
        self.session.execute(
            delete(MarketDividendORM).where(MarketDividendORM.ticker == watch.ticker)
        )
        for event in dividends:
            self.session.add(
                MarketDividendORM(
                    ticker=watch.ticker,
                    ex_date=event.ex_date,
                    approval_date=event.approval_date,
                    corporate_action=event.corporate_action,
                    type_stock=event.type_stock,
                    value_cash=event.value_cash,
                    closing_price_prior_ex=event.closing_price_prior_ex,
                )
            )

        watch.history_synced_at = datetime.utcnow()
        self.session.flush()

    async def _sync_intraday(self, watch: MarketWatchlistORM) -> None:
        today = date.today()
        points = await self.quote_provider.get_intraday(watch.ticker)

        self.session.execute(
            delete(MarketIntradayORM).where(MarketIntradayORM.ticker == watch.ticker)
        )

        if points:
            for point in points:
                self.session.add(
                    MarketIntradayORM(
                        ticker=watch.ticker,
                        traded_at=point.traded_at,
                        price=point.price,
                        session_date=point.traded_at.date(),
                    )
                )
        else:
            quotes = await self.quote_provider.get_quotes([watch.ticker])
            price = quotes.get(watch.ticker)
            if price is not None:
                now = datetime.now()
                self.session.add(
                    MarketIntradayORM(
                        ticker=watch.ticker,
                        traded_at=now.replace(microsecond=0),
                        price=price,
                        session_date=today,
                    )
                )

        watch.intraday_synced_at = datetime.utcnow()
        self.session.flush()

    def _build_row(self, watch: MarketWatchlistORM) -> MarketTickerRow:
        history = list(
            self.session.scalars(
                select(MarketPriceHistoryORM)
                .where(MarketPriceHistoryORM.ticker == watch.ticker)
                .order_by(MarketPriceHistoryORM.trade_date.desc())
                .limit(2)
            )
        )
        intraday = list(
            self.session.scalars(
                select(MarketIntradayORM)
                .where(
                    MarketIntradayORM.ticker == watch.ticker,
                    MarketIntradayORM.session_date == date.today(),
                )
                .order_by(MarketIntradayORM.traded_at)
            )
        )
        dividends = list(
            self.session.scalars(
                select(MarketDividendORM).where(
                    MarketDividendORM.ticker == watch.ticker
                )
            )
        )
        current_price, previous_price, direction = self._price_context(
            watch.ticker, list(reversed(history)), intraday
        )
        dividends_12m = self._dividends_12m(dividends)
        yield_ratio = (
            dividends_12m / current_price
            if current_price is not None and current_price > 0
            else None
        )
        return MarketTickerRow(
            ticker=watch.ticker,
            company_name=watch.company_name,
            current_price=current_price,
            previous_price=previous_price,
            price_direction=direction,
            dividends_12m=dividends_12m,
            yield_ratio=yield_ratio,
            history_synced_at=watch.history_synced_at,
            intraday_synced_at=watch.intraday_synced_at,
        )

    def _price_context(
        self,
        ticker: str,
        history: list[MarketPriceHistoryORM],
        intraday: list[MarketIntradayORM],
    ) -> tuple[Decimal | None, Decimal | None, str]:
        current: Decimal | None = None
        previous: Decimal | None = None

        if len(intraday) >= 2:
            current = intraday[-1].price
            previous = intraday[-2].price
        elif len(intraday) == 1:
            current = intraday[0].price
            if history:
                previous = history[-1].close_price
        elif history:
            current = history[-1].close_price
            if len(history) >= 2:
                previous = history[-2].close_price

        direction = "flat"
        if current is not None and previous is not None:
            if current > previous:
                direction = "up"
            elif current < previous:
                direction = "down"
        return current, previous, direction

    @staticmethod
    def _dividends_12m(dividends: list[MarketDividendORM]) -> Decimal:
        cutoff = date.today() - timedelta(days=365)
        total = Decimal("0")
        for item in dividends:
            if item.ex_date >= cutoff:
                total += item.value_cash
        return total

    @staticmethod
    def _build_price_series(
        history: list[MarketPriceHistoryORM],
        intraday: list[MarketIntradayORM],
    ) -> list[MarketPricePoint]:
        series: list[MarketPricePoint] = []
        for bar in history:
            series.append(
                MarketPricePoint(
                    timestamp=bar.trade_date.isoformat(),
                    label=bar.trade_date.strftime("%d/%m/%Y"),
                    segment="historical",
                    price=bar.close_price,
                    low=bar.low_price,
                    avg=bar.avg_price,
                    high=bar.high_price,
                )
            )
        for point in intraday:
            series.append(
                MarketPricePoint(
                    timestamp=point.traded_at.isoformat(sep=" "),
                    label=point.traded_at.strftime("%d/%m %H:%M"),
                    segment="intraday",
                    price=point.price,
                    low=None,
                    avg=None,
                    high=None,
                )
            )
        return series

    @staticmethod
    def _build_dividend_series(
        dividends: list[MarketDividendORM],
    ) -> list[MarketDividendPoint]:
        cumulative = Decimal("0")
        series: list[MarketDividendPoint] = []
        for item in dividends:
            cumulative += item.value_cash
            series.append(
                MarketDividendPoint(
                    date=item.ex_date.isoformat(),
                    label=item.ex_date.strftime("%d/%m/%Y"),
                    unit_value=item.value_cash,
                    cumulative_unit_value=cumulative,
                    corporate_action=item.corporate_action,
                )
            )
        return series
