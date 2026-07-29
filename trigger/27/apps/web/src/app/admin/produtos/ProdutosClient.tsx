"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type Produto = {
  id: string;
  codigo: string;
  descricao: string;
  descricaoFiscal: string | null;
  tipo: string;
  tipoLabel: string;
  unidade: string;
  ncm: string | null;
  cest: string | null;
  origem: number;
  cfopCompraPadrao: string | null;
  cfopVendaPadrao: string | null;
  cTribNac: string | null;
  cNbs: string | null;
  documentoSaidaPadrao: string;
  controlaEstoque: boolean;
  estoqueMinimo: number;
  custoMedio: number;
  papelId: string | null;
  papelNome: string | null;
  acabamentoId: string | null;
  acabamentoNome: string | null;
  tubeteId: string | null;
  tubeteTamanho: string | null;
  ativo: boolean;
  observacoes: string | null;
};

type Catalogos = {
  papeis: Array<{ id: string; nome: string }>;
  acabamentos: Array<{ id: string; nome: string }>;
  tubetes: Array<{ id: string; tamanho: string }>;
};

const EMPTY_FORM = {
  codigo: "",
  descricao: "",
  descricaoFiscal: "",
  tipo: "INSUMO",
  unidade: "UN",
  ncm: "",
  cest: "",
  origem: "0",
  cfopCompraPadrao: "",
  cfopVendaPadrao: "",
  cTribNac: "",
  cNbs: "",
  documentoSaidaPadrao: "NFSE",
  controlaEstoque: true,
  estoqueMinimo: "0",
  papelId: "",
  acabamentoId: "",
  tubeteId: "",
  observacoes: "",
  ativo: true,
};

export function ProdutosClient({ name, role }: { name: string; role: string }) {
  const [items, setItems] = useState<Produto[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogos>({
    papeis: [],
    acabamentos: [],
    tubetes: [],
  });
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ncmDesc, setNcmDesc] = useState<string | null>(null);
  const [showInativos, setShowInativos] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipoFiltro) params.set("tipo", tipoFiltro);
    params.set("ativo", showInativos ? "all" : "true");
    const res = await fetch(`/api/produtos?${params}`);
    const j = await res.json();
    if (res.ok) {
      setItems((j.items || []) as Produto[]);
    }
  }, [q, tipoFiltro, showInativos]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/catalogos");
      if (!res.ok) return;
      const j = await res.json();
      setCatalogos({
        papeis: (j.papeis || []).map((p: { id: string; nome: string }) => ({
          id: p.id,
          nome: p.nome,
        })),
        acabamentos: (j.acabamentos || []).map((a: { id: string; nome: string }) => ({
          id: a.id,
          nome: a.nome,
        })),
        tubetes: (j.tubetes || []).map((t: { id: string; tamanho: string }) => ({
          id: t.id,
          tamanho: t.tamanho,
        })),
      });
    })();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNcmDesc(null);
    setError(null);
    setOk(null);
  }

  function openEdit(p: Produto) {
    setEditingId(p.id);
    setForm({
      codigo: p.codigo,
      descricao: p.descricao,
      descricaoFiscal: p.descricaoFiscal || "",
      tipo: p.tipo,
      unidade: p.unidade,
      ncm: p.ncm || "",
      cest: p.cest || "",
      origem: String(p.origem ?? 0),
      cfopCompraPadrao: p.cfopCompraPadrao || "",
      cfopVendaPadrao: p.cfopVendaPadrao || "",
      cTribNac: p.cTribNac || "",
      cNbs: p.cNbs || "",
      documentoSaidaPadrao: p.documentoSaidaPadrao || "NFSE",
      controlaEstoque: p.controlaEstoque,
      estoqueMinimo: String(p.estoqueMinimo ?? 0),
      papelId: p.papelId || "",
      acabamentoId: p.acabamentoId || "",
      tubeteId: p.tubeteId || "",
      observacoes: p.observacoes || "",
      ativo: p.ativo,
    });
    setNcmDesc(null);
    setError(null);
    setOk(null);
  }

  async function lookupNcm() {
    if (!form.ncm.trim()) return;
    const res = await fetch(`/api/lookups/ncm?codigo=${encodeURIComponent(form.ncm)}`);
    const j = await res.json();
    if (res.ok) {
      setNcmDesc(j.descricao);
      setForm((f) => ({ ...f, ncm: j.codigo }));
    } else {
      setNcmDesc(null);
      setError(j.error || "NCM não encontrado");
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const payload = {
      ...form,
      origem: Number(form.origem) || 0,
      estoqueMinimo: Number(form.estoqueMinimo) || 0,
      papelId: form.papelId || null,
      acabamentoId: form.acabamentoId || null,
      tubeteId: form.tubeteId || null,
      controlaEstoque: form.tipo === "SERVICO" ? false : form.controlaEstoque,
    };
    try {
      const res = await fetch(editingId ? `/api/produtos/${editingId}` : "/api/produtos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao salvar");
      setOk(editingId ? "Produto atualizado" : "Produto criado");
      if (!editingId) openNew();
      else openEdit(j);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function inativar(id: string) {
    if (!confirm("Inativar este produto? Histórico e vínculos são preservados.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao inativar");
      setOk("Produto inativado (soft-delete)");
      if (editingId === id) openNew();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell shell-wide">
      <AppHeader name={name} role={role} />
      <p className="muted">
        <Link href="/admin">← Cadastros</Link>
        {" · "}
        <Link href="/estoque">Estoque</Link>
      </p>
      <h1>Produtos</h1>
      <p className="muted">
        Cadastro mestre com integridade: NCM, vínculos de catálogo, fiscal e estoque. Inativação
        preserva histórico (não apaga).
      </p>

      {error && <div className="alert">{error}</div>}
      {ok && <p className="ok">{ok}</p>}

      <div className="jornada-grid" style={{ marginTop: "1rem" }}>
        <form className="card-panel" onSubmit={salvar}>
          <div className="jornada-section-head">
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>
              {editingId ? "Editar produto" : "Novo produto"}
            </h2>
            {editingId && (
              <button type="button" className="secondary" onClick={openNew}>
                Novo
              </button>
            )}
          </div>

          <div className="grid-2">
            <label>
              Código *
              <input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
                disabled={!!editingId}
              />
            </label>
            <label>
              Tipo *
              <select
                value={form.tipo}
                onChange={(e) => {
                  const tipo = e.target.value;
                  setForm({
                    ...form,
                    tipo,
                    controlaEstoque: tipo === "SERVICO" ? false : form.controlaEstoque,
                    unidade: tipo === "INSUMO" && !form.unidade ? "M2" : form.unidade,
                  });
                }}
              >
                <option value="INSUMO">Insumo</option>
                <option value="ACABADO">Acabado</option>
                <option value="SERVICO">Serviço</option>
                <option value="INTERMEDIARIO">Intermediário</option>
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Descrição comercial *
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Descrição fiscal
              <input
                value={form.descricaoFiscal}
                onChange={(e) => setForm({ ...form, descricaoFiscal: e.target.value })}
              />
            </label>
            <label>
              Unidade
              <input
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              />
            </label>
            <label>
              Documento saída
              <select
                value={form.documentoSaidaPadrao}
                onChange={(e) => setForm({ ...form, documentoSaidaPadrao: e.target.value })}
              >
                <option value="NFSE">NFS-e</option>
                <option value="NFE">NF-e</option>
              </select>
            </label>
            <label>
              NCM
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={form.ncm}
                  onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                  placeholder="8 dígitos"
                />
                <button type="button" className="secondary" onClick={lookupNcm}>
                  Buscar
                </button>
              </div>
              {ncmDesc && <small className="muted">{ncmDesc}</small>}
            </label>
            <label>
              CEST
              <input
                value={form.cest}
                onChange={(e) => setForm({ ...form, cest: e.target.value })}
              />
            </label>
            <label>
              CFOP compra
              <input
                value={form.cfopCompraPadrao}
                onChange={(e) => setForm({ ...form, cfopCompraPadrao: e.target.value })}
              />
            </label>
            <label>
              CFOP venda
              <input
                value={form.cfopVendaPadrao}
                onChange={(e) => setForm({ ...form, cfopVendaPadrao: e.target.value })}
              />
            </label>
            <label>
              cTribNac (NFS-e)
              <input
                value={form.cTribNac}
                onChange={(e) => setForm({ ...form, cTribNac: e.target.value })}
                placeholder="130501"
              />
            </label>
            <label>
              cNBS
              <input
                value={form.cNbs}
                onChange={(e) => setForm({ ...form, cNbs: e.target.value })}
                placeholder="121012100"
              />
            </label>
            <label>
              Vínculo papel
              <select
                value={form.papelId}
                onChange={(e) => setForm({ ...form, papelId: e.target.value })}
              >
                <option value="">—</option>
                {catalogos.papeis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vínculo acabamento
              <select
                value={form.acabamentoId}
                onChange={(e) => setForm({ ...form, acabamentoId: e.target.value })}
              >
                <option value="">—</option>
                {catalogos.acabamentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vínculo tubete
              <select
                value={form.tubeteId}
                onChange={(e) => setForm({ ...form, tubeteId: e.target.value })}
              >
                <option value="">—</option>
                {catalogos.tubetes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tamanho}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estoque mínimo
              <input
                type="number"
                step="0.0001"
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={form.controlaEstoque}
                disabled={form.tipo === "SERVICO"}
                onChange={(e) => setForm({ ...form, controlaEstoque: e.target.checked })}
              />
              Controla estoque
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Observações
              <textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: "0.85rem" }}>
            <button type="submit" disabled={busy}>
              {busy ? "Salvando…" : editingId ? "Atualizar" : "Criar produto"}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary danger-outline"
                disabled={busy}
                onClick={() => void inativar(editingId)}
              >
                Inativar
              </button>
            )}
          </div>
        </form>

        <div>
          <div className="toolbar" style={{ marginBottom: "0.75rem", gap: "0.5rem" }}>
            <input
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              style={{ maxWidth: 160 }}
            >
              <option value="">Todos</option>
              <option value="INSUMO">Insumo</option>
              <option value="ACABADO">Acabado</option>
              <option value="SERVICO">Serviço</option>
            </select>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
              <input
                type="checkbox"
                checked={showInativos}
                onChange={(e) => setShowInativos(e.target.checked)}
              />
              <span className="muted">Inativos</span>
            </label>
          </div>
          <div className="table-wrap card-panel" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>NCM</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className={editingId === p.id ? "row-active" : undefined}
                    style={{ cursor: "pointer", opacity: p.ativo ? 1 : 0.55 }}
                    onClick={() => openEdit(p)}
                  >
                    <td>
                      <code>{p.codigo}</code>
                    </td>
                    <td>{p.descricao}</td>
                    <td>{p.tipoLabel}</td>
                    <td>{p.ncm || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nenhum produto
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
