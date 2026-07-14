import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { TooltipProps } from "recharts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { PatrimonyComparisonChart } from "./PatrimonyComparisonChart";
import { formatCurrency, formatPeriod, formatPercent, formatQuantity } from "../utils";

interface Props {
  ticker: string;
  onClose: () => void;
}

interface ChartPoint {
  label: string;
  invested: number;
  liquidated: number;
  income: number;
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
  net_flow: number;
  asset_patrimony: number;
  savings_patrimony: number;
  selic_patrimony: number;
}

type FlowChartPoint = ChartPoint;

export function TickerModal({ ticker, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeline", ticker],
    queryFn: () => api.getTickerTimeline(ticker),
  });

  const chartData: ChartPoint[] =
    data?.timeline.map((point) => ({
      ...point,
      label: formatPeriod(point.period),
      net_flow: point.invested - point.liquidated,
    })) ?? [];

  const savingsAdvantage = data?.comparison_advantage ?? 0;
  const selicAdvantage = data?.selic_advantage ?? 0;
  const savingsRate = data?.savings_monthly_rate_pct ?? 0.5;
  const selicRate = data?.selic_monthly_rate_pct ?? 0.85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl border border-white/10 bg-surface-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-surface-800/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Horizonte do ativo
            </p>
            <h2 className="font-mono text-3xl font-bold text-white">{ticker}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8 p-6">
          {isLoading && (
            <p className="py-12 text-center text-slate-400">Carregando gráficos...</p>
          )}
          {isError && (
            <p className="py-12 text-center text-red-300">
              Não foi possível carregar a evolução deste ticker.
            </p>
          )}

          {chartData.length > 0 && (
            <>
              <PatrimonyComparisonChart
                data={chartData}
                savingsAdvantage={savingsAdvantage}
                selicAdvantage={selicAdvantage}
                savingsRate={savingsRate}
                selicRate={selicRate}
              />

              <ChartPanel
                title="Fluxo mensal: investido vs liquidado"
                subtitle="Barras mostram entradas e saídas de capital por mês"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) =>
                        `R$ ${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip content={<FlowTooltip />} />
                    <Legend />
                    <Bar dataKey="invested" name="Investido" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="liquidated" name="Liquidado" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                title="Evolução acumulada de proventos"
                subtitle="Área verde representa proventos recebidos ao longo do tempo"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) => `R$ ${v}`}
                    />
                    <Tooltip content={<CumulativeIncomeTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative_income"
                      name="Proventos acumulados"
                      stroke="#22c55e"
                      fill="url(#incomeGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                title="Proventos mensais"
                subtitle="Distribuição de dividendos, JCP e rendimentos"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip content={<MonthlyIncomeTooltip />} />
                    <Bar
                      dataKey="income"
                      name="Proventos do mês"
                      fill="#fbbf24"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-surface-900/60 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TooltipShell({
  label,
  rows,
}: {
  label?: string;
  rows: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <div className="rounded-xl border border-[#243352] bg-[#111b2e] px-4 py-3 shadow-xl">
      {label && <p className="mb-2 text-sm font-medium text-slate-300">{label}</p>}
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-400">
              {row.color && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="font-medium text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as FlowChartPoint;
  const series = payload[0].dataKey as string;
  const rows: Array<{ label: string; value: string; color?: string }> = [];

  if (series === "invested" && point.invested > 0) {
    rows.push(
      { label: "Investido", value: formatCurrency(point.invested), color: "#3b82f6" },
      { label: "Quantidade", value: formatQuantity(point.invested_quantity) },
      { label: "Preço unitário", value: formatCurrency(point.invested_unit_price) },
    );
  } else if (series === "liquidated" && point.liquidated > 0) {
    rows.push(
      { label: "Liquidado", value: formatCurrency(point.liquidated), color: "#f97316" },
      { label: "Quantidade", value: formatQuantity(point.liquidated_quantity) },
      { label: "Preço unitário", value: formatCurrency(point.liquidated_unit_price) },
    );
  }

  if (!rows.length) return null;
  return <TooltipShell label={label} rows={rows} />;
}

function CumulativeIncomeTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as ChartPoint;
  return (
    <TooltipShell
      label={label}
      rows={[
        {
          label: "Proventos acumulados",
          value: formatCurrency(point.cumulative_income),
          color: "#22c55e",
        },
        { label: "Quantidade", value: formatQuantity(point.position_quantity) },
      ]}
    />
  );
}

function MonthlyIncomeTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as ChartPoint;
  if (point.income <= 0) return null;

  const dividendUnitPrice = point.income_unit_price;
  const avgPurchasePrice = point.income_avg_purchase_unit_price;
  const yieldValue =
    dividendUnitPrice != null &&
    dividendUnitPrice > 0 &&
    avgPurchasePrice != null &&
    avgPurchasePrice > 0
      ? dividendUnitPrice / avgPurchasePrice
      : null;

  return (
    <TooltipShell
      rows={[
        { label: "Data do provento", value: label ?? "—" },
        { label: "Valor do provento", value: formatCurrency(point.income), color: "#fbbf24" },
        {
          label: "Valor unitário do provento",
          value: formatCurrency(dividendUnitPrice, 4),
        },
        {
          label: "Preço unitário médio de compra",
          value: formatCurrency(avgPurchasePrice, 4),
        },
        { label: "Yield", value: formatPercent(yieldValue) },
      ]}
    />
  );
}
