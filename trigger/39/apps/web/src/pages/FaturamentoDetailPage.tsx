import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { DocumentoFiscalPreviaCard } from '../components/DocumentoFiscalPrevia';
import { api, type Faturamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate, formatDecimalBr, formatUnitPrice } from '../lib/format';
import { titStatusLabel } from '../lib/comprasUi';
import { nfStatusLabel } from '../lib/fiscalUi';

function fatStatusLabel(status: string): string {
  if (status === 'CONFIRMADO') return 'Confirmado';
  if (status === 'ESTORNADO') return 'Estornado';
  return status.replace(/_/g, ' ');
}

function nfLabel(status: string): string {
  return nfStatusLabel(status);
}

export function FaturamentoDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [fat, setFat] = useState<Faturamento | null>(null);
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
      const res = await api.get<{ data: Faturamento }>(`/faturamentos/${id}`);
      setFat(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEstornarAberto(false);
    setMotivoEstorno('');
    setMsg(null);
    void load();
  }, [id]);

  const estornar = async () => {
    if (!fat) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Faturamento }>(`/faturamentos/${fat.id}/estornar`, {
        motivo: motivoEstorno.trim(),
      });
      setFat(res.data);
      setMsg(
        `Faturamento estornado. Cobranças canceladas. O pedido ${res.data.pedido?.codigo ?? ''} voltou para a fila de faturamento.`,
      );
      setEstornarAberto(false);
      setMotivoEstorno('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível estornar o faturamento.');
    } finally {
      setBusy(false);
    }
  };

  const emitirNf = async () => {
    if (!fat) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Faturamento }>(`/faturamentos/${fat.id}/emitir-nf`);
      setFat(res.data);
      setMsg('Envio ao hub Focus concluído. Confira o status das notas abaixo.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível emitir as notas.');
    } finally {
      setBusy(false);
    }
  };

  const consultarNf = async () => {
    if (!fat) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ data: Faturamento }>(`/faturamentos/${fat.id}/consultar-nf`);
      setFat(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível consultar o hub.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={fat?.codigo ?? 'Faturamento'}
        description={
          fat
            ? `${fat.parceiro?.razao_social ?? '—'} · ${fat.pedido?.codigo ?? 'PED —'}`
            : loading
              ? 'Carregando…'
              : 'Faturamento não encontrado.'
        }
        actions={
          <div className="btn-row">
            <Link to="/financeiro/faturamentos" className="btn btn-secondary">
              Voltar
            </Link>
            {fat?.pedido?.id ? (
              <Link to={`/pedidos/${fat.pedido.id}`} className="btn btn-secondary">
                {fat.pedido.codigo}
              </Link>
            ) : null}
          </div>
        }
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {loading || !fat ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">Faturamento não encontrado.</div>
        )
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Documento</span>
                  <strong>
                    <StatusPill status={fatStatusLabel(fat.status)} />
                  </strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{formatCurrency(fat.valor_bruto)}</strong>
                </div>
                <div>
                  <span>Sinal apropriado</span>
                  <strong>
                    {formatCurrency(fat.valor_adiantamento)}
                    {fat.adiantamento ? ` · ${fat.adiantamento.codigo}` : ''}
                  </strong>
                </div>
                <div>
                  <span>Saldo cobrado</span>
                  <strong>{formatCurrency(fat.valor_a_cobrar)}</strong>
                </div>
                <div>
                  <span>Condição</span>
                  <strong>
                    {fat.condicao_pagamento ?? '—'}
                    {fat.forma_pagamento ? ` · ${fat.forma_pagamento}` : ''}
                  </strong>
                </div>
                <div>
                  <span>Notas</span>
                  <strong>
                    <StatusPill status={nfLabel(fat.nf_status)} />
                  </strong>
                </div>
                <div>
                  <span>Faturado em</span>
                  <strong>{formatDate(fat.faturado_em ?? fat.created_at)}</strong>
                </div>
              </div>
              {fat.status === 'ESTORNADO' ? (
                <p className="form-hint" style={{ marginBottom: 0 }}>
                  Estornado em {formatDate(fat.estornado_em)}
                  {fat.motivo_estorno ? ` — ${fat.motivo_estorno}` : ''}. O documento permanece no
                  histórico. Sinal já recebido não foi alterado.
                </p>
              ) : (
                <p className="form-hint" style={{ marginBottom: 0 }}>
                  {fat.nf_status === 'AUTORIZADA'
                    ? 'Nota autorizada no hub Focus. O estoque de produto acabado só baixa neste momento.'
                    : 'A cobrança do saldo já foi gerada. A nota abaixo é prévia do que irá ao hub Focus — pendências de cadastro não desfazem o faturamento. Sem chave, número ou XML autorizado até o hub responder.'}
                </p>
              )}
            </div>
          </div>

          {(fat.documentos_fiscais ?? []).length > 0 ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Notas fiscais</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    NF-e para produto e NFS-e para serviço. Numeração vem do fisco — o sistema não
                    inventa série nem chave. Enquanto o hub não autorizar, você vê a prévia e o JSON
                    de envio.
                  </p>
                </div>
                <div className="nf-previa-list">
                  {fat.documentos_fiscais?.map((d) => (
                    <DocumentoFiscalPreviaCard key={d.id} doc={d} faturamentoId={fat.id} />
                  ))}
                </div>
                {fat.status === 'CONFIRMADO' && hasPermission('faturamento.escrever') ? (
                  <div className="btn-row" style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void emitirNf()}
                    >
                      Enviar / reenviar ao hub
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => void consultarNf()}
                    >
                      Atualizar status
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {hasPermission('faturamento.escrever') && fat.pode_estornar ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Estornar faturamento</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    A nota ainda não foi autorizada. Estornar cancela as cobranças deste documento e
                    devolve o pedido à fila para faturar de novo. O sinal já recebido permanece. Não
                    apaga o histórico.
                  </p>
                </div>
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
            </div>
          ) : null}

          {fat.status === 'CONFIRMADO' && !fat.pode_estornar && (fat.bloqueios_estorno ?? []).length > 0 ? (
            <p className="form-hint" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              {fat.bloqueios_estorno?.join(' ')}
            </p>
          ) : null}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <h3>Itens</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtde</th>
                      <th>Preço</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fat.itens ?? []).map((it) => (
                      <tr key={it.id}>
                        <td>{it.descricao}</td>
                        <td>
                          {formatDecimalBr(it.qtde, 0)} {it.unidade}
                        </td>
                        <td>{formatUnitPrice(it.preco_unitario)}</td>
                        <td>{formatCurrency(it.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3>Títulos e cobranças</h3>
              {(fat.titulos ?? []).length === 0 ? (
                <p className="muted">Nenhum título novo — o sinal cobriu o valor faturável.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Parcela</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Cobrança</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fat.titulos ?? []).map((t) => {
                        const cob = t.cobrancas?.[0];
                        return (
                          <tr key={t.id}>
                            <td>
                              <Link to="/financeiro/contas-a-receber">{t.codigo}</Link>
                            </td>
                            <td>{t.parcela ?? 1}</td>
                            <td>{formatDate(t.vencimento)}</td>
                            <td>{formatCurrency(t.valor)}</td>
                            <td>
                              <StatusPill status={titStatusLabel(t.status)} />
                            </td>
                            <td>
                              {cob ? (
                                <span>
                                  {cob.codigo} · {cob.status}
                                  {cob.pix_copia_cola ? ' · PIX' : ''}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
