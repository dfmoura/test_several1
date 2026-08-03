"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteResult } from "@orcamento/pricing-engine";
import { QuoteResultTables } from "@/components/QuoteResultTables";

type Catalogs = {
  papeis: Array<{ nome: string; precoM2: number }>;
  acabamentos: Array<{ nome: string; precoM2: number }>;
  tubetes: Array<{ tamanho: string; preco: number }>;
  paradas: Array<{ tipo: string }>;
  maquinas: Array<{ nome: string; grupo: string }>;
  impostos: number[];
  comissoes: number[];
};

type Faca = {
  id: string;
  tamanho: string | null;
  formato: string | null;
  puxada: number | null;
  z: number | null;
  rep: number | null;
  maquina: string | null;
  numero: string | null;
  cliente: string | null;
  notas: string | null;
  col: string | null;
  ativo: boolean;
  completa?: boolean;
};

type PartnerOpt = {
  id: string;
  nome: string;
  documentoFormatado: string;
  codigo: string | null;
  comissaoPadraoPct: number | null;
};

export type WizardForm = {
  clienteParceiroId: string;
  clienteNome: string;
  isProspect: boolean;
  prospectDocumento: string;
  prospectTelefone: string;
  prospectEmail: string;
  vendedorParceiroId: string;
  vendedorNome: string;
  observacoes: string;
  medida: string;
  larguraPapel: number;
  puxada: number;
  cores: number | "4V";
  papel: string;
  acabamento: string;
  qtdeModelos: number;
  qtdeColunas: number;
  etiqPorRolo: number;
  tubete: string;
  z: number | null;
  formatoFaca: string;
  repeticao: number;
  maquinaRoda: string;
  maquinaGrupo: string;
  impostoPct: number;
  matriz: boolean;
  matrizJaCobrada: boolean;
  colunaRebobinacao: number;
  rpm: number;
  comissaoPct: number;
  overridePapelM2: string;
  overrideTintaM2: string;
  prazoEntrega: string;
  validadeProposta: string;
  validadeDias: number;
  toleranciaQtdPct: number;
  faixas: Array<{ quantidade: number; tipoParada: string; comissaoPct: number }>;
};

function mapMaquinaToGrupo(
  maquinaLabel: string | null | undefined,
  catalogs: Catalogs | null,
): string | null {
  if (!maquinaLabel || !catalogs) return null;
  const up = maquinaLabel.toUpperCase();
  const exact = catalogs.maquinas.find(
    (m) => m.nome.toUpperCase() === up || m.grupo.toUpperCase() === up,
  );
  if (exact) return exact.grupo;
  if (up.includes("BATIDA")) return "BATIDA";
  if (up.includes("MODULAR")) return "MODULAR";
  if (up.includes("BETA") || up.includes("160") || up.includes("250") || up.includes("ETIRAMA")) {
    return "BETA / 160  / 250 / ETIRAMA";
  }
  return null;
}

function formatApiError(data: {
  error?: string;
  details?: { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
}): string {
  if (data.details?.fieldErrors) {
    const parts = Object.entries(data.details.fieldErrors)
      .filter(([, msgs]) => msgs && msgs.length)
      .slice(0, 4)
      .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`);
    if (parts.length) return `${data.error || "Dados inválidos"} — ${parts.join(" · ")}`;
  }
  return data.error || "Erro inesperado";
}

const defaultForm = (defaultVendedor: string): WizardForm => ({
  clienteParceiroId: "",
  clienteNome: "",
  isProspect: false,
  prospectDocumento: "",
  prospectTelefone: "",
  prospectEmail: "",
  vendedorParceiroId: "",
  vendedorNome: defaultVendedor,
  observacoes: "",
  medida: "5,0X2,5",
  larguraPapel: 7.5,
  puxada: 2.72749,
  cores: 1,
  papel: "BOPP BRILHO",
  acabamento: "COLD STAMP + COLA",
  qtdeModelos: 1,
  qtdeColunas: 2,
  etiqPorRolo: 1000,
  tubete: '3"',
  z: 43,
  formatoFaca: "ESPECIAL",
  repeticao: 5,
  maquinaRoda: "MODULAR",
  maquinaGrupo: "MODULAR",
  impostoPct: 16,
  matriz: true,
  matrizJaCobrada: false,
  colunaRebobinacao: 1,
  rpm: 1300,
  comissaoPct: 5,
  overridePapelM2: "",
  overrideTintaM2: "",
  prazoEntrega: "12 DIAS ÚTEIS",
  validadeProposta: "7 dias",
  validadeDias: 7,
  toleranciaQtdPct: 20,
  faixas: [
    { quantidade: 10000, tipoParada: "SEM PARADA", comissaoPct: 5 },
    { quantidade: 20000, tipoParada: "SEM PARADA", comissaoPct: 5 },
    { quantidade: 40000, tipoParada: "SEM PARADA", comissaoPct: 5 },
    { quantidade: 60000, tipoParada: "SEM PARADA", comissaoPct: 5 },
  ],
});

export function QuoteWizard({
  defaultVendedor,
  mode = "create",
  orcamentoId,
  initialForm,
  initialResult,
}: {
  defaultVendedor: string;
  mode?: "create" | "edit";
  orcamentoId?: string;
  initialForm?: Partial<WizardForm>;
  initialResult?: QuoteResult | null;
}) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [clientes, setClientes] = useState<PartnerOpt[]>([]);
  const [vendedores, setVendedores] = useState<PartnerOpt[]>([]);
  const [facas, setFacas] = useState<Faca[]>([]);
  const [facaFiltros, setFacaFiltros] = useState<{ maquinas: string[]; formatos: string[] }>({
    maquinas: [],
    formatos: [],
  });
  const [facaModal, setFacaModal] = useState(false);
  const [facaQ, setFacaQ] = useState("");
  const [facaMaq, setFacaMaq] = useState("");
  const [facaFmt, setFacaFmt] = useState("");
  const [facaCompletas, setFacaCompletas] = useState(true);
  const [facaSelecionada, setFacaSelecionada] = useState(Boolean(initialForm?.medida));
  const [puxadaManual, setPuxadaManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(initialResult ?? null);
  const [busy, setBusy] = useState<"idle" | "calc" | "save">("idle");

  const [form, setForm] = useState<WizardForm>(() => {
    const base = defaultForm(defaultVendedor);
    const merged = { ...base, ...initialForm };
    const faixas =
      initialForm?.faixas?.length
        ? initialForm.faixas.map((f) => ({
            quantidade: f.quantidade,
            tipoParada: f.tipoParada,
            comissaoPct: f.comissaoPct ?? initialForm.comissaoPct ?? base.comissaoPct,
          }))
        : base.faixas;
    return { ...merged, faixas };
  });

  useEffect(() => {
    fetch("/api/catalogos")
      .then((r) => r.json())
      .then(setCatalogs)
      .catch(() => setError("Falha ao carregar catálogos"));

    Promise.all([
      fetch("/api/parceiros?tipo=CLIENTE").then((r) => r.json()),
      fetch("/api/parceiros?tipo=VENDEDOR").then((r) => r.json()),
    ])
      .then(([cli, ven]) => {
        const clientesList = (cli.items || []) as PartnerOpt[];
        const vendedoresList = (ven.items || []) as PartnerOpt[];
        setClientes(clientesList);
        setVendedores(vendedoresList);
        setForm((f) => {
          const matchCliente =
            clientesList.find((c) => c.id === f.clienteParceiroId) ||
            clientesList.find((c) => c.nome.toUpperCase() === f.clienteNome.toUpperCase()) ||
            null;
          const matchVendedor =
            vendedoresList.find((v) => v.id === f.vendedorParceiroId) ||
            vendedoresList.find(
              (v) => v.nome.toUpperCase() === f.vendedorNome.toUpperCase(),
            ) ||
            (vendedoresList.length === 1 ? vendedoresList[0] : null);
          return {
            ...f,
            clienteParceiroId: matchCliente?.id || f.clienteParceiroId,
            clienteNome: matchCliente?.nome || f.clienteNome,
            vendedorParceiroId: matchVendedor?.id || f.vendedorParceiroId,
            vendedorNome: matchVendedor?.nome || f.vendedorNome,
            comissaoPct:
              matchVendedor?.comissaoPadraoPct != null
                ? matchVendedor.comissaoPadraoPct
                : f.comissaoPct,
            faixas:
              matchVendedor?.comissaoPadraoPct != null
                ? f.faixas.map((fx) => ({
                    ...fx,
                    comissaoPct: matchVendedor.comissaoPadraoPct as number,
                  }))
                : f.faixas,
          };
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!facaModal && !facaQ) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams({
        q: facaQ,
        limit: "60",
        completas: facaCompletas ? "1" : "0",
      });
      if (facaMaq) params.set("maquina", facaMaq);
      if (facaFmt) params.set("formato", facaFmt);
      fetch(`/api/catalogos/facas?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setFacas(d.facas || []);
          if (d.filtros) {
            setFacaFiltros({
              maquinas: (d.filtros.maquinas || []) as string[],
              formatos: (d.filtros.formatos || []) as string[],
            });
          }
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [facaQ, facaMaq, facaFmt, facaCompletas, facaModal]);

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  }

  function selectCliente(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, clienteParceiroId: "", clienteNome: "", isProspect: false }));
      setResult(null);
      return;
    }
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setForm((f) => ({
      ...f,
      clienteParceiroId: c.id,
      clienteNome: c.nome,
      isProspect: false,
    }));
    setResult(null);
  }

  function selectVendedor(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, vendedorParceiroId: "", vendedorNome: "" }));
      return;
    }
    const v = vendedores.find((x) => x.id === id);
    if (!v) return;
    const com = v.comissaoPadraoPct != null ? v.comissaoPadraoPct : form.comissaoPct;
    setForm((f) => ({
      ...f,
      vendedorParceiroId: v.id,
      vendedorNome: v.nome,
      comissaoPct: com,
      faixas: f.faixas.map((fx) => ({ ...fx, comissaoPct: com })),
    }));
    setResult(null);
  }

  function applyFaca(f: Faca) {
    const grupo = mapMaquinaToGrupo(f.maquina, catalogs);
    setForm((prev) => ({
      ...prev,
      medida: f.tamanho || prev.medida,
      puxada: f.puxada ?? prev.puxada,
      z: f.z,
      formatoFaca: f.formato || prev.formatoFaca,
      repeticao: f.rep ?? prev.repeticao,
      maquinaRoda: f.maquina || prev.maquinaRoda,
      maquinaGrupo: grupo || prev.maquinaGrupo,
      qtdeColunas: f.col ? Number(f.col) || prev.qtdeColunas : prev.qtdeColunas,
    }));
    setFacaSelecionada(true);
    setPuxadaManual(f.puxada == null);
    setFacaModal(false);
    setResult(null);
    if (f.notas?.toUpperCase().includes("NÃO USAR")) {
      setError(`Atenção: faca marcada — ${f.notas}`);
    } else {
      setError(null);
    }
  }

  const payload = useMemo(() => {
    const ovPapel = form.overridePapelM2.trim() ? Number(form.overridePapelM2) : null;
    const ovTinta = form.overrideTintaM2.trim() ? Number(form.overrideTintaM2) : null;
    return {
      clienteNome: form.clienteNome.trim(),
      clienteParceiroId: form.clienteParceiroId || null,
      isProspect: form.isProspect,
      prospectDocumento: form.prospectDocumento || null,
      prospectTelefone: form.prospectTelefone || null,
      prospectEmail: form.prospectEmail || null,
      vendedorNome: form.vendedorNome.trim() || defaultVendedor,
      vendedorParceiroId: form.vendedorParceiroId || null,
      observacoes: form.observacoes,
      medida: form.medida,
      larguraPapel: form.larguraPapel,
      puxada: form.puxada,
      cores: form.cores,
      papel: form.papel,
      acabamento: form.acabamento,
      qtdeModelos: form.qtdeModelos,
      qtdeColunas: form.qtdeColunas,
      etiqPorRolo: form.etiqPorRolo,
      tubete: form.tubete,
      z: form.z,
      formatoFaca: form.formatoFaca,
      repeticao: form.repeticao,
      maquinaRoda: form.maquinaRoda,
      maquinaGrupo: form.maquinaGrupo,
      impostoPct: form.impostoPct,
      matriz: form.matriz,
      matrizJaCobrada: form.matrizJaCobrada,
      colunaRebobinacao: form.colunaRebobinacao,
      rpm: form.rpm,
      comissaoPct: form.comissaoPct,
      overrides:
        ovPapel != null || ovTinta != null
          ? { papelM2: ovPapel, tintaAcimaM2: ovTinta }
          : null,
      prazoEntrega: form.prazoEntrega,
      validadeProposta: form.validadeProposta,
      validadeDias: form.validadeDias,
      toleranciaQtdPct: form.toleranciaQtdPct,
      faixas: form.faixas,
    };
  }, [form, defaultVendedor]);

  function validateCabecalho(): string | null {
    if (!form.clienteParceiroId && !form.isProspect) {
      return "Selecione um cliente cadastrado ou marque como prospect.";
    }
    if (form.isProspect && !form.clienteNome.trim()) {
      return "Informe o nome do prospect.";
    }
    if (!form.vendedorNome.trim() && !form.vendedorParceiroId) {
      return "Selecione o vendedor.";
    }
    if (!form.medida || !form.puxada) {
      return "Selecione a faca no mapa (medida e puxada obrigatórias).";
    }
    if (!form.faixas.some((f) => f.quantidade > 0)) {
      return "Informe ao menos uma quantidade > 0.";
    }
    return null;
  }

  async function calcularSomente() {
    setError(null);
    const v = validateCabecalho();
    if (v) {
      setError(v);
      document.getElementById("orc-cabecalho")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy("calc");
    try {
      const res = await fetch("/api/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(formatApiError(data));
        return;
      }
      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById("orc-resultado")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("Falha de rede ao calcular. Tente novamente.");
    } finally {
      setBusy("idle");
    }
  }

  /** Estudo §1.3: snapshot do cálculo no momento do save. */
  async function calcularESalvar() {
    setError(null);
    const v = validateCabecalho();
    if (v) {
      setError(v);
      document.getElementById("orc-cabecalho")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy("save");
    try {
      const calcRes = await fetch("/api/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const calcData = await calcRes.json();
      if (!calcRes.ok) {
        setError(formatApiError(calcData));
        return;
      }
      setResult(calcData);

      const url =
        mode === "edit" && orcamentoId
          ? `/api/orcamentos/${orcamentoId}`
          : "/api/orcamentos";
      const saveRes = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(formatApiError(saveData));
        return;
      }
      router.push(`/orcamentos/${saveData.id}`);
      router.refresh();
    } catch {
      setError("Falha de rede ao salvar. Verifique a conexão e tente de novo.");
    } finally {
      setBusy("idle");
    }
  }

  if (!catalogs) {
    return <p className="muted">Carregando catálogos…</p>;
  }

  const grupos = [...new Set(catalogs.maquinas.map((m) => m.grupo))];
  const papelCat = catalogs.papeis.find((p) => p.nome === form.papel);
  const cabok = Boolean(
    (form.clienteParceiroId || (form.isProspect && form.clienteNome.trim())) &&
      (form.vendedorParceiroId || form.vendedorNome.trim()),
  );

  return (
    <div className="orc-flexorca">
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {/* ── 1. Cabeçalho comercial (estudo GERACAO_ORCAMENTO §3.1) ── */}
      <section className="orc-panel orc-panel-cabecalho" id="orc-cabecalho">
        <h1>Cabeçalho</h1>
        <p className="orc-hint">
          Cliente e vendedor são obrigatórios. Texto livre de cliente não é permitido —
          use cadastro ou prospect mínimo.
        </p>
        <div className="orc-grid orc-grid-cab">
          <label className={!form.clienteParceiroId && !form.isProspect ? "orc-field-warn" : undefined}>
            Cliente (cadastro)
            <select
              value={form.clienteParceiroId}
              disabled={form.isProspect}
              onChange={(e) => selectCliente(e.target.value)}
            >
              <option value="">— selecione —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.documentoFormatado ? ` · ${c.documentoFormatado}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="orc-check-label">
            <span>Prospect</span>
            <span className="orc-check-row">
              <input
                type="checkbox"
                checked={form.isProspect}
                onChange={(e) => {
                  const on = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    isProspect: on,
                    clienteParceiroId: on ? "" : f.clienteParceiroId,
                  }));
                  setResult(null);
                }}
              />
              Cadastro mínimo (sem parceiro completo)
            </span>
          </label>
          {form.isProspect && (
            <>
              <label className={!form.clienteNome.trim() ? "orc-field-warn" : undefined}>
                Nome do prospect *
                <input
                  value={form.clienteNome}
                  onChange={(e) => set("clienteNome", e.target.value)}
                  placeholder="Razão / nome fantasia"
                />
              </label>
              <label>
                Documento (opcional)
                <input
                  value={form.prospectDocumento}
                  onChange={(e) => set("prospectDocumento", e.target.value)}
                  placeholder="CNPJ/CPF"
                />
              </label>
              <label>
                Telefone
                <input
                  value={form.prospectTelefone}
                  onChange={(e) => set("prospectTelefone", e.target.value)}
                />
              </label>
              <label>
                E-mail
                <input
                  value={form.prospectEmail}
                  onChange={(e) => set("prospectEmail", e.target.value)}
                />
              </label>
            </>
          )}
          <label className={!form.vendedorParceiroId && !form.vendedorNome ? "orc-field-warn" : undefined}>
            Vendedor
            <select value={form.vendedorParceiroId} onChange={(e) => selectVendedor(e.target.value)}>
              <option value="">— selecione —</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Observações internas
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Não entram na proposta ao cliente"
            />
          </label>
        </div>
        {!cabok && (
          <p className="orc-cab-status">Preencha cliente e vendedor para liberar o cálculo.</p>
        )}
      </section>

      {/* ── 2. Especificação técnica ── */}
      <section className="orc-panel">
        <h1>Especificação técnica</h1>
        <p className="orc-hint">
          Selecione a <strong>faca</strong> no mapa. Medida, puxada, Z e REP vêm juntos.
          Em <strong>REDONDA</strong>, a medida é o diâmetro (Ø).
        </p>

        <div className="orc-faca-picker">
          <div className="orc-faca-summary">
            <div className="orc-faca-summary-top">
              <span className="orc-faca-kicker">Faca do mapa</span>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setFacaModal(true);
                  setFacaQ(form.medida || "");
                }}
              >
                {facaSelecionada || form.medida ? "Trocar faca" : "Buscar faca"}
              </button>
            </div>
            <div className="orc-faca-title">{form.medida || "Nenhuma faca selecionada"}</div>
            <div className="orc-faca-meta">
              {form.formatoFaca
                ? `${form.formatoFaca} · Z ${form.z ?? "—"} · REP ${form.repeticao || "—"}`
                : "Abra o mapa para escolher medida, formato e máquina."}
            </div>
            {(form.z || form.repeticao || form.puxada) && (
              <div className="orc-faca-chips">
                <span>Z {form.z ?? "—"}</span>
                <span>REP {form.repeticao || "—"}</span>
                <span>Puxada {form.puxada}</span>
                <span>Máq. {form.maquinaRoda || "—"}</span>
              </div>
            )}
          </div>

          <div className="orc-auto-grid">
            <label className="orc-auto">
              Medida
              <input value={form.medida} readOnly />
            </label>
            <label className="orc-auto">
              Formato (faca)
              <input value={form.formatoFaca} readOnly />
            </label>
            <label className={`orc-auto ${puxadaManual ? "manual" : ""}`}>
              Puxada máquina (cm)
              <input
                type="number"
                step="any"
                value={form.puxada}
                onChange={(e) => {
                  setPuxadaManual(true);
                  set("puxada", Number(e.target.value));
                }}
              />
              <small className="orc-field-note">
                {puxadaManual ? "Editada manualmente" : "Vem do mapa"}
              </small>
            </label>
            <label className={`orc-auto ${puxadaManual ? "manual" : ""}`}>
              Z
              <input
                type="number"
                step="any"
                value={form.z ?? ""}
                onChange={(e) => {
                  setPuxadaManual(true);
                  set("z", e.target.value === "" ? null : Number(e.target.value));
                }}
              />
            </label>
            <label className="orc-auto">
              REP (repetição)
              <input value={form.repeticao || ""} readOnly />
            </label>
            <label className="orc-auto">
              Máquina do mapa
              <input value={form.maquinaRoda} readOnly />
            </label>
          </div>
        </div>

        <div className="orc-grid">
          <label>
            Largura papel (cm)
            <input
              type="number"
              step="0.01"
              value={form.larguraPapel}
              onChange={(e) => set("larguraPapel", Number(e.target.value))}
            />
          </label>
          <label>
            Cores
            <select
              value={String(form.cores)}
              onChange={(e) => {
                const v = e.target.value;
                set("cores", v === "4V" ? "4V" : Number(v));
              }}
            >
              {[0, 1, 2, 3, 4, "4V", 5, 6, 7, 8].map((c) => (
                <option key={String(c)} value={String(c)}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Papel
            <select value={form.papel} onChange={(e) => set("papel", e.target.value)}>
              {catalogs.papeis.map((p) => (
                <option key={p.nome} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Acabamento
            <select value={form.acabamento} onChange={(e) => set("acabamento", e.target.value)}>
              {catalogs.acabamentos.map((a) => (
                <option key={a.nome} value={a.nome}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qtde modelos
            <input
              type="number"
              value={form.qtdeModelos}
              onChange={(e) => set("qtdeModelos", Number(e.target.value))}
            />
          </label>
          <label>
            Qtde colunas
            <input
              type="number"
              value={form.qtdeColunas}
              onChange={(e) => set("qtdeColunas", Number(e.target.value))}
            />
          </label>
          <label>
            Etiq. por rolo
            <input
              type="number"
              value={form.etiqPorRolo}
              onChange={(e) => set("etiqPorRolo", Number(e.target.value))}
            />
          </label>
          <label>
            Tubete
            <select value={form.tubete} onChange={(e) => set("tubete", e.target.value)}>
              {catalogs.tubetes.map((t) => (
                <option key={t.tamanho} value={t.tamanho}>
                  {t.tamanho}
                </option>
              ))}
            </select>
          </label>
          <label>
            Máquina que roda
            <select
              value={form.maquinaRoda}
              onChange={(e) => {
                const nome = e.target.value;
                const grupo = mapMaquinaToGrupo(nome, catalogs);
                setForm((f) => ({
                  ...f,
                  maquinaRoda: nome,
                  maquinaGrupo: grupo || f.maquinaGrupo,
                }));
                setResult(null);
              }}
            >
              {[...new Set(catalogs.maquinas.map((m) => m.nome))].map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Grupo de custo (R$/h)
            <select
              value={form.maquinaGrupo}
              onChange={(e) => set("maquinaGrupo", e.target.value)}
            >
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label>
            Imposto %
            <select
              value={form.impostoPct}
              onChange={(e) => set("impostoPct", Number(e.target.value))}
            >
              {catalogs.impostos.map((i) => (
                <option key={i} value={i}>
                  {i}%
                </option>
              ))}
            </select>
          </label>
          <label>
            Matriz (1º pedido)
            <select
              value={form.matriz ? "SIM" : "NÃO"}
              onChange={(e) => set("matriz", e.target.value === "SIM")}
            >
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </label>
          <label>
            Coluna rebobinação
            <input
              type="number"
              value={form.colunaRebobinacao}
              onChange={(e) => set("colunaRebobinacao", Number(e.target.value))}
            />
          </label>
          <label>
            Troca / parada (padrão)
            <select
              value={form.faixas[0]?.tipoParada || "SEM PARADA"}
              onChange={(e) => {
                const t = e.target.value;
                setForm((f) => ({
                  ...f,
                  faixas: f.faixas.map((fx) => ({ ...fx, tipoParada: t })),
                }));
                setResult(null);
              }}
            >
              {catalogs.paradas.map((p) => (
                <option key={p.tipo} value={p.tipo}>
                  {p.tipo}
                </option>
              ))}
            </select>
          </label>
          <label>
            RPM
            <input
              type="number"
              value={form.rpm}
              onChange={(e) => set("rpm", Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      {/* ── 3. Quantidades ── */}
      <section className="orc-panel">
        <div className="orc-row-between">
          <h1>Quantidades</h1>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              set("faixas", [
                ...form.faixas,
                {
                  quantidade: 80000,
                  tipoParada: form.faixas.at(-1)?.tipoParada || "SEM PARADA",
                  comissaoPct: form.comissaoPct,
                },
              ])
            }
          >
            + faixa
          </button>
        </div>
        <p className="orc-hint">Escada de preços — o cliente escolhe a faixa no link de aprovação.</p>
        <div className="orc-faixas">
          {form.faixas.map((fx, idx) => (
            <div key={idx} className="orc-faixa">
              <label>
                Quantidade
                <input
                  type="number"
                  value={fx.quantidade}
                  onChange={(e) => {
                    const faixas = [...form.faixas];
                    faixas[idx] = { ...fx, quantidade: Number(e.target.value) };
                    set("faixas", faixas);
                  }}
                />
              </label>
              <label>
                % Comissão
                <input
                  type="number"
                  step="0.1"
                  value={fx.comissaoPct}
                  onChange={(e) => {
                    const faixas = [...form.faixas];
                    faixas[idx] = { ...fx, comissaoPct: Number(e.target.value) };
                    set("faixas", faixas);
                  }}
                />
              </label>
              <label>
                Troca / parada
                <select
                  value={fx.tipoParada}
                  onChange={(e) => {
                    const faixas = [...form.faixas];
                    faixas[idx] = { ...fx, tipoParada: e.target.value };
                    set("faixas", faixas);
                  }}
                >
                  {catalogs.paradas.map((p) => (
                    <option key={p.tipo} value={p.tipo}>
                      {p.tipo}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ghost"
                disabled={form.faixas.length <= 1}
                onClick={() => set("faixas", form.faixas.filter((_, i) => i !== idx))}
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Proposta + overrides ── */}
      <section className="orc-panel">
        <h1>Proposta comercial</h1>
        <div className="orc-grid orc-grid-3">
          <label>
            Prazo de entrega
            <input
              value={form.prazoEntrega}
              onChange={(e) => set("prazoEntrega", e.target.value)}
            />
          </label>
          <label>
            Validade
            <input
              value={form.validadeProposta}
              onChange={(e) => {
                const v = e.target.value;
                const m = v.match(/(\d+)/);
                setForm((f) => ({
                  ...f,
                  validadeProposta: v,
                  validadeDias: m ? Number(m[1]) : f.validadeDias,
                }));
                setResult(null);
              }}
            />
          </label>
          <label>
            Tolerância ±%
            <input
              type="number"
              value={form.toleranciaQtdPct}
              onChange={(e) => set("toleranciaQtdPct", Number(e.target.value))}
            />
          </label>
          <label>
            Override papel R$/m²
            <input
              type="number"
              step="0.01"
              placeholder={papelCat ? String(papelCat.precoM2) : "catálogo"}
              value={form.overridePapelM2}
              onChange={(e) => set("overridePapelM2", e.target.value)}
            />
          </label>
          <label>
            Override tinta &gt;30 m²
            <input
              type="number"
              step="0.01"
              placeholder="catálogo"
              value={form.overrideTintaM2}
              onChange={(e) => set("overrideTintaM2", e.target.value)}
            />
          </label>
          <label className="orc-check-label">
            <span>Matriz</span>
            <span className="orc-check-row">
              <input
                type="checkbox"
                checked={form.matrizJaCobrada}
                onChange={(e) => set("matrizJaCobrada", e.target.checked)}
              />
              Já cobrada em pedido anterior
            </span>
          </label>
        </div>
      </section>

      <div className="orc-actions-bar orc-actions-sticky">
        <button
          type="button"
          className="primary"
          onClick={() => void calcularESalvar()}
          disabled={busy !== "idle"}
        >
          {busy === "save"
            ? "Salvando…"
            : mode === "edit"
              ? "Calcular e salvar"
              : "Calcular e salvar orçamento"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void calcularSomente()}
          disabled={busy !== "idle"}
        >
          {busy === "calc" ? "Calculando…" : "Só calcular"}
        </button>
        {result && (
          <span className="orc-actions-ok muted">Cálculo pronto — use o botão principal para gravar.</span>
        )}
      </div>

      {result && (
        <section className="orc-panel orc-panel-result" id="orc-resultado">
          <QuoteResultTables result={result} form={form} />
        </section>
      )}

      {facaModal && (
        <div className="orc-faca-modal" role="dialog" aria-modal="true">
          <div className="orc-faca-modal-backdrop" onClick={() => setFacaModal(false)} />
          <div className="orc-faca-modal-panel">
            <header className="orc-faca-modal-head">
              <div>
                <h2>Mapa de facas</h2>
                <p className="orc-faca-modal-sub">
                  <strong>MAPA DE FACAS</strong> · REDONDA = Ø · REP = repetição
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setFacaModal(false)}>
                Fechar
              </button>
            </header>
            <div className="orc-faca-filters">
              <label>
                Buscar
                <input
                  type="search"
                  value={facaQ}
                  onChange={(e) => setFacaQ(e.target.value)}
                  placeholder="Medida, Ø, cliente…"
                  autoFocus
                />
              </label>
              <label>
                Máquina
                <select value={facaMaq} onChange={(e) => setFacaMaq(e.target.value)}>
                  <option value="">Todas</option>
                  {facaFiltros.maquinas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Formato
                <select value={facaFmt} onChange={(e) => setFacaFmt(e.target.value)}>
                  <option value="">Todos</option>
                  {facaFiltros.formatos.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="orc-check-row">
                <input
                  type="checkbox"
                  checked={facaCompletas}
                  onChange={(e) => setFacaCompletas(e.target.checked)}
                />
                Só completas
              </label>
            </div>
            <div className="orc-faca-table-wrap">
              <table className="orc-faca-table">
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th>Formato</th>
                    <th>Máq.</th>
                    <th>Z</th>
                    <th>
                      REP
                      <br />
                      <small>repetição</small>
                    </th>
                    <th>Puxada</th>
                    <th>Cliente / nota</th>
                  </tr>
                </thead>
                <tbody>
                  {facas.map((f) => (
                    <tr
                      key={f.id}
                      className={f.completa === false ? "incompleta" : undefined}
                      style={{ opacity: f.ativo ? 1 : 0.5, cursor: "pointer" }}
                      onClick={() => applyFaca(f)}
                    >
                      <td>{f.tamanho}</td>
                      <td>{f.formato}</td>
                      <td>{f.maquina}</td>
                      <td>{f.z}</td>
                      <td>{f.rep}</td>
                      <td>{f.puxada}</td>
                      <td>
                        {f.cliente || f.notas || "—"}
                        {f.numero ? ` · nº ${f.numero}` : ""}
                      </td>
                    </tr>
                  ))}
                  {!facas.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)" }}>
                        Nenhuma faca encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
