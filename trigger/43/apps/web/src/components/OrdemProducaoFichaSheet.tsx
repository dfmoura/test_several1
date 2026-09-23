import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { PedidoItemFichaBloco } from './PedidoFichaSheet';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { RastreioFichaSection } from './RastreioInsumosFichaSheet';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { opMaterialStatusLabel, opStatusLabel } from '../lib/producaoUi';
import { dash, formatDateTimeBr, opChipClass } from '../lib/producaoFicha';

/**
 * Ficha da OP — mesma família visual do PED.
 * Sem preço. Spec do item do pedido. Materiais e conclusão só da OP.
 */
export type OrdemProducaoFichaSheetProps = {
  ordem: OrdemProducao;
  pedido: Pedido | null;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function qty(value: string | number | null | undefined, unidade?: string | null, digits = 4): string {
  const body = formatDecimalBr(value, digits);
  if (body === '—') return '—';
  return unidade ? `${body} ${unidade}` : body;
}

export function OrdemProducaoFichaSheet({
  ordem: o,
  pedido,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemProducaoFichaSheetProps) {
  const item =
    pedido?.itens.find((i) => i.id === o.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const materiais = o.materiais ?? [];
  const tol = o.pedido?.tolerancia_qtd_pct ?? pedido?.tolerancia_qtd_pct ?? '20';
  const pedCodigo = o.pedido?.codigo ?? pedido?.codigo ?? '—';
  const parceiro = pedido?.parceiro ?? o.parceiro ?? null;
  const cliente = identidadeParteComercial(parceiro, parceiro?.razao_social ?? '—');
  const clienteCodigo = (parceiro?.codigo ?? '').trim();
  const clienteLead = clienteCodigo
    ? `${clienteCodigo} — ${cliente.display}`
    : cliente.display;
  const clienteMeta = [
    ...metaLinhasParteComercial(parceiro, { showCodigo: false, showDocumento: false }),
    formatEnderecoParceiro(pedido?.parceiro) ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const qtdePlanejada = formatDecimalBr(Number(o.qtde_planejada), 0);
  const ops = pedido?.ordens_producao ?? [];
  const oss = pedido?.ordens_servico ?? [];

  return (
    <article className="ficha-sheet ped-ficha" aria-label={`Ficha da ordem ${o.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha da ordem · operacional</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">Ordem de produção</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          <span className="ficha-chip ficha-chip-muted">{qtdePlanejada} un.</span>
          {pedido?.prazo_entrega_dias != null ? (
            <span className="ficha-chip ficha-chip-muted">{prazoEntregaCompleto(pedido)}</span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">±{tol}%</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Aberta" value={formatDateTime(o.created_at)} />
        {o.iniciada_em ? <FichaKv label="Iniciada" value={formatDateTime(o.iniciada_em)} /> : null}
        {o.concluida_em ? (
          <FichaKv label="Concluída" value={formatDateTime(o.concluida_em)} />
        ) : null}
      </div>

      <FichaSection title="Item">
        {pedido && item ? (
          <div className="ped-ficha-itens">
            <PedidoItemFichaBloco
              pedido={pedido}
              item={item}
              ops={ops}
              oss={oss}
              multi={false}
              eixo="producao"
              qtdePlanejada={o.qtde_planejada}
            />
          </div>
        ) : (
          <p className="ficha-empty">
            {o.pedido_item?.descricao ?? 'Item do pedido indisponível nesta ficha.'}
          </p>
        )}
      </FichaSection>

      <FichaSection title="Materiais">
        {materiais.length === 0 ? (
          <p className="ficha-empty">
            Nenhum material casado ao snapshot. A requisição pode ter sido incluída na tela da OP.
          </p>
        ) : (
          <table className="ficha-table">
            <thead>
              <tr>
                <th>Componente</th>
                <th>SKU</th>
                <th>Planejado</th>
                <th>Requisitado</th>
                <th>Avaria</th>
                <th>Retorno</th>
                <th>Perda processo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.componente ?? '—'}
                    {m.origem_texto ? ` · ${m.origem_texto}` : ''}
                  </td>
                  <td>
                    {m.produto ? `${m.produto.codigo} — ${m.produto.descricao_fiscal}` : '—'}
                  </td>
                  <td>{qty(m.qtde_planejada, m.unidade)}</td>
                  <td>{m.pendente ? '—' : qty(m.qtde_requisitada, m.unidade)}</td>
                  <td>{m.pendente ? '—' : qty(m.qtde_avaria, m.unidade)}</td>
                  <td>{qty(m.qtde_retorno, m.unidade)}</td>
                  <td>{qty(m.qtde_perda, m.unidade)}</td>
                  <td>{opMaterialStatusLabel(m.pendente ? 'PENDENTE' : 'REQUISITADO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FichaSection>

      {o.rastreio ? <RastreioFichaSection rastreio={o.rastreio} /> : null}

      {o.status === 'CONCLUIDA' ? (
        <FichaSection title="Conclusão">
          <div className="ficha-kv-grid cols-3">
            <FichaKv
              label="Qtde boa (PA)"
              value={o.qtde_boa != null ? formatDecimalBr(Number(o.qtde_boa), 0) : '—'}
            />
            <FichaKv label="Refugo" value={formatDecimalBr(Number(o.qtde_refugo), 0)} />
            <FichaKv label="MOV PA" value={o.pa_movimento?.codigo ?? '—'} />
            <FichaKv label="Fora da tolerância" value={o.fora_tolerancia ? 'Sim' : 'Não'} />
            {o.motivo_fora_tolerancia ? (
              <FichaKv label="Motivo" value={o.motivo_fora_tolerancia} wide />
            ) : null}
          </div>
        </FichaSection>
      ) : null}

      {o.status === 'CANCELADA' ? (
        <FichaSection title="Devolvida ao pedido">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="Motivo" value={dash(o.motivo_cancelamento)} wide />
            <FichaKv
              label="Cancelada em"
              value={o.cancelada_em ? formatDateTime(o.cancelada_em) : '—'}
            />
          </div>
        </FichaSection>
      ) : null}

      {o.observacao ? (
        <FichaSection title="Observações">
          <p className="ficha-obs">{o.observacao}</p>
        </FichaSection>
      ) : null}

      <RegistroMetaStrip registro={{ created_at: o.created_at }} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>
          Uso interno · {o.codigo} · emitido por {emitidoPor}
        </span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
