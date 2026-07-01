from __future__ import annotations

import hashlib
from collections import defaultdict
from decimal import Decimal

from app.domain.b3_schema import AVG_COST_QUANTIZE, DIRECTION_CREDIT
from app.domain.models import (
    Movement,
    PortfolioComparisonPoint,
    TickerDashboard,
    TickerPosition,
    TimelinePoint,
)
from app.domain.savings_comparator import (
    DEFAULT_CDI_MONTHLY_RATE,
    DEFAULT_SAVINGS_MONTHLY_RATE,
    simulate_cdi_balance,
    simulate_savings_balance,
)
from app.domain.value_objects import MovementKind


class PositionCalculator:
    """Reconstrói posição e fluxos a partir das movimentações B3."""

    def calculate_positions(self, movements: list[Movement]) -> dict[str, TickerPosition]:
        ordered = sorted(movements, key=lambda m: (m.trade_date, m.external_key))
        positions: dict[str, TickerPosition] = {}

        for movement in ordered:
            if movement.kind == MovementKind.IGNORE:
                continue

            pos = positions.setdefault(movement.ticker, TickerPosition(ticker=movement.ticker))

            if movement.kind == MovementKind.INCOME:
                amount = movement.total_value or Decimal("0")
                pos.total_income += amount
                continue

            if movement.kind == MovementKind.BUY:
                qty = movement.quantity
                value = movement.total_value or Decimal("0")
                if qty > 0:
                    pos.quantity += qty
                    pos.total_invested += value
                continue

            if movement.kind == MovementKind.SELL:
                qty = movement.quantity
                value = movement.total_value or Decimal("0")
                if qty > 0:
                    pos.quantity = max(Decimal("0"), pos.quantity - qty)
                    pos.total_liquidated += value
                continue

            if movement.kind == MovementKind.BONUS:
                pos.quantity += movement.quantity
                continue

            if movement.kind == MovementKind.POSITION_SET:
                pos.quantity = movement.quantity
                continue

            if movement.kind == MovementKind.SPLIT:
                if movement.direction.lower() == DIRECTION_CREDIT:
                    pos.quantity += movement.quantity
                else:
                    pos.quantity = max(Decimal("0"), pos.quantity - movement.quantity)

        for pos in positions.values():
            if pos.quantity > 0 and pos.total_invested > 0:
                pos.avg_cost = (pos.total_invested / pos.quantity).quantize(Decimal(AVG_COST_QUANTIZE))

        return positions

    def build_timeline(
        self,
        movements: list[Movement],
        ticker: str,
        *,
        current_price: Decimal | None = None,
        savings_monthly_rate: Decimal = DEFAULT_SAVINGS_MONTHLY_RATE,
        cdi_monthly_rate: Decimal = DEFAULT_CDI_MONTHLY_RATE,
    ) -> list[TimelinePoint]:
        filtered = [m for m in movements if m.ticker == ticker and m.kind != MovementKind.IGNORE]
        filtered.sort(key=lambda m: (m.trade_date, m.external_key))

        monthly: dict[str, dict[str, Decimal]] = defaultdict(
            lambda: {
                "invested": Decimal("0"),
                "liquidated": Decimal("0"),
                "income": Decimal("0"),
                "invested_quantity": Decimal("0"),
                "liquidated_quantity": Decimal("0"),
                "income_quantity": Decimal("0"),
            }
        )
        period_end_position: dict[str, Decimal] = {}
        period_end_cost_basis: dict[str, Decimal] = {}
        period_end_avg_cost: dict[str, Decimal] = {}
        position_qty = Decimal("0")
        cost_basis = Decimal("0")

        for movement in filtered:
            period = movement.trade_date.strftime("%Y-%m")
            bucket = monthly[period]
            qty = movement.quantity

            if movement.kind == MovementKind.INCOME:
                value = movement.total_value or Decimal("0")
                bucket["income"] += value
                if qty > 0:
                    bucket["income_quantity"] = max(bucket["income_quantity"], qty)
            elif movement.kind == MovementKind.BUY:
                value = movement.total_value or Decimal("0")
                bucket["invested"] += value
                if qty > 0:
                    bucket["invested_quantity"] += qty
                    position_qty += qty
                    cost_basis += value
            elif movement.kind == MovementKind.SELL:
                value = movement.total_value or Decimal("0")
                bucket["liquidated"] += value
                if qty > 0:
                    bucket["liquidated_quantity"] += qty
                    if position_qty > 0:
                        avg = cost_basis / position_qty
                        sold_cost = (avg * qty).quantize(Decimal("0.01"))
                        cost_basis = max(Decimal("0"), cost_basis - sold_cost)
                    position_qty = max(Decimal("0"), position_qty - qty)
            elif movement.kind == MovementKind.BONUS:
                if qty > 0:
                    position_qty += qty
            elif movement.kind == MovementKind.POSITION_SET:
                position_qty = qty
                cost_basis = Decimal("0")
            elif movement.kind == MovementKind.SPLIT:
                if movement.direction.lower() == DIRECTION_CREDIT:
                    position_qty += qty
                else:
                    if position_qty > 0:
                        avg = cost_basis / position_qty
                        removed = min(qty, position_qty)
                        cost_basis = max(Decimal("0"), cost_basis - avg * removed)
                    position_qty = max(Decimal("0"), position_qty - qty)

            period_end_position[period] = position_qty
            period_end_cost_basis[period] = cost_basis
            if position_qty > 0:
                period_end_avg_cost[period] = (cost_basis / position_qty).quantize(
                    Decimal(AVG_COST_QUANTIZE)
                )

        monthly_flows = [
            (period, monthly[period]["invested"], monthly[period]["liquidated"])
            for period in sorted(monthly.keys())
        ]
        savings_balances = simulate_savings_balance(monthly_flows, savings_monthly_rate)
        cdi_balances = simulate_cdi_balance(monthly_flows, cdi_monthly_rate)

        cumulative_invested = Decimal("0")
        cumulative_liquidated = Decimal("0")
        cumulative_income = Decimal("0")
        points: list[TimelinePoint] = []
        sorted_periods = sorted(monthly.keys())

        for index, period in enumerate(sorted_periods):
            bucket = monthly[period]
            cumulative_invested += bucket["invested"]
            cumulative_liquidated += bucket["liquidated"]
            cumulative_income += bucket["income"]

            invested_qty = bucket["invested_quantity"]
            liquidated_qty = bucket["liquidated_quantity"]
            income_qty = bucket["income_quantity"]
            invested = bucket["invested"]
            liquidated = bucket["liquidated"]
            income = bucket["income"]
            position_qty = period_end_position.get(period, Decimal("0"))
            avg_cost = period_end_avg_cost.get(period)

            is_last = index == len(sorted_periods) - 1
            if is_last and current_price is not None and position_qty > 0:
                position_value = position_qty * current_price
            elif avg_cost is not None and position_qty > 0:
                position_value = position_qty * avg_cost
            else:
                position_value = Decimal("0")

            asset_patrimony = (
                cumulative_income + cumulative_liquidated + position_value
            ).quantize(Decimal("0.01"))
            savings_patrimony = savings_balances.get(period, Decimal("0"))
            cdi_patrimony = cdi_balances.get(period, Decimal("0"))

            points.append(
                TimelinePoint(
                    period=period,
                    invested=invested,
                    liquidated=liquidated,
                    income=income,
                    cumulative_invested=cumulative_invested,
                    cumulative_liquidated=cumulative_liquidated,
                    cumulative_income=cumulative_income,
                    invested_quantity=invested_qty,
                    liquidated_quantity=liquidated_qty,
                    income_quantity=income_qty,
                    position_quantity=position_qty,
                    invested_unit_price=self._weighted_unit_price(invested, invested_qty),
                    liquidated_unit_price=self._weighted_unit_price(liquidated, liquidated_qty),
                    income_unit_price=self._weighted_unit_price(income, income_qty),
                    asset_patrimony=asset_patrimony,
                    savings_patrimony=savings_patrimony,
                    cdi_patrimony=cdi_patrimony,
                )
            )

        return points

    def build_portfolio_timeline(
        self,
        movements: list[Movement],
        *,
        current_prices: dict[str, Decimal] | None = None,
        savings_monthly_rate: Decimal = DEFAULT_SAVINGS_MONTHLY_RATE,
        cdi_monthly_rate: Decimal = DEFAULT_CDI_MONTHLY_RATE,
    ) -> list[PortfolioComparisonPoint]:
        filtered = [m for m in movements if m.kind != MovementKind.IGNORE]
        filtered.sort(key=lambda m: (m.trade_date, m.external_key))

        monthly: dict[str, dict[str, Decimal]] = defaultdict(
            lambda: {
                "invested": Decimal("0"),
                "liquidated": Decimal("0"),
                "income": Decimal("0"),
            }
        )
        ticker_qty: dict[str, Decimal] = defaultdict(Decimal)
        ticker_cost: dict[str, Decimal] = defaultdict(Decimal)
        period_ticker_snapshot: dict[str, dict[str, tuple[Decimal, Decimal]]] = {}

        for movement in filtered:
            period = movement.trade_date.strftime("%Y-%m")
            bucket = monthly[period]
            ticker = movement.ticker
            qty = movement.quantity

            if movement.kind == MovementKind.INCOME:
                bucket["income"] += movement.total_value or Decimal("0")
            elif movement.kind == MovementKind.BUY:
                value = movement.total_value or Decimal("0")
                bucket["invested"] += value
                if qty > 0:
                    ticker_qty[ticker] += qty
                    ticker_cost[ticker] += value
            elif movement.kind == MovementKind.SELL:
                value = movement.total_value or Decimal("0")
                bucket["liquidated"] += value
                if qty > 0 and ticker_qty[ticker] > 0:
                    avg = ticker_cost[ticker] / ticker_qty[ticker]
                    sold_cost = (avg * qty).quantize(Decimal("0.01"))
                    ticker_cost[ticker] = max(Decimal("0"), ticker_cost[ticker] - sold_cost)
                    ticker_qty[ticker] = max(Decimal("0"), ticker_qty[ticker] - qty)
            elif movement.kind == MovementKind.BONUS:
                if qty > 0:
                    ticker_qty[ticker] += qty
            elif movement.kind == MovementKind.POSITION_SET:
                ticker_qty[ticker] = qty
                ticker_cost[ticker] = Decimal("0")
            elif movement.kind == MovementKind.SPLIT:
                if movement.direction.lower() == DIRECTION_CREDIT:
                    ticker_qty[ticker] += qty
                elif ticker_qty[ticker] > 0:
                    avg = ticker_cost[ticker] / ticker_qty[ticker]
                    removed = min(qty, ticker_qty[ticker])
                    ticker_cost[ticker] = max(Decimal("0"), ticker_cost[ticker] - avg * removed)
                    ticker_qty[ticker] = max(Decimal("0"), ticker_qty[ticker] - qty)

            period_ticker_snapshot[period] = {
                t: (ticker_qty[t], ticker_cost[t])
                for t in ticker_qty
                if ticker_qty[t] > 0
            }

        monthly_flows = [
            (period, monthly[period]["invested"], monthly[period]["liquidated"])
            for period in sorted(monthly.keys())
        ]
        savings_balances = simulate_savings_balance(monthly_flows, savings_monthly_rate)
        cdi_balances = simulate_cdi_balance(monthly_flows, cdi_monthly_rate)
        prices = current_prices or {}

        cumulative_liquidated = Decimal("0")
        cumulative_income = Decimal("0")
        points: list[PortfolioComparisonPoint] = []
        sorted_periods = sorted(monthly.keys())

        for index, period in enumerate(sorted_periods):
            bucket = monthly[period]
            cumulative_liquidated += bucket["liquidated"]
            cumulative_income += bucket["income"]

            is_last = index == len(sorted_periods) - 1
            position_value = Decimal("0")
            for ticker, (qty, cost_basis) in period_ticker_snapshot.get(period, {}).items():
                if qty <= 0:
                    continue
                if is_last and ticker in prices:
                    position_value += qty * prices[ticker]
                elif cost_basis > 0:
                    position_value += cost_basis

            asset_patrimony = (
                cumulative_income + cumulative_liquidated + position_value
            ).quantize(Decimal("0.01"))

            points.append(
                PortfolioComparisonPoint(
                    period=period,
                    asset_patrimony=asset_patrimony,
                    savings_patrimony=savings_balances.get(period, Decimal("0")),
                    cdi_patrimony=cdi_balances.get(period, Decimal("0")),
                )
            )

        return points

    @staticmethod
    def _weighted_unit_price(total: Decimal, quantity: Decimal) -> Decimal | None:
        if quantity <= 0 or total <= 0:
            return None
        return (total / quantity).quantize(Decimal(AVG_COST_QUANTIZE))

    @staticmethod
    def external_key(
        trade_date: str,
        movement: str,
        product: str,
        direction: str,
        quantity: str,
        total_value: str,
    ) -> str:
        raw = f"{trade_date}|{movement}|{product}|{direction}|{quantity}|{total_value}"
        return hashlib.sha256(raw.encode()).hexdigest()
