import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OpInsumosReservados } from '../components/OpInsumosReservados';
import { PaEmbalagemPanel } from '../components/PaEmbalagemPanel';
import { PedidoItemFichaCabecalho } from '../components/PedidoFichaSheet';
import { StatusPill } from '../components/StatusPill';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import { api, type OrdemProducao, type Pedido } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDecimalBr } from '../lib/format';
import {
  leituraNecessidadeOp,
  leituraQtdeMaterial,
  type LeituraQtdeMaterial,
} from '../lib/producaoPick';
import { opStatusLabel, parseQtdeDigitada } from '../lib/producaoUi';

function QtdeMaterialLeitura({ leitura }: { leitura: LeituraQtdeMaterial }) {
  return (
    <>
      {leitura.principal}
      {leitura.complemento ? <span className="op-qtde-extra">{leitura.complemento}</span> : null}
    </>
  );
}

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
  const itemPedido =
    pedido?.itens.find((i) => i.id === op?.pedido_item?.id) ?? null;

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
          <div className="op-item-detalhe">
            <header
              className={`op-item-titulo${pedido && itemPedido ? ' op-item-titulo--liga' : ''}`}
            >
              <div className="op-item-titulo__texto">
                <p className="op-item-titulo__kicker">
                  {itemPedido?.necessidade === 'REVENDA'
                    ? 'Revenda'
                    : itemPedido?.necessidade === 'SERVICO'
                      ? 'Serviço'
                      : 'Etiqueta'}
                </p>
                <h2>
                  {(op.pedido_item?.descricao ?? itemPedido?.descricao ?? '').trim() ||
                    'Etiqueta sob medida'}
                </h2>
              </div>
              <StatusPill status={opStatusLabel(op.status)} />
            </header>
            {pedido && itemPedido ? (
              <PedidoItemFichaCabecalho pedido={pedido} item={itemPedido} />
            ) : null}
          </div>

          <OpInsumosReservados
            op={op}
            podeEstoque={hasPermission('estoque.ler')}
            podeProducao={podeProducao}
            canWrite={hasPermission('estoque.escrever')}
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
                          <th>A ordem pede</th>
                          <th>Saiu da prateleira</th>
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
                              <td>
                                <QtdeMaterialLeitura leitura={leituraNecessidadeOp(m, op)} />
                              </td>
                              <td>
                                <QtdeMaterialLeitura
                                  leitura={leituraQtdeMaterial(m, op, parseQtdeDigitada(m.qtde_requisitada))}
                                />
                              </td>
                              <td>
                                <QtdeMaterialLeitura
                                  leitura={leituraQtdeMaterial(m, op, parseQtdeDigitada(m.qtde_retorno))}
                                />
                              </td>
                              <td>
                                <QtdeMaterialLeitura
                                  leitura={leituraQtdeMaterial(m, op, parseQtdeDigitada(m.qtde_perda))}
                                />
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
