"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
};

type PartnerOpt = {
  id: string;
  nome: string;
  documentoFormatado: string;
  codigo: string | null;
  comissaoPadraoPct: number | null;
};

type QuoteResult = {
  valorMatrizBruto: number;
  alerts: string[];
  faixas: Array<{
    production: {
      quantidade: number;
      metragemLinear: number;
      metragemM2: number;
      horaMaquina: number;
      qtdeRolos: number;
      qtdeCaixas: number;
    };
    costs: {
      valorPapel: number;
      valorMaquina: number;
      tinta: number;
      acabamento: number;
      rebobinacao: number;
      tubete: number;
      valorCaixa: number;
      valorServico: number;
    };
    commercial: {
      valorEtiqueta: number;
      valorMatriz: number;
      valorTotal: number;
      servicoEncargos: number;
    };
  }>;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type WizardForm = {
  clienteParceiroId: string;
  clienteNome: string;
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
  colunaRebobinacao: number;
  rpm: number;
  comissaoPct: number;
  faixas: Array<{ quantidade: number; tipoParada: string }>;
};

const defaultForm = (defaultVendedor: string): WizardForm => ({
  clienteParceiroId: "",
  clienteNome: "BANCA DO DINEI",
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
  colunaRebobinacao: 1,
  rpm: 1300,
  comissaoPct: 5,
  faixas: [
    { quantidade: 10000, tipoParada: "SEM PARADA" },
    { quantidade: 20000, tipoParada: "SEM PARADA" },
    { quantidade: 40000, tipoParada: "SEM PARADA" },
    { quantidade: 60000, tipoParada: "SEM PARADA" },
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
  const [step, setStep] = useState(mode === "edit" ? 6 : 1);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [clientes, setClientes] = useState<PartnerOpt[]>([]);
  const [vendedores, setVendedores] = useState<PartnerOpt[]>([]);
  const [facas, setFacas] = useState<Faca[]>([]);
  const [facaQ, setFacaQ] = useState(initialForm?.medida || "5,0X2,5");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(initialResult ?? null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<WizardForm>({
    ...defaultForm(defaultVendedor),
    ...initialForm,
    faixas: initialForm?.faixas?.length
      ? initialForm.faixas
      : defaultForm(defaultVendedor).faixas,
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
            clientesList.find((c) => c.nome.toUpperCase() === f.clienteNome.toUpperCase()) ||
            null;
          const matchVendedor =
            vendedoresList.find((v) => v.nome.toUpperCase() === f.vendedorNome.toUpperCase()) ||
            null;
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
          };
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/catalogos/facas?q=${encodeURIComponent(facaQ)}&limit=30`)
        .then((r) => r.json())
        .then((d) => setFacas(d.facas || []))
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [facaQ]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectCliente(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, clienteParceiroId: "", clienteNome: "" }));
      return;
    }
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setForm((f) => ({
      ...f,
      clienteParceiroId: c.id,
      clienteNome: c.nome,
    }));
  }

  function selectVendedor(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, vendedorParceiroId: "", vendedorNome: "" }));
      return;
    }
    const v = vendedores.find((x) => x.id === id);
    if (!v) return;
    setForm((f) => ({
      ...f,
      vendedorParceiroId: v.id,
      vendedorNome: v.nome,
      comissaoPct: v.comissaoPadraoPct != null ? v.comissaoPadraoPct : f.comissaoPct,
    }));
  }

  function selectFaca(f: Faca) {
    setForm((prev) => ({
      ...prev,
      medida: f.tamanho || prev.medida,
      puxada: f.puxada ?? prev.puxada,
      z: f.z,
      formatoFaca: f.formato || prev.formatoFaca,
      repeticao: f.rep ?? prev.repeticao,
      maquinaRoda: f.maquina || prev.maquinaRoda,
      qtdeColunas: f.col ? Number(f.col) || prev.qtdeColunas : prev.qtdeColunas,
    }));
    if (f.notas?.toUpperCase().includes("NÃO USAR")) {
      setError(`Atenção: faca marcada — ${f.notas}`);
    } else {
      setError(null);
    }
    setStep(4);
  }

  const payload = useMemo(
    () => ({
      clienteNome: form.clienteNome,
      clienteParceiroId: form.clienteParceiroId || null,
      vendedorNome: form.vendedorNome,
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
      maquinaRoda: form.maquinaRoda,
      maquinaGrupo: form.maquinaGrupo,
      impostoPct: form.impostoPct,
      matriz: form.matriz,
      colunaRebobinacao: form.colunaRebobinacao,
      rpm: form.rpm,
      comissaoPct: form.comissaoPct,
      faixas: form.faixas,
    }),
    [form],
  );

  async function calcular() {
    setError(null);
    const res = await fetch("/api/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro no cálculo");
      return;
    }
    setResult(data);
    setStep(6);
  }

  async function salvar() {
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "edit" && orcamentoId
          ? `/api/orcamentos/${orcamentoId}`
          : "/api/orcamentos";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar");
        return;
      }
      router.push(`/orcamentos/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!catalogs) {
    return <p className="muted">Carregando catálogos…</p>;
  }

  return (
    <div>
      <div className="steps">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            className={`step-pill ${step === n ? "active" : ""}`}
            onClick={() => setStep(n)}
          >
            Passo {n}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="card-panel grid-2">
          <label>
            Cliente (cadastro)
            <select value={form.clienteParceiroId} onChange={(e) => selectCliente(e.target.value)}>
              <option value="">— texto livre abaixo —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.documentoFormatado ? ` · ${c.documentoFormatado}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vendedor (cadastro)
            <select value={form.vendedorParceiroId} onChange={(e) => selectVendedor(e.target.value)}>
              <option value="">— texto livre abaixo —</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nome do cliente *
            <input
              value={form.clienteNome}
              onChange={(e) => {
                set("clienteNome", e.target.value);
                set("clienteParceiroId", "");
              }}
            />
          </label>
          <label>
            Nome do vendedor *
            <input
              value={form.vendedorNome}
              onChange={(e) => {
                set("vendedorNome", e.target.value);
                set("vendedorParceiroId", "");
              }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Observações internas
            <textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </label>
          <button type="button" onClick={() => setStep(2)}>
            Continuar
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="card-panel">
          <div className="grid-3">
            <label>
              Medida
              <input value={form.medida} onChange={(e) => set("medida", e.target.value)} />
            </label>
            <label>
              Largura papel (cm)
              <input
                type="number"
                step="0.1"
                value={form.larguraPapel}
                onChange={(e) => set("larguraPapel", Number(e.target.value))}
              />
            </label>
            <label>
              Puxada
              <input
                type="number"
                step="0.00001"
                value={form.puxada}
                onChange={(e) => set("puxada", Number(e.target.value))}
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
              Z
              <input
                type="number"
                value={form.z ?? ""}
                onChange={(e) => set("z", e.target.value === "" ? null : Number(e.target.value))}
              />
            </label>
            <label>
              Máquina (grupo custo)
              <select
                value={form.maquinaGrupo}
                onChange={(e) => set("maquinaGrupo", e.target.value)}
              >
                {[...new Set(catalogs.maquinas.map((m) => m.grupo))].map((g) => (
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
              Matriz
              <select
                value={form.matriz ? "SIM" : "NÃO"}
                onChange={(e) => set("matriz", e.target.value === "SIM")}
              >
                <option value="SIM">SIM</option>
                <option value="NÃO">NÃO</option>
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
            <label>
              Comissão %
              <select
                value={form.comissaoPct}
                onChange={(e) => set("comissaoPct", Number(e.target.value))}
              >
                {catalogs.comissoes.map((c) => (
                  <option key={c} value={c}>
                    {c}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              Voltar
            </button>
            <button type="button" onClick={() => setStep(3)}>
              Selecionar faca
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card-panel">
          <h2>Mapa de facas</h2>
          <label>
            Busca (tamanho, formato, máquina, nº, cliente)
            <input value={facaQ} onChange={(e) => setFacaQ(e.target.value)} />
          </label>
          <table className="table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>Tamanho</th>
                <th>Formato</th>
                <th>Máquina</th>
                <th>Z</th>
                <th>Puxada</th>
                <th>Nº</th>
                <th>Cliente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facas.map((f) => (
                <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
                  <td>{f.tamanho}</td>
                  <td>{f.formato}</td>
                  <td>{f.maquina}</td>
                  <td>{f.z}</td>
                  <td>{f.puxada}</td>
                  <td>{f.numero}</td>
                  <td>{f.cliente}</td>
                  <td>
                    <button type="button" onClick={() => selectFaca(f)}>
                      Usar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" onClick={() => setStep(4)}>
            Pular (manter valores atuais)
          </button>
        </section>
      )}

      {step === 4 && (
        <section className="card-panel">
          <h2>Quantidades</h2>
          {form.faixas.map((fx, idx) => (
            <div key={idx} className="grid-2" style={{ marginBottom: "0.75rem" }}>
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
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                set("faixas", [
                  ...form.faixas,
                  { quantidade: 80000, tipoParada: form.faixas.at(-1)?.tipoParada || "SEM PARADA" },
                ])
              }
            >
              + Faixa
            </button>
            <button type="button" onClick={() => { setStep(5); void calcular(); }}>
              Calcular
            </button>
          </div>
        </section>
      )}

      {(step === 5 || step === 6) && result && (
        <section className="card-panel">
          <h2>{step === 5 ? "Breakdown técnico" : "Proposta / consolidado"}</h2>
          {result.alerts?.length > 0 && (
            <div className="alert-warn" role="status">
              {result.alerts.join(" · ")}
            </div>
          )}
          <table className="table">
            <thead>
              <tr>
                <th>Qtde</th>
                {step === 5 ? (
                  <>
                    <th>m linear</th>
                    <th>m²</th>
                    <th>Hora máq.</th>
                    <th>Papel</th>
                    <th>Máquina</th>
                    <th>Serviço</th>
                  </>
                ) : (
                  <>
                    <th>Rolos</th>
                    <th>Total etiquetas</th>
                    <th>Unitário*</th>
                    <th>Valor rolo</th>
                    <th>Matriz</th>
                    <th>Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {result.faixas.map((f) => {
                const unit =
                  f.commercial.valorEtiqueta / f.production.quantidade;
                const valorRolo =
                  f.commercial.valorEtiqueta / f.production.qtdeRolos;
                return (
                  <tr key={f.production.quantidade}>
                    <td className="money">{f.production.quantidade.toLocaleString("pt-BR")}</td>
                    {step === 5 ? (
                      <>
                        <td className="money">{f.production.metragemLinear.toFixed(2)}</td>
                        <td className="money">{f.production.metragemM2.toFixed(1)}</td>
                        <td className="money">{f.production.horaMaquina.toFixed(3)}</td>
                        <td className="money">{brl(f.costs.valorPapel)}</td>
                        <td className="money">{brl(f.costs.valorMaquina)}</td>
                        <td className="money">{brl(f.costs.valorServico)}</td>
                      </>
                    ) : (
                      <>
                        <td className="money">{f.production.qtdeRolos}</td>
                        <td className="money">{brl(f.commercial.valorEtiqueta)}</td>
                        <td className="money">{brl(unit)}</td>
                        <td className="money">{brl(valorRolo)}</td>
                        <td className="money">{brl(f.commercial.valorMatriz)}</td>
                        <td className="money">
                          <strong>{brl(f.commercial.valorTotal)}</strong>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {step === 6 && (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              {form.papel} · {form.medida} · {form.acabamento} · {form.etiqPorRolo} etiq/rolo
              <br />
              Prazo: 12 dias úteis · Validade: 7 dias · Quantidades podem variar ±20%
              <br />
              Matriz somente no 1º pedido ({brl(result.faixas[0]?.commercial.valorMatriz || 0)})
            </p>
          )}
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            {step === 5 && (
              <button type="button" onClick={() => setStep(6)}>
                Ver consolidado
              </button>
            )}
            {step === 6 && (
              <>
                <button type="button" className="secondary" onClick={() => setStep(5)}>
                  Breakdown
                </button>
                <button type="button" onClick={salvar} disabled={saving}>
                  {saving
                    ? "Salvando…"
                    : mode === "edit"
                      ? "Salvar alterações"
                      : "Salvar rascunho"}
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
