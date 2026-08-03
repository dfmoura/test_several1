"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatBrl, formatQtde } from "@/lib/orcamento-comercial";

type Faixa = {
  index: number;
  quantidade: number;
  valorTotal: number;
  valorUnitario: number;
  valorRolo: number | null;
  valorMatriz: number;
};

type Proposta = {
  codigo: string;
  versao: number;
  status: string;
  vencido: boolean;
  jaAprovado: boolean;
  jaRecusado: boolean;
  expiraEm: string;
  clienteNome: string;
  vendedorNome: string;
  empresa: {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    logoUrl: string | null;
    telefone: string | null;
    email: string | null;
  };
  descricao: {
    medida: string;
    papel: string;
    acabamento: string;
    cores: string;
    etiqPorRolo: number;
    prazoDias: number;
    validadeDias: number;
    condicaoPagamento: string;
    tolerancia: string;
    matriz: boolean;
  };
  faixas: Faixa[];
  observacoes: string | null;
};

export function AprovacaoClient({ token }: { token: string }) {
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faixaIndex, setFaixaIndex] = useState(0);
  const [nomeCliente, setNomeCliente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<"APROVADO" | "RECUSADO" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aprovacao/${token}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Link inválido");
      setProposta(j);
      setNomeCliente(j.clienteNome || "");
      if (j.jaAprovado) setDone("APROVADO");
      if (j.jaRecusado) setDone("RECUSADO");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar a proposta");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(acao: "APROVAR" | "RECUSAR") {
    setBusy(acao);
    setError(null);
    try {
      const body =
        acao === "APROVAR"
          ? { acao, faixaIndex, nomeCliente: nomeCliente.trim(), motivo: motivo.trim() || null }
          : { acao, motivo: motivo.trim() || null };
      const res = await fetch(`/api/aprovacao/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao registrar decisão");
      setDone(acao === "APROVAR" ? "APROVADO" : "RECUSADO");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  function onAprovar(e: FormEvent) {
    e.preventDefault();
    void submit("APROVAR");
  }

  if (loading) {
    return (
      <div className="aprovacao-page">
        <p className="muted">Carregando proposta…</p>
      </div>
    );
  }

  if (error && !proposta) {
    return (
      <div className="aprovacao-page">
        <div className="aprovacao-card">
          <h1>Link indisponível</h1>
          <p className="alert">{error}</p>
        </div>
      </div>
    );
  }

  if (!proposta) return null;

  const bloqueado = proposta.vencido || proposta.jaAprovado || proposta.jaRecusado || !!done;

  return (
    <div className="aprovacao-page">
      <div className="aprovacao-card">
        <header className="aprovacao-header">
          {proposta.empresa.logoUrl ? (
            <Image
              src={proposta.empresa.logoUrl}
              alt={proposta.empresa.nomeFantasia}
              width={140}
              height={56}
              className="aprovacao-logo"
              unoptimized
            />
          ) : (
            <strong>{proposta.empresa.nomeFantasia}</strong>
          )}
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {proposta.codigo} · v{proposta.versao}
          </p>
        </header>

        {done === "APROVADO" && (
          <div className="alert-info" role="status">
            Proposta aprovada. Obrigado — nossa equipe dará continuidade ao pedido.
          </div>
        )}
        {done === "RECUSADO" && (
          <div className="alert-warn" role="status">
            Proposta recusada. Entre em contato com {proposta.vendedorNome} se desejar revisar.
          </div>
        )}
        {proposta.vencido && !done && (
          <div className="alert-warn" role="status">
            Esta proposta expirou. Solicite uma atualização ao vendedor.
          </div>
        )}

        <section style={{ marginTop: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Proposta comercial</h2>
          <p>
            <strong>{proposta.clienteNome}</strong>
            <br />
            <span className="muted">Vendedor: {proposta.vendedorNome}</span>
          </p>
          <dl className="orc-dl" style={{ marginTop: "1rem" }}>
            <div>
              <dt>Medida</dt>
              <dd>{proposta.descricao.medida}</dd>
            </div>
            <div>
              <dt>Papel / acabamento</dt>
              <dd>
                {proposta.descricao.papel} · {proposta.descricao.acabamento}
              </dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{proposta.descricao.cores}</dd>
            </div>
            <div>
              <dt>Prazo / validade</dt>
              <dd>
                Entrega ~{proposta.descricao.prazoDias} dias · validade {proposta.descricao.validadeDias}{" "}
                dias
              </dd>
            </div>
            <div>
              <dt>Pagamento</dt>
              <dd>{proposta.descricao.condicaoPagamento}</dd>
            </div>
            <div>
              <dt>Tolerância</dt>
              <dd>{proposta.descricao.tolerancia}</dd>
            </div>
          </dl>
        </section>

        <section style={{ marginTop: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem" }}>Quantidades e valores</h3>
          <div className="aprovacao-faixas">
            {proposta.faixas.map((f) => (
              <label
                key={f.index}
                className={`aprovacao-faixa${faixaIndex === f.index ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="faixa"
                  checked={faixaIndex === f.index}
                  disabled={bloqueado}
                  onChange={() => setFaixaIndex(f.index)}
                />
                <div>
                  <strong>{formatQtde(f.quantidade)} un.</strong>
                  <span className="money">{formatBrl(f.valorTotal)}</span>
                  <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                    {formatBrl(f.valorUnitario)}/un
                    {f.valorRolo != null ? ` · ${formatBrl(f.valorRolo)}/rolo` : ""}
                    {f.valorMatriz > 0 ? ` · matriz ${formatBrl(f.valorMatriz)}` : ""}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {proposta.observacoes && (
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            {proposta.observacoes}
          </p>
        )}

        {!bloqueado && (
          <>
            {error && (
              <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
                {error}
              </div>
            )}
            <form onSubmit={onAprovar} style={{ marginTop: "1.25rem", display: "grid", gap: "0.75rem" }}>
              <label>
                Seu nome (aceite)
                <input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                  placeholder="Nome completo"
                />
              </label>
              <label>
                Observação (opcional)
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  placeholder="Comentários sobre a proposta"
                />
              </label>
              <button type="submit" disabled={!!busy}>
                {busy === "APROVAR" ? "Confirmando…" : "Aprovar proposta"}
              </button>
            </form>
            <button
              type="button"
              className="secondary danger-outline"
              style={{ marginTop: "0.75rem", width: "100%" }}
              disabled={!!busy}
              onClick={() => void submit("RECUSAR")}
            >
              {busy === "RECUSAR" ? "Enviando…" : "Recusar proposta"}
            </button>
          </>
        )}

        <footer className="muted" style={{ marginTop: "1.5rem", fontSize: "0.8rem" }}>
          Válido até {new Date(proposta.expiraEm).toLocaleDateString("pt-BR")} ·{" "}
          {proposta.empresa.telefone || proposta.empresa.email || proposta.empresa.cnpj}
        </footer>
      </div>

      <style jsx global>{`
        .aprovacao-page {
          min-height: 100dvh;
          background: var(--bg-muted, #f4f6f8);
          padding: 1rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .aprovacao-card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }
        .aprovacao-header {
          text-align: center;
        }
        .aprovacao-logo {
          object-fit: contain;
          max-height: 56px;
          width: auto;
          margin: 0 auto;
        }
        .aprovacao-faixas {
          display: grid;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .aprovacao-faixa {
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
          padding: 0.75rem;
          border: 1px solid var(--border, #ddd);
          border-radius: 8px;
          cursor: pointer;
        }
        .aprovacao-faixa.selected {
          border-color: var(--accent, #2563eb);
          background: rgba(37, 99, 235, 0.04);
        }
        .aprovacao-faixa input {
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}
