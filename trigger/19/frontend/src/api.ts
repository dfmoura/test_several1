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
  asset_patrimony: number;
  savings_patrimony: number;
  cdi_patrimony: number;
}

export interface TickerDetail {
  ticker: string;
  timeline: TimelinePoint[];
  comparison_advantage: number;
  cdi_advantage: number;
  savings_monthly_rate_pct: number;
  cdi_monthly_rate_pct: number;
}

export interface PortfolioComparisonPoint {
  period: string;
  asset_patrimony: number;
  savings_patrimony: number;
  cdi_patrimony: number;
}

export interface PortfolioComparison {
  timeline: PortfolioComparisonPoint[];
  comparison_advantage: number;
  cdi_advantage: number;
  savings_monthly_rate_pct: number;
  cdi_monthly_rate_pct: number;
}

export interface ImportResult {
  batch_id: number;
  imported: number;
  duplicates: number;
  total_movements: number;
  tickers: string[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Erro ${response.status}`);
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
};
