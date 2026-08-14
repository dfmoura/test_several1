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
import type { Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import { necessidadeLabel, opStatusLabel, pedItemStatusLabel, pedStatusLabel } from '../lib/producaoUi';
import {
  asPedidoSnap,
  dash,
  faixaFisica,
  formatDateTimeBr,
  modelosDoSnap,
  pedChipClass,
  specOperacional,
} from '../lib/producaoFicha';

/**
 * Ficha operacional do PED — documento-mestre (estudo 32 GERACAO_PEDIDO).
 * Uso interno. Sem preço/margem (PRODUCAO §2.6). Não é proposta ao cliente.
 */
export type PedidoFichaSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

export function PedidoFichaSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoFichaSheetProps) {
  const item = p.itens[0];
  const spec = specOperacional(p, item);
  const faixa = faixaFisica(p);
  const modelos = modelosDoSnap(spec);
  const snap = asPedidoSnap(p.snapshot);
  const readeq = snap.readequacao;
  const ops = p.ordens_producao ?? [];
  const oss = p.ordens_servico ?? [];

  return (
    <article className="ficha-sheet" aria-label={`Ficha do pedido ${p.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha operacional · Pedido (PED)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{p.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{p.parceiro?.razao_social ?? '—'}</h2>
          <p className="ficha-fantasia">
            {item?.descricao ?? 'Pedido operacional'}
            {p.orcamento?.codigo ? ` · ${p.orcamento.codigo}` : ''}
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${pedChipClass(p.status)}`.trim()}>
            {pedStatusLabel(p.status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">
            {item ? necessidadeLabel(item.necessidade) : 'PED'}
          </span>
          {p.prazo_entrega_dias != null ? (
            <span className="ficha-chip ficha-chip-muted">{p.prazo_entrega_dias} d.úteis</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <FichaKv label="Cliente" value={p.parceiro ? `${p.parceiro.codigo} — ${p.parceiro.razao_social}` : '—'} />
        <FichaKv label="Orçamento" value={p.orcamento?.codigo ?? dash(snap.orcamento_codigo)} />
        <FichaKv
          label="Versão ORC"
          value={snap.orcamento_versao != null ? `v${snap.orcamento_versao}` : '—'}
        />
        <FichaKv label="Cadastrado" value={formatDateTime(p.created_at)} />
      </div>

      <div className="ficha-columns">
        <FichaSection title="Identificação">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="Código" value={p.codigo} />
            <FichaKv label="Status" value={pedStatusLabel(p.status)} />
            <FichaKv label="Prazo prometido" value={p.prazo_entrega_dias != null ? `${p.prazo_entrega_dias} dias úteis` : '—'} />
            <FichaKv label="Tolerância" value={`±${p.tolerancia_qtd_pct}%`} />
            <FichaKv label="Faixa aprovada" value={String(p.faixa_index + 1)} />
            <FichaKv
              label="Família fiscal"
              value={item?.familia_fiscal ?? '—'}
            />
          </div>
        </FichaSection>
        <FichaSection title="Origem">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="ORC" value={p.orcamento?.codigo ?? '—'} />
            <FichaKv
              label="Parceiro"
              value={p.parceiro ? `${p.parceiro.codigo} — ${p.parceiro.razao_social}` : '—'}
            />
            <FichaKv
              label="PA / SKU"
              value={
                item?.produto_pa
                  ? `${item.produto_pa.codigo} — ${item.produto_pa.descricao_fiscal}`
                  : '—'
              }
              wide
            />
          </div>
        </FichaSection>
      </div>

      <FichaSection title="Itens">
        {p.itens.length === 0 ? (
          <p className="ficha-empty">Nenhum item neste pedido.</p>
        ) : (
          <table className="ficha-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Necessidade</th>
                <th>Pedida</th>
                <th>Produzida</th>
                <th>Faturável</th>
                <th>Status</th>
                <th>Ordem</th>
              </tr>
            </thead>
            <tbody>
              {p.itens.map((it) => {
                const op = ops.find(
                  (o) =>
                    o.status !== 'CANCELADA' &&
                    (o.pedido_item_id == null || o.pedido_item_id === it.id),
                );
                const os = oss.find(
                  (o) =>
                    o.status !== 'CANCELADA' &&
                    (o.pedido_item_id == null || o.pedido_item_id === it.id),
                );
                const ordem =
                  it.necessidade === 'SERVICO'
                    ? os
                      ? `${os.codigo} · ${opStatusLabel(os.status)}`
                      : '—'
                    : op
                      ? `${op.codigo} · ${opStatusLabel(op.status)}`
                      : '—';
                return (
                  <tr key={it.id}>
                    <td>{it.descricao}</td>
                    <td>{necessidadeLabel(it.necessidade)}</td>
                    <td>
                      {formatDecimalBr(Number(it.qtde_pedida), 0)} {it.unidade}
                    </td>
                    <td>{formatDecimalBr(Number(it.qtde_produzida), 0)}</td>
                    <td>{formatDecimalBr(Number(it.qtde_faturavel), 0)}</td>
                    <td>{pedItemStatusLabel(it.status)}</td>
                    <td>{ordem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </FichaSection>

      <FichaEspecificacaoSection spec={spec} />
      <FichaFacaSection spec={spec} />
      <FichaGuiaProducaoSection spec={spec} faixa={faixa} modelos={modelos} />

      {ops.length > 0 || oss.length > 0 ? (
        <FichaSection title="Ordens vinculadas">
          <table className="ficha-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Código</th>
                <th>Status</th>
                <th>Planejada</th>
                <th>Executada / boa</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((o) => (
                <tr key={`op-${o.id}`}>
                  <td>OP</td>
                  <td>
                    <strong>{o.codigo}</strong>
                  </td>
                  <td>{opStatusLabel(o.status)}</td>
                  <td>{formatDecimalBr(Number(o.qtde_planejada), 0)}</td>
                  <td>{o.qtde_boa != null ? formatDecimalBr(Number(o.qtde_boa), 0) : '—'}</td>
                </tr>
              ))}
              {oss.map((o) => (
                <tr key={`os-${o.id}`}>
                  <td>OS</td>
                  <td>
                    <strong>{o.codigo}</strong>
                  </td>
                  <td>{opStatusLabel(o.status)}</td>
                  <td>{formatDecimalBr(Number(o.qtde_planejada), 0)}</td>
                  <td>
                    {o.qtde_executada != null ? formatDecimalBr(Number(o.qtde_executada), 0) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FichaSection>
      ) : null}

      {readeq ? (
        <FichaSection title="Readequação">
          <div className="ficha-kv-grid cols-4">
            <FichaKv label="OP" value={dash(readeq.op_codigo as string)} />
            <FichaKv
              label="Pedida → boa"
              value={`${dash(readeq.qtde_pedida as string)} → ${dash(readeq.qtde_boa as string)}`}
            />
            <FichaKv
              label="Tolerância"
              value={readeq.tolerancia_qtd_pct != null ? `±${readeq.tolerancia_qtd_pct}%` : '—'}
            />
            <FichaKv
              label="Fora da faixa"
              value={readeq.fora_tolerancia ? 'Sim' : 'Não'}
            />
            {readeq.motivo ? (
              <FichaKv label="Motivo" value={dash(readeq.motivo as string)} wide />
            ) : null}
          </div>
        </FichaSection>
      ) : null}

      {p.rastreio ? <RastreioFichaSection rastreio={p.rastreio} /> : null}

      {p.observacao ? (
        <FichaSection title="Observação">
          <p className="ficha-obs">{p.observacao}</p>
        </FichaSection>
      ) : null}

      <p className="ficha-note">
        <strong>Uso interno</strong> — documento-mestre operacional (estudo 32 · GERACAO_PEDIDO).
        Snapshot travado do ORC aprovado. Sem composição de custo nem preço de venda (PRODUCAO
        §2.6).
      </p>

      <RegistroMetaStrip registro={{ created_at: p.created_at }} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · pedido · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
