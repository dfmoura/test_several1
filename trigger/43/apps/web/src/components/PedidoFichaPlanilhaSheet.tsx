import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { formatoLabel } from './FacaShapeIcon';
import type { Pedido, PedidoItem } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatCurrency, formatDecimalBr, formatUnitPrice } from '../lib/format';
import { descontoAplicadoNoTotal } from '../lib/orcamentoForm';
import {
  descontoDoPedido,
  formatEnderecoParceiro,
  freteTextoDoPedido,
} from '../lib/pedidoConfirmacao';
import {
  comissaoInclusaDoItem,
  linhaSimplesDoItem,
  particionarItensPedido,
  somaValores,
} from '../lib/pedidoFichaContrato';
import {
  fechamentoPlanilhaHint,
  linhasComerciaisPlanilha,
  linhasProducaoPlanilha,
  type PedidoPlanilhaVisual,
} from '../lib/pedidoFichaPlanilha';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import { tipoServicoLabel } from '../lib/operacoesSaida';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { pedStatusLabel } from '../lib/producaoUi';
import {
  asPedidoSnap,
  dash,
  formatDateTimeBr,
  pedChipClass,
  specOperacional,
} from '../lib/producaoFicha';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { isSaidaEtiqueta, saidaEtiquetaLabelCurto } from '../lib/saidaEtiqueta';

/**
 * Ficha planilha do pedido — A4 paisagem, uso interno.
 * Etiquetas: tabelas densas (comercial + produção).
 * Revenda e serviço: tabelas comerciais compactas (sem produção).
 * Satélite da ficha contrato retrato. Valores travados. Sem custo/gordura.
 */
export type PedidoFichaPlanilhaSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function dashCell(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s && s !== '—' ? s : '—';
}

function visualOf(pedido: Pedido, item: PedidoItem): PedidoPlanilhaVisual {
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

function fmtQtd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const scale = Math.abs(value - Math.round(value)) < 1e-6 ? 0 : 2;
  return formatDecimalBr(value, scale, { stripTrailingZeros: true });
}

function fmtCm(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return formatDecimalBr(value, digits, { stripTrailingZeros: true });
}

function fmtMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value <= 0.004) return formatCurrency(0);
  return formatCurrency(value);
}

function fmtUnit(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatUnitPrice(value);
}

function TabelaComercial({
  pedido,
  itens,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
}) {
  const linhas = linhasComerciaisPlanilha(pedido, itens, (item) => visualOf(pedido, item));
  const total = somaValores(itens);

  return (
    <table className="ficha-table ped-planilha-table ped-planilha-table--comercial">
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
          <th className="ficha-td-num">Vlr. matriz</th>
          <th className="ficha-td-num">Vlr. arte</th>
          <th className="ficha-td-num">Vlr. faca</th>
          <th className="ficha-td-num">Vlr. milh.</th>
          <th className="ficha-td-num">Comissão</th>
          <th className="ficha-td-num">Frete</th>
          <th className="ficha-td-num">Vlr. unit.</th>
          <th className="ficha-td-num">Vlr. rolo</th>
          <th className="ficha-td-num">Desc.</th>
          <th className="ficha-td-num">Sub-Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td className="ficha-td-num">{ln.itemOrdem}</td>
            <td className="ficha-td-num">{ln.primeiraDoItem ? fmtQtd(ln.quant) : '—'}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.medida) : '—'}</td>
            <td className="ficha-td-num">{ln.primeiraDoItem ? fmtCm(ln.larguraCm) : '—'}</td>
            <td className="ficha-td-num">
              {ln.primeiraDoItem ? fmtCm(ln.puxadaCm, 4) : '—'}
            </td>
            <td>{dashCell(ln.modelo)}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.material) : '—'}</td>
            <td className="ped-planilha-obs">{dashCell(ln.obs)}</td>
            <td>{dashCell(ln.cores)}</td>
            <td className="ficha-td-num">{fmtMoney(ln.valorMatriz)}</td>
            <td className="ficha-td-num">
              {ln.valorArte > 0.004 ? formatCurrency(ln.valorArte) : '—'}
            </td>
            <td className="ficha-td-num">{fmtMoney(ln.valorFaca)}</td>
            <td className="ficha-td-num">{fmtUnit(ln.valorMilheiro)}</td>
            <td className="ficha-td-num">{fmtMoney(ln.comissao)}</td>
            <td className="ficha-td-num">
              {ln.freteADefinir
                ? 'a definir'
                : ln.primeiraDoDocumento
                  ? fmtMoney(ln.frete)
                  : '—'}
            </td>
            <td className="ficha-td-num">{fmtUnit(ln.unitario)}</td>
            <td className="ficha-td-num">{fmtMoney(ln.valorRolo)}</td>
            <td className="ficha-td-num">{fmtMoney(ln.desconto)}</td>
            <td className="ficha-td-num">{formatCurrency(ln.subtotal)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={18} className="ficha-td-num">
            Total etiquetas
          </td>
          <td className="ficha-td-num">
            <strong>{formatCurrency(total)}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function TabelaProducao({
  pedido,
  itens,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
}) {
  const linhas = linhasProducaoPlanilha(pedido, itens, (item) => visualOf(pedido, item));

  return (
    <table className="ficha-table ped-planilha-table ped-planilha-table--producao">
      <thead>
        <tr>
          <th>Item</th>
          <th>Troca prod.</th>
          <th className="ficha-td-num">Larg. papel</th>
          <th className="ficha-td-num">Col. prod.</th>
          <th className="ficha-td-num">Metr. linear</th>
          <th className="ficha-td-num">M²</th>
          <th>Acabamento</th>
          <th>Tubete</th>
          <th className="ficha-td-num">Col. reb.</th>
          <th className="ficha-td-num">Etiq/rolo</th>
          <th className="ficha-td-num">Rolos</th>
          <th className="ficha-td-num">m/rolo</th>
          <th>Formato faca</th>
          <th className="ficha-td-num">Nº faca</th>
          <th className="ficha-td-num">Z</th>
          <th>Saída</th>
          <th>Máquina</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td className="ficha-td-num">{ln.itemOrdem}</td>
            <td>{dashCell(ln.trocaProduto)}</td>
            <td className="ficha-td-num">{fmtCm(ln.larguraPapelCm)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.colunasProducao)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.metragemLinear)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.m2)}</td>
            <td>{dashCell(ln.acabamento)}</td>
            <td>{dashCell(ln.tubete)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.colunasRebobinacao)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.etiqPorRolo)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.rolos)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.metrosPorRolo)}</td>
            <td>{dashCell(ln.formatoFaca)}</td>
            <td className="ficha-td-num">{dashCell(ln.nFaca)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.z)}</td>
            <td className="ped-planilha-saida">
              {ln.saidaCodigo && isSaidaEtiqueta(ln.saidaCodigo) ? (
                <SaidaEtiquetaBadge code={ln.saidaCodigo} variant="dense" />
              ) : (
                '—'
              )}
            </td>
            <td>{dashCell(ln.maquina)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Revenda / serviço — mesmo grão da ficha contrato retrato.
 * Fora da grade de etiqueta e fora da tabela de produção.
 */
function TabelaSimplesPlanilha({
  pedido,
  itens,
  sku,
  descricaoLabel,
  valorLabel,
  rodape,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
  sku: boolean;
  descricaoLabel: string;
  valorLabel: string;
  rodape: string;
}) {
  const total = somaValores(itens);

  return (
    <table className="ficha-table ped-planilha-table ped-planilha-table--simples">
      <thead>
        <tr>
          <th>Item</th>
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
            <tr key={item.id}>
              <td className="ficha-td-num">{ln.ordem}</td>
              {sku ? <td>{dashCell(ln.sku)}</td> : <td>{dashCell(servico)}</td>}
              <td>{dashCell(ln.descricao)}</td>
              <td className="ficha-td-num">
                {formatDecimalBr(ln.qtde, 0)}
                {ln.unidade ? ` ${ln.unidade}` : ''}
              </td>
              <td className="ficha-td-num">{fmtUnit(ln.unitario)}</td>
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

function FechamentoPlanilha({ pedido }: { pedido: Pedido }) {
  const grupos = particionarItensPedido(pedido.itens ?? []);
  const totalEtiquetas = somaValores(grupos.etiquetas);
  const totalRevenda = somaValores(grupos.revendas);
  const vendaMista = grupos.etiquetas.length > 0 && grupos.revendas.length > 0;
  const somaItens = somaValores(pedido.itens ?? []);
  const fechamento = descontoAplicadoNoTotal(descontoDoPedido(pedido), somaItens);
  const mostraComissao = grupos.etiquetas.length > 0 || grupos.servicos.length > 0;
  const comissao = [...grupos.etiquetas, ...grupos.servicos].reduce(
    (acc, item) => acc + comissaoInclusaDoItem(pedido, item),
    0,
  );

  return (
    <div className="ped-planilha-fechamento">
      {vendaMista ? (
        <p>
          <span>Subtotal da venda</span>
          <strong>{formatCurrency(totalEtiquetas + totalRevenda)}</strong>
        </p>
      ) : null}
      <p>
        <span>{fechamentoPlanilhaHint(pedido)}</span>
      </p>
      {mostraComissao && comissao > 0.004 ? (
        <p>
          <span>
            Comissão <span className="ped-ficha-fechamento-nota">já inclusa</span>
          </span>
          <strong>{formatCurrency(comissao)}</strong>
        </p>
      ) : null}
      <p>
        <span>
          Desconto{' '}
          <span className="ped-ficha-fechamento-nota">
            {fechamento.desconto > 0 ? 'no documento' : 'não aplicado'}
          </span>
        </span>
        <strong>{formatCurrency(fechamento.desconto)}</strong>
      </p>
      <p className="ped-ficha-total-pedido">
        <span>Total do pedido</span>
        <strong>{formatCurrency(fechamento.total)}</strong>
      </p>
    </div>
  );
}

export function PedidoFichaPlanilhaSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoFichaPlanilhaSheetProps) {
  const snap = asPedidoSnap(p.snapshot);
  const grupos = particionarItensPedido(p.itens ?? []);
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
      className="ficha-sheet ped-ficha ficha-sheet-ped-planilha"
      aria-label={`Ficha planilha do pedido ${p.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha planilha do pedido · uso interno</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{p.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">Pedido · planilha</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${pedChipClass(p.status)}`.trim()}>
            {pedStatusLabel(p.status)}
          </span>
          {p.prazo_entrega_dias != null ? (
            <span className="ficha-chip ficha-chip-muted">{prazoEntregaCompleto(p)}</span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">±{p.tolerancia_qtd_pct}%</span>
          <span className="ficha-chip ficha-chip-muted">A4 paisagem</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip ped-planilha-kv">
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

      {grupos.etiquetas.length > 0 ? (
        <>
          <FichaSection title="Comercial · etiqueta">
            <TabelaComercial pedido={p} itens={grupos.etiquetas} />
          </FichaSection>
          <FichaSection title="Produção">
            <p className="ped-planilha-hint">
              Larg. papel = largura × colunas de produção
            </p>
            <TabelaProducao pedido={p} itens={grupos.etiquetas} />
          </FichaSection>
        </>
      ) : null}

      {grupos.revendas.length > 0 ? (
        <FichaSection title="Produto de revenda">
          <TabelaSimplesPlanilha
            pedido={p}
            itens={grupos.revendas}
            sku
            descricaoLabel="Descrição"
            valorLabel="Subtotal"
            rodape="Total revenda"
          />
        </FichaSection>
      ) : null}

      {grupos.servicos.length > 0 ? (
        <FichaSection title="Prestação de serviço">
          <TabelaSimplesPlanilha
            pedido={p}
            itens={grupos.servicos}
            sku={false}
            descricaoLabel="Descrição"
            valorLabel="Total"
            rodape="Total serviços"
          />
        </FichaSection>
      ) : null}

      {grupos.etiquetas.length === 0 &&
      grupos.revendas.length === 0 &&
      grupos.servicos.length === 0 ? (
        <FichaSection title="Itens">
          <p className="ficha-empty">Nenhum item neste pedido.</p>
        </FichaSection>
      ) : null}

      <FechamentoPlanilha pedido={p} />

      <RegistroMetaStrip registro={p} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · planilha · {p.codigo} · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
