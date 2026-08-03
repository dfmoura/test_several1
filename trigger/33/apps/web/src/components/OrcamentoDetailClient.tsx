"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  descricaoProduto,
  formatBrl,
  formatQtde,
  type ComercialParams,
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { formatOrcamento } from "@/lib/codigos-documento";
import { isOrcamentoVencido } from "@/lib/orcamento-input";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/orcamento-status";
import type { OrcamentoStatus } from "@prisma/client";
import { QuoteResultTables } from "@/components/QuoteResultTables";
import type { QuoteResult } from "@orcamento/pricing-engine";

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
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [faixaPedido, setFaixaPedido] = useState(0);

  const codigo = formatOrcamento({
    numero: props.numero,
    versao: props.versao,
    data: props.data,
  });

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

  async function enviarLinkCliente() {
    await run("link", async () => {
      const res = await fetch(`/api/orcamentos/${props.id}/link-aprovacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível gerar o link");
      const url = j.url as string;
      try {
        await navigator.clipboard.writeText(url);
        setLinkMsg(`Link copiado · ${j.codigo}`);
      } catch {
        setLinkMsg(url);
      }
    });
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
  const baseValidade = props.enviadoEm ? new Date(props.enviadoEm) : new Date(props.data);
  const vencido = isOrcamentoVencido({
    baseDate: baseValidade,
    validadeDias: props.input.validadeDias,
    validadeProposta: props.input.validadeProposta || props.comercial.validade,
  });

  const fullResult: QuoteResult | null =
    props.result?.faixas?.length
      ? {
          valorMatrizBruto: props.result.valorMatrizBruto || 0,
          valorMatriz:
            props.result.valorMatriz ??
            props.result.faixas[0]?.commercial.valorMatriz ??
            0,
          matrizCobrada:
            props.result.matrizCobrada ??
            Boolean(props.input.matriz && !props.input.matrizJaCobrada),
          alerts: props.result.alerts || [],
          faixas: props.result.faixas.map((f) => ({
            production: {
              quantidade: f.production.quantidade,
              tipoParada: f.production.tipoParada || "SEM PARADA",
              metragemLinear: f.production.metragemLinear || 0,
              metragemM2: f.production.metragemM2 || 0,
              horaMaquina: f.production.horaMaquina || 0,
              horaTrocaProduto: f.production.horaTrocaProduto || 0,
              horaTrocaBobina: f.production.horaTrocaBobina || 0,
              perdaAcerto: f.production.perdaAcerto || 0,
              perdaAcabamento: f.production.perdaAcabamento || 0,
              perdaPapelTrocaProduto: f.production.perdaPapelTrocaProduto || 0,
              perdaTrocaBobinaM2: f.production.perdaTrocaBobinaM2 || 0,
              qtdeRolos: f.production.qtdeRolos,
              qtdeCaixas: f.production.qtdeCaixas || 0,
              rolosPorCaixa: f.production.rolosPorCaixa || 12,
            },
            costs: {
              valorPapel: f.costs.valorPapel || 0,
              valorMaquina: f.costs.valorMaquina || 0,
              valorTrocaProduto: f.costs.valorTrocaProduto || 0,
              valorTrocaBobina: f.costs.valorTrocaBobina || 0,
              valorPapelTrocaProduto: f.costs.valorPapelTrocaProduto || 0,
              tinta: f.costs.tinta || 0,
              acabamento: f.costs.acabamento || 0,
              rebobinacao: f.costs.rebobinacao || 0,
              tubete: f.costs.tubete || 0,
              valorCaixa: f.costs.valorCaixa || 0,
              valorServico: f.costs.valorServico,
            },
            commercial: {
              comissaoPct: f.commercial.comissaoPct ?? props.input.comissaoPct ?? 0,
              comissao: f.commercial.comissao || 0,
              imposto: f.commercial.imposto || 0,
              servicoEncargos: f.commercial.servicoEncargos || 0,
              valorEtiqueta: f.commercial.valorEtiqueta,
              valorMatriz: f.commercial.valorMatriz,
              valorTotal: f.commercial.valorTotal,
            },
          })),
        }
      : null;

  return (
    <div className="orc-detail">
      <PageHeader
        kicker="Comercial · ORC"
        title={
          <>
            Orçamento {codigo}
          </>
        }
        subtitle={
          <div className="chip-row">
            <StatusBadge status={props.status} />
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              {props.clienteNome} · {props.vendedorNome}
            </span>
            <span className="muted" style={{ display: "block", width: "100%", fontSize: "0.82rem", marginTop: "0.35rem" }}>
              {props.status === "RASCUNHO" && "Próximo: enviar link ao cliente (ou aprovar em HML)."}
              {props.status === "ENVIADO" && "Aguardando aceite do cliente no link."}
              {props.status === "VISUALIZADO" && "Cliente visualizou — aguardando aprovação."}
              {props.status === "APROVADO" && "Aceite ok — gere o pedido (PED). OS/OP nascem na confirmação."}
              {props.status === "REPROVADO" && "Reprovado — edite e gere nova versão se necessário."}
              {props.status === "PERDIDO" && "Encerrado."}
            </span>
          </div>
        }
        crumbs={[{ href: "/orcamentos", label: "Orçamentos" }]}
        actions={
          <div className="orc-actions">
            {props.mutavel && props.result && (
              <button type="button" className="secondary" onClick={enviarLinkCliente} disabled={!!busy}>
                {busy === "link" ? "Gerando…" : "Enviar link ao cliente"}
              </button>
            )}
            <button type="button" className="secondary" onClick={abrirPdf} disabled={!!busy || !props.result}>
              Gerar PDF
            </button>
            {props.status === "APROVADO" && (
              <button
                type="button"
                onClick={() => setModal("pedido")}
                disabled={!!busy || vencido}
                title={vencido ? "Orçamento vencido — recálculo obrigatório" : undefined}
              >
                3. Gerar pedido
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
        }
      />

      {linkMsg && (
        <div className="alert-info" role="status">
          {linkMsg}
        </div>
      )}

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

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

      {vencido && (
        <div className="alert-warn" role="status">
          <strong>Validade expirada.</strong> Este orçamento passou da validade da proposta
          ({props.input.validadeProposta || props.comercial.validade}). Recalcule e salve
          antes de gerar pedido (estudo 32).
        </div>
      )}

      {props.input.isProspect && (
        <div className="alert-info" role="status">
          Cliente cadastrado como <strong>prospect</strong> — promoção a cadastro completo
          recomendada antes do faturamento.
        </div>
      )}

      {props.mutavel && (props.status === "ENVIADO" || props.status === "VISUALIZADO") && (
        <div className="orc-pending-banner">
          Aguardando aprovação ou reprovação (cliente pode usar o link enviado). Enquanto isso, o
          orçamento ainda pode ser editado ou excluído.
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
              <strong>
                {props.input.matriz
                  ? props.input.matrizJaCobrada
                    ? "Sim (já cobrada)"
                    : "Sim (1º pedido)"
                  : "Não"}
              </strong>
            </div>
            <div>
              <span className="muted">Máq. F10 · G10</span>
              <strong>
                {(props.input.maquinaRoda || "—") +
                  " · " +
                  (props.input.maquinaGrupo || "—")}
              </strong>
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

      {props.role !== "VENDEDOR" && fullResult && (
        <section className="orc-panel" style={{ marginTop: "1rem" }}>
          <QuoteResultTables
            result={fullResult}
            form={{
              clienteNome: props.clienteNome,
              medida: props.input.medida || "",
              puxada: props.input.puxada || 0,
              z: props.input.z ?? null,
              formatoFaca: props.input.formatoFaca || "",
              repeticao: props.input.repeticao || 0,
              cores: (props.input.cores as number | "4V") ?? 0,
              papel: props.input.papel || "",
              acabamento: props.input.acabamento || "",
              etiqPorRolo: props.input.etiqPorRolo || 0,
              maquinaRoda: props.input.maquinaRoda || "",
              maquinaGrupo: props.input.maquinaGrupo || "",
              matriz: Boolean(props.input.matriz),
              matrizJaCobrada: Boolean(props.input.matrizJaCobrada),
              prazoEntrega: props.input.prazoEntrega || props.comercial.prazoEntrega,
              validadeProposta:
                props.input.validadeProposta || props.comercial.validade,
              toleranciaQtdPct: props.input.toleranciaQtdPct ?? 20,
            }}
          />
        </section>
      )}

      {props.role === "VENDEDOR" && (
        <section className="card-panel" style={{ marginTop: "1rem" }}>
          <h2>Breakdown interno</h2>
          <p className="muted">
            Detalhamento de custo oculto para o perfil vendedor (estudo 32 / RF11).
          </p>
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
                  Depois: confirmar → estoque/MRP → produção → NF-e → boleto → entrega →
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
