"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  descricaoProduto,
  formatBrl,
  formatQtde,
  type ComercialParams,
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/orcamento-status";
import type { OrcamentoStatus } from "@prisma/client";

type DecisaoUser = { id: string; name: string; email: string } | null;

export type OrcamentoDetailProps = {
  id: string;
  numero: number;
  versao: number;
  status: OrcamentoStatus;
  clienteNome: string;
  vendedorNome: string;
  observacoes: string | null;
  data: string;
  enviadoEm: string | null;
  decididoEm: string | null;
  motivoDecisao: string | null;
  mutavel: boolean;
  createdByName: string;
  decididoPor: DecisaoUser;
  input: OrcamentoInputSnapshot;
  result: OrcamentoResultSnapshot | null;
  comercial: ComercialParams;
  role: string;
};

function StatusBadge({ status }: { status: OrcamentoStatus }) {
  return (
    <span className={`chip ${STATUS_CHIP_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OrcamentoDetailClient(props: OrcamentoDetailProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"aprovar" | "reprovar" | "excluir" | "pedido" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [faixaPedido, setFaixaPedido] = useState(0);

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      setModal(null);
      setMotivo("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na operação");
    } finally {
      setBusy(null);
    }
  }

  async function enviar() {
    await run("enviar", async () => {
      const res = await fetch(`/api/orcamentos/${props.id}/enviar`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível enviar");
    });
  }

  async function decidir(decisao: "APROVAR" | "REPROVAR") {
    await run(decisao.toLowerCase(), async () => {
      const res = await fetch(`/api/orcamentos/${props.id}/decidir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisao,
          motivo: motivo.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível registrar a decisão");
    });
  }

  async function excluir() {
    await run("excluir", async () => {
      const res = await fetch(`/api/orcamentos/${props.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Não foi possível excluir");
      router.push("/orcamentos");
      router.refresh();
    });
  }

  async function gerarPedido() {
    await run("pedido", async () => {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcamentoId: props.id, faixaIndex: faixaPedido }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível gerar o pedido");
      router.push(`/pedidos/${j.id}`);
      router.refresh();
    });
  }

  function abrirPdf() {
    window.open(`/api/orcamentos/${props.id}/pdf`, "_blank", "noopener,noreferrer");
  }

  const faixas = props.result?.faixas || [];
  const locked = !props.mutavel;

  return (
    <div className="orc-detail">
      <div className="toolbar orc-detail-head">
        <div>
          <p className="muted" style={{ margin: "0 0 0.35rem" }}>
            <Link href="/orcamentos">← Orçamentos</Link>
          </p>
          <h1 style={{ marginBottom: "0.35rem" }}>
            Orçamento {props.numero}
            <span className="muted" style={{ fontWeight: 500 }}>
              {" "}
              · v{props.versao}
            </span>
          </h1>
          <div className="chip-row" style={{ marginTop: "0.35rem" }}>
            <StatusBadge status={props.status} />
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              {props.clienteNome} · {props.vendedorNome}
            </span>
          </div>
        </div>

        <div className="orc-actions">
          <button type="button" className="secondary" onClick={abrirPdf} disabled={!!busy || !props.result}>
            Gerar PDF
          </button>
          {props.status === "APROVADO" && (
            <button type="button" onClick={() => setModal("pedido")} disabled={!!busy}>
              4. Gerar pedido + OS
            </button>
          )}
          {props.mutavel && (
            <>
              <Link className="btn secondary-link" href={`/orcamentos/${props.id}/editar`}>
                Editar
              </Link>
              {props.status === "RASCUNHO" && (
                <button type="button" onClick={enviar} disabled={!!busy}>
                  {busy === "enviar" ? "Enviando…" : "Enviar p/ aprovação"}
                </button>
              )}
              <button
                type="button"
                className="btn-approve"
                onClick={() => setModal("aprovar")}
                disabled={!!busy}
              >
                Aprovar
              </button>
              <button
                type="button"
                className="btn-reject"
                onClick={() => setModal("reprovar")}
                disabled={!!busy}
              >
                Reprovar
              </button>
              <button
                type="button"
                className="secondary danger-outline"
                onClick={() => setModal("excluir")}
                disabled={!!busy}
              >
                Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {locked && (
        <div className="orc-lock-banner">
          <strong>Orçamento {STATUS_LABEL[props.status].toLowerCase()}</strong>
          <span>
            {" "}
            — edição e exclusão bloqueadas após a decisão comercial.
            {props.decididoEm && (
              <>
                {" "}
                Decisão em {new Date(props.decididoEm).toLocaleString("pt-BR")}
                {props.decididoPor ? ` por ${props.decididoPor.name}` : ""}.
              </>
            )}
          </span>
          {props.motivoDecisao && (
            <p className="orc-motivo">Motivo: {props.motivoDecisao}</p>
          )}
        </div>
      )}

      {props.mutavel && props.status === "ENVIADO" && (
        <div className="orc-pending-banner">
          Aguardando aprovação ou reprovação. Enquanto isso, o orçamento ainda pode ser
          editado ou excluído.
        </div>
      )}

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <section className="card-panel">
          <h2>Dados comerciais</h2>
          <dl className="orc-dl">
            <div>
              <dt>Cliente</dt>
              <dd>{props.clienteNome}</dd>
            </div>
            <div>
              <dt>Vendedor</dt>
              <dd>{props.vendedorNome}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{new Date(props.data).toLocaleDateString("pt-BR")}</dd>
            </div>
            <div>
              <dt>Criado por</dt>
              <dd>{props.createdByName}</dd>
            </div>
            {props.enviadoEm && (
              <div>
                <dt>Enviado em</dt>
                <dd>{new Date(props.enviadoEm).toLocaleString("pt-BR")}</dd>
              </div>
            )}
          </dl>
          {props.observacoes && (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Obs. internas: {props.observacoes}
            </p>
          )}
        </section>

        <section className="card-panel">
          <h2>Especificação</h2>
          <p style={{ margin: "0 0 0.75rem" }}>{descricaoProduto(props.input)}</p>
          <div className="orc-spec-grid">
            <div>
              <span className="muted">Cores</span>
              <strong>{String(props.input.cores ?? "—")}</strong>
            </div>
            <div>
              <span className="muted">Tubete</span>
              <strong>{props.input.tubete || "—"}</strong>
            </div>
            <div>
              <span className="muted">Colunas</span>
              <strong>{props.input.qtdeColunas ?? "—"}</strong>
            </div>
            <div>
              <span className="muted">Modelos</span>
              <strong>{props.input.qtdeModelos ?? "—"}</strong>
            </div>
            <div>
              <span className="muted">Matriz</span>
              <strong>{props.input.matriz ? "Sim (1º pedido)" : "Não"}</strong>
            </div>
            <div>
              <span className="muted">Máquina</span>
              <strong>{props.input.maquinaRoda || props.input.maquinaGrupo || "—"}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card-panel" style={{ marginTop: "1rem" }}>
        <div className="toolbar" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Consolidado comercial</h2>
          <button type="button" className="secondary" onClick={abrirPdf} disabled={!props.result}>
            PDF paisagem para o cliente
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Etiquetas</th>
              <th>Rolos</th>
              <th>Total</th>
              <th>Unitário</th>
              <th>Valor rolo</th>
              <th>Matriz</th>
              <th>Total c/ matriz</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f, idx) => {
              const q = f.production.quantidade;
              const rolos = f.production.qtdeRolos || 1;
              return (
                <tr key={`${idx}-${q}`}>
                  <td className="money">{formatQtde(q)}</td>
                  <td className="money">{formatQtde(rolos)}</td>
                  <td className="money">{formatBrl(f.commercial.valorEtiqueta)}</td>
                  <td className="money">{formatBrl(f.commercial.valorEtiqueta / q)}</td>
                  <td className="money">{formatBrl(f.commercial.valorEtiqueta / rolos)}</td>
                  <td className="money">{formatBrl(f.commercial.valorMatriz)}</td>
                  <td className="money">
                    <strong>{formatBrl(f.commercial.valorTotal)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Prazo: {props.comercial.prazoEntrega} · Validade: {props.comercial.validade} ·{" "}
          {props.comercial.clausulaQuantidade}
          <br />
          Matriz — somente no 1º pedido. O PDF do cliente não expõe breakdown de custo.
        </p>
      </section>

      {props.role !== "VENDEDOR" && faixas.length > 0 && (
        <section className="card-panel" style={{ marginTop: "1rem" }}>
          <h2>Breakdown interno</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Qtde</th>
                <th>Valor serviço</th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((f, idx) => (
                <tr key={`${idx}-${f.production.quantidade}`}>
                  <td className="money">{formatQtde(f.production.quantidade)}</td>
                  <td className="money">{formatBrl(f.costs.valorServico)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {modal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card-panel modal-panel" style={{ width: "min(480px, 100%)" }}>
            {modal === "aprovar" && (
              <>
                <h2>Aprovar orçamento</h2>
                <p className="muted">
                  Confirma a aprovação de {props.numero}-v{props.versao} para{" "}
                  <strong style={{ color: "var(--ink)" }}>{props.clienteNome}</strong>? Após
                  aprovar, o orçamento não poderá mais ser editado nem excluído.
                </p>
                <label>
                  Observação (opcional)
                  <textarea
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: cliente confirmou por e-mail"
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-approve"
                    disabled={!!busy}
                    onClick={() => void decidir("APROVAR")}
                  >
                    {busy === "aprovar" ? "Aprovando…" : "Confirmar aprovação"}
                  </button>
                </div>
              </>
            )}
            {modal === "reprovar" && (
              <>
                <h2>Reprovar orçamento</h2>
                <p className="muted">
                  Informe o motivo. Depois da reprovação, o registro fica bloqueado para
                  edição e exclusão.
                </p>
                <label>
                  Motivo da reprovação *
                  <textarea
                    rows={4}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: preço acima do esperado / cliente optou por outro fornecedor"
                    required
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-reject"
                    disabled={!!busy || motivo.trim().length < 3}
                    onClick={() => void decidir("REPROVAR")}
                  >
                    {busy === "reprovar" ? "Reprovando…" : "Confirmar reprovação"}
                  </button>
                </div>
              </>
            )}
            {modal === "excluir" && (
              <>
                <h2>Excluir orçamento</h2>
                <p className="muted">
                  Esta ação remove o orçamento {props.numero}-v{props.versao}. Só é
                  permitida enquanto o status ainda aguarda decisão.
                </p>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-reject"
                    disabled={!!busy}
                    onClick={() => void excluir()}
                  >
                    {busy === "excluir" ? "Excluindo…" : "Excluir definitivamente"}
                  </button>
                </div>
              </>
            )}
            {modal === "pedido" && (
              <>
                <h2>Gerar pedido de venda</h2>
                <p className="muted">
                  Converte este orçamento aprovado em pedido + ordem de serviço (passo 4).
                  Depois: materiais/compras se faltar → produção → NF → boleto → entrega →
                  recebimento. Escolha a faixa de quantidade.
                </p>
                <label>
                  Faixa
                  <select
                    value={faixaPedido}
                    onChange={(e) => setFaixaPedido(Number(e.target.value))}
                  >
                    {faixas.map((f, i) => (
                      <option key={i} value={i}>
                        {formatQtde(f.production.quantidade)} un —{" "}
                        {formatBrl(f.commercial.valorTotal)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!!busy || !faixas.length}
                    onClick={() => void gerarPedido()}
                  >
                    {busy === "pedido" ? "Gerando…" : "Confirmar pedido"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
