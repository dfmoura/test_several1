import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  FichaEspecificacaoSection,
  FichaFacaSection,
  FichaGuiaProducaoSection,
  FichaKv,
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
 * Ficha operacional da OP — chão de fábrica (estudo 32 PRODUCAO_OPERACIONAL).
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

  return (
    <article className="ficha-sheet" aria-label={`Ficha da ordem de produção ${o.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha operacional · Ordem de produção (OP)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{o.pedido_item?.descricao ?? item?.descricao ?? 'Ordem de produção'}</h2>
          <p className="ficha-fantasia">
            {[o.pedido?.codigo ?? pedido?.codigo, o.parceiro?.razao_social]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">
            {formatDecimalBr(Number(o.qtde_planejada), 0)} un.
          </span>
          <span className="ficha-chip ficha-chip-muted">±{tol}%</span>
        </div>
      </div>

      <div className="ficha-kv-strip">
        <FichaKv label="Pedido" value={o.pedido?.codigo ?? pedido?.codigo ?? '—'} />
        <FichaKv
          label="Cliente"
          value={o.parceiro ? `${o.parceiro.codigo} — ${o.parceiro.razao_social}` : '—'}
        />
        <FichaKv label="Aberta em" value={formatDateTime(o.created_at)} />
        <FichaKv
          label="Concluída"
          value={o.concluida_em ? formatDateTime(o.concluida_em) : '—'}
        />
      </div>

      <div className="ficha-columns">
        <FichaSection title="Identificação">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="Código" value={o.codigo} />
            <FichaKv label="Status" value={opStatusLabel(o.status)} />
            <FichaKv label="Qtde planejada" value={formatDecimalBr(Number(o.qtde_planejada), 0)} />
            <FichaKv
              label="Qtde pedida"
              value={
                o.pedido_item?.qtde_pedida != null
                  ? formatDecimalBr(Number(o.pedido_item.qtde_pedida), 0)
                  : '—'
              }
            />
            <FichaKv
              label="Qtde boa"
              value={o.qtde_boa != null ? formatDecimalBr(Number(o.qtde_boa), 0) : '—'}
            />
            <FichaKv label="Refugo" value={formatDecimalBr(Number(o.qtde_refugo), 0)} />
          </div>
        </FichaSection>
        <FichaSection title="Vínculos">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="Pedido" value={o.pedido?.codigo ?? '—'} />
            <FichaKv label="Tolerância" value={`±${tol}%`} />
            <FichaKv
              label="Cliente"
              value={o.parceiro ? `${o.parceiro.codigo} — ${o.parceiro.razao_social}` : '—'}
              wide
            />
            <FichaKv
              label="MOV PA"
              value={o.pa_movimento?.codigo ?? '—'}
            />
            <FichaKv
              label="Iniciada"
              value={o.iniciada_em ? formatDateTime(o.iniciada_em) : '—'}
            />
          </div>
        </FichaSection>
      </div>

      <FichaEspecificacaoSection spec={spec} />
      <FichaFacaSection spec={spec} />
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
                <th>Retorno</th>
                <th>Perda</th>
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
          <div className="ficha-kv-grid cols-4">
            <FichaKv
              label="Qtde boa (PA)"
              value={o.qtde_boa != null ? formatDecimalBr(Number(o.qtde_boa), 0) : '—'}
            />
            <FichaKv label="Refugo" value={formatDecimalBr(Number(o.qtde_refugo), 0)} />
            <FichaKv label="Fora da tolerância" value={o.fora_tolerancia ? 'Sim' : 'Não'} />
            <FichaKv label="MOV PA" value={o.pa_movimento?.codigo ?? '—'} />
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
        <FichaSection title="Observação">
          <p className="ficha-obs">{o.observacao}</p>
        </FichaSection>
      ) : null}

      <p className="ficha-note">
        <strong>Uso interno</strong> — chão de fábrica (estudo 32 · PRODUCAO_OPERACIONAL).
        Especificação herdada do PED. Sem preço de venda nem margem (PRODUCAO §2.6).
      </p>

      <RegistroMetaStrip registro={{ created_at: o.created_at }} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · ordem de produção · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
