import { Link } from 'react-router-dom';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { modeloArteCaptionFromMedida } from './ModeloArteOverlay';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { StatusPill } from './StatusPill';
import type { Pedido, PedidoItem } from '../lib/api';
import { formatCurrency, formatDecimalBr, formatUnitPrice } from '../lib/format';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import {
  faixaIndexDoItem,
  matrizQuantidadesDoItem,
  modelosDoSnap,
  qtdeFaixaDoItem,
  specOperacional,
} from '../lib/producaoFicha';
import { necessidadeContratoLabel, pedItemStatusLabel } from '../lib/producaoUi';
import { saidaEtiquetaLabel } from '../lib/saidaEtiqueta';

type Props = {
  pedido: Pedido;
  busy?: boolean;
  canWriteProducao?: boolean;
  onSepararRevenda?: (itemId: number) => void;
  onAbrirOrdem?: (itemId: number, necessidade: string) => void;
};

function tituloDoItem(item: PedidoItem, spec: Record<string, unknown>): string {
  const desc = descricaoFromPedidoSpec(spec);
  if (item.necessidade === 'REVENDA') {
    const sku = (desc.produto_codigo ?? '').trim();
    const nome = (desc.produto_descricao ?? item.descricao ?? '').trim();
    if (sku && nome && !nome.includes(sku)) return `${sku} · ${nome}`;
    return nome || sku || item.descricao || 'Revenda';
  }
  if (item.necessidade === 'SERVICO') {
    return (desc.descricao_servico || item.descricao || 'Serviço').trim();
  }
  const parts = [desc.medida, desc.papel, desc.acabamento].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  );
  return parts.length > 0 ? parts.join(' · ') : item.descricao || 'Etiqueta';
}

function specResumoEtiqueta(spec: Record<string, unknown>): string[] {
  const desc = descricaoFromPedidoSpec(spec);
  const bits: string[] = [];
  if (desc.tubete) bits.push(`Tubete ${desc.tubete}`);
  if (desc.cores) bits.push(`${desc.cores} cor(es)`);
  if (desc.etiq_por_rolo != null) {
    bits.push(`${Number(desc.etiq_por_rolo).toLocaleString('pt-BR')} etiq/rolo`);
  }
  return bits;
}

export function PedidoItensContrato({
  pedido,
  busy = false,
  canWriteProducao = false,
  onSepararRevenda,
  onAbrirOrdem,
}: Props) {
  const podeAgir = canWriteProducao && ['LIBERADO', 'EM_PRODUCAO'].includes(pedido.status);
  const totalPedido = (pedido.itens ?? []).reduce(
    (acc, it) => acc + (Number(it.valor_total) || 0),
    0,
  );

  return (
    <div className="card ped-detail-itens">
      <div className="card-body">
        <div className="form-section">
          <h3>Itens do pedido</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Continuação do orçamento aprovado — cada posição com a faixa contratada e os
            modelos respectivos. Revenda confirma a separação aqui, sem ordem.
          </p>
        </div>

        {pedido.itens.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nenhum item neste pedido.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table ped-itens-tabela">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th className="num">Faixa</th>
                  <th className="num">Quantidade</th>
                  <th className="num">Unitário</th>
                  <th className="num">Total</th>
                  <th>Situação</th>
                  <th className="acoes" />
                </tr>
              </thead>
              {pedido.itens.map((item) => (
                <PedidoItemGrupo
                  key={item.id}
                  pedido={pedido}
                  item={item}
                  busy={busy}
                  podeAgir={podeAgir}
                  onSepararRevenda={onSepararRevenda}
                  onAbrirOrdem={onAbrirOrdem}
                />
              ))}
              <tfoot>
                <tr>
                  <td colSpan={6} className="num">
                    Total do pedido
                  </td>
                  <td className="num">
                    <strong>{formatCurrency(totalPedido)}</strong>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PedidoItemGrupo({
  pedido,
  item,
  busy,
  podeAgir,
  onSepararRevenda,
  onAbrirOrdem,
}: {
  pedido: Pedido;
  item: PedidoItem;
  busy: boolean;
  podeAgir: boolean;
  onSepararRevenda?: (itemId: number) => void;
  onAbrirOrdem?: (itemId: number, necessidade: string) => void;
}) {
  const spec = specOperacional(pedido, item);
  const isEtiqueta = item.necessidade === 'PRODUCAO';
  const isRevenda = item.necessidade === 'REVENDA';
  const modelos = isEtiqueta ? modelosDoSnap(spec) : [];
  const faixaIdx = faixaIndexDoItem(pedido, item);
  const qtdeFaixa = qtdeFaixaDoItem(pedido, item);
  const matriz = matrizQuantidadesDoItem(item);
  const titulo = tituloDoItem(item, spec);
  const resumo = isEtiqueta ? specResumoEtiqueta(spec) : [];
  const desc = descricaoFromPedidoSpec(spec);
  const saida = isEtiqueta ? String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? '') : '';
  const opAtiva = pedido.ordens_producao?.find(
    (o) =>
      o.status !== 'CANCELADA' &&
      (o.pedido_item_id == null || o.pedido_item_id === item.id),
  );
  const osAtiva = pedido.ordens_servico?.find(
    (o) =>
      o.status !== 'CANCELADA' &&
      (o.pedido_item_id == null || o.pedido_item_id === item.id),
  );

  return (
    <tbody className="ped-itens-grupo">
      <tr className="ped-itens-mae">
        <td className="num ped-itens-pos">{String(item.ordem).padStart(2, '0')}</td>
        <td>
          <div className="ped-itens-lead">
            <strong>{titulo}</strong>
            {resumo.length > 0 ? (
              <span className="ped-itens-resumo">{resumo.join(' · ')}</span>
            ) : null}
            {saida && saidaEtiquetaLabel(saida) ? (
              <span className="ped-itens-saida">
                <SaidaEtiquetaBadge code={saida} variant="dense" />
              </span>
            ) : null}
          </div>
        </td>
        <td>{necessidadeContratoLabel(item.necessidade)}</td>
        <td className="num">
          {isEtiqueta ? `#${faixaIdx + 1}` : '—'}
        </td>
        <td className="num">
          {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
        </td>
        <td className="num">
          {item.preco_unitario != null ? formatUnitPrice(item.preco_unitario) : '—'}
        </td>
        <td className="num">
          {item.valor_total != null ? formatCurrency(item.valor_total) : '—'}
        </td>
        <td>
          <StatusPill status={pedItemStatusLabel(item.status)} />
        </td>
        <td>
          <div className="table-actions table-actions--wrap">
            {isRevenda && podeAgir && item.status === 'PENDENTE' && onSepararRevenda ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => onSepararRevenda(item.id)}
              >
                Confirmar separação
              </button>
            ) : null}
            {item.necessidade === 'PRODUCAO' && opAtiva ? (
              <Link to={`/ordens-producao/${opAtiva.id}`} className="btn btn-secondary">
                {opAtiva.codigo}
              </Link>
            ) : null}
            {item.necessidade === 'SERVICO' && osAtiva ? (
              <Link to={`/ordens-servico/${osAtiva.id}`} className="btn btn-secondary">
                {osAtiva.codigo}
              </Link>
            ) : null}
            {podeAgir &&
            item.status === 'PENDENTE' &&
            !isRevenda &&
            onAbrirOrdem ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => onAbrirOrdem(item.id, item.necessidade)}
              >
                {item.necessidade === 'SERVICO' ? 'Abrir OS' : 'Abrir OP'}
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {modelos.length > 0 ? (
        <tr className="ped-itens-modelos">
          <td colSpan={9}>
            <ModelosComposicaoTable
              variant="data"
              className="ped-itens-modelos-table"
              title="Modelos desta posição"
              hint="Quantidade da faixa aprovada em cada arte."
              showValorArte={false}
              arteCaption={modeloArteCaptionFromMedida(desc.medida)}
              arteSaida={saida || null}
              modelos={modelos}
              faixas={[
                {
                  key: faixaIdx,
                  quantidade: qtdeFaixa,
                  highlighted: true,
                },
              ]}
              quantidadesPorFaixa={matriz}
            />
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
