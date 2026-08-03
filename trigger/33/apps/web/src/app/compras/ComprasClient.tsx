"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StepRail, type StepRailItem } from "@/components/StepRail";
import { EntradasTab } from "./EntradasTab";
import { NecessidadesTab } from "./NecessidadesTab";
import { PedidosCompraTab } from "./PedidosCompraTab";
import type {
  CadastroDraft,
  Entrada,
  EntradaItem,
  Kpi,
  Nec,
  PapelOpt,
  PedidoCompra,
  ProdutoOpt,
  ResolveMode,
  TabId,
} from "./compras-types";

const VALID_TABS: TabId[] = ["necessidades", "pedidos", "entradas"];

function parseTab(raw: string | null): TabId {
  if (raw && VALID_TABS.includes(raw as TabId)) return raw as TabId;
  return "necessidades";
}

export function ComprasClient({ name, role }: { name: string; role: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pedidoFiltro = searchParams.get("pedido");

  const [tab, setTabState] = useState<TabId>(() => parseTab(searchParams.get("tab")));
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [necs, setNecs] = useState<Nec[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [selectedNec, setSelectedNec] = useState<Set<string>>(new Set());
  const [activePcId, setActivePcId] = useState<string | null>(null);
  const [xml, setXml] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [papeis, setPapeis] = useState<PapelOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resolveItemId, setResolveItemId] = useState<string | null>(null);
  const [resolveMode, setResolveMode] = useState<ResolveMode>("idle");
  const [draft, setDraft] = useState<CadastroDraft | null>(null);
  const [produtoLinkId, setProdutoLinkId] = useState("");
  const [pedidoHighlightDone, setPedidoHighlightDone] = useState(false);

  function setTab(next: TabId) {
    setTabState(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/compras?${params.toString()}`, { scroll: false });
  }

  const load = useCallback(async () => {
    const [resumo, p, c] = await Promise.all([
      fetch("/api/compras?tipo=resumo").then((r) => r.json()),
      fetch("/api/produtos?tipo=INSUMO").then((r) => r.json()),
      fetch("/api/catalogos").then((r) => r.json()),
    ]);
    setKpi(resumo.kpi || null);
    setNecs(resumo.necessidades || []);
    setPedidos(resumo.pedidos || []);
    setEntradas(resumo.entradas || []);
    setProdutos(
      (p.items || []).map((x: ProdutoOpt) => ({
        id: x.id,
        codigo: x.codigo,
        descricao: x.descricao,
      })),
    );
    setPapeis(
      (c.papeis || []).map((x: { id: string; nome: string }) => ({
        id: x.id,
        nome: x.nome,
      })),
    );

    setActivePcId((prev) => {
      if (prev && (resumo.pedidos || []).some((x: PedidoCompra) => x.id === prev)) {
        return prev;
      }
      const aberto = (resumo.pedidos || []).find((x: PedidoCompra) =>
        ["RASCUNHO", "ENVIADO", "PARCIAL"].includes(x.status),
      );
      return aberto?.id || (resumo.pedidos || [])[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = parseTab(searchParams.get("tab"));
    setTabState(t);
  }, [searchParams]);

  useEffect(() => {
    if (!pedidoFiltro || pedidoHighlightDone || !necs.length) return;
    const related = necs.filter((n) => n.pedidoVendaId === pedidoFiltro && n.status === "ABERTA");
    if (related.length) {
      setSelectedNec(new Set(related.map((n) => n.id)));
      setTabState("necessidades");
      setMsg(
        `Filtrado pelo pedido de venda — ${related.length} necessidade(s) aberta(s) selecionada(s).`,
      );
    }
    setPedidoHighlightDone(true);
  }, [pedidoFiltro, necs, pedidoHighlightDone]);

  const activePc = useMemo(
    () => pedidos.find((p) => p.id === activePcId) || null,
    [pedidos, activePcId],
  );

  const necsVisiveis = useMemo(() => {
    if (!pedidoFiltro) return necs;
    return necs.filter((n) => n.pedidoVendaId === pedidoFiltro);
  }, [necs, pedidoFiltro]);

  const necsAbertas = necsVisiveis.filter((n) => n.status === "ABERTA");
  const necsEmCompra = necsVisiveis.filter((n) => n.status === "EM_COMPRA");

  function toggleNec(id: string) {
    setSelectedNec((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllAbertas() {
    setSelectedNec(new Set(necsAbertas.map((n) => n.id)));
  }

  function fecharResolucao() {
    setResolveItemId(null);
    setResolveMode("idle");
    setDraft(null);
    setProdutoLinkId("");
  }

  function abrirCadastro(item: EntradaItem) {
    setResolveItemId(item.id);
    setResolveMode("cadastrar");
    setProdutoLinkId("");
    setDraft({
      codigo: item.codigoSugerido,
      descricao: item.descricao,
      unidade: (item.unidade || "M2").toUpperCase(),
      ncm: item.ncm || "",
      papelId: "",
    });
  }

  function abrirVinculo(item: EntradaItem) {
    setResolveItemId(item.id);
    setResolveMode("vincular");
    setDraft(null);
    setProdutoLinkId("");
  }

  async function criarPc() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "criar_pedido_compra",
          necessidadeIds: [...selectedNec],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(`Pedido de compra #${j.numero} criado com ${j.qtdItens} item(ns)`);
      setSelectedNec(new Set());
      setTab("pedidos");
      await load();
      setActivePcId(j.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function enviarPc() {
    if (!activePc) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enviar_pedido_compra",
          pedidoCompraId: activePc.id,
          fornecedorNome: fornecedorNome || activePc.fornecedorNome,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(`Pedido de compra #${j.numero} marcado como enviado ao fornecedor`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function cancelarPc() {
    if (!activePc) return;
    if (
      !confirm(
        `Cancelar pedido de compra #${activePc.numero}? As necessidades voltam para abertas.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancelar_pedido_compra",
          pedidoCompraId: activePc.id,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(`Pedido de compra #${j.numero} cancelado`);
      setActivePcId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function carregarXmlExemplo() {
    if (!activePc) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/compras/exemplo-xml?pcId=${encodeURIComponent(activePc.id)}&pc=${activePc.numero}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Não foi possível gerar o XML de exemplo");
      }
      const text = await res.text();
      const chave = res.headers.get("X-Chave-Nfe");
      setXml(text);
      setMsg(
        `XML gerado para PC #${activePc.numero} (${activePc.itens.length} itens)${
          chave ? ` · chave …${chave.slice(-8)}` : ""
        }. Cada carga cria chave nova — pode reimportar sem conflito.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function importarXml() {
    if (!activePc) {
      setError("Selecione um pedido de compra para vincular a entrada");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "importar_xml",
          xml,
          pedidoCompraId: activePc.id,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(j.error || "NFe já importada");
          setXml("");
          setTab("entradas");
          setMsg(
            `Entrada já existe${
              j.pedidoCompraNumero != null ? ` (PC #${j.pedidoCompraNumero})` : ""
            }. Para novo teste, clique em "Gerar XML fresco" no pedido.`,
          );
          return;
        }
        throw new Error(j.error);
      }
      const pend = (j.itens || []).filter(
        (i: { status: string }) => i.status === "PENDENTE_MATCH",
      ).length;
      setMsg(
        pend
          ? `NFe importada no PC #${activePc.numero} — ${pend} item(ns) sem cadastro`
          : `NFe importada e vinculada ao PC #${activePc.numero} — ${j.statusLabel}`,
      );
      setXml("");
      setTab("entradas");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function vincular(itemId: string, produtoId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vincular_item",
          itemId,
          produtoId,
          salvarCodigoFornecedor: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg("Item vinculado ao produto do estoque");
      fecharResolucao();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function cadastrarEVincular() {
    if (!resolveItemId || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cadastrar_e_vincular",
          itemId: resolveItemId,
          ...draft,
          salvarCodigoFornecedor: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(`Produto ${j.produto.codigo} cadastrado e vinculado`);
      fecharResolucao();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function lancarEstoque(documentoId: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lancar_estoque", documentoId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(
        "Estoque lançado — materiais reavaliados nas OS. Próximo: Estoque ou voltar ao Pedido.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setXml("");
    setError(null);
  }, [activePcId]);

  useEffect(() => {
    if (activePc?.fornecedorNome) setFornecedorNome(activePc.fornecedorNome);
  }, [activePc?.id, activePc?.fornecedorNome]);

  const fluxoSteps: StepRailItem[] = [
    {
      id: "nec",
      label: "Necessidades",
      state: kpi && kpi.necessidadesAbertas > 0 ? "current" : "done",
      detail: kpi ? `${kpi.necessidadesAbertas} abertas` : "—",
      href: "/compras?tab=necessidades",
    },
    {
      id: "pc",
      label: "Pedido compra",
      state: kpi && kpi.pedidosAbertos > 0 ? "current" : "pending",
      detail: kpi ? `${kpi.pedidosAbertos} em aberto` : "—",
      href: "/compras?tab=pedidos",
    },
    {
      id: "nfe",
      label: "NFe entrada",
      state: kpi && kpi.entradasPendentes > 0 ? "current" : "pending",
      detail: kpi
        ? kpi.entradasPendentes > 0
          ? `${kpi.entradasPendentes} pendentes`
          : `${kpi.entradasLancadas || 0} lançada(s)`
        : "—",
      href: "/compras?tab=entradas",
    },
    {
      id: "match",
      label: "Matching",
      state: kpi && kpi.entradasPendentes > 0 ? "current" : "pending",
      detail: "Vincular produtos",
      href: "/compras?tab=entradas",
    },
    {
      id: "est",
      label: "Estoque / OS",
      state: "pending",
      detail: "Libera produção",
      href: "/estoque",
    },
  ];

  return (
    <AppShell name={name} role={role} wide>

      <PageHeader
        kicker="Suporte · OP parada / MRP"
        title="Compras de insumos"
        subtitle="Fluxo paralelo do estudo 32: necessidade → COT/OC → NFe entrada → estoque. Não inicia o ciclo comercial."
        actions={
          <>
            <Link className="btn secondary-link" href="/estoque">
              → 2. Estoque
            </Link>
            <Link className="btn secondary-link" href="/pedidos">
              Pedidos de venda
            </Link>
          </>
        }
      >
        <StepRail steps={fluxoSteps} ariaLabel="Fluxo de compras" columns={5} />
        {pedidoFiltro ? (
          <p className="compras-hint" style={{ marginTop: "0.75rem" }}>
            Filtrado pelo pedido{" "}
            <Link href={`/pedidos/${pedidoFiltro}`}>
              <code>{pedidoFiltro.slice(0, 8)}…</code>
            </Link>
            .{" "}
            <button
              type="button"
              className="linkish"
              onClick={() => {
                router.replace("/compras?tab=necessidades");
                setPedidoHighlightDone(false);
              }}
            >
              Limpar filtro
            </button>
          </p>
        ) : null}
      </PageHeader>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {msg && (
        <div className="alert-ok" role="status">
          {msg}
        </div>
      )}

      {kpi && (
        <div className="compras-kpi">
          <div className="compras-kpi-card">
            <span>Abertas</span>
            <strong>{kpi.necessidadesAbertas}</strong>
          </div>
          <div className="compras-kpi-card">
            <span>Em compra</span>
            <strong>{kpi.necessidadesEmCompra}</strong>
          </div>
          <div className="compras-kpi-card">
            <span>Pedidos PC</span>
            <strong>{kpi.pedidosAbertos}</strong>
          </div>
          <div className="compras-kpi-card">
            <span>Entradas pend.</span>
            <strong>{kpi.entradasPendentes}</strong>
          </div>
          <div className="compras-kpi-card">
            <span>Estoque OK</span>
            <strong>{kpi.entradasLancadas ?? 0}</strong>
          </div>
        </div>
      )}

      <div className="compras-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === "necessidades" ? "is-active" : ""}
          aria-selected={tab === "necessidades"}
          onClick={() => setTab("necessidades")}
        >
          1. Necessidades
          {necsAbertas.length > 0 && <em>{necsAbertas.length}</em>}
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "pedidos" ? "is-active" : ""}
          aria-selected={tab === "pedidos"}
          onClick={() => setTab("pedidos")}
        >
          2. Pedidos de compra
          {pedidos.length > 0 && <em>{pedidos.length}</em>}
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "entradas" ? "is-active" : ""}
          aria-selected={tab === "entradas"}
          onClick={() => setTab("entradas")}
        >
          3. Entradas NFe
          {entradas.length > 0 && <em>{entradas.length}</em>}
        </button>
      </div>

      {tab === "necessidades" && (
        <NecessidadesTab
          necs={necsVisiveis}
          necsAbertas={necsAbertas}
          necsEmCompra={necsEmCompra}
          selectedNec={selectedNec}
          busy={busy}
          onToggle={toggleNec}
          onSelectAll={selectAllAbertas}
          onCriarPc={() => void criarPc()}
          onGoPedidos={() => setTab("pedidos")}
          onOpenPc={(pcId) => {
            setActivePcId(pcId);
            setTab("pedidos");
          }}
        />
      )}

      {tab === "pedidos" && (
        <PedidosCompraTab
          pedidos={pedidos}
          activePc={activePc}
          activePcId={activePcId}
          fornecedorNome={fornecedorNome}
          xml={xml}
          busy={busy}
          onSelectPc={setActivePcId}
          onFornecedorChange={setFornecedorNome}
          onXmlChange={setXml}
          onEnviar={() => void enviarPc()}
          onCancelar={() => void cancelarPc()}
          onCarregarXml={() => void carregarXmlExemplo()}
          onImportarXml={() => void importarXml()}
        />
      )}

      {tab === "entradas" && (
        <EntradasTab
          entradas={entradas}
          busy={busy}
          resolveItemId={resolveItemId}
          resolveMode={resolveMode}
          draft={draft}
          produtoLinkId={produtoLinkId}
          produtos={produtos}
          papeis={papeis}
          onLancar={(id) => void lancarEstoque(id)}
          onAbrirCadastro={abrirCadastro}
          onAbrirVinculo={abrirVinculo}
          onFechar={fecharResolucao}
          onDraftChange={setDraft}
          onProdutoLinkChange={setProdutoLinkId}
          onCadastrar={() => void cadastrarEVincular()}
          onVincular={(itemId, produtoId) => void vincular(itemId, produtoId)}
        />
      )}
    </AppShell>
  );
}
