export interface TickerCard {
  ticker: string;
  company_name: string;
  quantity: number;
  avg_cost: number;
  total_invested: number;
  total_liquidated: number;
  total_income: number;
  current_price: number | null;
  market_value: number | null;
  dividends_12m: number;
  yield_ratio: number | null;
}

export interface Dashboard {
  total_invested: number;
  total_liquidated: number;
  total_income: number;
  net_invested: number;
  tickers: TickerCard[];
}

export interface TimelinePoint {
  period: string;
  invested: number;
  liquidated: number;
  income: number;
  cumulative_invested: number;
  cumulative_liquidated: number;
  cumulative_income: number;
  invested_quantity: number;
  liquidated_quantity: number;
  income_quantity: number;
  position_quantity: number;
  invested_unit_price: number | null;
  liquidated_unit_price: number | null;
  income_unit_price: number | null;
  avg_purchase_unit_price: number | null;
  income_avg_purchase_unit_price: number | null;
  asset_patrimony: number;
  savings_patrimony: number;
  selic_patrimony: number;
  bitcoin_patrimony: number;
}

export interface TickerDetail {
  ticker: string;
  timeline: TimelinePoint[];
  comparison_advantage: number;
  selic_advantage: number;
  savings_monthly_rate_pct: number;
  selic_monthly_rate_pct: number;
  bitcoin_advantage: number;
  bitcoin_monthly_rate_pct: number;
  bitcoin_available: boolean;
}

export interface PortfolioComparisonPoint {
  period: string;
  asset_patrimony: number;
  savings_patrimony: number;
  selic_patrimony: number;
  bitcoin_patrimony: number;
}

export interface PortfolioComparison {
  timeline: PortfolioComparisonPoint[];
  comparison_advantage: number;
  selic_advantage: number;
  savings_monthly_rate_pct: number;
  selic_monthly_rate_pct: number;
  bitcoin_advantage: number;
  bitcoin_monthly_rate_pct: number;
  bitcoin_available: boolean;
}

export interface ImportResult {
  batch_id: number;
  imported: number;
  duplicates: number;
  total_movements: number;
  tickers: string[];
}

export type PriceDirection = "up" | "down" | "flat";

export interface MarketTickerRow {
  ticker: string;
  company_name: string;
  current_price: number | null;
  previous_price: number | null;
  price_direction: PriceDirection;
  dividends_12m: number;
  yield_ratio: number | null;
  history_synced_at: string | null;
  intraday_synced_at: string | null;
}

export interface MarketPricePoint {
  timestamp: string;
  label: string;
  segment: "historical" | "intraday";
  price: number | null;
  low: number | null;
  avg: number | null;
  high: number | null;
}

export interface MarketDividendPoint {
  date: string;
  label: string;
  unit_value: number;
  cumulative_unit_value: number;
  corporate_action: string;
}

export interface MarketTickerDetail {
  ticker: string;
  company_name: string;
  current_price: number | null;
  previous_price: number | null;
  price_direction: PriceDirection;
  dividends_12m: number;
  yield_ratio: number | null;
  dividends_total: number;
  historical_low: number | null;
  historical_avg: number | null;
  historical_high: number | null;
  price_series: MarketPricePoint[];
  dividend_series: MarketDividendPoint[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    let message = `Erro ${response.status}`;
    try {
      const payload = JSON.parse(text);
      if (typeof payload?.detail === "string") message = payload.detail;
      else if (payload?.detail) message = JSON.stringify(payload.detail);
      else if (text) message = text;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<Dashboard>("/api/v1/dashboard"),
  getPortfolioComparison: () =>
    request<PortfolioComparison>("/api/v1/portfolio/comparison"),
  getTickerTimeline: (ticker: string) =>
    request<TickerDetail>(`/api/v1/tickers/${ticker}/timeline`),
  importFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportResult>("/api/v1/imports", {
      method: "POST",
      body: form,
    });
  },
  getMarketTickers: () => request<MarketTickerRow[]>("/api/v1/market/tickers"),
  addMarketTicker: (ticker: string) =>
    request<MarketTickerRow>("/api/v1/market/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    }),
  getMarketTickerDetail: (ticker: string) =>
    request<MarketTickerDetail>(`/api/v1/market/tickers/${ticker}`),
  removeMarketTicker: (ticker: string) =>
    request<{ status: string; ticker: string }>(`/api/v1/market/tickers/${ticker}`, {
      method: "DELETE",
    }),
  refreshMarketTicker: (ticker: string) =>
    request<MarketTickerRow>(`/api/v1/market/tickers/${ticker}/refresh`, {
      method: "POST",
    }),
};
