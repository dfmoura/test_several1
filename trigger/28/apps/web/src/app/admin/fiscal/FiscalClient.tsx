"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

type Natureza = {
  id: string;
  codigo: string;
  descricao: string;
  cfopDentroUf: string;
  cfopForaUf: string;
  finalidadeEmissao: number;
  ativo: boolean;
};

type Serie = {
  id: string;
  tipo: string;
  serie: number;
  proximoNumero: number;
  ambiente: string;
  ativo: boolean;
  observacoes: string | null;
};

type Parametros = {
  opSimpNac: number;
  regApTribSN: number;
  regEspTrib: number;
  pTotTribSN: number;
  csosnPadrao: string;
  cstPisPadrao: string;
  cstCofinsPadrao: string;
  serieDpsPadrao: number;
  serieNfePadrao: number;
  naturezaMercadoriaId: string | null;
  modalidadeFretePadrao: number;
  presencaCompradorPadrao: number;
  infCplPadrao: string | null;
};

export default function FiscalClient({ name, role }: { name: string; role: string }) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Record<string, unknown> | null>(null);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [focus, setFocus] = useState<Record<string, unknown> | null>(null);
  const [natForm, setNatForm] = useState({
    codigo: "",
    descricao: "",
    cfopDentroUf: "5102",
    cfopForaUf: "6102",
    finalidadeEmissao: "1",
  });
  const [serieForm, setSerieForm] = useState({
    tipo: "NFE",
    serie: "1",
    proximoNumero: "1",
    ambiente: "HOMOLOGACAO",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fiscal");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao carregar");
      setEmpresa(j.empresa);
      setParametros(j.parametros);
      setNaturezas(j.naturezas || []);
      setSeries(j.series || []);
      setFocus(j.focus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveParametros(e: FormEvent) {
    e.preventDefault();
    if (!parametros) return;
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/fiscal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "parametros", parametros }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Falha ao salvar");
      return;
    }
    setMsg("Parâmetros fiscais salvos.");
    await load();
  }

  async function saveNatureza(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/fiscal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "natureza",
        natureza: {
          ...natForm,
          finalidadeEmissao: Number(natForm.finalidadeEmissao),
        },
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Falha ao salvar natureza");
      return;
    }
    setMsg("Natureza de operação salva.");
    setNatForm({
      codigo: "",
      descricao: "",
      cfopDentroUf: "5102",
      cfopForaUf: "6102",
      finalidadeEmissao: "1",
    });
    await load();
  }

  async function saveSerie(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/fiscal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "serie",
        serie: {
          tipo: serieForm.tipo,
          serie: Number(serieForm.serie),
          proximoNumero: Number(serieForm.proximoNumero),
          ambiente: serieForm.ambiente,
        },
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Falha ao salvar série");
      return;
    }
    setMsg("Série fiscal salva.");
    await load();
  }

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="Cadastros"
        title="Fiscal Focus"
        subtitle="Parâmetros, naturezas e séries alinhados às APIs Focus NF-e e NFS-e Nacional."
      />
      <p className="muted" style={{ marginTop: "-0.5rem" }}>
        <Link href="/admin">Cadastros</Link>
        {" · "}
        <a href="https://doc.focusnfe.com.br/reference/nfe" target="_blank" rel="noreferrer">
          Doc NF-e
        </a>
        {" · "}
        <a
          href="https://doc.focusnfe.com.br/reference/nfse-nacional"
          target="_blank"
          rel="noreferrer"
        >
          Doc NFS-e Nacional
        </a>
      </p>

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
      {loading && <p className="muted">Carregando…</p>}

      {empresa && (
        <section className="card-panel" style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.15rem" }}>Emitente</h2>
          <p style={{ margin: 0 }}>
            {String(empresa.razaoSocial)} · CNPJ {String(empresa.cnpj)} · IBGE{" "}
            {String(empresa.codigoMunicipioIbge || "—")} · {String(empresa.ambienteFiscal)}
            {empresa.simularProducao ? " (simulação)" : ""}
          </p>
          {focus && (
            <p className="muted" style={{ marginBottom: 0 }}>
              Focus: modo {String(focus.modo)} · {focus.ativo ? "ativo" : "inativo"}
            </p>
          )}
        </section>
      )}

      {parametros && (
        <section className="card-panel" style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.15rem" }}>Parâmetros (Simples Nacional)</h2>
          <form onSubmit={saveParametros} className="grid-2" style={{ gap: "0.75rem" }}>
            <label>
              Opção SN (opSimpNac)
              <input
                type="number"
                value={parametros.opSimpNac}
                onChange={(e) =>
                  setParametros({ ...parametros, opSimpNac: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Regime apuração SN
              <input
                type="number"
                value={parametros.regApTribSN}
                onChange={(e) =>
                  setParametros({ ...parametros, regApTribSN: Number(e.target.value) })
                }
              />
            </label>
            <label>
              % tributos SN (transparência)
              <input
                type="number"
                step="0.01"
                value={parametros.pTotTribSN}
                onChange={(e) =>
                  setParametros({ ...parametros, pTotTribSN: Number(e.target.value) })
                }
              />
            </label>
            <label>
              CSOSN padrão
              <input
                value={parametros.csosnPadrao}
                onChange={(e) =>
                  setParametros({ ...parametros, csosnPadrao: e.target.value })
                }
              />
            </label>
            <label>
              Série NF-e padrão
              <input
                type="number"
                value={parametros.serieNfePadrao}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    serieNfePadrao: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Série DPS padrão
              <input
                type="number"
                value={parametros.serieDpsPadrao}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    serieDpsPadrao: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Natureza mercadoria
              <select
                value={parametros.naturezaMercadoriaId || ""}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    naturezaMercadoriaId: e.target.value || null,
                  })
                }
              >
                <option value="">—</option>
                {naturezas.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.codigo} — {n.descricao.slice(0, 48)}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="primary">
                Salvar parâmetros
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card-panel" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>Naturezas de operação</h2>
        <ul style={{ marginTop: 0 }}>
          {naturezas.map((n) => (
            <li key={n.id}>
              <strong>{n.codigo}</strong> — {n.descricao} (CFOP {n.cfopDentroUf}/{n.cfopForaUf})
            </li>
          ))}
        </ul>
        <form onSubmit={saveNatureza} className="grid-2" style={{ gap: "0.75rem" }}>
          <label>
            Código
            <input
              value={natForm.codigo}
              onChange={(e) => setNatForm({ ...natForm, codigo: e.target.value })}
              required
            />
          </label>
          <label>
            Finalidade
            <input
              value={natForm.finalidadeEmissao}
              onChange={(e) =>
                setNatForm({ ...natForm, finalidadeEmissao: e.target.value })
              }
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Descrição (natureza_operacao Focus)
            <input
              value={natForm.descricao}
              onChange={(e) => setNatForm({ ...natForm, descricao: e.target.value })}
              required
            />
          </label>
          <label>
            CFOP dentro UF
            <input
              value={natForm.cfopDentroUf}
              onChange={(e) => setNatForm({ ...natForm, cfopDentroUf: e.target.value })}
              required
            />
          </label>
          <label>
            CFOP fora UF
            <input
              value={natForm.cfopForaUf}
              onChange={(e) => setNatForm({ ...natForm, cfopForaUf: e.target.value })}
              required
            />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="secondary">
              Incluir / atualizar natureza
            </button>
          </div>
        </form>
      </section>

      <section className="card-panel">
        <h2 style={{ fontSize: "1.15rem" }}>Séries e numeração</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Série</th>
              <th>Próximo nº</th>
              <th>Ambiente</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id}>
                <td>{s.tipo}</td>
                <td>{s.serie}</td>
                <td>{s.proximoNumero}</td>
                <td>{s.ambiente}</td>
                <td>{s.ativo ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={saveSerie} className="grid-2" style={{ gap: "0.75rem", marginTop: "1rem" }}>
          <label>
            Tipo
            <select
              value={serieForm.tipo}
              onChange={(e) => setSerieForm({ ...serieForm, tipo: e.target.value })}
            >
              <option value="NFE">NFE</option>
              <option value="NFSE_DPS">NFSE_DPS</option>
            </select>
          </label>
          <label>
            Série
            <input
              value={serieForm.serie}
              onChange={(e) => setSerieForm({ ...serieForm, serie: e.target.value })}
            />
          </label>
          <label>
            Próximo número
            <input
              value={serieForm.proximoNumero}
              onChange={(e) =>
                setSerieForm({ ...serieForm, proximoNumero: e.target.value })
              }
            />
          </label>
          <label>
            Ambiente
            <select
              value={serieForm.ambiente}
              onChange={(e) => setSerieForm({ ...serieForm, ambiente: e.target.value })}
            >
              <option value="HOMOLOGACAO">HOMOLOGACAO</option>
              <option value="PRODUCAO">PRODUCAO</option>
            </select>
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="secondary">
              Incluir / atualizar série
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
