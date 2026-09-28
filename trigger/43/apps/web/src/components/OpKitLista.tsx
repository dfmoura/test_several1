import { Link } from 'react-router-dom';
import { StatusPill } from './StatusPill';
import type { OrdemProducao, OrdemProducaoMaterial } from '../lib/api';
import { formatPickPrincipal } from '../lib/producaoPick';
import {
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitOnde,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  podeAbrirEstoque: boolean;
};

function nomeKit(m: OrdemProducaoMaterial): string {
  const papel = (m.origem_texto ?? '').trim();
  const humano = opComponenteLabel(m.componente);
  if (papel && humano === 'Papel') return papel;
  if (papel && humano !== 'Material') return `${humano} · ${papel}`;
  return m.produto?.descricao_fiscal || humano;
}

/**
 * Kit da OP — lista do que pegar. Três estados. Sem tabela de ERP.
 */
export function OpKitLista({ op, podeAbrirEstoque }: Props) {
  const linhas = op.materiais ?? [];
  const naoCasados = op.disponibilidade?.componentes_nao_casados ?? [];
  const temFaltante = Boolean(op.disponibilidade?.aguardando_material);
  const ciclos = op.ficha_retirada?.ciclos?.length ?? 0;

  return (
    <div className="card op-kit" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Kit desta ordem</h3>
          <p className="muted" style={{ margin: 0 }}>
            O que precisa para produzir. No estoque você marca o que saiu; depois entrega na
            máquina.
          </p>
        </div>

        {temFaltante ? (
          <div className="alert alert-warning" role="status">
            <strong>Falta material no estoque</strong> — abasteça pela compra antes de buscar o
            restante.
          </div>
        ) : null}

        {naoCasados.length > 0 ? (
          <div className="alert alert-warning" role="status">
            <strong>Item sem cadastro</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {naoCasados.map((c) => (
                <li key={`${c.componente}-${c.origem_texto}`}>
                  {opComponenteLabel(c.componente)}
                  {c.origem_texto ? ` · ${c.origem_texto}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {linhas.length === 0 && naoCasados.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Ainda não há lista de material nesta ordem.
          </p>
        ) : (
          <ul className="op-kit__lista">
            {linhas.map((m) => {
              const estado = opKitEstado(m);
              const onde = opKitOnde(m);
              return (
                <li key={m.id} className={`op-kit__item op-kit__item--${estado}`}>
                  <div className="op-kit__nome">
                    <strong>{nomeKit(m)}</strong>
                    {m.produto?.codigo ? (
                      <span className="muted">{m.produto.codigo}</span>
                    ) : null}
                  </div>
                  <div className="op-kit__qtde">{formatPickPrincipal(m, op)}</div>
                  <div className="op-kit__onde muted">{onde === '—' ? 'Sem local' : onde}</div>
                  <div className="op-kit__estado">
                    <StatusPill status={opKitEstadoLabel(estado)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {ciclos > 0 ? (
          <p className="muted" style={{ margin: '0.85rem 0 0' }}>
            {ciclos === 1 ? '1 retirada já registrada' : `${ciclos} retiradas já registradas`}
            {podeAbrirEstoque ? (
              <>
                {' · '}
                <Link to={hrefFichaEstoque(op.id)}>Ver o que saiu</Link>
              </>
            ) : null}
          </p>
        ) : null}

        {op.handoff?.entregue ? (
          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
            Entregue na máquina
            {op.handoff.recebidos_nome ? ` · ${op.handoff.recebidos_nome}` : ''}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
