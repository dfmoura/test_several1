import { Link } from 'react-router-dom';
import { StatusPill } from './StatusPill';
import { formatoLabel } from './FacaShapeIcon';
import type { OrdemProducao, Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { specOperacional } from '../lib/producaoFicha';
import { opStatusLabel } from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  pedido: Pedido | null;
};

/**
 * Herói da ficha: o que produzir — não códigos de estoque.
 */
export function OpHeroEtiqueta({ op, pedido }: Props) {
  const item =
    pedido?.itens.find((i) => i.id === op.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const desc = descricaoFromPedidoSpec(spec);
  const titulo =
    (op.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Etiqueta sob medida';
  const qtde = formatDecimalBr(Number(op.qtde_planejada), 0);
  const prazo = pedido ? prazoEntregaCompleto(pedido) : null;
  const opsDoPedido = (pedido?.ordens_producao ?? []).filter((o) => o.status !== 'CANCELADA');
  const outrasOps = opsDoPedido.filter((o) => o.id !== op.id);
  const faca = desc.formato_faca
    ? `${formatoLabel(desc.formato_faca)}${desc.faca_nova ? ' · nova' : ''}`
    : null;

  const chips = [
    desc.medida ? { k: 'Medida', v: desc.medida } : null,
    desc.papel ? { k: 'Papel', v: desc.papel } : null,
    faca ? { k: 'Faca', v: faca } : null,
    desc.cores ? { k: 'Cores', v: desc.cores } : null,
    desc.acabamento ? { k: 'Acabamento', v: desc.acabamento } : null,
    desc.tubete ? { k: 'Tubete', v: desc.tubete } : null,
  ].filter((c): c is { k: string; v: string } => c != null);

  return (
    <div className="card op-hero" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="op-hero__topo">
          <div>
            <p className="op-hero__kicker">O que produzir</p>
            <h2 className="op-hero__titulo">{titulo}</h2>
            {op.parceiro ? (
              <p className="op-hero__cliente">{op.parceiro.razao_social}</p>
            ) : null}
          </div>
          <div className="op-hero__qtde">
            <strong>{qtde}</strong>
            <span>etiquetas</span>
            <StatusPill status={opStatusLabel(op.status)} />
          </div>
        </div>

        {chips.length > 0 ? (
          <dl className="op-hero__spec">
            {chips.map((c) => (
              <div key={c.k}>
                <dt>{c.k}</dt>
                <dd>{c.v}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="op-hero__refs muted">
          {op.codigo}
          {op.pedido ? (
            <>
              {' · '}
              <Link to={`/pedidos/${op.pedido.id}`}>{op.pedido.codigo}</Link>
            </>
          ) : null}
          {prazo && prazo !== '—' ? ` · ${prazo}` : null}
          {op.status === 'CONCLUIDA' && op.qtde_boa != null
            ? ` · boas ${formatDecimalBr(Number(op.qtde_boa), 0)}`
            : null}
        </p>

        {outrasOps.length > 0 ? (
          <p className="muted" style={{ margin: '0.65rem 0 0' }}>
            {opsDoPedido.length} ordens neste pedido
            {outrasOps.map((o) => (
              <span key={o.id}>
                {' · '}
                <Link to={`/ordens-producao/${o.id}`}>{o.codigo}</Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
