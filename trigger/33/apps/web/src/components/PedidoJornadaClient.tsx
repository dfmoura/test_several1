"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
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
    pronto?: boolean;
    checklist?: Array<{
      codigo: string;
      severidade: "erro" | "aviso";
      mensagem: string;
      cadastro?: string;
    }>;
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
    isAdiantamento?: boolean;
    cobranca: {
      linhaDigitavel: string | null;
      pixCopiaECola: string | null;
      nossoNumero: string | null;
      codigoSolicitacao: string | null;
      status: string;
      simulado: boolean;
    } | null;
  } | null;
  titulosReceber?: Array<{
    id: string;
    valor: number;
    status: string;
    isAdiantamento?: boolean;
  }>;
  ordensProducao?: Array<{
    id: string;
    numero: number;
    codigo: string;
    status: string;
    statusLabel: string;
    iniciadoEm: string | null;
    concluidoEm: string | null;
  }>;
  creditoFlag?: string | null;
  creditoMotivo?: string | null;
  percentualSinal?: number | null;
  nextAction?: {
    id: string;
    label: string;
    channel: "main" | "ops" | "os" | "op";
    hint?: string;
    osId?: string | null;
    opId?: string | null;
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
  const [creditoMotivo, setCreditoMotivo] = useState("");

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

  async function act(
    action: string,
    path: "main" | "ops" = "main",
    extra: Record<string, unknown> = {},
  ) {
    setBusy(action);
    setError(null);
    try {
      const url = path === "ops" ? `/api/pedidos/${id}/operacoes` : `/api/pedidos/${id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
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

  async function opAct(opId: string, action: "iniciar" | "concluir") {
    setBusy(`op-${action}`);
    setError(null);
    try {
      const res = await fetch("/api/ordens-producao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opId, action }),
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

  async function runNextAction() {
    const na = pedido?.nextAction;
    if (!na) return;
    if (na.id === "liberar_credito") {
      const motivo = creditoMotivo.trim() || window.prompt("Motivo da liberação de crédito:") || "";
      if (!motivo.trim()) {
        setError("Informe o motivo da liberação de crédito.");
        return;
      }
      await act("liberar_credito", "ops", { motivo: motivo.trim() });
      setCreditoMotivo("");
      return;
    }
    if (na.id === "baixar_sinal") {
      await act("baixar_sinal", "ops");
      return;
    }
    if (na.id === "iniciar_producao") {
      if (na.channel === "op" && na.opId) {
        await opAct(na.opId, "iniciar");
        return;
      }
      if (na.osId) {
        await osAct(na.osId, "iniciar");
        return;
      }
    }
    if (na.id === "concluir_producao") {
      if (na.channel === "op" && na.opId) {
        await opAct(na.opId, "concluir");
        return;
      }
      if (na.osId) {
        await osAct(na.osId, "concluir");
        return;
      }
    }
    if (na.channel === "ops") {
      await act(na.id, "ops");
      return;
    }
    await act(na.id === "confirmar" ? "confirmar" : na.id, "main");
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
      <AppShell name={name} role={role}>
        <p className="muted">Carregando jornada do pedido…</p>
      </AppShell>
    );
  }

  if (!pedido) {
    return (
      <AppShell name={name} role={role}>
        <p className="error">{error}</p>
        <Link href="/pedidos">← Pedidos</Link>
      </AppShell>
    );
  }

  const os = pedido.ordensServico[0];
  const op = pedido.ordensProducao?.[0];
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
  const next = pedido.nextAction;
  const nextLabel =
    next?.id === "faturar" && fiscal?.labelCta ? fiscal.labelCta : next?.label || null;

  return (
    <AppShell name={name} role={role} wide>
      <PageHeader
        kicker="Jornada · PED"
        title={
          <>
            Pedido {pedido.numero}
            <span className={`chip chip-status-${pedido.status.toLowerCase()}`}>
              {pedido.statusLabel}
            </span>
          </>
        }
        subtitle={
          <>
            <strong>{pedido.clienteNome}</strong>
            <span className="muted">
              {" "}
              · {formatQtde(pedido.quantidade)} un · {formatBrl(pedido.valorTotal)}
              {pedido.vendedorNome ? ` · ${pedido.vendedorNome}` : ""}
            </span>
            <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.85rem" }}>
              Crédito → confirmar → materiais → produção → notas → cobrança → entrega → baixa
              {pedido.creditoFlag ? ` · crédito ${pedido.creditoFlag}` : ""}
            </span>
            {next?.hint && (
              <span className="jornada-next-hint">{next.hint}</span>
            )}
          </>
        }
        crumbs={[
          { href: "/pedidos", label: "Pedidos" },
          ...(pedido.orcamento
            ? [
                {
                  href: `/orcamentos/${pedido.orcamento.id}`,
                  label: `Orçamento ${pedido.orcamento.numero}`,
                },
              ]
            : []),
        ]}
        actions={
          <>
            {faltaMaterial && (
              <Link className="btn secondary-link" href={comprasHref}>
                Compras (faltas)
              </Link>
            )}
            {next && (
              <button type="button" disabled={!!busy} onClick={() => void runNextAction()}>
                {busy ? "Processando…" : nextLabel}
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
            {["RASCUNHO", "LIBERADO", "CONFIRMADO", "EM_PRODUCAO", "AGUARDA_CREDITO", "AGUARDA_ADIANTAMENTO"].includes(
              pedido.status,
            ) && (
              <button
                type="button"
                className="secondary"
                disabled={!!busy}
                onClick={() => void act("cancelar")}
              >
                Cancelar
              </button>
            )}
          </>
        }
      >
        <StepRail
          steps={fluxo.etapas.map((et) => ({
            ...et,
            href: et.id === "materiais" && faltaMaterial ? comprasHref : undefined,
          }))}
          ariaLabel="Jornada do pedido"
          columns={8}
        />
      </PageHeader>

      {pedido.status === "AGUARDA_CREDITO" && (
        <section className="card-panel jornada-credito-banner">
          <h2 style={{ marginTop: 0 }}>Crédito bloqueado</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {pedido.creditoMotivo || "O motor de crédito bloqueou a produção. Financeiro precisa liberar."}
          </p>
          <label>
            Motivo da liberação
            <input
              value={creditoMotivo}
              onChange={(e) => setCreditoMotivo(e.target.value)}
              placeholder="Ex.: alçada direção / garantia adicional"
            />
          </label>
        </section>
      )}

      {pedido.status === "AGUARDA_ADIANTAMENTO" && (
        <section className="card-panel jornada-credito-banner">
          <h2 style={{ marginTop: 0 }}>Aguardando sinal</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Baixe o título de adiantamento para liberar o pedido (estudo: crédito ≠ aceite).
            {pedido.percentualSinal ? ` Sinal ${pedido.percentualSinal}%.` : ""}
          </p>
        </section>
      )}

      {pedido.status === "LIBERADO" && (
        <section className="card-panel jornada-credito-banner is-ok">
          <h2 style={{ marginTop: 0 }}>Pedido liberado</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Pronto para confirmar e gerar OS + OP. Use o botão principal acima.
          </p>
        </section>
      )}

      {op && (
        <section className="card-panel" style={{ marginBottom: "1rem" }}>
          <div className="jornada-section-head">
            <h2 style={{ margin: 0 }}>Ordem de produção</h2>
            <span className="chip">{op.statusLabel}</span>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {op.codigo} · produção industrial no mesmo ERP (não há sistema paralelo).
          </p>
        </section>
      )}

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

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
                <p className="muted">
                  {pedido.status === "LIBERADO" || pedido.status === "RASCUNHO"
                    ? "Confirme o pedido (botão principal) para gerar OS + OP e explodir materiais."
                    : pedido.status === "AGUARDA_CREDITO" || pedido.status === "AGUARDA_ADIANTAMENTO"
                      ? "Resolva crédito/sinal antes de confirmar e gerar OS + OP."
                      : "Sem OS neste pedido."}
                </p>
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
                          {it.documentoSaidaPadrao === "NFSE"
                            ? "NFS-e serviço"
                            : "NF-e produção"}
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
                          {it.documentoSaidaPadrao === "NFSE"
                            ? "NFS-e serviço"
                            : "NF-e produção"}
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
                    {pedido.docsEntrada.some((d) => d.status === "ESTOQUE_LANCADO") ? (
                      <>
                        <button
                          type="button"
                          className="btn"
                          disabled={!!busy}
                          onClick={() => void act("reavaliar_materiais")}
                        >
                          {busy === "reavaliar_materiais"
                            ? "Reservando…"
                            : "Reservar materiais / liberar OS"}
                        </button>
                        <Link className="secondary" href={comprasHref}>
                          Ver compras
                        </Link>
                      </>
                    ) : (
                      <Link className="btn" href={comprasHref}>
                        Comprar faltas deste pedido →
                      </Link>
                    )}
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
                  Faturamento padrão do estudo 32:{" "}
                  <strong>NF-e de produção própria</strong> (PA-ETQ, CFOP 5101/6101) +{" "}
                  títulos/boleto, via{" "}
                  <a
                    href="https://doc.focusnfe.com.br/reference/nfe"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Focus NFe
                  </a>
                  . Insumos ficam no estoque/custo — não viram linha de NF de venda.
                </p>
                <div className="dual-fiscal">
                  {fiscal.emitirNfe && (
                    <div className="dual-fiscal-card nfe">
                      <span className="doc-tag">NF-e · produção</span>
                      <h3>Produto acabado</h3>
                      <span className="muted">
                        CFOP 5101/6101 · família PA-ETQ (+ FAC se cobrada)
                      </span>
                      <b className="money" style={{ display: "block", marginTop: 8 }}>
                        {formatBrl(fiscal.valorNfe || pedido.valorTotal)}
                      </b>
                    </div>
                  )}
                  {fiscal.emitirNfse && (
                    <div className="dual-fiscal-card nfse">
                      <span className="doc-tag">NFS-e · serviço avulso</span>
                      <h3>Somente item SVC</h3>
                      <span className="muted">Não é o padrão da etiqueta sob encomenda</span>
                      <b className="money" style={{ display: "block", marginTop: 8 }}>
                        {formatBrl(fiscal.valorNfse || 0)}
                      </b>
                      {fiscal.discriminacao && (
                        <small className="muted" style={{ display: "block", marginTop: 6 }}>
                          {fiscal.discriminacao}
                        </small>
                      )}
                    </div>
                  )}
                </div>
                {!!fiscal.checklist?.length && (
                  <div
                    className={fiscal.pronto ? "alert-ok" : "alert"}
                    role="status"
                    style={{ marginTop: "1rem" }}
                  >
                    <strong>
                      {fiscal.pronto
                        ? "Cadastros fiscais prontos para emissão Focus"
                        : "Pendências de cadastro fiscal"}
                    </strong>
                    <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                      {fiscal.checklist.map((c) => (
                        <li key={c.codigo}>
                          [{c.severidade}] {c.mensagem}
                          {c.cadastro === "parceiro" && (
                            <>
                              {" "}
                              <Link href="/admin/parceiros">Corrigir parceiro</Link>
                            </>
                          )}
                          {c.cadastro === "produto" && (
                            <>
                              {" "}
                              <Link href="/admin/produtos">Corrigir produto</Link>
                            </>
                          )}
                          {(c.cadastro === "serie" ||
                            c.cadastro === "parametro" ||
                            c.cadastro === "empresa") && (
                            <>
                              {" "}
                              <Link href="/admin/fiscal">Configurar fiscal</Link>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                    {d.tipo === "NFE"
                      ? "NF-e · produção própria"
                      : "NFS-e · serviço avulso"}
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
                  <p className="doc-kind">Saída · NF-e produção</p>
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
                            {pedido.tituloReceber.cobranca.pixCopiaECola}
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
                      <div className="doc-actions" style={{ marginTop: "0.75rem" }}>
                        <a
                          className="btn secondary-link"
                          href={`/api/pedidos/${pedido.id}/boleto?fmt=pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF Bolepix
                        </a>
                      </div>
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
    </AppShell>
  );
}
