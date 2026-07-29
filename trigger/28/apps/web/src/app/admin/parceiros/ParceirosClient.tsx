"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  formatCepMask,
  formatCnpjMask,
  formatCpfMask,
} from "@/lib/parceiros";

type TipoParceiro = "CLIENTE" | "FORNECEDOR" | "VENDEDOR" | "USUARIO";
type TipoPessoa = "PF" | "PJ";
type RoleAcesso = "ADMIN" | "VENDEDOR" | "ORCAMENTISTA";

type Parceiro = {
  id: string;
  codigo: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  razaoSocial: string | null;
  documento: string | null;
  documentoFormatado: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  website: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoMunicipioIbge: string | null;
  emailFiscal: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  indicadorIeDest: "CONTRIBUINTE" | "ISENTO" | "NAO_CONTRIBUINTE";
  contribuinteIcms: boolean;
  consumidorFinal: boolean;
  observacoes: string | null;
  ativo: boolean;
  tipos: Array<{
    tipo: TipoParceiro;
    label: string;
    comissaoPadraoPct: number | null;
    ativo: boolean;
  }>;
  tiposFlags: {
    cliente: boolean;
    fornecedor: boolean;
    vendedor: boolean;
    usuario: boolean;
  };
  acesso: {
    userId: string;
    email: string;
    role: RoleAcesso;
    active: boolean;
  } | null;
};

const TIPO_OPTS: Array<{ value: TipoParceiro; label: string }> = [
  { value: "CLIENTE", label: "Cliente" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "USUARIO", label: "Usuário do sistema" },
];

type FormState = {
  codigo: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  razaoSocial: string;
  documento: string;
  email: string;
  telefone: string;
  celular: string;
  website: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  emailFiscal: string;
  codigoMunicipioIbge: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  indicadorIeDest: "CONTRIBUINTE" | "ISENTO" | "NAO_CONTRIBUINTE";
  contribuinteIcms: boolean;
  consumidorFinal: boolean;
  observacoes: string;
  ativo: boolean;
  tipos: TipoParceiro[];
  comissaoPadraoPct: string;
  acessoEmail: string;
  acessoPassword: string;
  acessoRole: RoleAcesso;
  acessoActive: boolean;
};

const emptyForm = (): FormState => ({
  codigo: "",
  tipoPessoa: "PJ",
  nome: "",
  razaoSocial: "",
  documento: "",
  email: "",
  telefone: "",
  celular: "",
  website: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  emailFiscal: "",
  codigoMunicipioIbge: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  indicadorIeDest: "NAO_CONTRIBUINTE",
  contribuinteIcms: false,
  consumidorFinal: false,
  observacoes: "",
  ativo: true,
  tipos: ["CLIENTE"],
  comissaoPadraoPct: "",
  acessoEmail: "",
  acessoPassword: "",
  acessoRole: "VENDEDOR",
  acessoActive: true,
});

function fromParceiro(p: Parceiro): FormState {
  const comissao = p.tipos.find((t) => t.tipo === "VENDEDOR")?.comissaoPadraoPct;
  return {
    codigo: p.codigo || "",
    tipoPessoa: p.tipoPessoa,
    nome: p.nome,
    razaoSocial: p.razaoSocial || "",
    documento: p.documentoFormatado || p.documento || "",
    email: p.email || "",
    telefone: p.telefone || "",
    celular: p.celular || "",
    website: p.website || "",
    cep: p.cep || "",
    logradouro: p.logradouro || "",
    numero: p.numero || "",
    complemento: p.complemento || "",
    bairro: p.bairro || "",
    cidade: p.cidade || "",
    uf: p.uf || "",
    emailFiscal: p.emailFiscal || "",
    codigoMunicipioIbge: p.codigoMunicipioIbge || "",
    inscricaoEstadual: p.inscricaoEstadual || "",
    inscricaoMunicipal: p.inscricaoMunicipal || "",
    indicadorIeDest: p.indicadorIeDest || "NAO_CONTRIBUINTE",
    contribuinteIcms: p.contribuinteIcms ?? false,
    consumidorFinal: p.consumidorFinal ?? false,
    observacoes: p.observacoes || "",
    ativo: p.ativo,
    tipos: p.tipos.map((t) => t.tipo),
    comissaoPadraoPct: comissao != null ? String(comissao) : "",
    acessoEmail: p.acesso?.email || p.email || "",
    acessoPassword: "",
    acessoRole: p.acesso?.role || "VENDEDOR",
    acessoActive: p.acesso?.active ?? true,
  };
}

export default function ParceirosClient({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const [items, setItems] = useState<Parceiro[]>([]);
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoParceiro>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lookupCnpjBusy, setLookupCnpjBusy] = useState(false);
  const [lookupCepBusy, setLookupCepBusy] = useState(false);
  const [lookupIbgeBusy, setLookupIbgeBusy] = useState(false);
  const [ibgeSugestoes, setIbgeSugestoes] = useState<Array<{ codigo: string; nome: string; ufSigla: string }>>([]);
  const [showIbgeDropdown, setShowIbgeDropdown] = useState(false);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const lastCnpjLookup = useRef<string>("");
  const lastCepLookup = useRef<string>("");
  const ibgeSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** true se o usuário editou o código manualmente (não re-sugerir ao mudar tipo). */
  const codigoManual = useRef(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filtroTipo) params.set("tipo", filtroTipo);
    const res = await fetch(`/api/admin/parceiros?${params}`);
    const data = await res.json();
    setItems(data.items || []);
  }, [q, filtroTipo]);

  useEffect(() => {
    void load();
  }, [load]);

  const wantsUsuario = form.tipos.includes("USUARIO");
  const wantsVendedor = form.tipos.includes("VENDEDOR");

  const title = useMemo(
    () => (editingId ? "Editar parceiro" : "Novo parceiro"),
    [editingId],
  );

  async function sugerirCodigo(tipos: TipoParceiro[]) {
    const params = new URLSearchParams({ tipos: tipos.join(",") });
    const res = await fetch(`/api/admin/parceiros/proximo-codigo?${params}`);
    const data = await res.json();
    if (res.ok && data.codigo) {
      setForm((f) => ({ ...f, codigo: data.codigo }));
      codigoManual.current = false;
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
    setMsg(null);
    setLookupHint(null);
    lastCnpjLookup.current = "";
    lastCepLookup.current = "";
    codigoManual.current = false;
    void sugerirCodigo(["CLIENTE"]);
  }

  function openEdit(p: Parceiro) {
    setEditingId(p.id);
    setForm(fromParceiro(p));
    setShowForm(true);
    setError(null);
    setMsg(null);
    setLookupHint(null);
    codigoManual.current = true;
    lastCnpjLookup.current = (p.documento || "").replace(/\D/g, "");
    lastCepLookup.current = (p.cep || "").replace(/\D/g, "");
  }

  function toggleTipo(tipo: TipoParceiro) {
    setForm((f) => {
      const has = f.tipos.includes(tipo);
      const tipos = has ? f.tipos.filter((t) => t !== tipo) : [...f.tipos, tipo];
      const next = tipos.length ? tipos : f.tipos;
      // Código é sequencial numérico global — independente do tipo do parceiro.
      return { ...f, tipos: next };
    });
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onDocumentoChange(raw: string) {
    const masked =
      form.tipoPessoa === "PJ" ? formatCnpjMask(raw) : formatCpfMask(raw);
    setField("documento", masked);
  }

  function onCepChange(raw: string) {
    setField("cep", formatCepMask(raw));
  }

  async function consultarCnpj(force = false) {
    if (form.tipoPessoa !== "PJ") return;
    const digits = form.documento.replace(/\D/g, "");
    if (digits.length !== 14) {
      if (force) setLookupHint("Informe um CNPJ completo (14 dígitos).");
      return;
    }
    if (!force && lastCnpjLookup.current === digits) return;

    setLookupCnpjBusy(true);
    setLookupHint("Consultando CNPJ…");
    try {
      const res = await fetch(`/api/lookups/cnpj?cnpj=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupHint(data.error || "CNPJ não encontrado.");
        return;
      }
      lastCnpjLookup.current = digits;
      setForm((f) => ({
        ...f,
        tipoPessoa: "PJ",
        documento: data.documentoFormatado || f.documento,
        razaoSocial: data.razaoSocial || f.razaoSocial,
        nome: data.nomeFantasia || data.razaoSocial || f.nome,
        email: f.email || data.email || "",
        telefone: f.telefone || data.telefone || "",
        cep: data.cep || f.cep,
        logradouro: data.logradouro || f.logradouro,
        numero: data.numero || f.numero,
        complemento: data.complemento || f.complemento,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade || f.cidade,
        uf: data.uf || f.uf,
        codigoMunicipioIbge: data.codigoMunicipioIbge || f.codigoMunicipioIbge,
      }));
      if (data.cep) {
        lastCepLookup.current = String(data.cep).replace(/\D/g, "");
      }
      if (!data.codigoMunicipioIbge && data.cidade && data.uf) {
        resolverIbgePorCidadeUf(data.cidade, data.uf);
      }
      setLookupHint(
        data.fonte === "minhareceita"
          ? "Dados preenchidos via Minha Receita."
          : "Dados preenchidos via BrasilAPI (Receita Federal).",
      );
    } catch {
      setLookupHint("Falha de rede ao consultar CNPJ.");
    } finally {
      setLookupCnpjBusy(false);
    }
  }

  async function consultarCep(force = false) {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      if (force) setLookupHint("Informe um CEP completo (8 dígitos).");
      return;
    }
    if (!force && lastCepLookup.current === digits) return;

    setLookupCepBusy(true);
    setLookupHint("Consultando CEP…");
    try {
      const res = await fetch(`/api/lookups/cep?cep=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupHint(data.error || "CEP não encontrado.");
        return;
      }
      lastCepLookup.current = digits;
      setForm((f) => ({
        ...f,
        cep: data.cepFormatado || f.cep,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade || f.cidade,
        uf: data.uf || f.uf,
        complemento: f.complemento || data.complemento || "",
        codigoMunicipioIbge: data.codigoMunicipioIbge || f.codigoMunicipioIbge,
      }));
      if (!data.codigoMunicipioIbge && data.cidade && data.uf) {
        resolverIbgePorCidadeUf(data.cidade, data.uf);
      }
      setLookupHint(
        data.fonte === "viacep"
          ? "Endereço preenchido via ViaCEP."
          : "Endereço preenchido via BrasilAPI.",
      );
    } catch {
      setLookupHint("Falha de rede ao consultar CEP.");
    } finally {
      setLookupCepBusy(false);
    }
  }

  async function resolverIbgePorCidadeUf(cidade: string, uf: string) {
    try {
      const params = new URLSearchParams({ cidade, uf });
      const res = await fetch(`/api/lookups/ibge?${params}`);
      const data = await res.json();
      if (res.ok && data.codigo) {
        setForm((f) => ({ ...f, codigoMunicipioIbge: data.codigo }));
      }
    } catch { /* silently fail — user can fill manually */ }
  }

  function buscarMunicipiosIbge(query: string) {
    setShowIbgeDropdown(false);
    if (ibgeSearchTimer.current) clearTimeout(ibgeSearchTimer.current);
    if (query.length < 3) {
      setIbgeSugestoes([]);
      return;
    }
    ibgeSearchTimer.current = setTimeout(async () => {
      setLookupIbgeBusy(true);
      try {
        const res = await fetch(`/api/lookups/ibge?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok && data.municipios) {
          setIbgeSugestoes(data.municipios);
          setShowIbgeDropdown(true);
        }
      } catch { /* ignore */ } finally {
        setLookupIbgeBusy(false);
      }
    }, 350);
  }

  function selecionarMunicipioIbge(m: { codigo: string; nome: string; ufSigla: string }) {
    setForm((f) => ({
      ...f,
      codigoMunicipioIbge: m.codigo,
      cidade: f.cidade || m.nome,
      uf: f.uf || m.ufSigla,
    }));
    setIbgeSugestoes([]);
    setShowIbgeDropdown(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);

    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      tipoPessoa: form.tipoPessoa,
      nome: form.nome,
      razaoSocial: form.razaoSocial || null,
      documento: form.documento || null,
      email: form.email || null,
      telefone: form.telefone || null,
      celular: form.celular || null,
      website: form.website || null,
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      emailFiscal: form.emailFiscal || null,
      codigoMunicipioIbge: form.codigoMunicipioIbge || null,
      inscricaoEstadual: form.inscricaoEstadual || null,
      inscricaoMunicipal: form.inscricaoMunicipal || null,
      indicadorIeDest: form.indicadorIeDest,
      contribuinteIcms: form.contribuinteIcms,
      consumidorFinal: form.consumidorFinal,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
      tipos: form.tipos,
      comissaoPadraoPct:
        wantsVendedor && form.comissaoPadraoPct !== ""
          ? Number(form.comissaoPadraoPct)
          : null,
      acesso: wantsUsuario
        ? {
            email: form.acessoEmail,
            role: form.acessoRole,
            active: form.acessoActive,
            ...(form.acessoPassword ? { password: form.acessoPassword } : {}),
          }
        : null,
    };

    const res = await fetch(
      editingId ? `/api/admin/parceiros/${editingId}` : "/api/admin/parceiros",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Falha ao salvar");
      return;
    }

    setMsg(editingId ? "Parceiro atualizado." : "Parceiro criado.");
    setShowForm(false);
    setEditingId(null);
    await load();
  }

  async function inativar(p: Parceiro) {
    if (!confirm(`Inativar/remover "${p.nome}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/parceiros/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao remover");
      return;
    }
    setMsg(data.message || "Parceiro removido/inativado.");
    await load();
  }

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="Cadastros"
        title="Parceiros"
        subtitle="Um cadastro, vários papéis: cliente, fornecedor, vendedor e/ou usuário do sistema."
        crumbs={[{ href: "/admin", label: "Cadastros" }]}
        actions={
          <button type="button" onClick={openCreate}>
            Novo parceiro
          </button>
        }
      />

      {msg && (
        <div className="alert-ok" role="status">
          {msg}
        </div>
      )}
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <section className="card-panel">
        <div className="grid-3" style={{ marginBottom: "1rem" }}>
          <label>
            Buscar
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, documento, código, cidade…"
            />
          </label>
          <label>
            Filtrar por papel
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "" | TipoParceiro)}
            >
              <option value="">Todos</option>
              {TIPO_OPTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            &nbsp;
            <button type="button" className="secondary" onClick={() => void load()}>
              Atualizar lista
            </button>
          </label>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Documento</th>
              <th>Papéis</th>
              <th>Cidade</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>
                  <strong>{p.nome}</strong>
                </td>
                <td>{p.documentoFormatado || "—"}</td>
                <td>
                  <div className="chip-row">
                    {p.tipos.map((t) => (
                      <span key={t.tipo} className={`chip chip-${t.tipo.toLowerCase()}`}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {[p.cidade, p.uf].filter(Boolean).join("/") || "—"}
                </td>
                <td>{p.ativo ? "Ativo" : "Inativo"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="secondary" onClick={() => openEdit(p)}>
                    Editar
                  </button>{" "}
                  <button type="button" className="secondary" onClick={() => void inativar(p)}>
                    Inativar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum parceiro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div
            className="card-panel modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="parceiro-form-title"
          >
            <h2 id="parceiro-form-title">{title}</h2>
            <form onSubmit={onSubmit} className="parceiro-form">
              <fieldset>
                <legend>Identificação</legend>
                <div className="grid-3">
                  <label>
                    Código *
                    <div className="field-with-action">
                      <input
                        value={form.codigo}
                        onChange={(e) => {
                          codigoManual.current = true;
                          setField("codigo", e.target.value.replace(/\D/g, "").slice(0, 40));
                        }}
                        required
                        disabled={!!editingId}
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0001"
                        title={
                          editingId
                            ? "Código imutável após o cadastro (chave de negócio)"
                            : "Código numérico único na empresa"
                        }
                      />
                      {!editingId && (
                        <button
                          type="button"
                          className="secondary field-action"
                          onClick={() => {
                            codigoManual.current = false;
                            void sugerirCodigo(form.tipos);
                          }}
                        >
                          Sugerir
                        </button>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>
                      {editingId
                        ? "Imutável — usado em pedidos, NF-e e relatórios."
                        : "Numérico e único na empresa. Sequencial sugerido automaticamente."}
                    </span>
                  </label>
                  <label>
                    Tipo de pessoa
                    <select
                      value={form.tipoPessoa}
                      onChange={(e) => {
                        const next = e.target.value as TipoPessoa;
                        setForm((f) => ({
                          ...f,
                          tipoPessoa: next,
                          documento:
                            next === "PJ"
                              ? formatCnpjMask(f.documento)
                              : formatCpfMask(f.documento),
                          razaoSocial: next === "PF" ? "" : f.razaoSocial,
                        }));
                        setLookupHint(null);
                      }}
                    >
                      <option value="PJ">Pessoa jurídica</option>
                      <option value="PF">Pessoa física</option>
                    </select>
                  </label>
                  <label>
                    {form.tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
                    <div className="field-with-action">
                      <input
                        value={form.documento}
                        onChange={(e) => onDocumentoChange(e.target.value)}
                        onBlur={() => {
                          if (form.tipoPessoa === "PJ") void consultarCnpj(false);
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={
                          form.tipoPessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"
                        }
                      />
                      {form.tipoPessoa === "PJ" && (
                        <button
                          type="button"
                          className="secondary field-action"
                          disabled={lookupCnpjBusy}
                          onClick={() => void consultarCnpj(true)}
                        >
                          {lookupCnpjBusy ? "…" : "Buscar"}
                        </button>
                      )}
                    </div>
                  </label>
                </div>
                {lookupHint && (
                  <p className="lookup-hint muted">{lookupHint}</p>
                )}
                <div className="grid-2" style={{ marginTop: "0.75rem" }}>
                  <label>
                    Nome / nome fantasia *
                    <input
                      required
                      value={form.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                    />
                  </label>
                  <label>
                    Razão social
                    <input
                      value={form.razaoSocial}
                      onChange={(e) => setField("razaoSocial", e.target.value)}
                      disabled={form.tipoPessoa === "PF"}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Papéis do parceiro *</legend>
                <div className="chip-row check-row">
                  {TIPO_OPTS.map((t) => (
                    <label key={t.value} className="check-chip">
                      <input
                        type="checkbox"
                        checked={form.tipos.includes(t.value)}
                        onChange={() => toggleTipo(t.value)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
                {wantsVendedor && (
                  <label style={{ marginTop: "0.75rem", maxWidth: 220 }}>
                    Comissão padrão (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={form.comissaoPadraoPct}
                      onChange={(e) => setField("comissaoPadraoPct", e.target.value)}
                    />
                  </label>
                )}
              </fieldset>

              <fieldset>
                <legend>Contato</legend>
                <div className="grid-3">
                  <label>
                    E-mail
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </label>
                  <label>
                    Telefone
                    <input
                      value={form.telefone}
                      onChange={(e) => setField("telefone", e.target.value)}
                    />
                  </label>
                  <label>
                    Celular
                    <input
                      value={form.celular}
                      onChange={(e) => setField("celular", e.target.value)}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Endereço</legend>
                <div className="grid-3">
                  <label>
                    CEP
                    <div className="field-with-action">
                      <input
                        value={form.cep}
                        onChange={(e) => onCepChange(e.target.value)}
                        onBlur={() => void consultarCep(false)}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="00000-000"
                      />
                      <button
                        type="button"
                        className="secondary field-action"
                        disabled={lookupCepBusy}
                        onClick={() => void consultarCep(true)}
                      >
                        {lookupCepBusy ? "…" : "Buscar"}
                      </button>
                    </div>
                  </label>
                  <label style={{ gridColumn: "span 2" }}>
                    Logradouro
                    <input
                      value={form.logradouro}
                      onChange={(e) => setField("logradouro", e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid-3" style={{ marginTop: "0.75rem" }}>
                  <label>
                    Número
                    <input
                      value={form.numero}
                      onChange={(e) => setField("numero", e.target.value)}
                    />
                  </label>
                  <label>
                    Complemento
                    <input
                      value={form.complemento}
                      onChange={(e) => setField("complemento", e.target.value)}
                    />
                  </label>
                  <label>
                    Bairro
                    <input
                      value={form.bairro}
                      onChange={(e) => setField("bairro", e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid-3" style={{ marginTop: "0.75rem" }}>
                  <label>
                    Cidade
                    <input
                      value={form.cidade}
                      onChange={(e) => setField("cidade", e.target.value)}
                    />
                  </label>
                  <label>
                    UF
                    <input
                      maxLength={2}
                      value={form.uf}
                      onChange={(e) => setField("uf", e.target.value.toUpperCase())}
                    />
                  </label>
                  <label>
                    Website
                    <input
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Dados fiscais (Focus NF-e / NFS-e)</legend>
                <p className="muted" style={{ marginTop: 0 }}>
                  Destinatário da NF-e e tomador da NFS-e Nacional. IBGE e IE são obrigatórios em
                  produção.
                </p>
                <div className="grid-3">
                  <label style={{ position: "relative" }}>
                    Código IBGE município
                    <div className="field-with-action">
                      <input
                        value={form.codigoMunicipioIbge}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const isNumeric = /^\d*$/.test(raw);
                          if (isNumeric) {
                            setField("codigoMunicipioIbge", raw.slice(0, 7));
                          }
                          buscarMunicipiosIbge(raw);
                        }}
                        onFocus={() => {
                          if (ibgeSugestoes.length > 0) setShowIbgeDropdown(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowIbgeDropdown(false), 200);
                        }}
                        placeholder="Digite código ou nome da cidade"
                        autoComplete="off"
                      />
                      {lookupIbgeBusy && (
                        <span className="field-action muted" style={{ pointerEvents: "none" }}>…</span>
                      )}
                    </div>
                    {form.codigoMunicipioIbge && (
                      <span className="muted" style={{ fontSize: "0.7rem" }}>
                        IBGE: {form.codigoMunicipioIbge}
                      </span>
                    )}
                    {showIbgeDropdown && ibgeSugestoes.length > 0 && (
                      <ul
                        className="ibge-dropdown"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: "var(--bg, #fff)",
                          border: "1px solid var(--border, #ddd)",
                          borderRadius: "0.375rem",
                          maxHeight: 200,
                          overflowY: "auto",
                          margin: 0,
                          padding: 0,
                          listStyle: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        {ibgeSugestoes.map((m) => (
                          <li
                            key={m.codigo}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selecionarMunicipioIbge(m);
                            }}
                            style={{
                              padding: "0.5rem 0.75rem",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              borderBottom: "1px solid var(--border, #eee)",
                            }}
                          >
                            <strong>{m.nome}</strong>
                            <span className="muted"> — {m.ufSigla}</span>
                            <code style={{ float: "right", fontSize: "0.75rem" }}>{m.codigo}</code>
                          </li>
                        ))}
                      </ul>
                    )}
                  </label>
                  <label>
                    Inscrição estadual
                    <input
                      value={form.inscricaoEstadual}
                      onChange={(e) => setField("inscricaoEstadual", e.target.value)}
                    />
                  </label>
                  <label>
                    Inscrição municipal
                    <input
                      value={form.inscricaoMunicipal}
                      onChange={(e) => setField("inscricaoMunicipal", e.target.value)}
                    />
                  </label>
                  <label>
                    Indicador IE (indIEDest)
                    <select
                      value={form.indicadorIeDest}
                      onChange={(e) =>
                        setField(
                          "indicadorIeDest",
                          e.target.value as FormState["indicadorIeDest"],
                        )
                      }
                    >
                      <option value="NAO_CONTRIBUINTE">9 — Não contribuinte</option>
                      <option value="CONTRIBUINTE">1 — Contribuinte ICMS</option>
                      <option value="ISENTO">2 — Isento</option>
                    </select>
                  </label>
                  <label>
                    E-mail fiscal
                    <input
                      type="email"
                      value={form.emailFiscal}
                      onChange={(e) => setField("emailFiscal", e.target.value)}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.consumidorFinal}
                      onChange={(e) => setField("consumidorFinal", e.target.checked)}
                    />
                    Consumidor final
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.contribuinteIcms}
                      onChange={(e) => setField("contribuinteIcms", e.target.checked)}
                    />
                    Contribuinte ICMS
                  </label>
                </div>
              </fieldset>

              {wantsUsuario && (
                <fieldset>
                  <legend>Acesso ao sistema</legend>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Credenciais ficam na tabela User, vinculadas 1:1 a este parceiro.
                  </p>
                  <div className="grid-3">
                    <label>
                      E-mail de login *
                      <input
                        type="email"
                        required={wantsUsuario}
                        value={form.acessoEmail}
                        onChange={(e) => setField("acessoEmail", e.target.value)}
                      />
                    </label>
                    <label>
                      Senha {editingId ? "(deixe em branco para manter)" : "*"}
                      <input
                        type="password"
                        minLength={8}
                        required={wantsUsuario && !editingId}
                        value={form.acessoPassword}
                        onChange={(e) => setField("acessoPassword", e.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      Papel de acesso
                      <select
                        value={form.acessoRole}
                        onChange={(e) => setField("acessoRole", e.target.value as RoleAcesso)}
                      >
                        <option value="VENDEDOR">Vendedor</option>
                        <option value="ORCAMENTISTA">Orçamentista</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </label>
                  </div>
                  <label className="check-inline" style={{ marginTop: "0.75rem" }}>
                    <input
                      type="checkbox"
                      checked={form.acessoActive}
                      onChange={(e) => setField("acessoActive", e.target.checked)}
                    />
                    Login ativo
                  </label>
                </fieldset>
              )}

              <fieldset>
                <legend>Observações</legend>
                <label>
                  Notas internas
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setField("observacoes", e.target.value)}
                  />
                </label>
                <label className="check-inline" style={{ marginTop: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setField("ativo", e.target.checked)}
                  />
                  Parceiro ativo
                </label>
              </fieldset>

              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar parceiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
