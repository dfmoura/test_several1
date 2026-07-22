import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { formatPeriod } from "../utils";
import { PatrimonyComparisonChart } from "./PatrimonyComparisonChart";

function formatRate(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function PortfolioComparisonSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio-comparison"],
    queryFn: api.getPortfolioComparison,
  });

  if (isLoading) {
    return (
      <section className="mb-8 rounded-2xl border border-white/5 bg-surface-800/40 px-6 py-10 text-center text-slate-400">
        Carregando comparativo da carteira...
      </section>
    );
  }

  if (isError || !data?.timeline.length) return null;

  const chartData = data.timeline.map((point) => ({
    label: formatPeriod(point.period),
    asset_patrimony: point.asset_patrimony,
    savings_patrimony: point.savings_patrimony,
    selic_patrimony: point.selic_patrimony,
    bitcoin_patrimony: point.bitcoin_patrimony,
  }));

  return (
    <section className="mb-8">
      <PatrimonyComparisonChart
        data={chartData}
        savingsAdvantage={data.comparison_advantage}
        selicAdvantage={data.selic_advantage}
        savingsRate={data.savings_monthly_rate_pct}
        selicRate={data.selic_monthly_rate_pct}
        bitcoinAdvantage={data.bitcoin_advantage}
        bitcoinRate={data.bitcoin_monthly_rate_pct}
        bitcoinAvailable={data.bitcoin_available}
        title="Carteira vs benchmarks"
        subtitle={`Consolidado de todos os tickers — taxas BCB: poupança ${formatRate(data.savings_monthly_rate_pct)}% · Selic ${formatRate(data.selic_monthly_rate_pct)}% a.m.`}
      />
    </section>
  );
}
