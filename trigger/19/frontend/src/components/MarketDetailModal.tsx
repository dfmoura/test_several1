import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Minus,
  TrendingUp,
  X,
} from "lucide-react";
import type { TooltipProps } from "recharts";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, MarketDividendPoint, MarketPricePoint, PriceDirection } from "../api";
import { formatCurrency, formatPercent } from "../utils";

const PRICE_SERIES_LEGEND = [
  { color: "#f97316", label: "Máxima" },
  { color: "#38bdf8", label: "Média" },
  { color: "#a78bfa", label: "Mínima" },
  { color: "#22c55e", label: "Preço / Intraday", emphasis: true },
] as const;

interface Props {
  ticker: string;
  onClose: () => void;
}

export function MarketDetailModal({ ticker, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-detail", ticker],
    queryFn: () => api.getMarketTickerDetail(ticker),
  });

  const priceData =
    data?.price_series.map((point) => ({
      ...point,
      low: point.segment === "historical" ? point.low : null,
      avg: point.segment === "historical" ? point.avg : null,
      high: point.segment === "historical" ? point.high : null,
    })) ?? [];

  const dividendData = data?.dividend_series ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl border border-white/10 bg-surface-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-surface-800/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Dashboard de mercado
            </p>
            <h2 className="font-mono text-3xl font-bold text-white">{ticker}</h2>
            {data && (
              <p className="mt-1 text-sm text-slate-400">{data.company_name}</p>
            )}
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
            <p className="py-12 text-center text-slate-400">
              Carregando dashboard...
            </p>
          )}
          {isError && (
            <p className="py-12 text-center text-red-300">
              Não foi possível carregar o detalhe deste ticker.
            </p>
          )}

          {data && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DetailKpi
                  label="Preço atual"
                  value={formatCurrency(data.current_price)}
                  direction={data.price_direction}
                  subtitle={
                    data.previous_price != null
                      ? `Anterior ${formatCurrency(data.previous_price)}`
                      : undefined
                  }
                />
                <DetailKpi
                  label="Proventos 12m"
                  value={formatCurrency(data.dividends_12m)}
                  accent="gold"
                  subtitle={`Total histórico ${formatCurrency(data.dividends_total)}`}
                  icon={<Coins size={16} />}
                />
                <DetailKpi
                  label="Yield"
                  value={formatPercent(data.yield_ratio)}
                  accent="green"
                  subtitle="Proventos 12m / preço atual"
                />
                <DetailKpi
                  label="Faixa histórica"
                  value={
                    data.historical_low != null && data.historical_high != null
                      ? `${formatCurrency(data.historical_low)} — ${formatCurrency(data.historical_high)}`
                      : "—"
                  }
                  subtitle={
                    data.historical_avg != null
                      ? `Média ${formatCurrency(data.historical_avg)}`
                      : undefined
                  }
                  icon={<TrendingUp size={16} />}
                />
              </section>

              <ChartPanel
                title="Evolução de preço"
                subtitle="Histórico COTAHIST com mínima, média e máxima — emenda com intraday do dia corrente"
                legend={<SeriesLegend items={PRICE_SERIES_LEGEND} />}
              >
                {priceData.length === 0 ? (
                  <EmptyChart message="Sem série de preços para este ticker." />
                ) : (
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={priceData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        fontSize={11}
                        minTickGap={28}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="high"
                        name="Máxima"
                        stroke="#f97316"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        name="Média"
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="low"
                        name="Mínima"
                        stroke="#a78bfa"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        name="Preço / Intraday"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              <ChartPanel
                title="Evolução de proventos"
                subtitle="Valor unitário por evento e valor unitário acumulado"
              >
                {dividendData.length === 0 ? (
                  <EmptyChart message="Sem proventos registrados para este ticker." />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={dividendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        fontSize={11}
                        minTickGap={28}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`}
                      />
                      <Tooltip content={<DividendTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="unit_value"
                        name="Valor unitário"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#fbbf24" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative_unit_value"
                        name="Valor unitário acumulado"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailKpi({
  label,
  value,
  subtitle,
  direction,
  accent,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  direction?: PriceDirection;
  accent?: "gold" | "green";
  icon?: React.ReactNode;
}) {
  const DirectionIcon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : direction === "flat"
          ? Minus
          : null;

  const valueClass =
    direction === "up"
      ? "text-accent-glow"
      : direction === "down"
        ? "text-red-400"
        : accent === "gold"
          ? "text-gold"
          : accent === "green"
            ? "text-accent-glow"
            : "text-white";

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-900/60 p-5">
      <div className="mb-3 flex items-center justify-between text-slate-400">
        <span className="text-sm">{label}</span>
        {DirectionIcon ? (
          <DirectionIcon size={16} className={valueClass} />
        ) : (
          icon
        )}
      </div>
      <p className={`font-mono text-xl font-semibold ${valueClass}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  legend,
  children,
}: {
  title: string;
  subtitle: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-surface-900/60 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        {legend && <div className="mt-3">{legend}</div>}
      </div>
      {children}
    </section>
  );
}

function SeriesLegend({
  items,
}: {
  items: ReadonlyArray<{ color: string; label: string; emphasis?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Legenda do gráfico">
      {items.map((item) => (
        <span
          key={item.label}
          role="listitem"
          className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-surface-800/90 px-3 py-1.5 text-xs font-medium ${
            item.emphasis ? "text-white" : "text-slate-300"
          }`}
        >
          <span
            className="inline-block h-[3px] w-5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-48 place-items-center text-sm text-slate-500">
      {message}
    </div>
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
          <div
            key={row.label}
            className="flex items-center justify-between gap-6 text-sm"
          >
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

function PriceTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MarketPricePoint;
  const rows: Array<{ label: string; value: string; color?: string }> = [];

  if (point.segment === "historical") {
    if (point.high != null)
      rows.push({ label: "Máxima", value: formatCurrency(point.high), color: "#f97316" });
    if (point.avg != null)
      rows.push({ label: "Média", value: formatCurrency(point.avg), color: "#38bdf8" });
    if (point.low != null)
      rows.push({ label: "Mínima", value: formatCurrency(point.low), color: "#a78bfa" });
    if (point.price != null)
      rows.push({ label: "Fechamento", value: formatCurrency(point.price), color: "#22c55e" });
  } else if (point.price != null) {
    rows.push({ label: "Intraday", value: formatCurrency(point.price), color: "#22c55e" });
  }

  if (!rows.length) return null;
  return <TooltipShell label={label} rows={rows} />;
}

function DividendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MarketDividendPoint;
  return (
    <TooltipShell
      label={label}
      rows={[
        {
          label: "Valor unitário",
          value: formatCurrency(point.unit_value),
          color: "#fbbf24",
        },
        {
          label: "Acumulado",
          value: formatCurrency(point.cumulative_unit_value),
          color: "#22c55e",
        },
        { label: "Evento", value: point.corporate_action },
      ]}
    />
  );
}
