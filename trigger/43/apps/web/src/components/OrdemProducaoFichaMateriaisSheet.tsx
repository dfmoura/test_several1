import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDecimalBr } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';
import { bobinaDaOrdem, insumosDoKit } from '../lib/opFichaMateriais';
import { textoMaquinaFlexo } from '../lib/opFichaFlexo';
import { formatDateTimeBr, opChipClass, specOperacional } from '../lib/producaoFicha';
import { opStatusLabel } from '../lib/producaoUi';

/**
 * Ficha de materiais da OP — A4 paisagem.
 * Satélite da ficha flexo retrato. Bobina mãe + kit. Sem preço, sem local/volume.
 */
export type OrdemProducaoFichaMateriaisSheetProps = {
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

function fmtCm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return `${formatDecimalBr(value, 2, { stripTrailingZeros: true })} cm`;
}

export function OrdemProducaoFichaMateriaisSheet({
  ordem: o,
  pedido,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemProducaoFichaMateriaisSheetProps) {
  const item =
    pedido?.itens.find((i) => i.id === o.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const maquina = textoMaquinaFlexo(spec);
  const bobina = bobinaDaOrdem(o, pedido);
  const insumos = insumosDoKit(o);
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

  return (
    <article
      className="ficha-sheet ped-ficha ficha-sheet-op-materiais"
      aria-label={`Ficha de materiais da ordem ${o.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Materiais · retirada · uso interno</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">Materiais · retirada</h2>
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

      <div className="ficha-kv-strip op-materiais-kv">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Produto" value={produto} wide />
      </div>

      <FichaSection title="Bobina · papel (rolo)">
        <p className="op-materiais-hint">
          Largura do papel = largura da faca × colunas de produção. Retirada em rolo (bobina mãe).
        </p>
        {!bobina ? (
          <p className="ficha-empty">Sem dados de bobina nesta ordem.</p>
        ) : (
          <table className="ficha-table op-materiais-table op-materiais-table--bobina">
            <thead>
              <tr>
                <th className="op-materiais-check" aria-label="Levado" />
                <th className="ficha-td-num">Item</th>
                <th>Material</th>
                <th className="ficha-td-num" title="Largura × colunas de produção">
                  Largura do papel
                </th>
                <th className="ficha-td-num">Metragem linear</th>
                <th className="ficha-td-num">m²</th>
                <th>Acabamento</th>
                <th>Tubete</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="op-materiais-check">
                  <span className="ficha-pick-check" aria-hidden />
                </td>
                <td className="ficha-td-num">
                  {bobina.itemOrdem != null ? bobina.itemOrdem : '—'}
                </td>
                <td>{dashCell(bobina.material)}</td>
                <td className="ficha-td-num">{fmtCm(bobina.larguraPapelCm)}</td>
                <td className="ficha-td-num">
                  {bobina.metragemLinear != null
                    ? `${fmtQtd(bobina.metragemLinear)} m`
                    : '—'}
                </td>
                <td className="ficha-td-num">{fmtQtd(bobina.m2)}</td>
                <td>{dashCell(bobina.acabamento)}</td>
                <td>{dashCell(bobina.tubete)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </FichaSection>

      <FichaSection title="Demais insumos do kit">
        <p className="op-materiais-hint">
          Todo o kit da ordem. Confirmar saída continua em Estoque · A buscar.
        </p>
        {insumos.length === 0 ? (
          <p className="ficha-empty">Esta ordem ainda não tem kit.</p>
        ) : (
          <table className="ficha-table op-materiais-table op-materiais-table--kit">
            <thead>
              <tr>
                <th className="op-materiais-check" aria-label="Levado" />
                <th className="ficha-td-num">#</th>
                <th>Insumo</th>
                <th>Qtde</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((ln, i) => (
                <tr key={ln.id} className={`op-materiais-kit--${ln.estado}`}>
                  <td className="op-materiais-check">
                    <span className="ficha-pick-check" aria-hidden />
                  </td>
                  <td className="ficha-td-num">{i + 1}</td>
                  <td>{ln.nome}</td>
                  <td>{ln.qtde}</td>
                  <td>{ln.situacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          Uso interno · {o.codigo} · materiais · emitido por {emitidoPor}
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
