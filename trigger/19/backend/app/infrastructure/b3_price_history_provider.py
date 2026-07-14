from __future__ import annotations

import io
import zipfile
from datetime import date
from decimal import Decimal
from pathlib import Path

import httpx

from app.core.config import get_settings
from app.domain.market_models import HistoricalPriceBar
from app.domain.ticker_type import normalize_ticker

BASE_URL = "https://bvmf.bmfbovespa.com.br/InstDados/SerHist"


class B3PriceHistoryProvider:
    """Série histórica diária via COTAHIST oficial B3 (padrão trigger/16)."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def fetch_history(
        self,
        ticker: str,
        year_start: int,
        year_end: int,
    ) -> list[HistoricalPriceBar]:
        symbol = normalize_ticker(ticker)
        bars: list[HistoricalPriceBar] = []
        cache_dir = Path(self.settings.cotahist_cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)

        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            for year in range(year_start, year_end + 1):
                zip_path = cache_dir / f"COTAHIST_A{year}.ZIP"
                if not zip_path.exists():
                    await self._download_year(client, year, zip_path)
                if not zip_path.exists():
                    continue
                bars.extend(self._parse_zip(zip_path, symbol))

        bars.sort(key=lambda bar: bar.trade_date)
        return bars

    async def _download_year(
        self,
        client: httpx.AsyncClient,
        year: int,
        zip_path: Path,
    ) -> None:
        url = f"{BASE_URL}/COTAHIST_A{year}.ZIP"
        try:
            response = await client.get(url)
            if response.status_code != 200:
                return
            zip_path.write_bytes(response.content)
        except httpx.HTTPError:
            return

    def _parse_zip(self, zip_path: Path, ticker: str) -> list[HistoricalPriceBar]:
        bars: list[HistoricalPriceBar] = []
        try:
            with zipfile.ZipFile(zip_path) as archive:
                for name in archive.namelist():
                    with archive.open(name) as handle:
                        text = io.TextIOWrapper(handle, encoding="latin-1")
                        for line in text:
                            bar = self._parse_line(line, ticker)
                            if bar is not None:
                                bars.append(bar)
        except (zipfile.BadZipFile, OSError):
            return []
        return bars

    @staticmethod
    def _parse_line(line: str, ticker: str) -> HistoricalPriceBar | None:
        if len(line) < 122:
            return None
        if line[0:2] != "01":
            return None
        code = line[12:24].strip()
        if code != ticker:
            return None
        if line[24:27] != "010":
            return None

        try:
            trade_date = date(
                int(line[2:6]),
                int(line[6:8]),
                int(line[8:10]),
            )
            open_price = Decimal(line[56:69]) / Decimal("100")
            high_price = Decimal(line[69:82]) / Decimal("100")
            low_price = Decimal(line[82:95]) / Decimal("100")
            avg_price = Decimal(line[95:108]) / Decimal("100")
            close_price = Decimal(line[108:121]) / Decimal("100")
        except (ValueError, IndexError):
            return None

        return HistoricalPriceBar(
            trade_date=trade_date,
            open_price=open_price,
            high_price=high_price,
            low_price=low_price,
            avg_price=avg_price,
            close_price=close_price,
        )
