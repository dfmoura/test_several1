import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProdutoCombobox } from '../components/ProdutoCombobox';
import { OpKitPainel } from '../components/OpKitPainel';
import { PaEmbalagemPanel } from '../components/PaEmbalagemPanel';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import {
  api,
  type OrdemProducao,
  type Pedido,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDecimalBr } from '../lib/format';
import { formatNecessidadeOp, formatPickPrincipal, modoRetirada } from '../lib/producaoPick';
import { hrefFichaEstoque, parseQtdeDigitada } from '../lib/producaoUi';

type ExtraLinha = { key: number; produto: Produto | null; qtde: string };

export function OrdemProducaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devolverAberto, setDevolverAberto] = useState(false);
  const [motivoDevolver, setMotivoDevolver] = useState('');

  const extraKeyRef = useRef(1);
  const emptyExtra = (): ExtraLinha => ({ key: extraKeyRef.current++, produto: null, qtde: '' });
  const [extras, setExtras] = useState<ExtraLinha[]>(() => [emptyExtra()]);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${id}`);
      setOp(res.data);
      if (res.data.pedido?.id) {
        try {
          const ped = await api.get<{ data: Pedido }>(`/pedidos/${res.data.pedido.id}`);
          setPedido(ped.data);
        } catch {
          setPedido(null);
        }
      } else {
        setPedido(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar a ordem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const aberta = useMemo(
    () => op && ['ABERTA', 'EM_ANDAMENTO'].includes(op.status),
    [op],
  );

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

  const podeProducao = Boolean(aberta && hasPermission('producao.ler'));

  return (
    <>
      <div className="pick-toolbar">
        <Link to="/ordens-producao" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {op ? <span className="pick-toolbar__ref">{op.codigo}</span> : null}
        {op?.pedido ? (
          <Link to={`/pedidos/${op.pedido.id}`} className="pick-toolbar__ref">
            {op.pedido.codigo}
          </Link>
        ) : null}
        {op ? (
          <a
            href={`/ordens-producao/${op.id}/ficha`}
            className="btn btn-secondary btn-sm"
            onClick={(e) => onAbrirFichaClick(e, `/ordens-producao/${op.id}/ficha`)}
          >
            Imprimir lista
          </a>
        ) : null}
      </div>

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading || !op ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">Ordem não encontrada.</div>
        )
      ) : (
        <>
          <OpKitPainel
            op={op}
            pedido={pedido}
            porta="op"
            podeEstoque={hasPermission('estoque.ler')}
            podeProducao={podeProducao}
            canWrite={
              hasPermission('producao.escrever') || hasPermission('estoque.escrever')
            }
            onOp={setOp}
          />

          {op.status === 'CONCLUIDA' ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Resultado</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Etiquetas boas no pedido. Embalagem é o passo seguinte.
                  </p>
                </div>
                <div className="detail-meta" style={{ marginBottom: '1rem' }}>
                  <div>
                    <span>Etiquetas boas</span>
                    <strong>
                      {op.qtde_boa != null ? formatDecimalBr(Number(op.qtde_boa), 0) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Refugo</span>
                    <strong>{formatDecimalBr(Number(op.qtde_refugo || 0), 0)}</strong>
                  </div>
                </div>
                {(op.materiais ?? []).filter((m) => !m.pendente).length > 0 ? (
                  <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Precisa</th>
                          <th>Saiu</th>
                          <th>Sobra</th>
                          <th>Perda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(op.materiais ?? [])
                          .filter((m) => !m.pendente)
                          .map((m) => (
                            <tr key={m.id}>
                              <td>
                                {m.produto?.descricao_fiscal ?? m.componente}
                                {m.produto?.codigo ? (
                                  <div className="muted" style={{ fontSize: '0.85em' }}>
                                    {m.produto.codigo}
                                  </div>
                                ) : null}
                              </td>
                              <td>{formatNecessidadeOp(m, op)}</td>
                              <td>
                                {modoRetirada(m) === 'volume'
                                  ? formatPickPrincipal(m, op)
                                  : `${formatDecimalBr(Number(m.qtde_requisitada), 4)} ${m.unidade}`}
                              </td>
                              <td>
                                {modoRetirada(m) === 'volume'
                                  ? parseQtdeDigitada(m.qtde_retorno) > 0
                                    ? `${formatDecimalBr(Number(m.qtde_retorno), 4)} ${m.unidade}`
                                    : '—'
                                  : `${formatDecimalBr(Number(m.qtde_retorno), 4)} ${m.unidade}`}
                              </td>
                              <td>
                                {modoRetirada(m) === 'volume'
                                  ? parseQtdeDigitada(m.qtde_perda) > 0
                                    ? `${formatDecimalBr(Number(m.qtde_perda), 4)} ${m.unidade}`
                                    : '—'
                                  : `${formatDecimalBr(Number(m.qtde_perda), 4)} ${m.unidade}`}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {op.status === 'CONCLUIDA' ? (
            <PaEmbalagemPanel
              op={op}
              canWrite={hasPermission('producao.escrever')}
              onChanged={() => void load()}
            />
          ) : null}

          {aberta && hasPermission('producao.escrever') ? (
            <details className="card" style={{ marginBottom: '1rem' }}>
              <summary className="op-mais-summary">Acrescentar no kit</summary>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9em' }}>
                  Algo que não veio na lista. Informe e peça no estoque — a saída confirma lá.
                </p>
                {extras.map((linha, idx) => {
                  const idsNaOp = new Set(
                    (op.materiais ?? [])
                      .map((m) => m.produto?.id)
                      .filter((pid): pid is number => Number(pid) > 0),
                  );
                  const idsNesteForm = new Set(
                    extras
                      .filter((e) => e.key !== linha.key && e.produto)
                      .map((e) => e.produto!.id),
                  );
                  const un = (
                    linha.produto?.unidade_interna ||
                    linha.produto?.unidade_comercial ||
                    'un.'
                  ).toUpperCase();
                  return (
                    <div key={linha.key} className="oc-form-page__item">
                      <div
                        className={`oc-form-page__item-row${extras.length > 1 ? ' has-remove' : ''}`}
                      >
                        <ProdutoCombobox
                          className="oc-form-page__item-produto"
                          label={idx === 0 ? 'Material' : 'Material'}
                          value={linha.produto}
                          onChange={(p) => {
                            if (p && (idsNaOp.has(p.id) || idsNesteForm.has(p.id))) {
                              setErr(
                                idsNaOp.has(p.id)
                                  ? 'Este item já está no kit. Peça de novo pela lista de retirada.'
                                  : 'Este item já está em outra linha.',
                              );
                              return;
                            }
                            setErr(null);
                            setExtras((prev) =>
                              prev.map((e) => (e.key === linha.key ? { ...e, produto: p } : e)),
                            );
                          }}
                          familias={['MP', 'EMB']}
                          showSummary={false}
                          placeholder="Buscar por código ou descrição…"
                          emptyMessage="Nenhum material encontrado."
                        />
                        <div className="form-group oc-form-page__item-qtde">
                          <label>Quanto ({un})</label>
                          <input
                            inputMode="decimal"
                            value={linha.qtde}
                            onChange={(e) =>
                              setExtras((prev) =>
                                prev.map((x) =>
                                  x.key === linha.key ? { ...x, qtde: e.target.value } : x,
                                ),
                              )
                            }
                            aria-label={`Quantidade extra ${linha.produto?.codigo ?? idx + 1}`}
                          />
                        </div>
                        {extras.length > 1 ? (
                          <div className="form-group oc-form-page__item-remove">
                            <label>&nbsp;</label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busy}
                              onClick={() =>
                                setExtras((prev) => prev.filter((e) => e.key !== linha.key))
                              }
                            >
                              Remover
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => setExtras((prev) => [...prev, emptyExtra()])}
                  >
                    + Item
                  </button>
                  {extras
                    .filter((e) => e.produto && parseQtdeDigitada(e.qtde) > 0)
                    .map((e) => (
                      <Link
                        key={e.key}
                        className="btn btn-primary btn-sm"
                        to={hrefFichaEstoque(op.id, {
                          produtoId: e.produto!.id,
                          qtde: e.qtde,
                        })}
                      >
                        Pedir {e.produto!.codigo} no estoque
                      </Link>
                    ))}
                </div>
              </div>
            </details>
          ) : null}

          {aberta && hasPermission('producao.escrever') && op.pode_devolver_ao_pedido ? (
            <details className="card" style={{ marginBottom: '1rem' }}>
              <summary className="op-mais-summary">Devolver ao pedido</summary>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <p className="muted" style={{ margin: '0 0 0.75rem' }}>
                  Ainda não saiu material. Encerrar devolve o item ao pedido — o código desta
                  ordem permanece e outra pode ser aberta.
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
                        placeholder="Ex.: aberta por engano"
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
                        Confirmar
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
            </details>
          ) : null}

          {op.rastreio && (op.rastreio.resumo?.insumos_com_saida ?? 0) > 0 ? (
            <details className="card" style={{ marginBottom: '1rem' }}>
              <summary className="op-mais-summary">Origem do material</summary>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <RastreioInsumosPanel
                  rastreio={op.rastreio}
                  printHref={`/ordens-producao/${op.id}/rastreio`}
                />
              </div>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}
