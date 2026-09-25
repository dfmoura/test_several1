import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { modeloArteCaptionFromMedida } from './ModeloArteOverlay';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import type { ReactNode } from 'react';
import type { Pedido, PedidoItem } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatCurrency, formatDecimalBr, formatUnitPrice } from '../lib/format';
import { formatoLabel } from './FacaShapeIcon';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import {
  formatEnderecoParceiro,
  freteTextoDoPedido,
} from '../lib/pedidoConfirmacao';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { necessidadeContratoLabel, opStatusLabel, pedItemStatusLabel, pedStatusLabel } from '../lib/producaoUi';
import {
  asPedidoSnap,
  dash,
  faixaIndexDoItem,
  formatDateTimeBr,
  matrizQuantidadesDoItem,
  modelosDoSnap,
  pedChipClass,
  qtdeFaixaDoItem,
  specOperacional,
} from '../lib/producaoFicha';
import { saidaEtiquetaLabel, saidaEtiquetaLabelCurto } from '../lib/saidaEtiqueta';
import { displaySnap } from '../lib/orcamentoForm';
import { tintasDeComposicao } from '../lib/modeloTintas';
import { ModeloTintasPorModelo } from './ModeloTintasTags';
import { tipoServicoLabel } from '../lib/operacoesSaida';

/**
 * Ficha do pedido — contrato interno A4 paisagem.
 * Tabela de itens + modelos. Valores travados. Sem custo/gordura.
 * Ficha da OP e ficha-cliente não usam este recorte.
 */
export type PedidoFichaSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function ordemDoItem(
  it: PedidoItem,
  ops: NonNullable<Pedido['ordens_producao']>,
  oss: NonNullable<Pedido['ordens_servico']>,
): string {
  if (it.necessidade === 'SERVICO') {
    const os = oss.find(
      (o) =>
        o.status !== 'CANCELADA' &&
        (o.pedido_item_id == null || o.pedido_item_id === it.id),
    );
    return os ? `${os.codigo} · ${opStatusLabel(os.status)}` : '—';
  }
  const op = ops.find(
    (o) =>
      o.status !== 'CANCELADA' &&
      (o.pedido_item_id == null || o.pedido_item_id === it.id),
  );
  return op ? `${op.codigo} · ${opStatusLabel(op.status)}` : '—';
}

function snapVal(spec: Record<string, unknown>, key: string): string | null {
  const raw = displaySnap(spec[key]);
  if (!raw || raw === '—') return null;
  return raw;
}

type SpecPar = { label: string; value: ReactNode; size?: 'wide' | 'narrow' };

function pushPar(
  pairs: SpecPar[],
  label: string,
  value: ReactNode | null | undefined,
  size?: 'wide' | 'narrow',
) {
  if (value == null || value === false) return;
  if (typeof value === 'string') {
    const v = value.trim();
    if (!v || v === '—') return;
    pairs.push({ label, value: v, size });
    return;
  }
  pairs.push({ label, value, size });
}

function paresSpecItem({
  spec,
  isServico,
  isRevenda,
  descricaoItem,
  unidade,
  omitModelosCount,
  comercial,
}: {
  spec: Record<string, unknown>;
  isServico: boolean;
  isRevenda: boolean;
  descricaoItem: string;
  unidade: string;
  omitModelosCount: boolean;
  comercial: boolean;
}): SpecPar[] {
  const desc = descricaoFromPedidoSpec(spec);
  const pairs: SpecPar[] = [];

  if (isRevenda) {
    pushPar(
      pairs,
      'Produto',
      desc.produto_descricao || descricaoItem || 'Revenda',
      'wide',
    );
    pushPar(pairs, 'SKU', desc.produto_codigo || null);
    if (!comercial) {
      pushPar(pairs, 'Unidade', unidade || desc.unidade || null, 'narrow');
    }
    return pairs;
  }

  if (isServico) {
    pushPar(
      pairs,
      'Descrição',
      descricaoItem || desc.descricao_servico || 'Prestação de serviço',
      'wide',
    );
    pushPar(pairs, 'Serviço', tipoServicoLabel(desc.tipo_servico) || 'Serviço');
    if (!comercial) {
      pushPar(pairs, 'Unidade', unidade || desc.unidade || null, 'narrow');
    }
    if (desc.material_cliente) pushPar(pairs, 'Material', 'Do cliente', 'wide');
    return pairs;
  }

  pushPar(pairs, 'Material', desc.papel, 'wide');
  pushPar(pairs, 'Medida', desc.medida);
  pushPar(pairs, 'Acab.', desc.acabamento, 'wide');
  pushPar(pairs, 'Tubete', desc.tubete, 'narrow');
  pushPar(pairs, 'Cores', desc.cores, 'narrow');
  if (!comercial && tintasDeComposicao(desc.modelos_composicao).length > 0) {
    pushPar(
      pairs,
      'Cores da arte',
      <ModeloTintasPorModelo modelos={desc.modelos_composicao} />,
      'wide',
    );
  }
  if (!omitModelosCount) {
    const modelos =
      desc.modelos != null
        ? Number(desc.modelos).toLocaleString('pt-BR')
        : desc.modelos_composicao?.length
          ? String(desc.modelos_composicao.length)
          : null;
    pushPar(pairs, 'Modelos', modelos, 'narrow');
  }
  if (!comercial) {
    pushPar(
      pairs,
      'Etiq/rolo',
      desc.etiq_por_rolo != null ? Number(desc.etiq_por_rolo).toLocaleString('pt-BR') : null,
    );
  }
  const saida = String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? '');
  if (saida && saidaEtiquetaLabel(saida)) {
    pushPar(pairs, 'Saída', <SaidaEtiquetaBadge code={saida} variant="dense" />);
  }
  if (!comercial) {
    pushPar(
      pairs,
      'Puxada',
      desc.puxada_cm != null && Number.isFinite(Number(desc.puxada_cm))
        ? `${formatDecimalBr(Number(desc.puxada_cm), 2)} cm`
        : null,
    );
    pushPar(pairs, 'Máquina', snapVal(spec, 'maquina'));
    pushPar(pairs, 'Z', snapVal(spec, 'z'), 'narrow');
    pushPar(pairs, 'Colunas', snapVal(spec, 'colunas'), 'narrow');
    pushPar(
      pairs,
      'Larg. papel',
      spec.largura_cm != null && Number.isFinite(Number(spec.largura_cm))
        ? `${formatDecimalBr(Number(spec.largura_cm), 2)} cm`
        : null,
    );
  }
  const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
  const facaTxt = formato
    ? `${formatoLabel(formato)}${Boolean(spec.faca_nova) ? ' · nova' : ''}`
    : null;
  pushPar(pairs, 'Faca', facaTxt, 'wide');
  return pairs;
}

function SpecCelulas({ pairs }: { pairs: SpecPar[] }) {
  if (pairs.length === 0) {
    return <p className="ped-ficha-spec-empty">Sem especificação neste item.</p>;
  }

  return (
    <ul className="ped-ficha-spec-grid" role="list">
      {pairs.map((p, i) => (
        <li
          key={`${p.label}-${i}`}
          className={
            p.size === 'wide'
              ? 'ped-ficha-spec-cell ped-ficha-spec-cell--wide'
              : p.size === 'narrow'
                ? 'ped-ficha-spec-cell ped-ficha-spec-cell--narrow'
                : 'ped-ficha-spec-cell'
          }
        >
          <span className="ped-ficha-spec-k">{p.label}</span>
          <span className="ped-ficha-spec-v">{p.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function PedidoItemFichaBloco({
  pedido,
  item,
  ops,
  oss,
  multi,
  eixo = 'pedido',
  qtdePlanejada,
}: {
  pedido: Pedido;
  item: PedidoItem;
  ops: NonNullable<Pedido['ordens_producao']>;
  oss: NonNullable<Pedido['ordens_servico']>;
  multi: boolean;
  /** `producao` = chão (sem preço; mostra planejada da OP). */
  eixo?: 'pedido' | 'producao';
  qtdePlanejada?: string | null;
}) {
  const spec = specOperacional(pedido, item);
  const isServico = item.necessidade === 'SERVICO';
  const isRevenda = item.necessidade === 'REVENDA';
  const isEtiqueta = item.necessidade === 'PRODUCAO';
  const pa = item.produto_pa
    ? `${item.produto_pa.codigo} — ${item.produto_pa.descricao_fiscal}`
    : null;
  const ordemTxt = ordemDoItem(item, ops, oss);
  const descricao = (item.descricao || '').trim() || '—';
  const modelos = isEtiqueta ? modelosDoSnap(spec) : [];
  const faixaIdx = faixaIndexDoItem(pedido, item);
  const matrizQtdes = matrizQuantidadesDoItem(item);
  const qtdeFaixa = qtdeFaixaDoItem(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const comercial = eixo === 'pedido';
  const specPares = paresSpecItem({
    spec,
    isServico,
    isRevenda,
    descricaoItem: descricao,
    unidade: item.unidade,
    omitModelosCount: modelos.length > 0,
    comercial,
  });
  const modelosBloco =
    modelos.length > 0 ? (
      <div className="ped-ficha-item-comercial">
        <ModelosComposicaoTable
          variant="ficha"
          className="ped-ficha-modelos"
          title="Modelos"
          hint={null}
          showValorArte={false}
          arteCaption={modeloArteCaptionFromMedida(desc.medida)}
          arteSaida={String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? '') || null}
          modelos={modelos}
          faixas={[
            {
              key: faixaIdx,
              quantidade: qtdeFaixa,
              highlighted: true,
            },
          ]}
          quantidadesPorFaixa={matrizQtdes}
        />
      </div>
    ) : null;

  if (comercial) {
    const linha: SpecPar[] = [
      { label: '#', value: String(item.ordem).padStart(2, '0'), size: 'narrow' },
      { label: 'Tipo', value: necessidadeContratoLabel(item.necessidade) },
      ...specPares,
    ];
    if (isEtiqueta) {
      linha.push({ label: 'Faixa', value: `#${faixaIdx + 1}`, size: 'narrow' });
    }
    linha.push({
      label: 'Qtd',
      value: `${formatDecimalBr(Number(item.qtde_pedida), 0)} ${item.unidade}`,
      size: 'narrow',
    });

    return (
      <article className="ped-ficha-item ped-ficha-item--contrato">
        <div className="ped-ficha-item-spec ped-ficha-item-spec--linha">
          <SpecCelulas pairs={linha} />
        </div>
        {modelosBloco}
      </article>
    );
  }

  return (
    <article className="ped-ficha-item">
      <header className="ped-ficha-item-head">
        <div className="ped-ficha-item-lead">
          <div className="ped-ficha-item-title-row">
            {multi ? (
              <span className="ped-ficha-item-pos" aria-label={`Posição ${item.ordem}`}>
                {String(item.ordem).padStart(2, '0')}
              </span>
            ) : null}
            <strong>{descricao}</strong>
          </div>
          <span className="ped-ficha-item-tags">
            {necessidadeContratoLabel(item.necessidade)}
            {' · '}
            {pedItemStatusLabel(item.status)}
            {item.familia_fiscal ? ` · ${item.familia_fiscal}` : ''}
          </span>
          {pa ? <span className="ped-ficha-item-pa">{pa}</span> : null}
        </div>
        <div className="ped-ficha-item-qtdes">
          <span>
            <em>{isEtiqueta ? 'Faixa' : 'Quantidade'}</em>
            {isEtiqueta ? `#${faixaIdx + 1} · ` : null}
            {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
          </span>
          <span>
            <em>Produzida</em>
            {formatDecimalBr(Number(item.qtde_produzida), 0)}
          </span>
          <span>
            <em>Planejada</em>
            {qtdePlanejada != null ? formatDecimalBr(Number(qtdePlanejada), 0) : '—'}
          </span>
          {ordemTxt !== '—' ? (
            <span>
              <em>Ordem</em>
              {ordemTxt}
            </span>
          ) : null}
        </div>
      </header>
      <div className="ped-ficha-item-spec">
        <SpecCelulas pairs={specPares} />
      </div>
      {modelosBloco}
    </article>
  );
}

function dashCell(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s && s !== '—' ? s : '—';
}

function PedidoItensTabelaContrato({ pedido }: { pedido: Pedido }) {
  const totalPedido = (pedido.itens ?? []).reduce(
    (acc, it) => acc + (Number(it.valor_total) || 0),
    0,
  );

  return (
    <table className="ficha-table ped-ficha-contrato-table">
      <thead>
        <tr>
          <th className="ped-ficha-col-n">#</th>
          <th>Tipo</th>
          <th>Material</th>
          <th>Medida</th>
          <th>Acab.</th>
          <th>Tubete</th>
          <th>Cores</th>
          <th>Saída</th>
          <th>Faca</th>
          <th className="ficha-td-num">Faixa</th>
          <th className="ficha-td-num">Qtd</th>
          <th className="ficha-td-num">Unit.</th>
          <th className="ficha-td-num">Total</th>
        </tr>
      </thead>
      {pedido.itens.map((item) => {
        const spec = specOperacional(pedido, item);
        const desc = descricaoFromPedidoSpec(spec);
        const isEtiqueta = item.necessidade === 'PRODUCAO';
        const isRevenda = item.necessidade === 'REVENDA';
        const isServico = item.necessidade === 'SERVICO';
        const modelos = isEtiqueta ? modelosDoSnap(spec) : [];
        const faixaIdx = faixaIndexDoItem(pedido, item);
        const qtdeFaixa = qtdeFaixaDoItem(pedido, item);
        const matriz = matrizQuantidadesDoItem(item);
        const saida = saidaEtiquetaLabelCurto(
          String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? ''),
        );
        const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
        const faca = formato
          ? `${formatoLabel(formato)}${Boolean(spec.faca_nova) ? ' · nova' : ''}`
          : null;

        let material = desc.papel;
        let medida = desc.medida;
        if (isRevenda) {
          material = desc.produto_descricao || item.descricao;
          medida = desc.produto_codigo || null;
        } else if (isServico) {
          material = desc.descricao_servico || item.descricao;
          medida = tipoServicoLabel(desc.tipo_servico) || 'Serviço';
        }

        return (
          <tbody key={item.id} className="ped-ficha-contrato-grupo">
            <tr>
              <td className="ped-ficha-col-n">{String(item.ordem).padStart(2, '0')}</td>
              <td>{necessidadeContratoLabel(item.necessidade)}</td>
              <td>{dashCell(material)}</td>
              <td>{dashCell(medida)}</td>
              <td>{dashCell(isEtiqueta ? desc.acabamento : null)}</td>
              <td>{dashCell(isEtiqueta ? desc.tubete : null)}</td>
              <td>{dashCell(isEtiqueta ? desc.cores : null)}</td>
              <td>{dashCell(isEtiqueta ? saida : null)}</td>
              <td>{dashCell(isEtiqueta ? faca : null)}</td>
              <td className="ficha-td-num">{isEtiqueta ? `#${faixaIdx + 1}` : '—'}</td>
              <td className="ficha-td-num">
                {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
              </td>
              <td className="ficha-td-num">
                {item.preco_unitario != null ? formatUnitPrice(item.preco_unitario) : '—'}
              </td>
              <td className="ficha-td-num">
                {item.valor_total != null ? formatCurrency(item.valor_total) : '—'}
              </td>
            </tr>
            {modelos.length > 0 ? (
              <tr className="ped-ficha-contrato-modelos">
                <td colSpan={13}>
                  <ModelosComposicaoTable
                    variant="ficha"
                    className="ped-ficha-modelos"
                    title="Modelos"
                    hint={null}
                    showValorArte={false}
                    showArtePreview={false}
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
      })}
      {pedido.itens.length > 0 ? (
        <tfoot>
          <tr>
            <td colSpan={12} className="ficha-td-num">
              Total do pedido
            </td>
            <td className="ficha-td-num">
              <strong>{formatCurrency(totalPedido)}</strong>
            </td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

export function PedidoFichaSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoFichaSheetProps) {
  const snap = asPedidoSnap(p.snapshot);
  const readeq = snap.readequacao;
  const cliente = identidadeParteComercial(
    p.parceiro,
    p.parceiro?.razao_social ?? '—',
  );
  const clienteCodigo = (p.parceiro?.codigo ?? '').trim();
  const clienteLead = clienteCodigo
    ? `${clienteCodigo} — ${cliente.display}`
    : cliente.display;
  const clienteMeta = [
    ...metaLinhasParteComercial(p.parceiro, { showCodigo: false, showDocumento: false }),
    formatEnderecoParceiro(p.parceiro) ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const entregaOps = freteTextoDoPedido(p);
  const orcCodigo = p.orcamento?.codigo ?? dash(snap.orcamento_codigo);
  const nItens = p.itens.length;

  return (
    <article
      className="ficha-sheet ped-ficha ficha-sheet-ped"
      aria-label={`Ficha do pedido ${p.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha do pedido · contrato interno</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{p.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">Pedido</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${pedChipClass(p.status)}`.trim()}>
            {pedStatusLabel(p.status)}
          </span>
          {p.prazo_entrega_dias != null ? (
            <span className="ficha-chip ficha-chip-muted">{prazoEntregaCompleto(p)}</span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">±{p.tolerancia_qtd_pct}%</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip">
        <FichaKv
          label="Orçamento"
          value={
            snap.orcamento_versao != null
              ? `${orcCodigo} · v${snap.orcamento_versao}`
              : orcCodigo
          }
        />
        <FichaKv
          label="Vendedor"
          value={
            p.vendedor ? `${p.vendedor.codigo} — ${p.vendedor.razao_social}` : '—'
          }
        />
        {entregaOps ? <FichaKv label="Entrega" value={entregaOps} /> : null}
      </div>

      <FichaSection title={nItens > 1 ? `Itens · ${nItens}` : 'Itens'}>
        {p.itens.length === 0 ? (
          <p className="ficha-empty">Nenhum item neste pedido.</p>
        ) : (
          <PedidoItensTabelaContrato pedido={p} />
        )}
      </FichaSection>

      {readeq ? (
        <FichaSection title="Readequação">
          <div className="ficha-kv-grid cols-4">
            <FichaKv label="OP" value={dash(readeq.op_codigo as string)} />
            <FichaKv
              label="Pedida → boa"
              value={`${dash(readeq.qtde_pedida as string)} → ${dash(readeq.qtde_boa as string)}`}
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

      <RegistroMetaStrip registro={p} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · {p.codigo} · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
