import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
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
import { pedStatusLabel } from '../lib/producaoUi';
import {
  linhaSimplesDoItem,
  linhasEtiquetaDoItem,
  matrizResidualDoItem,
  particionarItensPedido,
  somaValores,
} from '../lib/pedidoFichaContrato';
import {
  asPedidoSnap,
  dash,
  formatDateTimeBr,
  pedChipClass,
  specOperacional,
} from '../lib/producaoFicha';
import { saidaEtiquetaLabelCurto } from '../lib/saidaEtiqueta';
import { ModeloTintasTags } from './ModeloTintasTags';
import { tipoServicoLabel } from '../lib/operacoesSaida';

/**
 * Ficha do pedido — contrato interno A4 paisagem.
 * Etiquetas (uma linha por modelo) e revenda em blocos separados.
 * Valores travados. Sem custo/gordura. Sem readequação.
 * Ficha da OP e ficha-cliente não usam este recorte.
 */
export type PedidoFichaSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};



function dashCell(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s && s !== '—' ? s : '—';
}

function visualEtiqueta(pedido: Pedido, item: PedidoItem): { saida: string | null; faca: string | null } {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const saida = saidaEtiquetaLabelCurto(
    String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? ''),
  );
  const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
  const faca = formato
    ? `${formatoLabel(formato)}${spec.faca_nova ? ' · nova' : ''}`
    : null;
  return { saida: saida || null, faca };
}

function fmtQtdInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatDecimalBr(value, 0);
}

function fmtRolos(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const scale = Math.abs(value - Math.round(value)) < 1e-6 ? 0 : 2;
  return formatDecimalBr(value, scale, { stripTrailingZeros: true });
}

function PedidoTabelaEtiquetas({
  pedido,
  itens,
  rodape,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
  rodape: string;
}) {
  const grupos = itens.map((item) => ({
    item,
    linhas: linhasEtiquetaDoItem(pedido, item, visualEtiqueta(pedido, item)),
    matriz: matrizResidualDoItem(pedido, item),
  }));
  const modelos = grupos.flatMap((g) => g.linhas);
  const somaRolos = modelos.reduce((acc, ln) => acc + (ln.rolos ?? 0), 0);
  const temRolos = modelos.some((ln) => ln.rolos != null);
  const somaEtiquetas = modelos.reduce((acc, ln) => acc + (ln.etiquetas ?? 0), 0);
  const somaEtiqPorRolo = grupos.reduce((acc, g) => acc + (g.linhas[0]?.etiqPorRolo ?? 0), 0);
  const temEtiqPorRolo = grupos.some((g) => g.linhas[0]?.etiqPorRolo != null);
  const somaArte = modelos.reduce((acc, ln) => acc + (ln.valorArte > 0 ? ln.valorArte : 0), 0);
  const somaMatriz = grupos.reduce((acc, g) => acc + g.matriz, 0);
  const total = somaValores(itens);

  return (
    <table className="ficha-table ped-ficha-contrato-table ped-ficha-contrato-table--etq">
      <thead>
        <tr>
          <th className="ped-ficha-col-n">#</th>
          <th>Material</th>
          <th>Medida</th>
          <th>Acab.</th>
          <th className="ped-ficha-col-xs">Tub.</th>
          <th className="ped-ficha-col-xs">Cores</th>
          <th>Saída</th>
          <th className="ped-ficha-col-xs">Máq.</th>
          <th className="ped-ficha-col-xs">Nº faca</th>
          <th>Faca</th>
          <th className="ped-ficha-col-xs">Fx</th>
          <th>Modelo</th>
          <th>Cores arte</th>
          <th className="ficha-td-num ped-ficha-th-val">Vlr. arte</th>
          <th className="ficha-td-num ped-ficha-th-val">Unitário</th>
          <th className="ficha-td-num ped-ficha-th-val">Valor rolo</th>
          <th className="ficha-td-num ped-ficha-th-val">Etiq. por rolo</th>
          <th className="ficha-td-num ped-ficha-th-val ped-ficha-col-xs">Rolos</th>
          <th className="ficha-td-num ped-ficha-th-val">Etiquetas</th>
          <th className="ficha-td-num ped-ficha-th-val">Subtotal</th>
        </tr>
      </thead>
      {grupos.map(({ item, linhas }) => (
        <tbody key={item.id} className="ped-ficha-contrato-grupo">
          {linhas.map((ln) => (
            <tr key={ln.key}>
              <td className="ped-ficha-col-n">{String(ln.ordem).padStart(2, '0')}</td>
              <td>{dashCell(ln.material)}</td>
              <td>{dashCell(ln.medida)}</td>
              <td>{dashCell(ln.acabamento)}</td>
              <td className="ped-ficha-col-xs">{dashCell(ln.tubete)}</td>
              <td className="ped-ficha-col-xs">{dashCell(ln.cores)}</td>
              <td>{dashCell(ln.saida)}</td>
              <td className="ped-ficha-col-xs">{dashCell(ln.maquina)}</td>
              <td className="ped-ficha-col-xs ficha-td-num">{dashCell(ln.nFaca)}</td>
              <td>{dashCell(ln.faca)}</td>
              <td className="ped-ficha-col-xs">{dashCell(ln.faixa)}</td>
              <td className="ped-ficha-col-modelo">{ln.modelo}</td>
              <td className="ped-ficha-col-tintas">
                <ModeloTintasTags tintas={ln.tintas} empty="—" />
              </td>
              <td className="ficha-td-num">
                {ln.valorArte > 0 ? formatCurrency(ln.valorArte) : '—'}
              </td>
              <td className="ficha-td-num">
                {ln.unitario != null ? formatUnitPrice(ln.unitario) : '—'}
              </td>
              <td className="ficha-td-num">
                {ln.valorRolo != null ? formatCurrency(ln.valorRolo) : '—'}
              </td>
              <td className="ficha-td-num">{fmtQtdInt(ln.etiqPorRolo)}</td>
              <td className="ficha-td-num ped-ficha-col-xs">{fmtRolos(ln.rolos)}</td>
              <td className="ficha-td-num">{fmtQtdInt(ln.etiquetas)}</td>
              <td className="ficha-td-num">{formatCurrency(ln.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      ))}
      <tfoot>
        {somaMatriz > 0 ? (
          <tr className="ped-ficha-contrato-foot-matriz">
            <td colSpan={13} className="ficha-td-num">
              Total matriz
            </td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">—</td>
            <td className="ficha-td-num">
              <strong>{formatCurrency(somaMatriz)}</strong>
            </td>
          </tr>
        ) : null}
        <tr>
          <td colSpan={13} className="ficha-td-num">
            {rodape}
          </td>
          <td className="ficha-td-num">
            {somaArte > 0 ? formatCurrency(somaArte) : '—'}
          </td>
          <td className="ficha-td-num">—</td>
          <td className="ficha-td-num">—</td>
          <td className="ficha-td-num">{temEtiqPorRolo ? fmtQtdInt(somaEtiqPorRolo) : '—'}</td>
          <td className="ficha-td-num ped-ficha-col-xs">{temRolos ? fmtRolos(somaRolos) : '—'}</td>
          <td className="ficha-td-num">{fmtQtdInt(somaEtiquetas)}</td>
          <td className="ficha-td-num">
            <strong>{formatCurrency(total)}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function PedidoTabelaSimples({
  itens,
  pedido,
  sku,
  descricaoLabel,
  valorLabel,
  rodape,
}: {
  itens: PedidoItem[];
  pedido: Pedido;
  sku: boolean;
  descricaoLabel: string;
  valorLabel: string;
  rodape: string;
}) {
  const total = somaValores(itens);
  return (
    <table className="ficha-table ped-ficha-contrato-table ped-ficha-contrato-table--simples">
      <thead>
        <tr>
          <th className="ped-ficha-col-n">#</th>
          {sku ? <th>SKU</th> : <th>Serviço</th>}
          <th>{descricaoLabel}</th>
          <th className="ficha-td-num">Qtd</th>
          <th className="ficha-td-num">Unitário</th>
          <th className="ficha-td-num">{valorLabel}</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => {
          const ln = linhaSimplesDoItem(pedido, item);
          const spec = specOperacional(pedido, item);
          const desc = descricaoFromPedidoSpec(spec);
          const servico = !sku ? tipoServicoLabel(desc.tipo_servico) || 'Serviço' : null;
          return (
            <tr key={item.id} className="ped-ficha-contrato-grupo">
              <td className="ped-ficha-col-n">{String(ln.ordem).padStart(2, '0')}</td>
              {sku ? <td>{dashCell(ln.sku)}</td> : <td>{dashCell(servico)}</td>}
              <td>{dashCell(ln.descricao)}</td>
              <td className="ficha-td-num">
                {formatDecimalBr(ln.qtde, 0)} {ln.unidade}
              </td>
              <td className="ficha-td-num">
                {ln.unitario != null ? formatUnitPrice(ln.unitario) : '—'}
              </td>
              <td className="ficha-td-num">{formatCurrency(ln.total)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={5} className="ficha-td-num">
            {rodape}
          </td>
          <td className="ficha-td-num">
            <strong>{formatCurrency(total)}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function PedidoItensTabelaContrato({ pedido }: { pedido: Pedido }) {
  const grupos = particionarItensPedido(pedido.itens ?? []);
  const nGrupos =
    (grupos.etiquetas.length > 0 ? 1 : 0) +
    (grupos.revendas.length > 0 ? 1 : 0) +
    (grupos.servicos.length > 0 ? 1 : 0);
  const misto = nGrupos > 1;
  const totalPedido = somaValores(pedido.itens ?? []);

  return (
    <div className="ped-ficha-contrato-blocos">
      {grupos.etiquetas.length > 0 ? (
        <FichaSection title="Etiquetas">
          <PedidoTabelaEtiquetas
            pedido={pedido}
            itens={grupos.etiquetas}
            rodape={misto ? 'Total etiquetas' : 'Total do pedido'}
          />
        </FichaSection>
      ) : null}
      {grupos.revendas.length > 0 ? (
        <FichaSection title="Revenda">
          <PedidoTabelaSimples
            pedido={pedido}
            itens={grupos.revendas}
            sku
            descricaoLabel="Descrição"
            valorLabel="Subtotal"
            rodape={misto ? 'Total revenda' : 'Total do pedido'}
          />
        </FichaSection>
      ) : null}
      {grupos.servicos.length > 0 ? (
        <FichaSection title="Serviços">
          <PedidoTabelaSimples
            pedido={pedido}
            itens={grupos.servicos}
            sku={false}
            descricaoLabel="Descrição"
            valorLabel="Total"
            rodape={misto ? 'Total serviços' : 'Total do pedido'}
          />
        </FichaSection>
      ) : null}
      {misto ? (
        <p className="ped-ficha-total-pedido">
          Total do pedido <strong>{formatCurrency(totalPedido)}</strong>
        </p>
      ) : null}
    </div>
  );
}

export function PedidoFichaSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoFichaSheetProps) {
  const snap = asPedidoSnap(p.snapshot);
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

      {p.itens.length === 0 ? (
        <FichaSection title="Itens">
          <p className="ficha-empty">Nenhum item neste pedido.</p>
        </FichaSection>
      ) : (
        <PedidoItensTabelaContrato pedido={p} />
      )}

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
