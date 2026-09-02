import { Link } from 'react-router-dom';
import { StatusPill } from './StatusPill';
import type { Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import {
  necessidadeLabel,
  opMaterialResumoLabel,
  opStatusLabel,
  pedStatusLabel,
} from '../lib/producaoUi';
import { statusOrcPill } from '../lib/orcamentoForm';

type Props = {
  pedido: Pedido;
};

/**
 * Timeline operacional enxuta (estudo 32 / MAPA_FLUXO_POS_ORC).
 * Só códigos e status — sem dashboard, aging ou módulos esqueleto.
 */
export function PedidoAndamentoOperacional({ pedido }: Props) {
  const orc = pedido.orcamento;
  const item = pedido.itens[0] ?? null;
  const opAtiva =
    pedido.ordens_producao?.find((o) => o.status !== 'CANCELADA') ??
    pedido.ordens_producao?.[0] ??
    null;
  const osAtiva =
    pedido.ordens_servico?.find((o) => o.status !== 'CANCELADA') ??
    pedido.ordens_servico?.[0] ??
    null;
  const ordem = opAtiva ?? osAtiva;
  const isOs = !opAtiva && !!osAtiva;
  const fat = pedido.faturamento;
  const ent = pedido.entrega;

  let ordemHint = 'Aguardando abertura';
  if (item?.necessidade === 'REVENDA') {
    ordemHint = 'Revenda — sem OP/OS';
  } else if (ordem) {
    ordemHint = '';
  } else if (item) {
    ordemHint = `Aguardando abertura (${necessidadeLabel(item.necessidade)})`;
  }

  const mat = opAtiva?.materiais_resumo;
  let matLabel = '—';
  if (isOs) {
    matLabel = 'OS — sem separação de insumos';
  } else if (item?.necessidade === 'REVENDA') {
    matLabel = 'Revenda — separação sem OP';
  } else if (!opAtiva) {
    matLabel = 'Aguardando OP';
  } else if (mat && mat.total > 0) {
    matLabel = opMaterialResumoLabel(mat);
  } else if (opAtiva) {
    matLabel = 'Sem linhas de material';
  }

  let producaoLabel = '—';
  if (ordem) {
    producaoLabel = opStatusLabel(ordem.status);
    if (opAtiva?.qtde_boa != null && opAtiva.status === 'CONCLUIDA') {
      producaoLabel += ` · boa ${formatDecimalBr(Number(opAtiva.qtde_boa), 0)}`;
    } else if (osAtiva?.qtde_executada != null && osAtiva.status === 'CONCLUIDA') {
      producaoLabel += ` · ${formatDecimalBr(Number(osAtiva.qtde_executada), 0)}`;
    }
  } else if (item?.necessidade === 'REVENDA') {
    producaoLabel = pedStatusLabel(item.status);
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Andamento operacional</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Cadeia com códigos dos documentos — da proposta liberada até a entrega.
          </p>
        </div>
        <ol className="ped-andamento">
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Orçamento</span>
            <div className="ped-andamento-body">
              {orc ? (
                <Link to={`/orcamentos/${orc.id}`}>{orc.codigo}</Link>
              ) : (
                <span>—</span>
              )}
              {orc ? (
                <StatusPill status={statusOrcPill(orc.status ?? 'APROVADO', orc.financeiro_status)} />
              ) : null}
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Pedido</span>
            <div className="ped-andamento-body">
              <strong>{pedido.codigo}</strong>
              <StatusPill status={pedStatusLabel(pedido.status)} />
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">{isOs ? 'OS' : 'OP'}</span>
            <div className="ped-andamento-body">
              {ordem ? (
                <Link
                  to={
                    isOs ? `/ordens-servico/${ordem.id}` : `/ordens-producao/${ordem.id}`
                  }
                >
                  {ordem.codigo}
                </Link>
              ) : (
                <span className="muted">{ordemHint}</span>
              )}
              {ordem ? <StatusPill status={opStatusLabel(ordem.status)} /> : null}
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Materiais</span>
            <div className="ped-andamento-body">
              <span>{matLabel}</span>
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Produção</span>
            <div className="ped-andamento-body">
              <span>{producaoLabel}</span>
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Faturamento</span>
            <div className="ped-andamento-body">
              {fat ? (
                <>
                  <Link to={`/financeiro/faturamentos/${fat.id}`}>{fat.codigo}</Link>
                  <StatusPill status={fat.status} />
                </>
              ) : (
                <span className="muted">
                  {pedido.status === 'PRODUZIDO' ? 'Pronto para faturar' : 'Aguardando produção'}
                </span>
              )}
            </div>
          </li>
          <li className="ped-andamento-step">
            <span className="ped-andamento-label">Expedição</span>
            <div className="ped-andamento-body">
              {ent ? (
                <>
                  <Link to={`/expedicao/${ent.id}`}>{ent.codigo}</Link>
                  <StatusPill status={ent.status.replace(/_/g, ' ')} />
                </>
              ) : (
                <span className="muted">
                  {['FATURADO', 'EM_ENTREGA', 'ENTREGUE', 'ENCERRADO'].includes(pedido.status)
                    ? 'Aguardando expedição'
                    : 'Após o faturamento'}
                </span>
              )}
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
