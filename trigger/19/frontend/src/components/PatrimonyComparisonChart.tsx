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
import { formatCurrency } from "../utils";

export interface PatrimonyPoint {
  label: string;
  asset_patrimony: number;
  savings_patrimony: number;
  cdi_patrimony: number;
}

interface Props {
  data: PatrimonyPoint[];
  savingsAdvantage: number;
  cdiAdvantage: number;
  savingsRate: number;
  cdiRate: number;
  title?: string;
  subtitle?: string;
}

function formatRate(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function PatrimonyComparisonChart({
  data,
  savingsAdvantage,
  cdiAdvantage,
  savingsRate,
  cdiRate,
  title = "Ativo vs benchmarks",
  subtitle,
}: Props) {
  const resolvedSubtitle =
    subtitle ??
    `Mesmos aportes e resgates — poupança ${formatRate(savingsRate)}% a.m. · CDI ${formatRate(cdiRate)}% a.m.`;

  if (!data.length) return null;

  return (
    <section className="rounded-2xl border border-white/5 bg-surface-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{resolvedSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdvantageBadge value={cdiAdvantage} label="CDI" />
          <AdvantageBadge value={savingsAdvantage} label="poupança" muted />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243352" />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
          />
          <Tooltip content={<PatrimonyTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="asset_patrimony"
            name="Ativo (aportes + proventos)"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cdi_patrimony"
            name="CDI"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="savings_patrimony"
            name="Poupança"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

function AdvantageBadge({
  value,
  label,
  muted,
}: {
  value: number;
  label: string;
  muted?: boolean;
}) {
  const ahead = value >= 0;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ahead
          ? muted
            ? "bg-white/5 text-slate-300"
            : "bg-accent/10 text-accent-glow"
          : "bg-orange-500/10 text-orange-300"
      }`}
    >
      {ahead ? "+" : ""}
      {formatCurrency(value)} vs {label}
    </span>
  );
}

function PatrimonyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as PatrimonyPoint;
  const diffCdi = point.asset_patrimony - point.cdi_patrimony;
  const diffSavings = point.asset_patrimony - point.savings_patrimony;

  return (
    <div className="rounded-xl border border-[#243352] bg-[#111b2e] px-4 py-3 shadow-xl">
      {label && <p className="mb-2 text-sm font-medium text-slate-300">{label}</p>}
      <div className="space-y-1.5 text-sm">
        <TooltipRow
          label="Patrimônio no ativo"
          value={formatCurrency(point.asset_patrimony)}
          color="#22c55e"
        />
        <TooltipRow
          label="Patrimônio no CDI"
          value={formatCurrency(point.cdi_patrimony)}
          color="#3b82f6"
        />
        <TooltipRow
          label="Patrimônio na poupança"
          value={formatCurrency(point.savings_patrimony)}
          color="#64748b"
        />
        <TooltipRow
          label="Diferença vs CDI"
          value={`${diffCdi >= 0 ? "+" : ""}${formatCurrency(diffCdi)}`}
        />
        <TooltipRow
          label="Diferença vs poupança"
          value={`${diffSavings >= 0 ? "+" : ""}${formatCurrency(diffSavings)}`}
        />
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-slate-400">
        {color && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
