"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { formatBrl } from "@/lib/orcamento-comercial";

type Saldo = {
  id: string;
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: string;
  deposito: string;
  quantidade: number;
  reservado: number;
  disponivel: number;
  custoMedio: number;
};

type Mov = {
  id: string;
  tipo: string;
  quantidade: number;
  saldoApos: number | null;
  codigo: string;
  descricao: string;
  produtoTipo: string;
  unidade: string;
  observacao: string | null;
  createdAt: string;
  documentoTipo: string | null;
};

const TIPO_MOV_LABEL: Record<string, string> = {
  ENTRADA_COMPRA: "Entrada compra",
  ENTRADA_PRODUCAO: "Entrada produção",
  BAIXA_PRODUCAO: "Baixa produção",
  SAIDA_VENDA: "Saída venda",
  RESERVA: "Reserva",
  LIBERA_RESERVA: "Libera reserva",
  AJUSTE_INVENTARIO: "Ajuste",
  ESTORNO: "Estorno",
};

export function EstoqueClient({ name, role }: { name: string; role: string }) {
  const [tab, setTab] = useState<"saldos" | "movimentos">("saldos");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAjuste, setShowAjuste] = useState(false);
  const [ajusteProdutoId, setAjusteProdutoId] = useState("");
  const [ajusteDelta, setAjusteDelta] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("Ajuste inventário");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    if (tab === "saldos") {
      const q = filtroTipo ? `?tipo=${filtroTipo}` : "";
      const res = await fetch(`/api/estoque${q}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Erro");
        return;
      }
      setSaldos(j.items || []);
    } else {
      const q = filtroTipo
        ? `?view=movimentos&tipoProduto=${filtroTipo}`
        : "?view=movimentos";
      const res = await fetch(`/api/estoque${q}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Erro");
        return;
      }
      setMovs(j.items || []);
    }
  }, [tab, filtroTipo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function aplicarAjuste() {
    if (!ajusteProdutoId || !ajusteDelta) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: ajusteProdutoId,
          quantidadeDelta: Number(ajusteDelta.replace(",", ".")),
          motivo: ajusteMotivo || "Ajuste inventário",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha no ajuste");
      setMsg("Ajuste lançado");
      setAjusteDelta("");
      setShowAjuste(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  const baixos = saldos.filter((s) => s.disponivel <= 0 && s.tipo === "INSUMO");

  return (
    <div className="shell">
      <AppHeader name={name} role={role} />
      <p className="jornada-kicker">2 · Suprimentos</p>
      <h1>Estoque</h1>
      <p className="muted">
        Passo 2: posição física, reservado e disponível. Entradas vêm de Compras (NFe).
        Disponível baixo → compre faltas.
      </p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      <div className="toolbar estoque-toolbar-links" style={{ marginTop: "1rem" }}>
        <div className="steps" style={{ margin: 0 }}>
          <button
            type="button"
            className={`step-pill ${tab === "saldos" ? "active" : ""}`}
            onClick={() => setTab("saldos")}
          >
            Saldos
          </button>
          <button
            type="button"
            className={`step-pill ${tab === "movimentos" ? "active" : ""}`}
            onClick={() => setTab("movimentos")}
          >
            Movimentações
          </button>
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="">Todos os tipos</option>
          <option value="INSUMO">Insumos</option>
          <option value="ACABADO">Acabados</option>
          <option value="SERVICO">Serviços</option>
          <option value="INTERMEDIARIO">Intermediários</option>
        </select>
        <Link href="/compras?tab=necessidades">Comprar o que falta →</Link>
        <Link href="/compras?tab=entradas">Entradas NFe →</Link>
        <Link href="/admin/produtos">Cadastro de produtos →</Link>
        {role === "ADMIN" && (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowAjuste((v) => !v)}
          >
            {showAjuste ? "Fechar ajuste" : "Ajuste inventário"}
          </button>
        )}
      </div>

      {baixos.length > 0 && tab === "saldos" && (
        <p className="compras-hint" style={{ marginTop: "0.85rem" }}>
          {baixos.length} insumo(s) com disponível ≤ 0.{" "}
          <Link href="/compras?tab=necessidades">Abrir compras</Link>
        </p>
      )}

      {showAjuste && role === "ADMIN" && (
        <div className="estoque-ajuste">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void aplicarAjuste();
            }}
          >
            <label>
              Produto
              <select
                value={ajusteProdutoId}
                onChange={(e) => setAjusteProdutoId(e.target.value)}
                required
              >
                <option value="">Selecione…</option>
                {saldos.map((s) => (
                  <option key={s.produtoId} value={s.produtoId}>
                    {s.codigo} — {s.descricao}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Delta (+/−)
              <input
                value={ajusteDelta}
                onChange={(e) => setAjusteDelta(e.target.value)}
                placeholder="ex. 10 ou -2"
                required
              />
            </label>
            <label>
              Motivo
              <input
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              Lançar
            </button>
          </form>
        </div>
      )}

      {tab === "saldos" && (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Depósito</th>
                <th>Físico</th>
                <th>Reservado</th>
                <th>Disponível</th>
                <th>Custo médio</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.id}>
                  <td>
                    <code>{s.codigo}</code>
                  </td>
                  <td>{s.descricao}</td>
                  <td>{s.tipo}</td>
                  <td>{s.deposito}</td>
                  <td>
                    {s.quantidade} {s.unidade}
                  </td>
                  <td className="muted">
                    {s.reservado} {s.unidade}
                  </td>
                  <td>
                    <span
                      className={
                        s.disponivel <= 0 ? "estoque-disp-baixa" : "estoque-disp-ok"
                      }
                    >
                      {s.disponivel} {s.unidade}
                    </span>
                  </td>
                  <td className="money">{formatBrl(s.custoMedio)}</td>
                </tr>
              ))}
              {!saldos.length && (
                <tr>
                  <td colSpan={8} className="muted">
                    Sem saldos —{" "}
                    <Link href="/compras?tab=entradas">lance uma entrada de compra</Link>{" "}
                    primeiro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movimentos" && (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Saldo após</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{TIPO_MOV_LABEL[m.tipo] || m.tipo}</td>
                  <td>
                    <code>{m.codigo}</code>
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      {m.descricao} · {m.produtoTipo}
                    </div>
                  </td>
                  <td>
                    {m.quantidade} {m.unidade}
                  </td>
                  <td>{m.saldoApos ?? "—"}</td>
                  <td className="muted">
                    {m.documentoTipo || m.observacao || "—"}
                  </td>
                </tr>
              ))}
              {!movs.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
