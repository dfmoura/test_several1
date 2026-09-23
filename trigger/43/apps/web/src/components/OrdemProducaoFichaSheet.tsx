import { TriggerAttribution } from './TriggerAttribution';
import {
  FichaEspecificacaoSection,
  FichaFacaSection,
  FichaGuiaProducaoSection,
  FichaKv,
  FichaSaidaEtiquetaSection,
  FichaSection,
} from './ProducaoFichaBlocks';
import { RastreioFichaSection } from './RastreioInsumosFichaSheet';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import { opMaterialStatusLabel, opStatusLabel } from '../lib/producaoUi';
import {
  dash,
  faixaFisica,
  formatDateTimeBr,
  modelosDoSnap,
  opChipClass,
  specOperacional,
} from '../lib/producaoFicha';

/**
 * Ordem de produção imprimível — documento oficial de chão de fábrica.
 * Uso interno. Sem preço/margem. Spec herdada do PED.
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
  const item = pedido?.itens.find((i) => i.id === o.pedido_item?.id) ?? pedido?.itens[0];
  const spec = specOperacional(pedido, item);
  const faixa = faixaFisica(pedido);
  const modelos = modelosDoSnap(spec);
  const materiais = o.materiais ?? [];
  const tol = o.pedido?.tolerancia_qtd_pct ?? pedido?.tolerancia_qtd_pct ?? '20';
  const pedCodigo = o.pedido?.codigo ?? pedido?.codigo ?? '—';
  const cliente = o.parceiro
    ? `${o.parceiro.codigo} — ${o.parceiro.razao_social}`
    : '—';
  const descricao = o.pedido_item?.descricao ?? item?.descricao ?? 'Ordem de produção';
  const qtdePlanejada = formatDecimalBr(Number(o.qtde_planejada), 0);
  const qtdePedida =
    o.pedido_item?.qtde_pedida != null
      ? formatDecimalBr(Number(o.pedido_item.qtde_pedida), 0)
      : null;

  return (
    <article
      className="ficha-sheet ficha-sheet-op"
      aria-label={`Ordem de produção ${o.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Produção · documento oficial de chão</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-oc-banner ficha-op-banner">
        <div className="ficha-oc-banner-tipo">
          <strong>Ordem de produção</strong>
          <span>Documento oficial de chão de fábrica</span>
        </div>
        <div className="ficha-oc-banner-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">{qtdePlanejada} un.</span>
          <span className="ficha-chip ficha-chip-muted">±{tol}%</span>
        </div>
      </div>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{descricao}</h2>
          <p className="ficha-fantasia">
            {qtdePedida && qtdePedida !== qtdePlanejada
              ? `Produção sob encomenda · pedida ${qtdePedida} un.`
              : 'Produção sob encomenda'}
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className="ficha-oc-numero-label">Nº da OP</span>
          <span className="ficha-oc-numero">{o.codigo}</span>
        </div>
      </div>

      <div className="ficha-kv-strip">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Cliente" value={cliente} />
        <FichaKv label="Aberta" value={formatDateTime(o.created_at)} />
        {o.iniciada_em ? (
          <FichaKv label="Iniciada" value={formatDateTime(o.iniciada_em)} />
        ) : null}
        {o.concluida_em ? (
          <FichaKv label="Concluída" value={formatDateTime(o.concluida_em)} />
        ) : null}
      </div>

      <FichaEspecificacaoSection spec={spec} />
      <FichaFacaSection spec={spec} />
      <FichaSaidaEtiquetaSection spec={spec} />
      <FichaGuiaProducaoSection spec={spec} faixa={faixa} modelos={modelos} />

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
                    {m.produto
                      ? `${m.produto.codigo} — ${m.produto.descricao_fiscal}`
                      : '—'}
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

      <div className="ficha-oc-assinaturas">
        <div className="ficha-oc-assinatura">
          <span className="ficha-oc-assinatura-linha" aria-hidden />
          <strong>Operador / máquina</strong>
          <span>Nome / data</span>
        </div>
        <div className="ficha-oc-assinatura">
          <span className="ficha-oc-assinatura-linha" aria-hidden />
          <strong>Supervisor / CQ</strong>
          <span>Nome / data</span>
        </div>
      </div>

      <p className="ficha-note">
        Uso interno — chão de fábrica. Especificação herdada do pedido. Sem preço de venda nem
        margem.
      </p>

      <footer className="ficha-footer">
        <span>
          Ordem de produção {o.codigo} · emitida por {emitidoPor} ·{' '}
          {formatDateTimeBr(emitidoEm)}
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
