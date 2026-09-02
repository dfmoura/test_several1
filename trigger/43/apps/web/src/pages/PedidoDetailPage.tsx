import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { DocumentoFiscalPreviaCard } from '../components/DocumentoFiscalPrevia';
import { api, type FaturamentoPreview, type Pedido } from '../lib/api';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import { ExpedicaoPedidoPanel } from '../components/ExpedicaoPedidoPanel';
import { ComissaoPedidoPanel } from '../components/ComissaoPedidoPanel';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatCurrency, formatDate, formatDecimalBr, formatUnitPrice } from '../lib/format';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { nfStatusLabel } from '../lib/fiscalUi';
import { necessidadeLabel, pedItemStatusLabel, pedStatusLabel } from '../lib/producaoUi';

export function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [preview, setPreview] = useState<FaturamentoPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [estornarAberto, setEstornarAberto] = useState(false);
  const [motivoEstorno, setMotivoEstorno] = useState('');

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: Pedido }>(`/pedidos/${id}`);
      setPedido(res.data);
      if (
        res.data.status === 'PRODUZIDO' ||
        res.data.status === 'FATURADO' ||
        res.data.status === 'EM_ENTREGA' ||
        res.data.status === 'ENTREGUE' ||
        res.data.status === 'ENCERRADO'
      ) {
        try {
          const prev = await api.get<{ data: FaturamentoPreview }>(
            `/pedidos/${res.data.id}/faturamento-preview`,
          );
          setPreview(prev.data);
        } catch {
          setPreview(null);
        }
      } else {
        setPreview(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar pedido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEstornarAberto(false);
    setMotivoEstorno('');
    void load();
  }, [id]);

  const abrirOrdem = async (itemId: number, necessidade: string) => {
    if (!pedido) return;
    setBusy(true);
    setErr(null);
    try {
      const path =
        necessidade === 'SERVICO'
          ? `/pedidos/${pedido.id}/abrir-os`
          : `/pedidos/${pedido.id}/abrir-op`;
      const res = await api.post<{ data: { id: number; codigo: string } }>(path, {
        pedido_item_id: itemId,
      });
      if (necessidade === 'SERVICO') {
        navigate(`/ordens-servico/${res.data.id}`);
      } else {
        navigate(`/ordens-producao/${res.data.id}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível abrir a ordem.');
    } finally {
      setBusy(false);
    }
  };

  const faturar = async () => {
    if (!pedido) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: { codigo: string; valor_a_cobrar: string } }>(
        `/pedidos/${pedido.id}/faturar`,
        {},
      );
      setMsg(
        `Faturamento ${res.data.codigo} confirmado. Saldo a cobrar: ${formatCurrency(res.data.valor_a_cobrar)}.`,
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível faturar.');
    } finally {
      setBusy(false);
    }
  };

  const estornar = async () => {
    const fat = preview?.faturamento;
    if (!pedido || !fat) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.post(`/faturamentos/${fat.id}/estornar`, { motivo: motivoEstorno.trim() });
      setMsg(
        `Faturamento ${fat.codigo} estornado. Cobranças canceladas. O pedido voltou para a fila de faturamento.`,
      );
      setEstornarAberto(false);
      setMotivoEstorno('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível estornar o faturamento.');
    } finally {
      setBusy(false);
    }
  };

  const readeq = (pedido?.snapshot as { readequacao?: Record<string, unknown> } | null)?.readequacao;

  return (
    <>
      <PageHeader
        title={pedido?.codigo ?? 'Pedido'}
        description={
          pedido
            ? `${pedido.parceiro?.razao_social ?? '—'} · ${pedido.orcamento?.codigo ?? 'ORC —'}`
            : loading
              ? 'Carregando…'
              : 'Pedido não encontrado.'
        }
        actions={
          <div className="btn-row">
            <Link to="/pedidos" className="btn btn-secondary">
              Voltar
            </Link>
            {pedido ? (
              <a
                href={`/pedidos/${pedido.id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/pedidos/${pedido.id}/ficha`)}
              >
                Imprimir ficha
              </a>
            ) : null}
            {pedido?.rastreio && (pedido.rastreio.resumo?.insumos_com_saida ?? 0) > 0 ? (
              <a
                href={`/pedidos/${pedido.id}/rastreio`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/pedidos/${pedido.id}/rastreio`)}
              >
                Imprimir rastreio
              </a>
            ) : null}
            {pedido?.orcamento?.id ? (
              <Link to={`/orcamentos/${pedido.orcamento.id}`} className="btn btn-secondary">
                {pedido.orcamento.codigo}
              </Link>
            ) : null}
          </div>
        }
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {loading || !pedido ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">Pedido não encontrado.</div>
        )
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Status</span>
                  <strong>
                    <StatusPill status={pedStatusLabel(pedido.status)} />
                  </strong>
                </div>
                <div>
                  <span>Prazo</span>
                  <strong>
                    {pedido.prazo_entrega_dias != null ? prazoEntregaCompleto(pedido) : '—'}
                  </strong>
                </div>
                <div>
                  <span>Tolerância</span>
                  <strong>±{pedido.tolerancia_qtd_pct}%</strong>
                </div>
                {pedido.vendedor ? (
                  <div>
                    <span>Vendedor</span>
                    <strong>
                      {pedido.vendedor.codigo} — {pedido.vendedor.razao_social}
                    </strong>
                  </div>
                ) : null}
                {readeq ? (
                  <div>
                    <span>Readequação</span>
                    <strong>
                      {String(readeq.qtde_pedida)} →{' '}
                      {String(readeq.qtde_boa ?? readeq.qtde_executada ?? '—')}
                    </strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {preview ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Faturamento e cobrança</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Preço travado no pedido. Quantidade faturável é a produzida (tolerância). O unitário
                    é o total das etiquetas da faixa dividido pela quantidade — não o total vezes a
                    quantidade. Matriz/clichê e faca são fixos. Sinal já recebido é apropriado — não é
                    cobrado de novo. A nota segue no mesmo passo: prévia já visível; envio ao hub
                    quando o Focus da empresa estiver apto. Sem inventar número nem XML autorizado.
                  </p>
                </div>
                {preview.ja_faturado && preview.faturamento ? (
                  <>
                    <div className="detail-meta">
                      <div>
                        <span>Documento</span>
                        <strong>
                          <Link to={`/financeiro/faturamentos/${preview.faturamento.id}`}>
                            {preview.faturamento.codigo}
                          </Link>
                        </strong>
                      </div>
                      <div>
                        <span>Valor</span>
                        <strong>{formatCurrency(preview.faturamento.valor_bruto)}</strong>
                      </div>
                      <div>
                        <span>Sinal apropriado</span>
                        <strong>{formatCurrency(preview.faturamento.valor_adiantamento)}</strong>
                      </div>
                      <div>
                        <span>Saldo cobrado</span>
                        <strong>{formatCurrency(preview.faturamento.valor_a_cobrar)}</strong>
                      </div>
                      <div>
                        <span>Notas</span>
                        <strong>
                          <StatusPill status={nfStatusLabel(preview.faturamento.nf_status, preview.faturamento.nf_simulada)} />
                        </strong>
                      </div>
                    </div>
                    {preview.faturamento.documentos_fiscais &&
                    preview.faturamento.documentos_fiscais.length > 0 ? (
                      <div className="nf-previa-list" style={{ marginTop: '1rem' }}>
                        {preview.faturamento.documentos_fiscais.map((d) => (
                          <DocumentoFiscalPreviaCard
                            key={d.id}
                            doc={d}
                            faturamentoId={preview.faturamento!.id}
                          />
                        ))}
                      </div>
                    ) : null}
                    {hasPermission('faturamento.escrever') && preview.pode_estornar ? (
                      <div style={{ marginTop: '1rem' }}>
                        <p className="form-hint">
                          {preview.faturamento.nf_simulada
                            ? 'Autorização de teste não trava o estorno. Estornar cancela as cobranças e devolve o pedido à fila — o sinal já recebido permanece.'
                            : 'A nota ainda não foi autorizada. Estornar cancela as cobranças deste faturamento e devolve o pedido à fila — o sinal já recebido permanece. O documento FAT fica no histórico.'}
                        </p>
                        {!estornarAberto ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={busy}
                            onClick={() => setEstornarAberto(true)}
                          >
                            Estornar faturamento e cobranças
                          </button>
                        ) : (
                          <div>
                            <div className="form-group" style={{ maxWidth: 480 }}>
                              <label>Motivo</label>
                              <input
                                value={motivoEstorno}
                                onChange={(e) => setMotivoEstorno(e.target.value)}
                                placeholder="Ex.: condição de pagamento incorreta; cliente errado"
                                autoFocus
                              />
                            </div>
                            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                              <button
                                type="button"
                                className="btn btn-danger"
                                disabled={busy || motivoEstorno.trim().length < 3}
                                onClick={() => void estornar()}
                              >
                                Confirmar estorno
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={busy}
                                onClick={() => {
                                  setEstornarAberto(false);
                                  setMotivoEstorno('');
                                }}
                              >
                                Desistir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="detail-meta">
                      <div>
                        <span>Quantidade × unitário</span>
                        <strong>
                          {formatDecimalBr(preview.qtde_faturavel, 0)} ×{' '}
                          {formatUnitPrice(preview.preco_unitario)}
                        </strong>
                      </div>
                      <div>
                        <span>Etiquetas</span>
                        <strong>{formatCurrency(preview.valor_itens)}</strong>
                      </div>
                      {preview.valor_matriz && Number(preview.valor_matriz) > 0 ? (
                        <div>
                          <span>Matriz / clichê</span>
                          <strong>{formatCurrency(preview.valor_matriz)}</strong>
                        </div>
                      ) : null}
                      {preview.valor_faca && Number(preview.valor_faca) > 0 ? (
                        <div>
                          <span>Ferramental</span>
                          <strong>{formatCurrency(preview.valor_faca)}</strong>
                        </div>
                      ) : null}
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(preview.valor_bruto)}</strong>
                      </div>
                      <div>
                        <span>Sinal já recebido</span>
                        <strong>
                          {preview.adiantamento
                            ? `${formatCurrency(preview.valor_adiantamento)} · ${preview.adiantamento.codigo}`
                            : 'Nenhum'}
                        </strong>
                      </div>
                      <div>
                        <span>Saldo a cobrar</span>
                        <strong>{formatCurrency(preview.valor_a_cobrar)}</strong>
                      </div>
                      <div>
                        <span>Condição</span>
                        <strong>
                          {preview.condicao_pagamento}
                          {preview.forma_pagamento ? ` · ${preview.forma_pagamento}` : ''}
                        </strong>
                      </div>
                    </div>
                    {preview.parcelas && preview.parcelas.length > 0 ? (
                      <div className="table-wrap" style={{ marginTop: '1rem' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Parcela</th>
                              <th>Vencimento</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.parcelas.map((p) => (
                              <tr key={p.parcela}>
                                <td>
                                  {p.parcela} · {p.rotulo}
                                </td>
                                <td>{formatDate(p.vencimento)}</td>
                                <td>{formatCurrency(p.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="muted">Nenhum título novo — o sinal cobre o valor faturável.</p>
                    )}
                    {preview.avisos?.map((a) => (
                      <p key={a} className="form-hint">
                        {a}
                      </p>
                    ))}
                    {preview.fiscal ? (
                      <div style={{ marginTop: '1rem' }}>
                        <p className="form-hint" style={{ marginTop: 0 }}>
                          {preview.fiscal.documentos.map((d) => d.rotulo).join(' e ') || 'Documento fiscal'}
                          {preview.fiscal.emissao_automatica
                            ? preview.fiscal.emissor_teste?.ativo
                              ? ' — autorização de teste (sem certificado A1, sem valor fiscal). Quando o hub Focus estiver apto, o mesmo documento é enviado de verdade.'
                              : ' — o hub Focus está apto; a nota será enviada ao confirmar.'
                            : ` — ${preview.fiscal.hub.mensagem}`}
                        </p>
                        {preview.fiscal.avisos.map((a) => (
                          <p key={a} className="form-hint">
                            {a}
                          </p>
                        ))}
                        {preview.fiscal.pendencias.map((p) => (
                          <p key={p} className="form-hint">
                            {p}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {preview.bloqueios?.map((b) => (
                      <p key={b} className="form-error">
                        {b}
                      </p>
                    ))}
                    {hasPermission('faturamento.escrever') && preview.apto ? (
                      <div className="btn-row" style={{ marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => void faturar()}
                        >
                          Faturar e gerar cobranças
                          {preview.fiscal?.emissor_teste?.ativo
                            ? ' e autorizar nota de teste'
                            : preview.fiscal?.emissao_automatica
                              ? ' e emitir nota'
                              : ''}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          {['FATURADO', 'EM_ENTREGA', 'ENTREGUE', 'ENCERRADO'].includes(pedido.status) ? (
            <ExpedicaoPedidoPanel
              pedidoId={pedido.id}
              pedidoCodigo={pedido.codigo}
              pedidoStatus={pedido.status}
              onChanged={() => void load()}
            />
          ) : null}

          <ComissaoPedidoPanel pedidoId={pedido.id} pedidoStatus={pedido.status} />

          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Itens</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  Produção abre OP (item de produção) ou OS (serviço) a partir do pedido liberado.
                </p>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Necessidade</th>
                      <th>Pedida</th>
                      <th>Produzida</th>
                      <th>Status</th>
                      <th className="acoes">Ordem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.itens.map((item) => {
                      const opAtiva = pedido.ordens_producao?.find(
                        (o) =>
                          o.status !== 'CANCELADA' &&
                          (o.pedido_item_id == null || o.pedido_item_id === item.id),
                      );
                      const osAtiva = pedido.ordens_servico?.find(
                        (o) =>
                          o.status !== 'CANCELADA' &&
                          (o.pedido_item_id == null || o.pedido_item_id === item.id),
                      );
                      return (
                        <tr key={item.id}>
                          <td>{item.descricao}</td>
                          <td>{necessidadeLabel(item.necessidade)}</td>
                          <td>
                            {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
                          </td>
                          <td>{formatDecimalBr(Number(item.qtde_produzida), 0)}</td>
                          <td>
                            <StatusPill status={pedItemStatusLabel(item.status)} />
                          </td>
                          <td>
                            <div className="table-actions table-actions--wrap">
                              {item.necessidade === 'PRODUCAO' && opAtiva ? (
                                <Link
                                  to={`/ordens-producao/${opAtiva.id}`}
                                  className="btn btn-secondary"
                                >
                                  {opAtiva.codigo}
                                </Link>
                              ) : null}
                              {item.necessidade === 'SERVICO' && osAtiva ? (
                                <Link
                                  to={`/ordens-servico/${osAtiva.id}`}
                                  className="btn btn-secondary"
                                >
                                  {osAtiva.codigo}
                                </Link>
                              ) : null}
                              {hasPermission('producao.escrever') &&
                              ['LIBERADO', 'EM_PRODUCAO'].includes(pedido.status) &&
                              item.status === 'PENDENTE' &&
                              item.necessidade !== 'REVENDA' ? (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={busy}
                                  onClick={() => void abrirOrdem(item.id, item.necessidade)}
                                >
                                  {item.necessidade === 'SERVICO' ? 'Abrir OS' : 'Abrir OP'}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {pedido.rastreio ? (
            <RastreioInsumosPanel
              rastreio={pedido.rastreio}
              printHref={`/pedidos/${pedido.id}/rastreio`}
            />
          ) : null}
        </>
      )}
    </>
  );
}
