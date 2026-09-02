import { Link } from 'react-router-dom';
import type { OrdemProducao } from '../lib/api';
import { opPassoAtual } from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
};

/**
 * Passos da OP no chão (MAPA_FLUXO_POS_ORC / ADR produção).
 * Separar → produzir → concluir (retorno/perda/PA) → pedido.
 */
export function OpAndamentoPassos({ op }: Props) {
  const atual = opPassoAtual(op);
  const passos = [
    {
      id: 'separar',
      label: '1 · Separar',
      hint: 'Requisitar saída dos insumos (baixa no estoque)',
    },
    {
      id: 'produzir',
      label: '2 · Produzir',
      hint: 'Ordem em andamento na máquina',
    },
    {
      id: 'concluir',
      label: '3 · Concluir',
      hint: 'Retorno ao estoque, perda e quantidade boa (PA)',
    },
    {
      id: 'pedido',
      label: '4 · Pedido',
      hint: 'Item/PED atualizados para faturar',
    },
  ] as const;

  const idx = passos.findIndex((p) => p.id === atual);

  return (
    <div className="card op-passos-card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Passos da ordem</h3>
          <p className="muted" style={{ margin: 0 }}>
            Empenho leve não baixa saldo — só a requisição. Na conclusão, sobra volta e perda fica
            apontada; o pedido recebe a quantidade boa (±tolerância).
          </p>
        </div>
        <ol className="op-passos">
          {passos.map((p, i) => {
            const done = i < idx || op.status === 'CONCLUIDA';
            const active = i === idx && op.status !== 'CANCELADA';
            return (
              <li
                key={p.id}
                className={
                  'op-passo' +
                  (done ? ' op-passo--done' : '') +
                  (active ? ' op-passo--active' : '')
                }
              >
                <strong>{p.label}</strong>
                <span className="muted">{p.hint}</span>
              </li>
            );
          })}
        </ol>
        {op.status === 'CONCLUIDA' && op.pedido ? (
          <div className="op-passos-cta">
            <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-primary">
              Ver pedido {op.pedido.codigo}
            </Link>
            <Link to="/estoque" className="btn btn-secondary">
              Ver estoque
            </Link>
          </div>
        ) : null}
        {op.status === 'CANCELADA' && op.pedido ? (
          <div className="op-passos-cta">
            <p className="muted" style={{ margin: 0 }}>
              Ordem devolvida ao pedido — abra uma nova OP a partir do item.
            </p>
            <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-primary">
              Voltar ao pedido {op.pedido.codigo}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
