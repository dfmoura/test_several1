import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
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
import { necessidadeLabel, opStatusLabel, pedItemStatusLabel, pedStatusLabel } from '../lib/producaoUi';
import {
  asPedidoSnap,
  dash,
  formatDateTimeBr,
  modelosDoSnap,
  pedChipClass,
  snapInput,
  specOperacional,
} from '../lib/producaoFicha';
import { displaySnap } from '../lib/orcamentoForm';
import { tintasDeComposicao } from '../lib/modeloTintas';
import { ModeloTintasPorModelo } from './ModeloTintasTags';
import { tipoServicoLabel } from '../lib/operacoesSaida';

/**
 * Ficha do pedido — documento enxuto.
 * Cliente · meta · itens com especificação aninhada. Sem preço (PRODUCAO §2.6).
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

/** Especificação do item — label em cima, valor embaixo; larguras por necessidade. */
function PedidoSpecLinha({
  spec,
  isServico,
  descricaoItem,
  unidade,
  omitModelosCount = false,
}: {
  spec: Record<string, unknown>;
  isServico: boolean;
  descricaoItem: string;
  unidade: string;
  /** Quando a tabela de modelos vem logo abaixo. */
  omitModelosCount?: boolean;
}) {
  const desc = descricaoFromPedidoSpec(spec);
  const pairs: SpecPar[] = [];

  if (isServico) {
    pushPar(
      pairs,
      'Descrição',
      descricaoItem || desc.descricao_servico || 'Prestação de serviço',
      'wide',
    );
    pushPar(pairs, 'Tipo', tipoServicoLabel(desc.tipo_servico) || 'Serviço');
    pushPar(pairs, 'Unidade', unidade || desc.unidade || null, 'narrow');
    if (desc.material_cliente) pushPar(pairs, 'Material', 'Do cliente', 'wide');
  } else {
    pushPar(pairs, 'Material', desc.papel, 'wide');
    pushPar(pairs, 'Medida', desc.medida);
    pushPar(pairs, 'Acab.', desc.acabamento, 'wide');
    pushPar(pairs, 'Tubete', desc.tubete, 'narrow');
    pushPar(pairs, 'Cores', desc.cores, 'narrow');
    if (tintasDeComposicao(desc.modelos_composicao).length > 0) {
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
    pushPar(
      pairs,
      'Etiq/rolo',
      desc.etiq_por_rolo != null ? Number(desc.etiq_por_rolo).toLocaleString('pt-BR') : null,
    );
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
    const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
    const facaTxt = formato
      ? `${formatoLabel(formato)}${Boolean(spec.faca_nova) ? ' · nova' : ''}`
      : null;
    pushPar(pairs, 'Faca', facaTxt, 'wide');
  }

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
  const pa = item.produto_pa
    ? `${item.produto_pa.codigo} — ${item.produto_pa.descricao_fiscal}`
    : null;
  const ordemTxt = ordemDoItem(item, ops, oss);
  const descricao = (item.descricao || '').trim() || '—';
  const modelos = !isServico ? modelosDoSnap(spec) : [];
  const snap = asPedidoSnap(pedido.snapshot);
  const input = snapInput(pedido);
  const matrizQtdes = Array.isArray(input.modelos_composicao_quantidades)
    ? (input.modelos_composicao_quantidades as number[][])
    : undefined;
  const qtdeFaixa =
    Number(snap.faixa?.quantidade ?? item.qtde_pedida) || Number(item.qtde_pedida) || 0;

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
            {necessidadeLabel(item.necessidade)}
            {' · '}
            {pedItemStatusLabel(item.status)}
            {item.familia_fiscal ? ` · ${item.familia_fiscal}` : ''}
          </span>
          {pa ? <span className="ped-ficha-item-pa">{pa}</span> : null}
        </div>
        <div className="ped-ficha-item-qtdes">
          <span>
            <em>Pedida</em>
            {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
          </span>
          <span>
            <em>Produzida</em>
            {formatDecimalBr(Number(item.qtde_produzida), 0)}
          </span>
          {eixo === 'producao' ? (
            <span>
              <em>Planejada</em>
              {qtdePlanejada != null ? formatDecimalBr(Number(qtdePlanejada), 0) : '—'}
            </span>
          ) : (
            <span>
              <em>Faturável</em>
              {formatDecimalBr(Number(item.qtde_faturavel), 0)}
            </span>
          )}
          {ordemTxt !== '—' ? (
            <span>
              <em>Ordem</em>
              {ordemTxt}
            </span>
          ) : null}
        </div>
      </header>
      <div className="ped-ficha-item-spec">
        <PedidoSpecLinha
          spec={spec}
          isServico={isServico}
          descricaoItem={descricao}
          unidade={item.unidade}
          omitModelosCount={modelos.length > 0}
        />
      </div>

      <div className="ped-ficha-item-comercial">
        <div className="ped-ficha-faixa-aprovada">
          <div className="ped-ficha-faixa-head">
            <span className="ped-ficha-faixa-title">Faixa aprovada</span>
            <span className="ped-ficha-faixa-num">#{pedido.faixa_index + 1}</span>
          </div>
          <ul className="ped-ficha-faixa-kv" role="list">
            <li>
              <span className="ped-ficha-spec-k">Quantidade</span>
              <span className="ped-ficha-spec-v">
                {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
              </span>
            </li>
            {eixo === 'pedido' ? (
              <>
                <li>
                  <span className="ped-ficha-spec-k">Unitário</span>
                  <span className="ped-ficha-spec-v">
                    {item.preco_unitario != null ? formatUnitPrice(item.preco_unitario) : '—'}
                  </span>
                </li>
                <li>
                  <span className="ped-ficha-spec-k">Total</span>
                  <span className="ped-ficha-spec-v">
                    {item.valor_total != null ? formatCurrency(item.valor_total) : '—'}
                  </span>
                </li>
              </>
            ) : null}
          </ul>
        </div>

        {modelos.length > 0 ? (
          <ModelosComposicaoTable
            variant="ficha"
            className="ped-ficha-modelos"
            title="Modelos"
            hint="Distribuição da quantidade aprovada por arte."
            showValorArte={false}
            modelos={modelos}
            faixas={[
              {
                key: pedido.faixa_index,
                quantidade: qtdeFaixa,
                highlighted: true,
              },
            ]}
            quantidadesPorFaixa={matrizQtdes}
          />
        ) : null}
      </div>
    </article>
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
  const ops = p.ordens_producao ?? [];
  const oss = p.ordens_servico ?? [];
  const multi = p.itens.length > 1;
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
    <article className="ficha-sheet ped-ficha" aria-label={`Ficha do pedido ${p.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha do pedido · operacional</span>
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
          <div className="ped-ficha-itens">
            {p.itens.map((it) => (
              <PedidoItemFichaBloco
                key={it.id}
                pedido={p}
                item={it}
                ops={ops}
                oss={oss}
                multi={multi}
              />
            ))}
          </div>
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
