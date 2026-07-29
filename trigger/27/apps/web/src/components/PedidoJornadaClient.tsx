"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StepRail } from "@/components/StepRail";
import { formatBrl, formatQtde } from "@/lib/orcamento-comercial";
import type {
  FluxoEtapa,
  MovimentoFinanceiroVisual,
  TimelineEvent,
} from "@/lib/pedido-fluxo";

type PedidoJornada = {
  id: string;
  numero: number;
  status: string;
  statusLabel: string;
  clienteNome: string;
  vendedorNome: string;
  quantidade: number;
  valorTotal: number;
  condicaoPagamento: string | null;
  observacoes?: string | null;
  orcamento: { id: string; numero: number; versao: number } | null;
  confirmadoEm: string | null;
  faturadoEm: string | null;
  entregueEm: string | null;
  liquidadoEm: string | null;
  createdAt: string;
  specs?: Array<{ label: string; value: string }>;
  fiscalPlanejado?: {
    emitirNfse: boolean;
    emitirNfe: boolean;
    tipos: string[];
    labelCta: string;
    resumo: string;
    valorNfse: number | null;
    valorNfe: number | null;
    discriminacao?: string | null;
  } | null;
  producao?: {
    qtdeRolos: number | null;
    metragemM2: number | null;
    qtdeCaixas: number | null;
  } | null;
  itens: Array<{
    id?: string;
    descricao: string;
    quantidade: number;
    valorUnitario?: number;
    valorTotal: number;
    unidade?: string;
    documentoSaidaPadrao?: string | null;
    tipoProduto?: string | null;
    ordem?: number;
  }>;
  ordensServico: Array<{
    id: string;
    numero: number;
    status: string;
    statusLabel: string;
    iniciadoEm: string | null;
    concluidoEm: string | null;
    necessidades: Array<{
      id: string;
      descricao: string;
      qtdNecessaria: number;
      qtdReservada: number;
      qtdAtendida: number;
      status: string;
      unidade: string;
      produtoCodigo: string | null;
    }>;
  }>;
  necessidadesCompra: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    status: string;
  }>;
  docsEntrada: Array<{
    id: string;
    numero: string | null;
    emitenteNome: string | null;
    valorTotal: number | null;
    status: string;
    lancadoEm: string | null;
    itens: Array<{ descricao: string; quantidade: number; status: string }>;
  }>;
  docsSaida: Array<{
    id: string;
    tipo: string;
    status: string;
    numero: string | null;
    serie: string | null;
    chave: string | null;
    discriminacao: string | null;
    valorTotal: number;
    simulado: boolean;
    autorizadoEm: string | null;
    temXml: boolean;
  }>;
  docSaida: {
    id: string;
    tipo: string;
    status: string;
    numero: string | null;
    serie: string | null;
    chave: string | null;
    discriminacao: string | null;
    valorTotal: number;
    simulado: boolean;
    autorizadoEm: string | null;
    temXml: boolean;
  } | null;
  tituloReceber: {
    id: string;
    valor: number;
    vencimento: string;
    status: string;
    pagoEm: string | null;
    cobranca: {
      linhaDigitavel: string | null;
      pixCopiaECola: string | null;
      nossoNumero: string | null;
      codigoSolicitacao: string | null;
      status: string;
      simulado: boolean;
    } | null;
  } | null;
  entrega: {
    dataEntrega: string;
    modalidade: string | null;
    volumes: number | null;
    rolos: number | null;
    caixas: number | null;
  } | null;
  fluxo: {
    etapas: FluxoEtapa[];
    timeline: TimelineEvent[];
    movimentos: MovimentoFinanceiroVisual[];
  };
};

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matTone(status: string) {
  if (status === "OK" || status === "ATENDIDA") return "done";
  if (status === "PARCIAL") return "current";
  if (status === "SEM_PRODUTO") return "blocked";
  return "pending";
}

export function PedidoJornadaClient({
  id,
  name,
  role,
}: {
  id: string;
  name: string;
  role: string;
}) {
  const [pedido, setPedido] = useState<PedidoJornada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pedidos/${id}`);
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Pedido não encontrado");
      return;
    }
    setPedido(j);
    setError(null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: string, path: "main" | "ops" = "main") {
    setBusy(action);
    setError(null);
    try {
      const url = path === "ops" ? `/api/pedidos/${id}/operacoes` : `/api/pedidos/${id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  async function osAct(osId: string, action: "iniciar" | "concluir") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: osId, action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  if (!pedido && !error) {
    return (
      <div className="shell">
        <AppHeader name={name} role={role} />
        <p className="muted">Carregando jornada do pedido…</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="shell">
        <AppHeader name={name} role={role} />
        <p className="error">{error}</p>
        <Link href="/pedidos">← Pedidos</Link>
      </div>
    );
  }

  const os = pedido.ordensServico[0];
  const fluxo = pedido.fluxo;
  const fiscal = pedido.fiscalPlanejado;
  const faltaMaterial =
    !!os &&
    (os.status === "AGUARDANDO_MATERIAL" ||
      os.necessidades.some((n) => n.status === "FALTA" || n.status === "PARCIAL") ||
      pedido.necessidadesCompra.some(
        (n) => n.status === "ABERTA" || n.status === "EM_COMPRA",
      ));
  const comprasHref = `/compras?tab=necessidades&pedido=${encodeURIComponent(pedido.id)}`;
  const nextCta = (() => {
    if (pedido.status === "RASCUNHO") {
      return { label: "Confirmar pedido + gerar OS", onClick: () => act("confirmar") };
    }
    if (os?.status === "LIBERADA") {
      return { label: "Iniciar produção", onClick: () => osAct(os.id, "iniciar") };
    }
    if (os?.status === "EM_PRODUCAO") {
      return { label: "Concluir produção", onClick: () => osAct(os.id, "concluir") };
    }
    if (
      ["CONFIRMADO", "EM_PRODUCAO"].includes(pedido.status) &&
      pedido.ordensServico.every((o) => o.status === "CONCLUIDA")
    ) {
      return {
        label: fiscal?.labelCta || "5–6. Faturar — NF + boleto",
        onClick: () => act("faturar", "ops"),
      };
    }
    if (pedido.status === "FATURADO" && !pedido.entrega) {
      return { label: "7. Registrar entrega", onClick: () => act("entregar", "ops") };
    }
    if (
      (pedido.status === "ENTREGUE" || pedido.entrega) &&
      pedido.tituloReceber &&
      pedido.tituloReceber.status !== "PAGO"
    ) {
      return { label: "8. Baixar recebimento", onClick: () => act("receber", "ops") };
    }
    return null;
  })();

  return (
    <div className="shell shell-wide">
      <AppHeader name={name} role={role} />

      <p className="muted" style={{ marginBottom: "0.5rem" }}>
        <Link href="/pedidos">← Pedidos</Link>
        {pedido.orcamento && (
          <>
            {" · "}
            <Link href={`/orcamentos/${pedido.orcamento.id}`}>
              Orçamento {pedido.orcamento.numero}
            </Link>
          </>
        )}
      </p>

      <header className="jornada-hero">
        <div>
          <p className="jornada-kicker">4–8 · Operação</p>
          <h1>
            Pedido {pedido.numero}
            <span className={`chip chip-status-${pedido.status.toLowerCase()}`}>
              {pedido.statusLabel}
            </span>
          </h1>
          <p className="jornada-sub">
            <strong>{pedido.clienteNome}</strong>
            <span className="muted">
              {" "}
              · {formatQtde(pedido.quantidade)} un · {formatBrl(pedido.valorTotal)}
              {pedido.vendedorNome ? ` · ${pedido.vendedorNome}` : ""}
            </span>
          </p>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Pedido/OS → materiais → produção → notas fiscais → boleto → entrega → recebimento
          </p>
        </div>
        <div className="jornada-cta">
          {faltaMaterial && (
            <Link className="btn" href={comprasHref}>
              Ir para Compras (faltas)
            </Link>
          )}
          {nextCta && (
            <button type="button" disabled={!!busy} onClick={() => void nextCta.onClick()}>
              {busy ? "Processando…" : nextCta.label}
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              window.open(`/api/pedidos/${pedido.id}/pdf`, "_blank", "noopener,noreferrer")
            }
          >
            PDF do pedido
          </button>
          {os && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                window.open(
                  `/api/pedidos/${pedido.id}/os-pdf?osId=${os.id}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              PDF da OS
            </button>
          )}
          {["RASCUNHO", "CONFIRMADO", "EM_PRODUCAO"].includes(pedido.status) && (
            <button
              type="button"
              className="secondary"
              disabled={!!busy}
              onClick={() => void act("cancelar")}
            >
              Cancelar
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <StepRail
        steps={fluxo.etapas.map((et) => ({
          ...et,
          href: et.id === "materiais" && faltaMaterial ? comprasHref : undefined,
        }))}
        ariaLabel="Etapas do pedido"
        columns={7}
      />

      <div className="jornada-grid">
        {/* Coluna principal */}
        <div className="jornada-main">
          {/* OS */}
          <section className="card-panel jornada-section">
            <div className="jornada-section-head">
              <h2>Ordem de serviço</h2>
              {os && <span className="chip">{os.statusLabel}</span>}
            </div>
            {!os && (
              <>
                <p className="muted">Confirme o pedido para gerar a OS e explodir materiais.</p>
                {!!pedido.specs?.length && (
                  <div className="spec-grid" style={{ marginTop: "0.75rem" }}>
                    {pedido.specs.map((s) => (
                      <div key={s.label} className="spec-cell">
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="os-subhead">Itens do pedido (conforme orçamento)</h3>
                <div className="mat-grid">
                  {pedido.itens.map((it, idx) => (
                    <div key={it.id || idx} className="mat-card mat-done">
                      <div className="mat-top">
                        <strong>{it.descricao}</strong>
                        <span className="chip">
                          {it.documentoSaidaPadrao === "NFE"
                            ? "NF-e produto"
                            : "NFS-e impressão"}
                        </span>
                      </div>
                      <div className="mat-metrics">
                        <span>
                          Qtd{" "}
                          <b>
                            {formatQtde(it.quantidade)} {it.unidade || "UN"}
                          </b>
                        </span>
                        <span>
                          Total <b>{formatBrl(it.valorTotal)}</b>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {os && (
              <>
                <div className="os-meta">
                  <div>
                    <strong>OS {os.numero}</strong>
                    <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                      {os.iniciadoEm && `Iniciada ${fmtWhen(os.iniciadoEm)}`}
                      {os.iniciadoEm && os.concluidoEm ? " · " : ""}
                      {os.concluidoEm && `Concluída ${fmtWhen(os.concluidoEm)}`}
                      {!os.iniciadoEm && !os.concluidoEm && "Aguardando liberação / início"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      window.open(
                        `/api/pedidos/${pedido.id}/os-pdf?osId=${os.id}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Imprimir OS
                  </button>
                </div>

                {!!pedido.specs?.length && (
                  <div className="spec-grid">
                    {pedido.specs.map((s) => (
                      <div key={s.label} className="spec-cell">
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </div>
                    ))}
                    {pedido.producao?.qtdeRolos != null && (
                      <div className="spec-cell">
                        <span>Rolos</span>
                        <strong>{formatQtde(pedido.producao.qtdeRolos)}</strong>
                      </div>
                    )}
                    {pedido.producao?.metragemM2 != null && (
                      <div className="spec-cell">
                        <span>Metragem m²</span>
                        <strong>{formatQtde(pedido.producao.metragemM2)}</strong>
                      </div>
                    )}
                    {pedido.producao?.qtdeCaixas != null && (
                      <div className="spec-cell">
                        <span>Caixas</span>
                        <strong>{formatQtde(pedido.producao.qtdeCaixas)}</strong>
                      </div>
                    )}
                  </div>
                )}

                <h3 className="os-subhead">Itens do pedido (conforme orçamento)</h3>
                <div className="mat-grid" style={{ marginBottom: "1rem" }}>
                  {pedido.itens.map((it, idx) => (
                    <div key={it.id || idx} className="mat-card mat-done">
                      <div className="mat-top">
                        <strong>{it.descricao}</strong>
                        <span className="chip">
                          {it.documentoSaidaPadrao === "NFE"
                            ? "NF-e produto"
                            : "NFS-e impressão"}
                        </span>
                      </div>
                      <div className="mat-metrics">
                        <span>
                          Qtd{" "}
                          <b>
                            {formatQtde(it.quantidade)} {it.unidade || "UN"}
                          </b>
                        </span>
                        <span>
                          Total <b>{formatBrl(it.valorTotal)}</b>
                        </span>
                      </div>
                    </div>
                  ))}
                  {!pedido.itens.length && (
                    <p className="muted">Nenhum item comercial no pedido.</p>
                  )}
                </div>

                <h3 className="os-subhead">Materiais (consumo / MRP)</h3>
                <div className="mat-grid">
                  {os.necessidades.map((n) => (
                    <div key={n.id} className={`mat-card mat-${matTone(n.status)}`}>
                      <div className="mat-top">
                        <strong>{n.descricao}</strong>
                        <span className="chip">{n.status}</span>
                      </div>
                      {n.produtoCodigo && (
                        <code className="mat-code">{n.produtoCodigo}</code>
                      )}
                      <div className="mat-metrics">
                        <span>
                          Nec.{" "}
                          <b>
                            {n.qtdNecessaria} {n.unidade}
                          </b>
                        </span>
                        <span>
                          Res. <b>{n.qtdReservada}</b>
                        </span>
                        {n.qtdAtendida > 0 && (
                          <span>
                            Baixa <b>{n.qtdAtendida}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(faltaMaterial || !!pedido.necessidadesCompra.length) && (
                  <div className="jornada-cta" style={{ marginTop: "0.85rem" }}>
                    <Link className="btn" href={comprasHref}>
                      Comprar faltas deste pedido →
                    </Link>
                    <Link className="secondary" href="/estoque">
                      Ver estoque
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Notas */}
          <section className="card-panel jornada-section">
            <div className="jornada-section-head">
              <h2>Notas fiscais</h2>
              {fiscal && !pedido.docsSaida?.length && (
                <span className="chip chip-soft">{fiscal.resumo}</span>
              )}
            </div>

            {!pedido.docsSaida?.length && !pedido.docSaida && fiscal && (
              <div className="fiscal-plan">
                <p className="muted" style={{ marginTop: 0 }}>
                  No faturamento serão gerados XML + PDF (padrão{" "}
                  <a
                    href="https://doc.focusnfe.com.br/reference/introducao"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Focus NFe
                  </a>
                  ), conforme o tipo de cada item:
                </p>
                <div className="fiscal-plan-grid">
                  {fiscal.emitirNfse && (
                    <div className="fiscal-plan-card">
                      <strong>NFS-e Nacional</strong>
                      <span>Impressões / composição gráfica</span>
                      <b>{formatBrl(fiscal.valorNfse || 0)}</b>
                      {fiscal.discriminacao && (
                        <small className="muted" style={{ display: "block", marginTop: 6 }}>
                          {fiscal.discriminacao}
                        </small>
                      )}
                    </div>
                  )}
                  {fiscal.emitirNfe && (
                    <div className="fiscal-plan-card">
                      <strong>NF-e</strong>
                      <span>Produtos / mercadorias utilizados</span>
                      <b>{formatBrl(fiscal.valorNfe || 0)}</b>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="doc-grid">
              <article className={`doc-card ${pedido.docsEntrada.length ? "doc-live" : "doc-empty"}`}>
                <p className="doc-kind">NFe · entrada / insumos</p>
                {pedido.docsEntrada.length === 0 ? (
                  <p className="muted">Nenhuma entrada lançada ainda.</p>
                ) : (
                  pedido.docsEntrada.map((d) => (
                    <div key={d.id} className="doc-body">
                      <strong>
                        NFe {d.numero || "—"} · {d.status}
                      </strong>
                      <p className="muted">
                        {d.emitenteNome}
                        {d.valorTotal != null ? ` · ${formatBrl(d.valorTotal)}` : ""}
                      </p>
                      <ul className="doc-items">
                        {d.itens.slice(0, 4).map((it, idx) => (
                          <li key={idx}>
                            {it.descricao} · {it.quantidade}
                          </li>
                        ))}
                      </ul>
                      <div className="doc-actions">
                        <a
                          className="btn secondary-link"
                          href={`/api/compras/entradas/${d.id}?fmt=xml`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          XML
                        </a>
                      </div>
                      {d.lancadoEm && (
                        <small className="muted">Estoque em {fmtWhen(d.lancadoEm)}</small>
                      )}
                    </div>
                  ))
                )}
              </article>

              {(pedido.docsSaida?.length
                ? pedido.docsSaida
                : pedido.docSaida
                  ? [pedido.docSaida]
                  : []
              ).map((d) => (
                <article key={d.id} className="doc-card doc-live">
                  <p className="doc-kind">
                    {d.tipo === "NFE" ? "NF-e · venda / produto" : "NFS-e · venda / serviço"}
                  </p>
                  <div className="doc-body">
                    <strong>
                      {d.tipo === "NFE" ? "NF-e" : "NFS-e"} {d.numero}
                      {d.serie ? `/${d.serie}` : ""} · {d.status}
                    </strong>
                    <p className="money">{formatBrl(d.valorTotal)}</p>
                    {d.discriminacao && <p className="doc-disc">{d.discriminacao}</p>}
                    {d.chave && (
                      <p className="doc-chave">
                        <span className="muted">Chave</span> {d.chave}
                      </p>
                    )}
                    <div className="chip-row">
                      {d.simulado && <span className="chip">Simulado</span>}
                      {d.autorizadoEm && (
                        <span className="muted">{fmtWhen(d.autorizadoEm)}</span>
                      )}
                    </div>
                    <div className="doc-actions">
                      <a
                        className="btn secondary-link"
                        href={`/api/pedidos/${pedido.id}/fiscal?tipo=${d.tipo}&fmt=xml`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        XML
                      </a>
                      <a
                        className="btn secondary-link"
                        href={`/api/pedidos/${pedido.id}/fiscal?tipo=${d.tipo}&fmt=pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {d.tipo === "NFE" ? "DANFE" : "DANFSe"}
                      </a>
                    </div>
                  </div>
                </article>
              ))}

              {!pedido.docsSaida?.length && !pedido.docSaida && !fiscal && (
                <article className="doc-card doc-empty">
                  <p className="doc-kind">Saída · NFS-e / NF-e</p>
                  <p className="muted">Serão geradas no faturamento (XML + PDF).</p>
                </article>
              )}
            </div>
          </section>

          {/* Boleto + financeiro */}
          <section className="card-panel jornada-section">
            <div className="jornada-section-head">
              <h2>Cobrança e financeiro</h2>
            </div>
            {!pedido.tituloReceber ? (
              <p className="muted">Título e boleto nascem no faturamento.</p>
            ) : (
              <div className="fin-layout">
                <div className="boleto-card">
                  <p className="doc-kind">Bolepix · Inter</p>
                  <p className="money boleto-valor">{formatBrl(pedido.tituloReceber.valor)}</p>
                  <p className="muted">
                    Venc. {fmtWhen(pedido.tituloReceber.vencimento)} · Título{" "}
                    {pedido.tituloReceber.status}
                  </p>
                  {pedido.tituloReceber.cobranca && (
                    <>
                      <p>
                        Nosso nº{" "}
                        <strong>{pedido.tituloReceber.cobranca.nossoNumero || "—"}</strong>
                        {pedido.tituloReceber.cobranca.simulado && (
                          <span className="chip" style={{ marginLeft: "0.5rem" }}>
                            Simulado
                          </span>
                        )}
                      </p>
                      {pedido.tituloReceber.cobranca.linhaDigitavel && (
                        <div className="copy-row">
                          <code className="boleto-line">
                            {pedido.tituloReceber.cobranca.linhaDigitavel}
                          </code>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void copy(
                                pedido.tituloReceber!.cobranca!.linhaDigitavel!,
                                "linha",
                              )
                            }
                          >
                            {copied === "linha" ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      )}
                      {pedido.tituloReceber.cobranca.pixCopiaECola && (
                        <div className="copy-row">
                          <code className="boleto-line pix">
                            {pedido.tituloReceber.cobranca.pixCopiaECola.slice(0, 48)}…
                          </code>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void copy(
                                pedido.tituloReceber!.cobranca!.pixCopiaECola!,
                                "pix",
                              )
                            }
                          >
                            {copied === "pix" ? "Copiado" : "Pix"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mov-card">
                  <p className="doc-kind">Movimentação financeira</p>
                  {!fluxo.movimentos.length && (
                    <p className="muted">Sem lançamentos ainda.</p>
                  )}
                  <ul className="mov-list">
                    {fluxo.movimentos.map((m) => (
                      <li key={m.id}>
                        <div>
                          <strong>{m.descricao}</strong>
                          <small className="muted">{fmtWhen(m.at)}</small>
                        </div>
                        <div className="mov-right">
                          <span className={`mov-sinal mov-${m.sinal === "+" ? "in" : "neu"}`}>
                            {m.sinal} {formatBrl(m.valor)}
                          </span>
                          <span className="chip">{m.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {pedido.entrega && (
                    <p className="muted" style={{ marginTop: "0.75rem" }}>
                      Entrega {fmtWhen(pedido.entrega.dataEntrega)} ·{" "}
                      {pedido.entrega.modalidade}
                      {pedido.entrega.rolos != null ? ` · ${pedido.entrega.rolos} rolos` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Timeline lateral */}
        <aside className="card-panel jornada-timeline">
          <h2>Linha do tempo</h2>
          <ol className="tl">
            {fluxo.timeline.map((ev) => (
              <li key={ev.id} className={`tl-item tl-${ev.kind}`}>
                <span className="tl-mark" />
                <div>
                  <strong>{ev.title}</strong>
                  <p>{ev.detail}</p>
                  <small>{fmtWhen(ev.at)}</small>
                </div>
              </li>
            ))}
          </ol>
          {!!pedido.itens.length && (
            <div className="tl-item-resumo">
              <p className="doc-kind">Itens do pedido</p>
              {pedido.itens.map((it, idx) => (
                <div key={it.id || idx} style={{ marginBottom: "0.5rem" }}>
                  <p style={{ margin: 0 }}>{it.descricao}</p>
                  <p className="muted" style={{ margin: "0.15rem 0 0" }}>
                    {formatQtde(it.quantidade)} {it.unidade || "UN"} ·{" "}
                    {formatBrl(it.valorTotal)}
                    {it.documentoSaidaPadrao === "NFE" ? " · NF-e" : " · NFS-e"}
                  </p>
                </div>
              ))}
              {pedido.condicaoPagamento && (
                <p className="muted">{pedido.condicaoPagamento}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
