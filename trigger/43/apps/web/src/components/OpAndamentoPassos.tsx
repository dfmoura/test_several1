import { Link } from 'react-router-dom';
import type { OrdemProducao } from '../lib/api';
import { hrefApontamentoProducao, hrefFichaEstoque, opPassoAtual } from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  podeEstoque: boolean;
  podeProducao: boolean;
};

const PASSOS = [
  { id: 'pegar', label: '1 · Pegar o material', hint: 'Lista no estoque — sistema e físico' },
  { id: 'entregar', label: '2 · Entregar na produção', hint: 'Quem recebeu na máquina' },
  { id: 'produzir', label: '3 · Produzir', hint: 'Rodar a etiqueta' },
  { id: 'devolver', label: '4 · Devolver a sobra', hint: 'O que não usou volta ao estoque' },
  { id: 'fechar', label: '5 · Fechar a ordem', hint: 'Quantas etiquetas saíram boas' },
] as const;

/**
 * Jornada humana da OP. Um único CTA — a próxima ação.
 */
export function OpAndamentoPassos({ op, podeEstoque, podeProducao }: Props) {
  const atual = opPassoAtual(op);
  const idx = PASSOS.findIndex((p) => p.id === atual);
  const temFaltante = Boolean(op.disponibilidade?.aguardando_material);
  const pendentes = (op.materiais ?? []).filter((m) => m.pendente);
  const soSemEstoque =
    temFaltante && pendentes.length > 0 && pendentes.every((m) => m.aguardando_material);
  const encerrada = op.status === 'CONCLUIDA' || op.status === 'CANCELADA';

  return (
    <div className="card op-passos-card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Onde estamos</h3>
          <p className="muted" style={{ margin: 0 }}>
            {soSemEstoque
              ? 'Falta material no estoque — compre antes de buscar.'
              : 'Uma ação de cada vez. O sistema e o físico usam a mesma lista.'}
          </p>
        </div>
        <ol className="op-passos op-passos--5">
          {PASSOS.map((p, i) => {
            const done = encerrada || i < idx;
            const active = i === idx && !encerrada;
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
        <div className="op-passos-cta">
          {op.status === 'CANCELADA' && op.pedido ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                Ordem devolvida ao pedido — abra uma nova se ainda for produzir.
              </p>
              <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-primary">
                Voltar ao pedido {op.pedido.codigo}
              </Link>
            </>
          ) : op.status === 'CONCLUIDA' && op.pedido ? (
            <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-primary">
              Continuar no pedido {op.pedido.codigo}
            </Link>
          ) : atual === 'pegar' && soSemEstoque ? (
            <Link to="/compras/reposicao" className="btn btn-primary">
              Falta material — ir a Compras
            </Link>
          ) : atual === 'pegar' && podeEstoque ? (
            <Link to={hrefFichaEstoque(op.id)} className="btn btn-primary">
              Ir buscar no estoque
            </Link>
          ) : atual === 'entregar' && podeProducao ? (
            <Link to={hrefApontamentoProducao(op.id)} className="btn btn-primary">
              Entregar na máquina
            </Link>
          ) : (atual === 'produzir' || atual === 'devolver') && podeProducao ? (
            <Link to={hrefApontamentoProducao(op.id)} className="btn btn-primary">
              Abrir produção
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
