"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { formatCnae } from "@/lib/cnae";
import { formatCepMask, formatCnpjMask } from "@/lib/parceiros";

type Regime =
  | "SIMPLES_NACIONAL"
  | "SIMPLES_EXCESSO"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL"
  | "MEI"
  | "OUTRO";
type Ambiente = "HOMOLOGACAO" | "PRODUCAO";
type TipoCert = "A1" | "A3";
type Finalidade = "NFSE" | "NFE" | "CTE" | "GERAL";
type TipoCnae = "PRINCIPAL" | "SECUNDARIO";

type CnaeRow = {
  codigo: string;
  codigoFormatado?: string;
  descricao: string | null;
  tipo: TipoCnae;
  fonte?: string | null;
};

type Certificado = {
  id: string;
  apelido: string;
  tipo: TipoCert;
  tipoLabel: string;
  finalidade: Finalidade;
  finalidadeLabel: string;
  status: string;
  statusLabel: string;
  subjectCn: string | null;
  serialNumber: string | null;
  emissor: string | null;
  validadeInicio: string | null;
  validadeFim: string | null;
  arquivoNome: string | null;
  temArquivo: boolean;
  temSenha: boolean;
  ativo: boolean;
  observacoes: string | null;
};

type Empresa = {
  id: string;
  codigo: string | null;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  cnpjFormatado: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: string | null;
  cnaePrincipalFormatado?: string | null;
  cnaePrincipalDescricao: string | null;
  cnaes: CnaeRow[];
  cnaesSecundarios: CnaeRow[];
  regimeTributario: Regime;
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
  ambienteFiscal: Ambiente;
  simularProducao: boolean;
  ativo: boolean;
  observacoes: string | null;
  certificados: Certificado[];
};

type EmpresaForm = {
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnaePrincipal: string;
  cnaePrincipalDescricao: string;
  cnaesSecundarios: CnaeRow[];
  regimeTributario: Regime;
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
  codigoMunicipioIbge: string;
  ambienteFiscal: Ambiente;
  simularProducao: boolean;
  ativo: boolean;
  observacoes: string;
};

type CertForm = {
  apelido: string;
  tipo: TipoCert;
  finalidade: Finalidade;
  subjectCn: string;
  serialNumber: string;
  emissor: string;
  validadeInicio: string;
  validadeFim: string;
  senha: string;
  ativo: boolean;
  observacoes: string;
  arquivoBase64: string | null;
  arquivoNome: string;
};

const emptyEmpresa = (): EmpresaForm => ({
  codigo: "MATRIZ",
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cnaePrincipal: "",
  cnaePrincipalDescricao: "",
  cnaesSecundarios: [],
  regimeTributario: "SIMPLES_NACIONAL",
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
  codigoMunicipioIbge: "",
  ambienteFiscal: "HOMOLOGACAO",
  simularProducao: true,
  ativo: true,
  observacoes: "",
});

const emptyCert = (): CertForm => ({
  apelido: "",
  tipo: "A1",
  finalidade: "NFSE",
  subjectCn: "",
  serialNumber: "",
  emissor: "",
  validadeInicio: "",
  validadeFim: "",
  senha: "",
  ativo: true,
  observacoes: "",
  arquivoBase64: null,
  arquivoNome: "",
});

function fromEmpresa(e: Empresa): EmpresaForm {
  return {
    codigo: e.codigo || "",
    razaoSocial: e.razaoSocial,
    nomeFantasia: e.nomeFantasia,
    cnpj: formatCnpjMask(e.cnpj),
    inscricaoEstadual: e.inscricaoEstadual || "",
    inscricaoMunicipal: e.inscricaoMunicipal || "",
    cnaePrincipal: e.cnaePrincipalFormatado || formatCnae(e.cnaePrincipal) || e.cnaePrincipal || "",
    cnaePrincipalDescricao: e.cnaePrincipalDescricao || "",
    cnaesSecundarios: (e.cnaesSecundarios || e.cnaes?.filter((c) => c.tipo === "SECUNDARIO") || []).map(
      (c) => ({
        codigo: c.codigo,
        codigoFormatado: c.codigoFormatado || formatCnae(c.codigo),
        descricao: c.descricao,
        tipo: "SECUNDARIO" as const,
        fonte: c.fonte ?? null,
      }),
    ),
    regimeTributario: e.regimeTributario,
    email: e.email || "",
    telefone: e.telefone || "",
    celular: e.celular || "",
    website: e.website || "",
    cep: formatCepMask(e.cep || ""),
    logradouro: e.logradouro || "",
    numero: e.numero || "",
    complemento: e.complemento || "",
    bairro: e.bairro || "",
    cidade: e.cidade || "",
    uf: e.uf || "",
    codigoMunicipioIbge: e.codigoMunicipioIbge || "",
    ambienteFiscal: e.ambienteFiscal,
    simularProducao: e.simularProducao,
    ativo: e.ativo,
    observacoes: e.observacoes || "",
  };
}

function buildCnaesPayload(form: EmpresaForm): CnaeRow[] {
  const items: CnaeRow[] = [];
  if (form.cnaePrincipal.trim()) {
    items.push({
      codigo: form.cnaePrincipal,
      descricao: form.cnaePrincipalDescricao || null,
      tipo: "PRINCIPAL",
      fonte: "manual",
    });
  }
  for (const s of form.cnaesSecundarios) {
    if (!s.codigo?.trim()) continue;
    items.push({
      codigo: s.codigo,
      descricao: s.descricao,
      tipo: "SECUNDARIO",
      fonte: s.fonte ?? "manual",
    });
  }
  return items;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function EmpresaClient({ name, role }: { name: string; role: string }) {
  const [form, setForm] = useState<EmpresaForm>(emptyEmpresa());
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [certForm, setCertForm] = useState<CertForm>(emptyCert());
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCert, setSavingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "info">("ok");
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const [lookupCnpjBusy, setLookupCnpjBusy] = useState(false);
  const [lookupCepBusy, setLookupCepBusy] = useState(false);
  const lastCnpj = useRef("");
  const lastCep = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/empresa?full=1");
      if (res.status === 404) {
        setForm(emptyEmpresa());
        setCerts([]);
        setMsg("Cadastre a empresa raiz para iniciar o sistema.");
        setMsgTone("info");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Falha ao carregar empresa");
      }
      const data = (await res.json()) as Empresa;
      setForm(fromEmpresa(data));
      setCerts(data.certificados || []);
      lastCnpj.current = data.cnpj.replace(/\D/g, "");
      lastCep.current = (data.cep || "").replace(/\D/g, "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function lookupCnpj() {
    const cnpj = form.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      setLookupHint("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setLookupCnpjBusy(true);
    setLookupHint(null);
    try {
      const res = await fetch(`/api/lookups/cnpj?cnpj=${cnpj}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "CNPJ não encontrado");
      setForm((f) => ({
        ...f,
        razaoSocial: j.razaoSocial || f.razaoSocial,
        nomeFantasia: j.nomeFantasia || f.nomeFantasia || j.razaoSocial || "",
        email: j.email || f.email,
        telefone: j.telefone || f.telefone,
        cep: j.cep ? formatCepMask(j.cep) : f.cep,
        logradouro: j.logradouro || f.logradouro,
        numero: j.numero || f.numero,
        complemento: j.complemento || f.complemento,
        bairro: j.bairro || f.bairro,
        cidade: j.cidade || f.cidade,
        uf: j.uf || f.uf,
        cnaePrincipal: j.cnaePrincipal?.codigoFormatado || f.cnaePrincipal,
        cnaePrincipalDescricao: j.cnaePrincipal?.descricao || f.cnaePrincipalDescricao,
        cnaesSecundarios: Array.isArray(j.cnaesSecundarios)
          ? j.cnaesSecundarios.map(
              (c: {
                codigo: string;
                codigoFormatado?: string;
                descricao: string | null;
              }) => ({
                codigo: c.codigo,
                codigoFormatado: c.codigoFormatado || formatCnae(c.codigo),
                descricao: c.descricao,
                tipo: "SECUNDARIO" as const,
                fonte: j.fonte,
              }),
            )
          : f.cnaesSecundarios,
      }));
      lastCnpj.current = cnpj;
      const nSec = Array.isArray(j.cnaesSecundarios) ? j.cnaesSecundarios.length : 0;
      const cnaeHint = j.cnaePrincipal
        ? ` CNAE ${j.cnaePrincipal.codigoFormatado}${nSec ? ` + ${nSec} secundário(s)` : ""}.`
        : "";
      setLookupHint(`Dados preenchidos via ${j.fonte}.${cnaeHint} Revise antes de salvar.`);
    } catch (e) {
      setLookupHint(e instanceof Error ? e.message : "Falha no CNPJ");
    } finally {
      setLookupCnpjBusy(false);
    }
  }

  async function lookupCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setLookupHint("CEP deve ter 8 dígitos.");
      return;
    }
    setLookupCepBusy(true);
    setLookupHint(null);
    try {
      const res = await fetch(`/api/lookups/cep?cep=${cep}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "CEP não encontrado");
      setForm((f) => ({
        ...f,
        logradouro: j.logradouro || f.logradouro,
        bairro: j.bairro || f.bairro,
        cidade: j.cidade || f.cidade,
        uf: j.uf || f.uf,
        complemento: j.complemento || f.complemento,
      }));
      lastCep.current = cep;
      setLookupHint(`Endereço preenchido via ${j.fonte}.`);
    } catch (e) {
      setLookupHint(e instanceof Error ? e.message : "Falha no CEP");
    } finally {
      setLookupCepBusy(false);
    }
  }

  async function onSaveEmpresa(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          cnaePrincipalDescricao: form.cnaePrincipalDescricao || null,
          cnaes: buildCnaesPayload(form),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao salvar");
      setForm(fromEmpresa(j));
      setCerts(j.certificados || []);
      setMsg("Cadastro da empresa raiz salvo.");
      setMsgTone("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function openNewCert() {
    setEditingCertId(null);
    setCertForm(emptyCert());
    setShowCertModal(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openEditCert(c: Certificado) {
    setEditingCertId(c.id);
    setCertForm({
      apelido: c.apelido,
      tipo: c.tipo,
      finalidade: c.finalidade,
      subjectCn: c.subjectCn || "",
      serialNumber: c.serialNumber || "",
      emissor: c.emissor || "",
      validadeInicio: toDateInput(c.validadeInicio),
      validadeFim: toDateInput(c.validadeFim),
      senha: "",
      ativo: c.ativo,
      observacoes: c.observacoes || "",
      arquivoBase64: null,
      arquivoNome: c.arquivoNome || "",
    });
    setShowCertModal(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File | null) {
    if (!file) {
      setCertForm((f) => ({ ...f, arquivoBase64: null, arquivoNome: "" }));
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    setCertForm((f) => ({
      ...f,
      arquivoBase64: btoa(binary),
      arquivoNome: file.name,
    }));
  }

  async function onSaveCert(ev: FormEvent) {
    ev.preventDefault();
    setSavingCert(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        apelido: certForm.apelido,
        tipo: certForm.tipo,
        finalidade: certForm.finalidade,
        subjectCn: certForm.subjectCn || null,
        serialNumber: certForm.serialNumber || null,
        emissor: certForm.emissor || null,
        validadeInicio: certForm.validadeInicio
          ? new Date(`${certForm.validadeInicio}T00:00:00`).toISOString()
          : null,
        validadeFim: certForm.validadeFim
          ? new Date(`${certForm.validadeFim}T23:59:59`).toISOString()
          : null,
        ativo: certForm.ativo,
        observacoes: certForm.observacoes || null,
        arquivoNome: certForm.arquivoNome || null,
      };
      if (certForm.arquivoBase64) payload.arquivoBase64 = certForm.arquivoBase64;
      if (certForm.senha) payload.senha = certForm.senha;

      const res = await fetch(
        editingCertId
          ? `/api/admin/empresa/certificados/${editingCertId}`
          : "/api/admin/empresa/certificados",
        {
          method: editingCertId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha no certificado");
      setShowCertModal(false);
      setMsg(editingCertId ? "Certificado atualizado." : "Certificado cadastrado.");
      setMsgTone("ok");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no certificado");
    } finally {
      setSavingCert(false);
    }
  }

  async function removeCert(id: string) {
    if (!confirm("Remover este certificado?")) return;
    const res = await fetch(`/api/admin/empresa/certificados/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Falha ao remover");
      return;
    }
    setMsg("Certificado removido.");
    setMsgTone("ok");
    await load();
  }

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="Cadastros"
        title="Empresa (raiz do sistema)"
        subtitle="Cadastro único da emitente. Parceiros, usuários, orçamentos e certificados pertencem a esta raiz."
        crumbs={[{ href: "/admin", label: "Cadastros" }]}
      />

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {msg && !error && (
        <div className={msgTone === "info" ? "alert-info" : "alert-ok"} role="status">
          {msg}
        </div>
      )}
      {lookupHint && <p className="muted lookup-hint">{lookupHint}</p>}

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : (
        <>
          <form className="card-panel parceiro-form" onSubmit={onSaveEmpresa}>
            <fieldset>
              <legend>Identificação</legend>
              <div className="grid-2">
                <label>
                  Código
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  />
                </label>
                <label>
                  Regime tributário
                  <select
                    value={form.regimeTributario}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, regimeTributario: e.target.value as Regime }))
                    }
                  >
                    <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                    <option value="SIMPLES_EXCESSO">Simples (excesso)</option>
                    <option value="LUCRO_PRESUMIDO">Lucro presumido</option>
                    <option value="LUCRO_REAL">Lucro real</option>
                    <option value="MEI">MEI</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>
                <label>
                  CNPJ
                  <div className="field-with-action">
                    <input
                      value={form.cnpj}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cnpj: formatCnpjMask(e.target.value) }))
                      }
                      onBlur={() => {
                        const d = form.cnpj.replace(/\D/g, "");
                        if (d.length === 14 && d !== lastCnpj.current) void lookupCnpj();
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="secondary field-action"
                      disabled={lookupCnpjBusy}
                      onClick={() => void lookupCnpj()}
                    >
                      {lookupCnpjBusy ? "…" : "Buscar"}
                    </button>
                  </div>
                </label>
                <label>
                  CNAE principal
                  <input
                    value={form.cnaePrincipal}
                    onChange={(e) => setForm((f) => ({ ...f, cnaePrincipal: e.target.value }))}
                    placeholder="1813-0/99"
                  />
                </label>
                <label>
                  Descrição do CNAE principal
                  <input
                    value={form.cnaePrincipalDescricao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cnaePrincipalDescricao: e.target.value }))
                    }
                    placeholder="Preenchido automaticamente pela consulta CNPJ"
                  />
                </label>
                <label>
                  Razão social
                  <input
                    value={form.razaoSocial}
                    onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Nome fantasia
                  <input
                    value={form.nomeFantasia}
                    onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Inscrição estadual
                  <input
                    value={form.inscricaoEstadual}
                    onChange={(e) => setForm((f) => ({ ...f, inscricaoEstadual: e.target.value }))}
                  />
                </label>
                <label>
                  Inscrição municipal
                  <input
                    value={form.inscricaoMunicipal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, inscricaoMunicipal: e.target.value }))
                    }
                  />
                </label>
              </div>
              {form.cnaesSecundarios.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <p className="muted" style={{ marginBottom: "0.5rem" }}>
                    CNAEs secundários ({form.cnaesSecundarios.length}) — vindos da Receita Federal
                  </p>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {form.cnaesSecundarios.map((c, idx) => (
                        <tr key={`${c.codigo}-${idx}`}>
                          <td className="money">{c.codigoFormatado || formatCnae(c.codigo)}</td>
                          <td>{c.descricao || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  cnaesSecundarios: f.cnaesSecundarios.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend>Contato e endereço</legend>
              <div className="grid-2">
                <label>
                  E-mail
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label>
                  Website
                  <input
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </label>
                <label>
                  Celular
                  <input
                    value={form.celular}
                    onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))}
                  />
                </label>
                <label>
                  CEP
                  <div className="field-with-action">
                    <input
                      value={form.cep}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cep: formatCepMask(e.target.value) }))
                      }
                      onBlur={() => {
                        const d = form.cep.replace(/\D/g, "");
                        if (d.length === 8 && d !== lastCep.current) void lookupCep();
                      }}
                    />
                    <button
                      type="button"
                      className="secondary field-action"
                      disabled={lookupCepBusy}
                      onClick={() => void lookupCep()}
                    >
                      {lookupCepBusy ? "…" : "Buscar"}
                    </button>
                  </div>
                </label>
                <label>
                  Cód. município IBGE
                  <input
                    value={form.codigoMunicipioIbge}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, codigoMunicipioIbge: e.target.value }))
                    }
                    placeholder="3170206"
                  />
                </label>
                <label>
                  Logradouro
                  <input
                    value={form.logradouro}
                    onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                  />
                </label>
                <label>
                  Número
                  <input
                    value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  />
                </label>
                <label>
                  Complemento
                  <input
                    value={form.complemento}
                    onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                  />
                </label>
                <label>
                  Bairro
                  <input
                    value={form.bairro}
                    onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  />
                </label>
                <label>
                  Cidade
                  <input
                    value={form.cidade}
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  />
                </label>
                <label>
                  UF
                  <input
                    value={form.uf}
                    maxLength={2}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Ambiente fiscal</legend>
              <div className="grid-2">
                <label>
                  Ambiente
                  <select
                    value={form.ambienteFiscal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ambienteFiscal: e.target.value as Ambiente }))
                    }
                  >
                    <option value="HOMOLOGACAO">Homologação (teste)</option>
                    <option value="PRODUCAO">Produção</option>
                  </select>
                </label>
                <label className="check-inline" style={{ marginTop: "1.5rem" }}>
                  <input
                    type="checkbox"
                    checked={form.simularProducao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, simularProducao: e.target.checked }))
                    }
                  />
                  Simular produção (sem side-effects fiscais reais)
                </label>
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Empresa ativa
                </label>
              </div>
              <label style={{ marginTop: "0.75rem" }}>
                Observações
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </label>
            </fieldset>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar empresa"}
              </button>
            </div>
          </form>

          <section className="card-panel" style={{ marginTop: "1.25rem" }}>
            <div className="toolbar">
              <div>
                <h2 style={{ fontSize: "1.25rem" }}>Certificados digitais</h2>
                <p className="muted" style={{ margin: 0 }}>
                  A1/A3 para NFS-e, NF-e etc. Arquivo e senha ficam cifrados (AES-GCM). Em teste
                  pode cadastrar só metadados (status pendente).
                </p>
              </div>
              <button type="button" onClick={openNewCert}>
                Novo certificado
              </button>
            </div>

            {certs.length === 0 ? (
              <p className="muted" style={{ marginTop: "1rem" }}>
                Nenhum certificado cadastrado.
              </p>
            ) : (
              <table className="table" style={{ marginTop: "1rem" }}>
                <thead>
                  <tr>
                    <th>Apelido</th>
                    <th>Tipo</th>
                    <th>Finalidade</th>
                    <th>Status</th>
                    <th>Validade</th>
                    <th>Arquivo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c) => (
                    <tr key={c.id}>
                      <td>{c.apelido}</td>
                      <td>{c.tipoLabel}</td>
                      <td>{c.finalidadeLabel}</td>
                      <td>
                        <span className={`chip chip-cert-${c.status.toLowerCase()}`}>
                          {c.statusLabel}
                        </span>
                      </td>
                      <td>
                        {c.validadeFim
                          ? new Date(c.validadeFim).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td>{c.temArquivo ? c.arquivoNome || "Sim" : "Metadados"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openEditCert(c)}
                        >
                          Editar
                        </button>{" "}
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void removeCert(c.id)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {showCertModal && (
        <div className="modal-backdrop" role="dialog">
          <form className="card-panel modal-panel parceiro-form" onSubmit={onSaveCert}>
            <h2 style={{ fontSize: "1.25rem" }}>
              {editingCertId ? "Editar certificado" : "Novo certificado"}
            </h2>
            <div className="grid-2">
              <label>
                Apelido
                <input
                  value={certForm.apelido}
                  onChange={(e) => setCertForm((f) => ({ ...f, apelido: e.target.value }))}
                  required
                />
              </label>
              <label>
                Tipo
                <select
                  value={certForm.tipo}
                  onChange={(e) =>
                    setCertForm((f) => ({ ...f, tipo: e.target.value as TipoCert }))
                  }
                >
                  <option value="A1">A1 (arquivo)</option>
                  <option value="A3">A3 (token/HSM)</option>
                </select>
              </label>
              <label>
                Finalidade
                <select
                  value={certForm.finalidade}
                  onChange={(e) =>
                    setCertForm((f) => ({ ...f, finalidade: e.target.value as Finalidade }))
                  }
                >
                  <option value="NFSE">NFS-e</option>
                  <option value="NFE">NF-e</option>
                  <option value="CTE">CT-e</option>
                  <option value="GERAL">Uso geral</option>
                </select>
              </label>
              <label>
                Subject / CN
                <input
                  value={certForm.subjectCn}
                  onChange={(e) => setCertForm((f) => ({ ...f, subjectCn: e.target.value }))}
                />
              </label>
              <label>
                Nº de série
                <input
                  value={certForm.serialNumber}
                  onChange={(e) => setCertForm((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </label>
              <label>
                Emissor
                <input
                  value={certForm.emissor}
                  onChange={(e) => setCertForm((f) => ({ ...f, emissor: e.target.value }))}
                />
              </label>
              <label>
                Validade início
                <input
                  type="date"
                  value={certForm.validadeInicio}
                  onChange={(e) =>
                    setCertForm((f) => ({ ...f, validadeInicio: e.target.value }))
                  }
                />
              </label>
              <label>
                Validade fim
                <input
                  type="date"
                  value={certForm.validadeFim}
                  onChange={(e) => setCertForm((f) => ({ ...f, validadeFim: e.target.value }))}
                />
              </label>
              <label>
                Arquivo .pfx / .p12 (opcional)
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pfx,.p12,application/x-pkcs12"
                  onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                Senha do certificado (opcional)
                <input
                  type="password"
                  value={certForm.senha}
                  onChange={(e) => setCertForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder={editingCertId ? "Deixe em branco para manter" : ""}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <label className="check-inline" style={{ marginTop: "0.75rem" }}>
              <input
                type="checkbox"
                checked={certForm.ativo}
                onChange={(e) => setCertForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Certificado ativo
            </label>
            <label style={{ marginTop: "0.75rem" }}>
              Observações
              <textarea
                rows={2}
                value={certForm.observacoes}
                onChange={(e) => setCertForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowCertModal(false)}
              >
                Cancelar
              </button>
              <button type="submit" disabled={savingCert}>
                {savingCert ? "Salvando…" : "Salvar certificado"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
