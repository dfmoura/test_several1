import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LineChart, Upload, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "./api";
import { TickerCard } from "./components/TickerCard";
import { TickerModal } from "./components/TickerModal";
import { PortfolioComparisonSection } from "./components/PortfolioComparisonSection";
import { UploadZone } from "./components/UploadZone";
import { formatCurrency } from "./utils";

export default function App() {
  const queryClient = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  const importMutation = useMutation({
    mutationFn: api.importFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-comparison"] });
    },
  });

  const filteredTickers = useMemo(() => {
    const tickers = dashboardQuery.data?.tickers ?? [];
    const term = search.trim().toUpperCase();
    if (!term) return tickers;
    return tickers.filter(
      (t) =>
        t.ticker.includes(term) ||
        t.company_name.toUpperCase().includes(term),
    );
  }, [dashboardQuery.data?.tickers, search]);

  const activePositions = filteredTickers.filter((t) => t.quantity > 0).length;
  const hasData = (dashboardQuery.data?.tickers.length ?? 0) > 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
              <Wallet size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Carteira Previdenciária
              </p>
              <h1 className="text-xl font-semibold text-white">B3 Dashboard</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Buscar ticker ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-xl border border-white/10 bg-surface-800 px-4 py-2.5 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface-900 transition hover:bg-accent-glow">
              <Upload size={16} />
              Importar XLSX
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importMutation.mutate(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <UploadZone
          isUploading={importMutation.isPending}
          result={importMutation.data}
          error={importMutation.error?.message}
        />

        {dashboardQuery.isLoading && (
          <div className="grid place-items-center py-24 text-slate-400">
            Carregando carteira...
          </div>
        )}

        {dashboardQuery.isError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-200">
            Erro ao carregar dashboard. Verifique se a API está ativa.
          </div>
        )}

        {dashboardQuery.data && (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryKpi
                label="Total investido"
                value={formatCurrency(dashboardQuery.data.total_invested)}
                icon={<BarChart3 size={18} />}
              />
              <SummaryKpi
                label="Total liquidado"
                value={formatCurrency(dashboardQuery.data.total_liquidated)}
                icon={<LineChart size={18} />}
              />
              <SummaryKpi
                label="Proventos recebidos"
                value={formatCurrency(dashboardQuery.data.total_income)}
                accent
                icon={<Wallet size={18} />}
              />
              <SummaryKpi
                label="Posições ativas"
                value={String(activePositions)}
                subtitle={`${filteredTickers.length} tickers na base`}
              />
            </section>

            {hasData && <PortfolioComparisonSection />}

            {!hasData ? (
              <EmptyState />
            ) : (
              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredTickers.map((ticker) => (
                  <TickerCard
                    key={ticker.ticker}
                    data={ticker}
                    onClick={() => setSelectedTicker(ticker.ticker)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {selectedTicker && (
        <TickerModal
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
}

function SummaryKpi({
  label,
  value,
  subtitle,
  accent,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface-800/80 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between text-slate-400">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p
        className={`font-mono text-2xl font-semibold ${
          accent ? "text-accent-glow" : "text-white"
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-surface-800/40 px-8 py-20 text-center">
      <h2 className="text-2xl font-semibold text-white">
        Importe sua movimentação B3
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-slate-400">
        Baixe o XLSX na Área do Investidor (Movimentação da conta) e envie
        aqui. O sistema extrai os tickers, calcula posição e consolida
        proventos automaticamente.
      </p>
    </div>
  );
}
