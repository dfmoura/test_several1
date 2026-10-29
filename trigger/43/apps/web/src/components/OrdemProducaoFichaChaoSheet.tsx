import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDecimalBr } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';
import {
  itemPedidoDaOp,
  linhaProducaoChao,
  linhasIdentidadeChao,
  opFichaChaoMeta,
} from '../lib/opFichaChao';
import { textoMaquinaFlexo } from '../lib/opFichaFlexo';
import type {
  PedidoPlanilhaComercialLinha,
  PedidoPlanilhaProducaoLinha,
} from '../lib/pedidoFichaPlanilha';
import { formatDateTimeBr, opChipClass, specOperacional } from '../lib/producaoFicha';
import { opStatusLabel } from '../lib/producaoUi';
import { isSaidaEtiqueta } from '../lib/saidaEtiqueta';

/**
 * Ficha de chão unificada da OP — Impressão + Acabamento (A4 paisagem).
 * Satélite da ficha flexo retrato. Identidade 1×; rebobinação só exclusivos.
 * Reusa grão da planilha do PED, escopado ao item da OP.
 */
export type OrdemProducaoFichaChaoSheetProps = {
  ordem: OrdemProducao;
  pedido: Pedido | null;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function dashCell(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s && s !== '—' ? s : '—';
}

function fmtQtd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const scale = Math.abs(value - Math.round(value)) < 1e-6 ? 0 : 2;
  return formatDecimalBr(value, scale, { stripTrailingZeros: true });
}

function fmtCm(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return formatDecimalBr(value, digits, { stripTrailingZeros: true });
}

function TabelaIdentidade({ linhas }: { linhas: PedidoPlanilhaComercialLinha[] }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--identidade">
      <thead>
        <tr>
          <th>Item</th>
          <th className="ficha-td-num">Quant.</th>
          <th>Medida</th>
          <th className="ficha-td-num">Largura</th>
          <th className="ficha-td-num">Puxada</th>
          <th>Modelo</th>
          <th>Material</th>
          <th>Obs</th>
          <th>Cores</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td className="ficha-td-num">{ln.itemOrdem}</td>
            <td className="ficha-td-num">{ln.primeiraDoItem ? fmtQtd(ln.quant) : '—'}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.medida) : '—'}</td>
            <td className="ficha-td-num">
              {ln.primeiraDoItem ? fmtCm(ln.larguraCm) : '—'}
            </td>
            <td className="ficha-td-num">
              {ln.primeiraDoItem ? fmtCm(ln.puxadaCm, 4) : '—'}
            </td>
            <td>{dashCell(ln.modelo)}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.material) : '—'}</td>
            <td className="op-chao-obs">{dashCell(ln.obs)}</td>
            <td>{dashCell(ln.cores)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaImpressao({ ln }: { ln: PedidoPlanilhaProducaoLinha }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--impressao">
      <thead>
        <tr>
          <th>Item</th>
          <th>Troca de produto</th>
          <th className="ficha-td-num" title="Largura × colunas de produção">
            Largura do papel
          </th>
          <th className="ficha-td-num">Qdade colunas produção</th>
          <th className="ficha-td-num">Metragem linear</th>
          <th className="ficha-td-num">M²</th>
          <th>Acabamento</th>
          <th>Tubete</th>
          <th>Formato da faca</th>
          <th className="ficha-td-num">Nº faca</th>
          <th className="ficha-td-num">Z faca</th>
          <th>Saída</th>
          <th>Máquina</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="ficha-td-num">{ln.itemOrdem}</td>
          <td>{dashCell(ln.trocaProduto)}</td>
          <td className="ficha-td-num">{fmtCm(ln.larguraPapelCm)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.colunasProducao)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.metragemLinear)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.m2)}</td>
          <td>{dashCell(ln.acabamento)}</td>
          <td>{dashCell(ln.tubete)}</td>
          <td>{dashCell(ln.formatoFaca)}</td>
          <td className="ficha-td-num">{dashCell(ln.nFaca)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.z)}</td>
          <td className="op-chao-saida">
            {ln.saidaCodigo && isSaidaEtiqueta(ln.saidaCodigo) ? (
              <SaidaEtiquetaBadge code={ln.saidaCodigo} variant="dense" />
            ) : (
              '—'
            )}
          </td>
          <td>{dashCell(ln.maquina)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Só exclusivos de rebobinação — metragem/acabamento/tubete/saída ficam na impressão. */
function TabelaAcabamento({ ln }: { ln: PedidoPlanilhaProducaoLinha }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--acabamento">
      <thead>
        <tr>
          <th className="ficha-td-num">Qdade colunas rebobinação</th>
          <th className="ficha-td-num">Qdade etiquetas p/ rolo</th>
          <th className="ficha-td-num">Qdade de rolos</th>
          <th className="ficha-td-num">Qdade metros / rolo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="ficha-td-num">{fmtQtd(ln.colunasRebobinacao)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.etiqPorRolo)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.rolos)}</td>
          <td className="ficha-td-num">{fmtQtd(ln.metrosPorRolo)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function OrdemProducaoFichaChaoSheet({
  ordem: o,
  pedido,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemProducaoFichaChaoSheetProps) {
  const meta = opFichaChaoMeta();
  const item = itemPedidoDaOp(o, pedido);
  const identidade = pedido && item ? linhasIdentidadeChao(pedido, item) : [];
  const producao = pedido && item ? linhaProducaoChao(pedido, item) : null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const maquina = textoMaquinaFlexo(spec);
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
  const produto =
    (o.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Ordem de produção';
  const qtdePlanejada = formatDecimalBr(Number(o.qtde_planejada), 0);

  return (
    <article
      className="ficha-sheet ped-ficha ficha-sheet-op-chao ficha-sheet-op-chao--unificada"
      aria-label={`${meta.titulo} da ordem ${o.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">{meta.docLabel}</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{meta.titulo}</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          {maquina ? <span className="ficha-chip ficha-op-maquina">{maquina}</span> : null}
          <span className="ficha-chip ficha-chip-muted">{pedCodigo}</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip op-chao-kv">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Qtde planejada" value={qtdePlanejada} />
        <FichaKv label="Produto" value={produto} />
      </div>

      <FichaSection title="Identidade do item">
        {identidade.length === 0 ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar a identidade.
          </p>
        ) : (
          <TabelaIdentidade linhas={identidade} />
        )}
      </FichaSection>

      <FichaSection title={meta.secaoImpressao}>
        <p className="op-chao-hint">{meta.hintImpressao}</p>
        {!producao ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar os parâmetros de chão.
          </p>
        ) : (
          <TabelaImpressao ln={producao} />
        )}
      </FichaSection>

      <FichaSection title={meta.secaoAcabamento}>
        {!producao ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar a rebobinação.
          </p>
        ) : (
          <TabelaAcabamento ln={producao} />
        )}
      </FichaSection>

      <RegistroMetaStrip
        registro={{
          criado_por: o.criado_por,
          atualizado_por: o.atualizado_por ?? o.criado_por,
          created_at: o.created_at,
          updated_at: o.updated_at ?? o.created_at,
        }}
        className="ficha-autoria"
      />

      <footer className="ficha-footer">
        <span>
          Uso interno · {o.codigo} · impressão e acabamento · emitido por {emitidoPor}
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
