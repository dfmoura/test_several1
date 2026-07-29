"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  brl,
  fmtDate,
  statusChipClass,
  statusPagarLabel,
  statusReceberLabel,
  type FinanceiroDashboard,
  type MovimentoRow,
  type SugestaoConciliacao,
  type TabId,
  type TituloPagarRow,
  type TituloReceberRow,
} from "./financeiro-types";

const VALID_TABS: TabId[] = ["visao", "receber", "pagar", "banco", "fluxo"];

function parseTab(raw: string | null): TabId {
  if (raw && VALID_TABS.includes(raw as TabId)) return raw as TabId;
  return "visao";
}

function canFinance(role: string) {
  return role === "ADMIN" || role === "FINANCEIRO";
}

export function FinanceiroClient({ name, role }: { name: string; role: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTabState] = useState<TabId>(() => parseTab(searchParams.get("tab")));
  const [dash, setDash] = useState<FinanceiroDashboard | null>(null);
  const [receber, setReceber] = useState<TituloReceberRow[]>([]);
  const [pagar, setPagar] = useState<TituloPagarRow[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoRow[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoConciliacao[]>([]);
  const [filtroAr, setFiltroAr] = useState("abertos");
  const [filtroAp, setFiltroAp] = useState("abertos");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setTab(next: TabId) {
    setTabState(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/financeiro?${params.toString()}`, { scroll: false });
  }

  const loadDash = useCallback(async () => {
    const r = await fetch("/api/financeiro?tipo=dashboard");
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Falha ao carregar dashboard");
    setDash(j);
  }, []);

  const loadReceber = useCallback(async () => {
    const r = await fetch(`/api/financeiro?tipo=receber&filtro=${filtroAr}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Falha AR");
    setReceber(j.items || []);
  }, [filtroAr]);

  const loadPagar = useCallback(async () => {
    const r = await fetch(`/api/financeiro?tipo=pagar&filtro=${filtroAp}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Falha AP");
    setPagar(j.items || []);
  }, [filtroAp]);

  const loadBanco = useCallback(async () => {
    const r = await fetch("/api/financeiro?tipo=movimentos&pendentes=0");
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Falha extrato");
    setMovimentos(j.items || []);
    setSugestoes(j.sugestoes || []);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadDash();
      if (tab === "receber") await loadReceber();
      if (tab === "pagar") await loadPagar();
      if (tab === "banco") await loadBanco();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [tab, loadDash, loadReceber, loadPagar, loadBanco]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTabState(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  async function postAcao(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha na operação");
      setMsg(
        body.acao === "sincronizar_extrato"
          ? `Extrato sincronizado · ${j.importados} novo(s), ${j.ignorados} já existente(s)`
          : "Operação concluída",
      );
      await load();
      if (tab !== "banco" && body.acao === "sincronizar_extrato") {
        await loadBanco();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  const fluxoSpark = useMemo(() => {
    if (!dash?.fluxo?.dias?.length) return null;
    const vals = dash.fluxo.dias.map((d) => d.acumulado);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const w = 280;
    const h = 56;
    const pts = vals
      .map((v, i) => {
        const x = (i / Math.max(1, vals.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");
    return { pts, w, h, min, max };
  }, [dash]);

  const tabs: { id: TabId; label: string; hint?: string }[] = [
    { id: "visao", label: "Visão geral" },
    { id: "receber", label: "A receber", hint: dash ? String(dash.kpi.qtdReceber) : undefined },
    { id: "pagar", label: "A pagar", hint: dash ? String(dash.kpi.qtdPagar) : undefined },
    {
      id: "banco",
      label: "Banco · Extrato",
      hint: dash?.kpi.pendentesConciliacao
        ? String(dash.kpi.pendentesConciliacao)
        : undefined,
    },
    { id: "fluxo", label: "Fluxo de caixa" },
  ];

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="Tesouraria · ciclo vinculado"
        title="Financeiro"
        subtitle={
          <>
            Contas a receber (Bolepix), contas a pagar (NF entrada), saldo e extrato Inter com
            conciliação. APIs:{" "}
            {dash ? (
              <>
                <a href={dash.hubs.cobranca} target="_blank" rel="noreferrer">
                  Cobrança
                </a>
                {" · "}
                <a href={dash.hubs.extrato} target="_blank" rel="noreferrer">
                  Extrato
                </a>
                {" · "}
                <a href={dash.hubs.saldo} target="_blank" rel="noreferrer">
                  Saldo
                </a>
              </>
            ) : (
              "Inter Banking"
            )}
          </>
        }
        actions={
          <>
            <Link className="btn secondary-link" href="/pedidos">
              Pedidos · NF · Boleto
            </Link>
            <Link className="btn secondary-link" href="/compras?tab=entradas">
              Compras · entradas
            </Link>
            {canFinance(role) ? (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => postAcao({ acao: "sincronizar_extrato" })}
              >
                Sincronizar extrato Inter
              </button>
            ) : null}
          </>
        }
      />

      {error ? <p className="alert">{error}</p> : null}
      {msg ? <p className="alert-ok">{msg}</p> : null}

      {dash ? (
        <div className="fin-kpi" aria-label="Indicadores financeiros">
          <div className="fin-kpi-card fin-kpi-saldo">
            <span>Saldo disponível · Inter</span>
            <strong className="money">{brl(dash.kpi.saldoDisponivel)}</strong>
            <em>
              {dash.conta.bancoNome} {dash.conta.simulado ? "· simulado" : ""}
            </em>
          </div>
          <div className="fin-kpi-card">
            <span>A receber</span>
            <strong className="money">{brl(dash.kpi.aReceber)}</strong>
            <em>
              {dash.kpi.qtdReceber} título(s)
              {dash.kpi.vencidoReceber > 0
                ? ` · ${brl(dash.kpi.vencidoReceber)} vencido`
                : ""}
            </em>
          </div>
          <div className="fin-kpi-card">
            <span>A pagar</span>
            <strong className="money">{brl(dash.kpi.aPagar)}</strong>
            <em>
              {dash.kpi.qtdPagar} título(s)
              {dash.kpi.vencidoPagar > 0 ? ` · ${brl(dash.kpi.vencidoPagar)} vencido` : ""}
            </em>
          </div>
          <div className="fin-kpi-card">
            <span>Posição líquida</span>
            <strong className="money">{brl(dash.kpi.posicaoLiquida)}</strong>
            <em>Saldo + AR − AP</em>
          </div>
        </div>
      ) : (
        <p className="muted">Carregando posição financeira…</p>
      )}

      <div className="compras-tabs fin-tabs" role="tablist" aria-label="Módulo financeiro">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "is-active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.hint && Number(t.hint) > 0 ? (
              <span className="fin-tab-badge">{t.hint}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "visao" && dash ? (
        <section className="fin-grid-2">
          <article className="card-panel">
            <h2>Aging · a receber</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Distribuição por atraso — títulos abertos do ciclo de vendas.
            </p>
            <AgingBars buckets={dash.agingReceber} tone="in" />
          </article>
          <article className="card-panel">
            <h2>Aging · a pagar</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Obrigações de compra (NF entrada → título).
            </p>
            <AgingBars buckets={dash.agingPagar} tone="out" />
          </article>
          <article className="card-panel fin-span-2">
            <div className="fin-panel-head">
              <div>
                <h2>Caixa projetado · 30 dias</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  Entradas (AR) − saídas (AP) sobre o saldo Inter. Final:{" "}
                  <strong className="money">{brl(dash.fluxo.saldoFinal)}</strong>
                </p>
              </div>
              {fluxoSpark ? (
                <svg
                  className="fin-spark"
                  viewBox={`0 0 ${fluxoSpark.w} ${fluxoSpark.h}`}
                  width={fluxoSpark.w}
                  height={fluxoSpark.h}
                  aria-hidden
                >
                  <polyline
                    fill="none"
                    stroke="var(--brand-blue)"
                    strokeWidth="2.5"
                    points={fluxoSpark.pts}
                  />
                </svg>
              ) : null}
            </div>
            <div className="fin-fluxo-mini">
              {dash.fluxo.dias
                .filter((_, i) => i % 3 === 0 || i === dash.fluxo.dias.length - 1)
                .map((d) => (
                  <div key={d.data} className="fin-fluxo-day">
                    <span>{fmtDate(d.data)}</span>
                    <strong className={d.liquido >= 0 ? "fin-pos" : "fin-neg"}>
                      {brl(d.liquido)}
                    </strong>
                  </div>
                ))}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "receber" ? (
        <section className="card-panel">
          <div className="fin-toolbar">
            <h2 style={{ margin: 0 }}>Contas a receber</h2>
            <div className="fin-filters">
              {(
                [
                  ["abertos", "Abertos"],
                  ["vencidos", "Vencidos"],
                  ["pagos", "Liquidados"],
                  ["todos", "Todos"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={filtroAr === v ? "btn" : "btn secondary-link"}
                  onClick={() => setFiltroAr(v === "todos" ? "" : v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Aberto</th>
                  <th>Status</th>
                  <th>Cobrança</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {receber.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      Nenhum título neste filtro.
                    </td>
                  </tr>
                ) : (
                  receber.map((t) => (
                    <tr key={t.id} className={t.diasAtraso > 0 && t.valorAberto > 0 ? "fin-row-late" : ""}>
                      <td>PV-{t.pedidoNumero}</td>
                      <td>{t.clienteNome}</td>
                      <td>
                        {fmtDate(t.vencimento)}
                        {t.diasAtraso > 0 && t.valorAberto > 0 ? (
                          <span className="fin-late-tag"> +{t.diasAtraso}d</span>
                        ) : null}
                      </td>
                      <td className="money">{brl(t.valor)}</td>
                      <td className="money">{brl(t.valorAberto)}</td>
                      <td>
                        <span className={statusChipClass(t.status)}>
                          {statusReceberLabel(t.status)}
                        </span>
                      </td>
                      <td>
                        {t.cobranca ? (
                          <span className="muted">
                            {t.cobranca.status}
                            {t.cobranca.simulado ? " · sim" : ""}
                            {t.cobranca.temPix ? " · Pix" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Link href={`/pedidos/${t.pedidoId}`}>Abrir</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "pagar" ? (
        <section className="card-panel">
          <div className="fin-toolbar">
            <h2 style={{ margin: 0 }}>Contas a pagar</h2>
            <div className="fin-filters">
              {(
                [
                  ["abertos", "Abertos"],
                  ["vencidos", "Vencidos"],
                  ["pagos", "Pagos"],
                  ["todos", "Todos"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={filtroAp === v ? "btn" : "btn secondary-link"}
                  onClick={() => setFiltroAp(v === "todos" ? "" : v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Aberto</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagar.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      Nenhum título. Ao lançar estoque de NF de entrada, o AP é gerado
                      automaticamente.
                    </td>
                  </tr>
                ) : (
                  pagar.map((t) => (
                    <tr key={t.id} className={t.diasAtraso > 0 && t.valorAberto > 0 ? "fin-row-late" : ""}>
                      <td>
                        {t.fornecedorNome}
                        {t.pedidoCompraNumero != null ? (
                          <div className="muted">PC-{t.pedidoCompraNumero}</div>
                        ) : null}
                      </td>
                      <td>{t.descricao}</td>
                      <td>
                        {fmtDate(t.vencimento)}
                        {t.diasAtraso > 0 && t.valorAberto > 0 ? (
                          <span className="fin-late-tag"> +{t.diasAtraso}d</span>
                        ) : null}
                      </td>
                      <td className="money">{brl(t.valor)}</td>
                      <td className="money">{brl(t.valorAberto)}</td>
                      <td>
                        <span className={statusChipClass(t.status)}>
                          {statusPagarLabel(t.status)}
                        </span>
                      </td>
                      <td>
                        {canFinance(role) && t.valorAberto > 0 ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={() =>
                              postAcao({ acao: "baixar_pagar", tituloId: t.id })
                            }
                          >
                            Pagar
                          </button>
                        ) : t.pagoEm ? (
                          <span className="muted">{fmtDate(t.pagoEm)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "banco" ? (
        <section className="fin-grid-2">
          <article className="card-panel">
            <div className="fin-toolbar">
              <div>
                <h2 style={{ margin: 0 }}>Extrato · Inter</h2>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  {dash?.conta.apelido} · conciliação com AR/AP
                </p>
              </div>
              {canFinance(role) ? (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => postAcao({ acao: "sincronizar_extrato" })}
                >
                  Atualizar
                </button>
              ) : null}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Histórico</th>
                    <th>Valor</th>
                    <th>Conciliação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {movimentos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Sem movimentos. Sincronize o extrato após liquidações.
                      </td>
                    </tr>
                  ) : (
                    movimentos.map((m) => (
                      <tr key={m.id}>
                        <td>{fmtDate(m.dataEntrada)}</td>
                        <td>
                          <span
                            className={
                              m.tipoOperacao === "CREDITO" ? "fin-pos" : "fin-neg"
                            }
                          >
                            {m.tipoOperacao === "CREDITO" ? "C" : "D"} · {m.tipoTransacao}
                          </span>
                        </td>
                        <td>
                          <div>{m.titulo}</div>
                          <div className="muted">{m.descricao}</div>
                          {m.matchLabel ? (
                            <div className="fin-match">{m.matchLabel}</div>
                          ) : null}
                        </td>
                        <td className="money">{brl(m.valor)}</td>
                        <td>
                          <span
                            className={
                              m.conciliado
                                ? "chip chip-status-aprovado"
                                : m.conciliacaoStatus === "IGNORADO"
                                  ? "chip chip-soft"
                                  : "chip chip-status-enviado"
                            }
                          >
                            {m.conciliado
                              ? "Conciliado"
                              : m.conciliacaoStatus === "IGNORADO"
                                ? "Ignorado"
                                : "Pendente"}
                          </span>
                        </td>
                        <td>
                          {canFinance(role) && !m.conciliado && m.conciliacaoStatus !== "IGNORADO" ? (
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy}
                              onClick={() =>
                                postAcao({
                                  acao: "conciliar",
                                  movimentoId: m.id,
                                  ignorar: true,
                                })
                              }
                            >
                              Ignorar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
          <article className="card-panel">
            <h2>Sugestões de matching</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Pareamento automático por valor (confiança alta).
            </p>
            {sugestoes.length === 0 ? (
              <p className="muted">Nenhuma sugestão no momento.</p>
            ) : (
              <ul className="fin-sugestoes">
                {sugestoes.map((s) => (
                  <li key={s.movimentoId}>
                    <div>
                      <strong>{s.confianca === "alta" ? "Alta" : "Média"}</strong>
                      <span className="muted"> — {s.motivo}</span>
                    </div>
                    {canFinance(role) ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          postAcao({
                            acao: "conciliar",
                            movimentoId: s.movimentoId,
                            tituloReceberId: s.tituloReceberId,
                            tituloPagarId: s.tituloPagarId,
                          })
                        }
                      >
                        Conciliar
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {dash ? (
              <p className="fin-hub-foot">
                <a href={dash.hubs.saldo} target="_blank" rel="noreferrer">
                  API Saldo
                </a>
                {" · "}
                <a href={dash.hubs.extrato} target="_blank" rel="noreferrer">
                  API Extrato
                </a>
                {" · "}
                <a href={dash.hubs.cobranca} target="_blank" rel="noreferrer">
                  API Cobrança Bolepix
                </a>
              </p>
            ) : null}
          </article>
        </section>
      ) : null}

      {tab === "fluxo" && dash ? (
        <section className="card-panel">
          <h2>Fluxo de caixa · 30 dias</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Saldo inicial {brl(dash.fluxo.saldoInicial)} · entradas{" "}
            {brl(dash.fluxo.totalEntradas)} · saídas {brl(dash.fluxo.totalSaidas)} · saldo
            projetado <strong className="money">{brl(dash.fluxo.saldoFinal)}</strong>
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Entradas (AR)</th>
                  <th>Saídas (AP)</th>
                  <th>Líquido</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dash.fluxo.dias.map((d) => (
                  <tr key={d.data}>
                    <td>{fmtDate(d.data)}</td>
                    <td className="money fin-pos">
                      {d.entradas > 0 ? brl(d.entradas) : "—"}
                    </td>
                    <td className="money fin-neg">
                      {d.saidas > 0 ? brl(d.saidas) : "—"}
                    </td>
                    <td className={`money ${d.liquido >= 0 ? "fin-pos" : "fin-neg"}`}>
                      {brl(d.liquido)}
                    </td>
                    <td className="money">{brl(d.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function AgingBars({
  buckets,
  tone,
}: {
  buckets: FinanceiroDashboard["agingReceber"];
  tone: "in" | "out";
}) {
  const max = Math.max(1, ...buckets.map((b) => b.valor));
  return (
    <ul className="fin-aging">
      {buckets.map((b) => (
        <li key={b.id}>
          <div className="fin-aging-meta">
            <span>{b.label}</span>
            <strong className="money">{brl(b.valor)}</strong>
          </div>
          <div className="fin-aging-track" aria-hidden>
            <div
              className={`fin-aging-fill fin-aging-${tone}${b.id !== "a_vencer" && b.valor > 0 ? " is-late" : ""}`}
              style={{ width: `${Math.round((b.valor / max) * 100)}%` }}
            />
          </div>
          <span className="muted fin-aging-qty">{b.quantidade} tít.</span>
        </li>
      ))}
    </ul>
  );
}
