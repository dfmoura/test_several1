import { Link } from 'react-router-dom';
import { formatoLabel } from './FacaShapeIcon';
import type { OrdemProducao, Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { formatNecessidadeOp } from '../lib/producaoPick';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import { specOperacional } from '../lib/producaoFicha';
import {
  hrefApontamentoProducao,
  hrefFichaEstoque,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opKitOnde,
  opPassoAtual,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  pedido: Pedido | null;
  podeEstoque: boolean;
  podeProducao: boolean;
};

/**
 * A tela da OP é o carrinho: o sistema já montou o que pegar.
 * Sem passos, sem dossiê — lista pronta + um botão.
 */
export function OpCarrinho({ op, pedido, podeEstoque, podeProducao }: Props) {
  const item =
    pedido?.itens.find((i) => i.id === op.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const desc = descricaoFromPedidoSpec(spec);
  const titulo =
    (op.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Etiqueta sob medida';
  const qtde = formatDecimalBr(Number(op.qtde_planejada), 0);
  const faca = desc.formato_faca
    ? `${formatoLabel(desc.formato_faca)}${desc.faca_nova ? ' · nova' : ''}`
    : null;
  const specLinha = [desc.medida, desc.papel, faca, desc.cores, desc.acabamento]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(' · ');

  const linhas = op.materiais ?? [];
  const naoCasados = op.disponibilidade?.componentes_nao_casados ?? [];
  const atual = opPassoAtual(op);
  const pendentes = linhas.filter((m) => m.pendente);
  const soSemEstoque =
    Boolean(op.disponibilidade?.aguardando_material) &&
    pendentes.length > 0 &&
    pendentes.every((m) => m.aguardando_material);
  const falta = pendentes.length;
  const jaSaiu = linhas.filter((m) => !m.pendente).length;

  const cta = (() => {
    if (op.status === 'CANCELADA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Voltar ao pedido ${op.pedido.codigo}` };
    }
    if (op.status === 'CONCLUIDA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Continuar no pedido ${op.pedido.codigo}` };
    }
    if (atual === 'pegar' && soSemEstoque) {
      return { to: '/compras/reposicao', label: 'Falta no estoque — ir a Compras' };
    }
    if (atual === 'pegar' && podeEstoque) {
      return { to: hrefFichaEstoque(op.id), label: 'Ir buscar isto no estoque' };
    }
    if (atual === 'entregar' && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Entregar na máquina' };
    }
    if ((atual === 'produzir' || atual === 'devolver') && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir produção' };
    }
    return null;
  })();

  return (
    <article className="card op-carrinho">
      <div className="card-body">
        <header className="op-carrinho__fazer">
          <p className="op-carrinho__kicker">Para produzir</p>
          <h2 className="op-carrinho__titulo">{titulo}</h2>
          <p className="op-carrinho__meta">
            <strong>{qtde} etiquetas</strong>
            {op.parceiro ? ` · ${op.parceiro.razao_social}` : null}
            {specLinha ? ` · ${specLinha}` : null}
          </p>
        </header>

        <div className="op-carrinho__head">
          <div>
            <h3>O sistema já montou o que pegar</h3>
            <p className="muted" style={{ margin: 0 }}>
              {linhas.length === 0
                ? 'Ainda sem lista nesta ordem.'
                : falta === 0
                  ? `Tudo já saiu do estoque (${jaSaiu} ${jaSaiu === 1 ? 'item' : 'itens'}).`
                  : `${falta} ${falta === 1 ? 'item' : 'itens'} para buscar${jaSaiu > 0 ? ` · ${jaSaiu} já saiu` : ''}.`}
            </p>
          </div>
          {cta ? (
            <Link to={cta.to} className="btn btn-primary op-carrinho__cta">
              {cta.label}
            </Link>
          ) : null}
        </div>

        {soSemEstoque ? (
          <div className="alert alert-warning" role="status">
            Este código não tem saldo. Abra o material e escolha no estoque — os parecidos vêm primeiro.
          </div>
        ) : null}

        {naoCasados.length > 0 ? (
          <div className="alert alert-warning" role="status">
            Sem cadastro para: {naoCasados.map((c) => c.origem_texto || c.componente).join(', ')}.
          </div>
        ) : null}

        {linhas.length > 0 ? (
          <ol className="op-carrinho__lista">
            {linhas.map((m, i) => {
              const estado = opKitEstado(m);
              const onde = opKitOnde(m);
              return (
                <li key={m.id} className={`op-carrinho__item op-carrinho__item--${estado}`}>
                  <span className="op-carrinho__n" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="op-carrinho__nome">
                    <strong>{opKitNome(m)}</strong>
                    {onde !== '—' ? <span className="op-carrinho__onde">{onde}</span> : null}
                  </div>
                  <div className="op-carrinho__qtde">A ordem pede: {formatNecessidadeOp(m, op)}</div>
                  <span className={`op-carrinho__st op-carrinho__st--${estado}`}>
                    {opKitEstadoLabel(estado)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {op.handoff?.entregue ? (
          <p className="muted" style={{ margin: '0.85rem 0 0' }}>
            Entregue na máquina
            {op.handoff.recebidos_nome ? ` · ${op.handoff.recebidos_nome}` : ''}.
          </p>
        ) : null}
      </div>
    </article>
  );
}
