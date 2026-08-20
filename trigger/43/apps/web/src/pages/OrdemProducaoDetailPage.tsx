import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemProducao, type Produto } from '../lib/api';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDecimalBr } from '../lib/format';
import { opMaterialStatusLabel, opStatusLabel } from '../lib/producaoUi';

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

  const updateMat = (materialId: number, patch: Partial<MatForm>) => {
    setMats((prev) => {
      const current = prev.find((x) => x.material_id === materialId) ?? {
        material_id: materialId,
        qtde_retorno: '0',
        qtde_perda: '0',
      };
      return [...prev.filter((x) => x.material_id !== materialId), { ...current, ...patch }];
    });
  };

  const tol = op?.pedido?.tolerancia_qtd_pct ?? '20';
  const materiaisRequisitados = (op?.materiais ?? []).filter((m) => !m.pendente);

  return (
    <>
      <PageHeader
        title={op?.codigo ?? 'Ordem de produção'}
        description={
          op
            ? (op.pedido_item?.descricao ?? 'Ordem de produção')
            : loading
              ? 'Carregando…'
              : 'OP não encontrada.'
        }
        actions={
          <div className="btn-row">
            <Link to="/ordens-producao" className="btn btn-secondary">
              Voltar
            </Link>
            {op ? (
              <a
                href={`/ordens-producao/${op.id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/ordens-producao/${op.id}/ficha`)}
              >
                Imprimir ficha
              </a>
            ) : null}
            {op?.rastreio && (op.rastreio.resumo?.insumos_com_saida ?? 0) > 0 ? (
              <a
                href={`/ordens-producao/${op.id}/rastreio`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/ordens-producao/${op.id}/rastreio`)}
              >
                Imprimir rastreio
              </a>
            ) : null}
            {op?.pedido ? (
              <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-secondary">
                {op.pedido.codigo}
              </Link>
            ) : null}
          </div>
        }
      />

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading || !op ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">OP não encontrada.</div>
        )
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Status</span>
                  <strong>
                    <StatusPill status={opStatusLabel(op.status)} />
                  </strong>
                </div>
                <div>
                  <span>Planejada</span>
                  <strong>{formatDecimalBr(Number(op.qtde_planejada), 0)}</strong>
                </div>
                {op.qtde_boa != null ? (
                  <div>
                    <span>Boa</span>
                    <strong>{formatDecimalBr(Number(op.qtde_boa), 0)}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Tolerância</span>
                  <strong>±{tol}%</strong>
                </div>
                {op.parceiro ? (
                  <div>
                    <span>Cliente</span>
                    <strong>{op.parceiro.razao_social}</strong>
                  </div>
                ) : null}
                {op.pa_movimento ? (
                  <div>
                    <span>MOV PA</span>
                    <strong>{op.pa_movimento.codigo}</strong>
                  </div>
                ) : null}
                {op.status === 'CANCELADA' && op.motivo_cancelamento ? (
                  <div>
                    <span>Devolvida ao pedido</span>
                    <strong>{op.motivo_cancelamento}</strong>
                  </div>
                ) : null}
              </div>
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
                  alignItems: 'flex-start',
                }}
              >
                <div className="form-section" style={{ marginBottom: 0 }}>
                  <h3>Materiais</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    Pré-preenchidos do orçamento (papel, tubete, caixa). Confira e requisite a saída.
                  </p>
                </div>
                {aberta &&
                hasPermission('producao.escrever') &&
                (op.materiais ?? []).some((m) => m.pendente) ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void requisitarTodos()}
                  >
                    Requisitar todas as saídas
                  </button>
                ) : null}
              </div>

              <div className="table-wrap" style={{ marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th>SKU</th>
                      <th>Planejado</th>
                      <th>Requisitado</th>
                      <th>Status</th>
                      <th className="acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {(op.materiais ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
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
                            <StatusPill
                              status={opMaterialStatusLabel(m.pendente ? 'PENDENTE' : 'REQUISITADO')}
                            />
                          </td>
                          <td>
                            {aberta && hasPermission('producao.escrever') && m.pendente ? (
                              <div className="table-actions">
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
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {aberta && hasPermission('producao.escrever') ? (
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
              ) : null}
            </div>
          </div>

          {op.rastreio ? (
            <RastreioInsumosPanel
              rastreio={op.rastreio}
              printHref={`/ordens-producao/${op.id}/rastreio`}
            />
          ) : null}

          {aberta && hasPermission('producao.escrever') && op.pode_devolver_ao_pedido ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Devolver ao pedido</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Esta ordem ainda não baixou estoque. Encerrar devolve o item ao pedido — o código
                    da OP permanece no histórico e uma nova ordem pode ser aberta.
                  </p>
                </div>
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
                    <div className="btn-row" style={{ marginTop: '0.75rem' }}>
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
          ) : null}

          {aberta &&
          hasPermission('producao.escrever') &&
          !op.pode_devolver_ao_pedido &&
          (op.materiais ?? []).some((m) => !m.pendente) ? (
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Com saída de material já requisitada, a ordem segue até a conclusão. Não é possível
              devolver ao pedido.
            </p>
          ) : null}

          {aberta && hasPermission('producao.escrever') ? (
            <div className="card">
              <div className="card-body">
                <div className="form-section">
                  <h3>Concluir produção</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Informe retorno/perda de cada material (consumido = requisitado − retorno −
                    perda). Quantidade boa dentro de ±{tol}% readequa o pedido automaticamente.
                  </p>
                </div>

                {materiaisRequisitados.length > 0 ? (
                  <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Requisitado</th>
                          <th>Retorno</th>
                          <th>Perda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materiaisRequisitados.map((m) => {
                          const form = mats.find((x) => x.material_id === m.id) ?? {
                            material_id: m.id,
                            qtde_retorno: '0',
                            qtde_perda: '0',
                          };
                          return (
                            <tr key={m.id}>
                              <td>
                                <strong>{m.produto?.codigo}</strong>
                                <div className="muted">{m.produto?.descricao_fiscal}</div>
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_requisitada), 4)} {m.unidade}
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 96 }}>
                                  <input
                                    value={form.qtde_retorno}
                                    onChange={(e) =>
                                      updateMat(m.id, { qtde_retorno: e.target.value })
                                    }
                                    aria-label={`Retorno ${m.produto?.codigo ?? m.id}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 96 }}>
                                  <input
                                    value={form.qtde_perda}
                                    onChange={(e) => updateMat(m.id, { qtde_perda: e.target.value })}
                                    aria-label={`Perda ${m.produto?.codigo ?? m.id}`}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="form-group">
                    <label>Qtde boa (PA)</label>
                    <input value={qtdeBoa} onChange={(e) => setQtdeBoa(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Refugo</label>
                    <input value={qtdeRefugo} onChange={(e) => setQtdeRefugo(e.target.value)} />
                  </div>
                </div>

                <label
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}
                >
                  <input
                    type="checkbox"
                    checked={aceitarFora}
                    onChange={(e) => setAceitarFora(e.target.checked)}
                  />
                  Aceitar fora da tolerância ±{tol}%
                </label>
                {aceitarFora ? (
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label>Motivo</label>
                    <input value={motivoFora} onChange={(e) => setMotivoFora(e.target.value)} />
                  </div>
                ) : null}

                <div className="btn-row" style={{ marginTop: '1rem' }}>
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
          ) : null}
        </>
      )}
    </>
  );
}
