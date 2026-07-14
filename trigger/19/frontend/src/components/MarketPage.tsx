import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { api, MarketTickerRow, PriceDirection } from "../api";
import { formatCurrency, formatPercent } from "../utils";
import { MarketDetailModal } from "./MarketDetailModal";

export function MarketPage() {
  const queryClient = useQueryClient();
  const [tickerInput, setTickerInput] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const marketQuery = useQuery({
    queryKey: ["market-tickers"],
    queryFn: api.getMarketTickers,
    refetchInterval: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: api.addMarketTicker,
    onSuccess: () => {
      setTickerInput("");
      queryClient.invalidateQueries({ queryKey: ["market-tickers"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: api.removeMarketTicker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-tickers"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: api.getMarketTickers,
    onSuccess: (data) => {
      queryClient.setQueryData(["market-tickers"], data);
    },
  });

  const rows = marketQuery.data ?? [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker || addMutation.isPending) return;
    addMutation.mutate(ticker);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/5 bg-surface-800/80 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Watchlist de mercado
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              Tickers monitorados
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Informe um ticker B3 para carregar histórico oficial (COTAHIST),
              proventos da B3 e intraday do dia corrente. Os dados ficam na base
              para consulta rápida.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending || marketQuery.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-accent/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshMutation.isPending || marketQuery.isFetching
                  ? "animate-spin"
                  : ""
              }
            />
            Atualizar intraday
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Ex.: PETR4, VALE3, BBAS3"
              maxLength={12}
              className="w-full rounded-xl border border-white/10 bg-surface-900 py-3 pl-11 pr-4 font-mono text-sm uppercase outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={!tickerInput.trim() || addMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-surface-900 transition hover:bg-accent-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {addMutation.isPending ? "Carregando histórico..." : "Adicionar ticker"}
          </button>
        </form>

        {addMutation.isPending && (
          <p className="mt-3 text-sm text-slate-400">
            Baixando série histórica COTAHIST e proventos B3. Na primeira carga
            do ano isso pode levar alguns minutos.
          </p>
        )}

        {addMutation.isError && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {addMutation.error.message}
          </p>
        )}
      </section>

      {marketQuery.isLoading && (
        <div className="grid place-items-center py-20 text-slate-400">
          Carregando mercado...
        </div>
      )}

      {marketQuery.isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-200">
          Erro ao carregar tickers de mercado.
        </div>
      )}

      {!marketQuery.isLoading && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/10 bg-surface-800/40 px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-semibold text-white">
            Nenhum ticker no mercado
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-slate-400">
            Adicione um ticker acima para montar a tabela com preço intraday,
            proventos dos últimos 12 meses e yield.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-white/5 bg-surface-800/80 shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/5 bg-surface-900/60 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Ticker</th>
                  <th className="px-6 py-4 font-medium">Preço atual</th>
                  <th className="px-6 py-4 font-medium">Proventos</th>
                  <th className="px-6 py-4 font-medium">Yield</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <MarketRow
                    key={row.ticker}
                    row={row}
                    onOpen={() => setSelectedTicker(row.ticker)}
                    onRemove={() => removeMutation.mutate(row.ticker)}
                    removing={
                      removeMutation.isPending &&
                      removeMutation.variables === row.ticker
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/5 px-6 py-3 text-xs text-slate-500">
            Proventos = últimos 12 meses por ação · Yield = proventos / preço
            atual · Clique na linha para o dashboard detalhado
          </div>
        </section>
      )}

      {selectedTicker && (
        <MarketDetailModal
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
}

function MarketRow({
  row,
  onOpen,
  onRemove,
  removing,
}: {
  row: MarketTickerRow;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <tr
      className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
      onClick={onOpen}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-mono text-lg font-semibold text-white">
              {row.ticker}
            </p>
            <p className="line-clamp-1 text-xs text-slate-500">
              {row.company_name}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <PriceCell
          price={row.current_price}
          previous={row.previous_price}
          direction={row.price_direction}
        />
      </td>
      <td className="px-6 py-4">
        <p className="font-mono text-sm font-semibold text-gold">
          {formatCurrency(row.dividends_12m)}
        </p>
        <p className="text-xs text-slate-500">últimos 12 meses</p>
      </td>
      <td className="px-6 py-4">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 font-mono text-sm font-semibold text-accent-glow">
          {formatPercent(row.yield_ratio)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-accent/40 hover:text-accent"
            title="Abrir dashboard"
          >
            <ArrowUpRight size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={removing}
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
            title="Remover"
          >
            {removing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function PriceCell({
  price,
  previous,
  direction,
}: {
  price: number | null;
  previous: number | null;
  direction: PriceDirection;
}) {
  const delta =
    price != null && previous != null ? price - previous : null;
  const deltaPct =
    delta != null && previous != null && previous !== 0
      ? delta / previous
      : null;

  const tone =
    direction === "up"
      ? "text-accent-glow"
      : direction === "down"
        ? "text-red-400"
        : "text-slate-200";

  const bg =
    direction === "up"
      ? "bg-accent/10"
      : direction === "down"
        ? "bg-red-500/10"
        : "bg-white/5";

  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : direction === "flat"
          ? Minus
          : ArrowRight;

  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-1 ${bg}`}>
        <Icon size={16} className={tone} />
        <span className={`font-mono text-sm font-semibold ${tone}`}>
          {formatCurrency(price)}
        </span>
      </div>
      {delta != null && (
        <p className={`text-xs font-mono ${tone}`}>
          {delta > 0 ? "+" : ""}
          {formatCurrency(delta)}
          {deltaPct != null && ` (${formatPercent(deltaPct)})`}
        </p>
      )}
    </div>
  );
}
