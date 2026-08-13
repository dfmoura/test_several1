import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemProducao, type Produto } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';

type MatForm = { material_id: number; qtde_retorno: string; qtde_perda: string };

export function OrdemProducaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devolverAberto, setDevolverAberto] = useState(false);
  const [motivoDevolver, setMotivoDevolver] = useState('');

  const [produtoId, setProdutoId] = useState('');
  const [qtdeSaida, setQtdeSaida] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [qtdeBoa, setQtdeBoa] = useState('');
  const [qtdeRefugo, setQtdeRefugo] = useState('0');
  const [mats, setMats] = useState<MatForm[]>([]);
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${id}`);
      setOp(res.data);
      setQtdeBoa(res.data.qtde_boa ?? res.data.qtde_planejada);
      setMats(
        (res.data.materiais ?? []).map((m) => ({
          material_id: m.id,
          qtde_retorno: m.qtde_retorno || '0',
          qtde_perda: m.qtde_perda || '0',
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar OP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    void api
      .get<{ data: Produto[] }>('/produtos?familia=MP')
      .then((r) => setProdutos(r.data))
      .catch(() => setProdutos([]));
  }, []);

  const aberta = useMemo(
    () => op && ['ABERTA', 'EM_ANDAMENTO'].includes(op.status),
    [op],
  );

  const requisitar = async (opts?: { materialId?: number; qtde?: string; produtoId?: number }) => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {};
      if (opts?.materialId) {
        body.material_id = opts.materialId;
        if (opts.qtde) body.qtde = opts.qtde;
      } else {
        body.produto_id = opts?.produtoId ?? Number(produtoId);
        body.qtde = opts?.qtde ?? qtdeSaida;
      }
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/requisitar`,
        body,
      );
      setOp(res.data);
      setMats(
        (res.data.materiais ?? []).map((m) => ({
          material_id: m.id,
          qtde_retorno: m.qtde_retorno || '0',
          qtde_perda: m.qtde_perda || '0',
        })),
      );
      setProdutoId('');
      setQtdeSaida('');
      setMsg('Saída de material registrada.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha na requisição.');
    } finally {
      setBusy(false);
    }
  };

  const requisitarTodos = async () => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/requisitar-pendentes`,
      );
      setOp(res.data);
      setMats(
        (res.data.materiais ?? []).map((m) => ({
          material_id: m.id,
          qtde_retorno: m.qtde_retorno || '0',
          qtde_perda: m.qtde_perda || '0',
        })),
      );
      setMsg('Todas as saídas pendentes foram requisitadas.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao requisitar pendentes.');
    } finally {
      setBusy(false);
    }
  };

  const concluir = async () => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/concluir`,
        {
          qtde_boa: qtdeBoa,
          qtde_refugo: qtdeRefugo || '0',
          aceitar_fora_tolerancia: aceitarFora,
          motivo_fora_tolerancia: motivoFora || null,
          materiais: mats,
        },
      );
      setOp(res.data);
      setMsg('OP concluída · PA e readequação gravados.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao concluir.');
    } finally {
      setBusy(false);
    }
  };

  const devolverAoPedido = async () => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/devolver-ao-pedido`,
        { motivo: motivoDevolver.trim() },
      );
      setOp(res.data);
      setDevolverAberto(false);
      if (res.data.pedido?.id) {
        navigate(`/pedidos/${res.data.pedido.id}`);
        return;
      }
      setMsg('Ordem devolvida ao pedido.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível devolver ao pedido.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading">Carregando…</div>;
  if (!op) return <div className="empty">{err ?? 'OP não encontrada.'}</div>;

  const tol = op.pedido?.tolerancia_qtd_pct ?? '20';

  return (
    <>
      <PageHeader
        title={op.codigo}
        description={`${op.pedido_item?.descricao ?? '—'} · PED ${op.pedido?.codigo ?? '—'} · ±${tol}%`}
        actions={
          <Link to="/ordens-producao" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div className="muted">Status</div>
            <StatusPill status={op.status} />
          </div>
          <div>
            <div className="muted">Planejada</div>
            <strong>{formatDecimalBr(Number(op.qtde_planejada), 0)}</strong>
          </div>
          {op.qtde_boa != null && (
            <div>
              <div className="muted">Boa</div>
              <strong>{formatDecimalBr(Number(op.qtde_boa), 0)}</strong>
            </div>
          )}
          {op.pa_movimento && (
            <div>
              <div className="muted">MOV PA</div>
              <strong>{op.pa_movimento.codigo}</strong>
            </div>
          )}
          {op.pedido && (
            <div>
              <Link to={`/pedidos/${op.pedido.id}`}>Ver pedido</Link>
            </div>
          )}
          {op.status === 'CANCELADA' && op.motivo_cancelamento && (
            <div>
              <div className="muted">Devolvida ao pedido</div>
              <strong>{op.motivo_cancelamento}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Materiais</h3>
              <p className="muted" style={{ margin: 0 }}>
                Pré-preenchidos do orçamento (papel, tubete, caixa). Confira e requisite a saída.
              </p>
            </div>
            {aberta &&
              hasPermission('producao.escrever') &&
              (op.materiais ?? []).some((m) => m.pendente) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void requisitarTodos()}
                >
                  Requisitar todas as saídas
                </button>
              )}
          </div>

          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Componente</th>
                  <th>SKU</th>
                  <th>Planejado</th>
                  <th>Requisitado</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(op.materiais ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Nenhum material casado ao snapshot. Inclua manualmente abaixo.
                    </td>
                  </tr>
                ) : (
                  (op.materiais ?? []).map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.componente ?? '—'}
                        {m.origem_texto ? (
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {m.origem_texto}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {m.produto?.codigo} — {m.produto?.descricao_fiscal}
                      </td>
                      <td>
                        {formatDecimalBr(Number(m.qtde_planejada ?? 0), 4)} {m.unidade}
                      </td>
                      <td>
                        {m.pendente
                          ? '—'
                          : `${formatDecimalBr(Number(m.qtde_requisitada), 4)} ${m.unidade}`}
                      </td>
                      <td>
                        <StatusPill status={m.pendente ? 'PENDENTE' : 'REQUISITADO'} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {aberta && hasPermission('producao.escrever') && m.pendente && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={busy}
                            onClick={() =>
                              void requisitar({
                                materialId: m.id,
                                qtde: m.qtde_planejada ?? m.qtde_requisitada,
                              })
                            }
                          >
                            Requisitar saída
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {aberta && hasPermission('producao.escrever') && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer' }}>Incluir material extra</summary>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginTop: '0.75rem',
                  alignItems: 'flex-end',
                }}
              >
                <div className="form-group" style={{ minWidth: 280, flex: 1 }}>
                  <label>SKU (MP/EMB)</label>
                  <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.descricao_fiscal}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 120 }}>
                  <label>Qtde (interna)</label>
                  <input value={qtdeSaida} onChange={(e) => setQtdeSaida(e.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || !produtoId || !qtdeSaida}
                  onClick={() => void requisitar()}
                >
                  Requisitar saída
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {aberta && hasPermission('producao.escrever') && op.pode_devolver_ao_pedido && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Devolver ao pedido</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Esta ordem ainda não baixou estoque. Encerrar devolve o item ao pedido — o código da OP
              permanece no histórico e uma nova ordem pode ser aberta.
            </p>
            {!devolverAberto ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setDevolverAberto(true)}
              >
                Devolver ao pedido
              </button>
            ) : (
              <div>
                <div className="form-group" style={{ maxWidth: 480 }}>
                  <label>Motivo</label>
                  <input
                    value={motivoDevolver}
                    onChange={(e) => setMotivoDevolver(e.target.value)}
                    placeholder="Ex.: aberta por engano; item ainda não vai para a máquina"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || motivoDevolver.trim().length < 3}
                    onClick={() => void devolverAoPedido()}
                  >
                    Confirmar devolução
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setDevolverAberto(false);
                      setMotivoDevolver('');
                    }}
                  >
                    Desistir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {aberta &&
        hasPermission('producao.escrever') &&
        !op.pode_devolver_ao_pedido &&
        (op.materiais ?? []).some((m) => !m.pendente) && (
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Com saída de material já requisitada, a ordem segue até a conclusão. Não é possível
            devolver ao pedido.
          </p>
        )}

      {aberta && hasPermission('producao.escrever') && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Concluir produção</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Informe retorno/perda de cada material (consumido = requisitado − retorno − perda).
              Quantidade boa dentro de ±{tol}% readequa o pedido automaticamente.
            </p>

            {(op.materiais ?? [])
              .filter((m) => !m.pendente)
              .map((m) => {
              const form = mats.find((x) => x.material_id === m.id) ?? {
                material_id: m.id,
                qtde_retorno: '0',
                qtde_perda: '0',
              };
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.75rem',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>{m.produto?.codigo}</strong>
                    <div className="muted">
                      req. {formatDecimalBr(Number(m.qtde_requisitada), 4)} {m.unidade}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Retorno</label>
                    <input
                      value={form.qtde_retorno}
                      onChange={(e) =>
                        setMats((prev) => {
                          const next = prev.filter((x) => x.material_id !== m.id);
                          next.push({
                            material_id: m.id,
                            qtde_retorno: e.target.value,
                            qtde_perda: form.qtde_perda,
                          });
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Perda</label>
                    <input
                      value={form.qtde_perda}
                      onChange={(e) =>
                        setMats((prev) => {
                          const next = prev.filter((x) => x.material_id !== m.id);
                          next.push({
                            material_id: m.id,
                            qtde_retorno: form.qtde_retorno,
                            qtde_perda: e.target.value,
                          });
                          return next;
                        })
                      }
                    />
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Qtde boa (PA)</label>
                <input value={qtdeBoa} onChange={(e) => setQtdeBoa(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Refugo</label>
                <input value={qtdeRefugo} onChange={(e) => setQtdeRefugo(e.target.value)} />
              </div>
            </div>

            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <input
                type="checkbox"
                checked={aceitarFora}
                onChange={(e) => setAceitarFora(e.target.checked)}
              />
              Aceitar fora da tolerância ±{tol}%
            </label>
            {aceitarFora && (
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>Motivo</label>
                <input value={motivoFora} onChange={(e) => setMotivoFora(e.target.value)} />
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !qtdeBoa}
                onClick={() => void concluir()}
              >
                Concluir OP
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
