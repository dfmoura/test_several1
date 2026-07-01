import { TrendingUp, Coins, Layers, ArrowUpRight } from "lucide-react";
import { TickerCard as TickerCardType } from "../api";
import { formatCurrency, formatNumber } from "../utils";

interface Props {
  data: TickerCardType;
  onClick: () => void;
}

export function TickerCard({ data, onClick }: Props) {
  const yieldOnCost =
    data.total_invested > 0
      ? (data.total_income / data.total_invested) * 100
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface-800/90 p-5 text-left shadow-card transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-glow"
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-accent/10 blur-2xl transition group-hover:bg-accent/20" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-bold tracking-tight text-white">
            {data.ticker}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
            {data.company_name}
          </p>
        </div>
        <ArrowUpRight
          size={18}
          className="text-slate-500 transition group-hover:text-accent"
        />
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-4">
        <Metric
          icon={<Layers size={14} />}
          label="Quantidade"
          value={formatNumber(data.quantity, data.quantity % 1 ? 2 : 0)}
        />
        <Metric
          icon={<TrendingUp size={14} />}
          label="Preço atual"
          value={formatCurrency(data.current_price)}
        />
        <Metric
          icon={<Coins size={14} />}
          label="Proventos pagos"
          value={formatCurrency(data.total_income)}
          highlight
        />
        <Metric
          label="Valor em carteira"
          value={formatCurrency(data.market_value)}
        />
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-500">
        <span>Investido: {formatCurrency(data.total_invested)}</span>
        {yieldOnCost !== null && (
          <span className="rounded-full bg-accent/10 px-2 py-1 font-medium text-accent-glow">
            Yield {yieldOnCost.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={`font-mono text-sm font-semibold ${
          highlight ? "text-gold" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
