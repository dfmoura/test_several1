import { formatCest, formatNcm } from './FiscalCombobox';
import { TriggerAttribution } from './TriggerAttribution';
import type { Produto } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  DECIMAL_SCALE,
  familiaLabel,
  formatDecimalBr,
  formatFactor,
  formatPercent,
  formatQty,
  formatUnitPrice,
  naturezaGrupoLabel,
} from '../lib/format';

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function formatDateTimeBr(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function attrRaw(p: Produto, key: string): string | null {
  const v = p.atributos?.[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function attrCell(p: Produto, key: string, scale?: number): string {
  const raw = attrRaw(p, key);
  if (raw == null) return '—';
  if (scale == null) return raw;
  return formatDecimalBr(raw, scale, { stripTrailingZeros: true });
}

function simNao(v: boolean | undefined): string {
  if (v === undefined) return '—';
  return v ? 'S' : 'N';
}

function ncmCell(ncm: string | null | undefined): string {
  if (!ncm?.trim()) return '—';
  return formatNcm(ncm);
}

function cestCell(cest: string | null | undefined): string {
  if (!cest?.trim()) return '—';
  return formatCest(cest);
}

function situacaoCurta(s: string | null | undefined): string {
  if (!s) return '—';
  if (s === 'ATIVO') return 'Ativo';
  if (s === 'INATIVO') return 'Inativo';
  return s;
}

export type ProdutoFichaGerencialFiltros = {
  q?: string;
  familia?: string;
  grupo?: string;
};

export type ProdutoFichaGerencialSheetProps = {
  produtos: Produto[];
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
  filtros: ProdutoFichaGerencialFiltros;
  /** Colunas fiscais/CBS — só com permissão produto.fiscal. */
  incluirFiscal: boolean;
};

export function ProdutoFichaGerencialSheet({
  produtos,
  empresaNome,
  emitidoPor,
  emitidoEm,
  filtros,
  incluirFiscal,
}: ProdutoFichaGerencialSheetProps) {
  const filtroParts: string[] = [];
  if (filtros.q) filtroParts.push(`busca “${filtros.q}”`);
  if (filtros.familia) {
    filtroParts.push(`${filtros.familia} — ${familiaLabel(filtros.familia)}`);
  }
  if (filtros.grupo) filtroParts.push(`grupo ${filtros.grupo}`);
  const filtroLabel = filtroParts.length ? filtroParts.join(' · ') : 'Todos os SKUs da EMP (até 500)';

  return (
    <article
      className="ficha-sheet ficha-sheet-produtos-gerencial"
      aria-label="Ficha gerencial de produtos"
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha gerencial · Produtos (SKU)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{produtos.length} SKU(s)</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <p className="ficha-produtos-gerencial-filtros">
        Recorte: {filtroLabel}
        {incluirFiscal ? '' : ' · colunas fiscais omitidas (sem produto.fiscal)'}
      </p>

      <div className="table-wrap">
        <table className="ficha-table ficha-produtos-gerencial-table">
          <thead>
            <tr>
              <th>Código</th>
              <th className="col-fam">Fam</th>
              <th>Grupo</th>
              <th>Nat.</th>
              <th>Desc. fiscal</th>
              <th>Desc. comercial</th>
              <th>Sit.</th>
              <th>Un.com</th>
              <th>Un.est</th>
              <th className="num">Fator</th>
              <th>Programa</th>
              <th className="num">L mm</th>
              <th className="num">C m</th>
              <th className="num">g/m²</th>
              <th>Linha</th>
              <th className="num">Preço</th>
              <th className="num">Custo</th>
              <th className="num">Est.min</th>
              <th className="num">Lead</th>
              <th className="col-flag" title="Controla lote">
                L
              </th>
              <th className="col-flag" title="Controla validade">
                V
              </th>
              <th className="col-num3 num" title="Prazo de validade (dias)">
                Pz
              </th>
              {incluirFiscal ? (
                <>
                  <th>NCM</th>
                  <th>CEST</th>
                  <th className="num">Orig</th>
                  <th>SPED</th>
                  <th>CFOP E</th>
                  <th>CFOP S</th>
                  <th>CSOSN</th>
                  <th>CST ICMS</th>
                  <th>CST PIS</th>
                  <th>CST COF</th>
                  <th>GTIN</th>
                  <th>CST CBS</th>
                  <th>cClass</th>
                  <th className="num">Alíq CBS</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => {
              const natureza = p.grupo_catalogo?.natureza;
              const unCom = p.unidade_comercial;
              const unInt = p.unidade_interna;
              const showFator = Boolean(unCom && unInt && unCom !== unInt);
              return (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td className="col-fam" title={familiaLabel(p.familia)}>
                    {p.familia}
                  </td>
                  <td title={p.grupo_catalogo?.nome ?? undefined}>
                    {p.grupo ?? p.grupo_catalogo?.codigo ?? '—'}
                  </td>
                  <td title={natureza ? naturezaGrupoLabel(natureza) : undefined}>
                    {dash(natureza)}
                  </td>
                  <td title={p.descricao_fiscal}>{dash(p.descricao_fiscal)}</td>
                  <td title={p.descricao_comercial ?? undefined}>{dash(p.descricao_comercial)}</td>
                  <td>{situacaoCurta(p.situacao)}</td>
                  <td>{dash(unCom)}</td>
                  <td>{dash(unInt)}</td>
                  <td className="num">{showFator ? formatFactor(p.fator_conversao) : '—'}</td>
                  <td title={attrRaw(p, 'programa_compra') ?? undefined}>
                    {attrCell(p, 'programa_compra')}
                  </td>
                  <td className="num">{attrCell(p, 'largura_mm', DECIMAL_SCALE.dim)}</td>
                  <td className="num">{attrCell(p, 'comprimento_m', DECIMAL_SCALE.dim)}</td>
                  <td className="num">{attrCell(p, 'gramatura_g_m2', DECIMAL_SCALE.gramatura)}</td>
                  <td>{attrCell(p, 'grupo_estoque')}</td>
                  <td className="num">{formatUnitPrice(p.preco_tabela)}</td>
                  <td className="num">{formatUnitPrice(p.custo_medio)}</td>
                  <td className="num">{formatQty(p.estoque_minimo)}</td>
                  <td className="num">{dash(p.lead_time_dias)}</td>
                  <td className="col-flag">{simNao(p.controla_lote)}</td>
                  <td className="col-flag">{simNao(p.controla_validade)}</td>
                  <td className="col-num3 num">{dash(p.prazo_validade_dias)}</td>
                  {incluirFiscal ? (
                    <>
                      <td>{ncmCell(p.ncm)}</td>
                      <td>{cestCell(p.cest)}</td>
                      <td className="num">{dash(p.origem)}</td>
                      <td>{dash(p.tipo_item_sped)}</td>
                      <td>{dash(p.cfop_entrada_padrao)}</td>
                      <td>{dash(p.cfop_saida_padrao)}</td>
                      <td>{dash(p.csosn)}</td>
                      <td>{dash(p.cst_icms)}</td>
                      <td>{dash(p.cst_pis)}</td>
                      <td>{dash(p.cst_cofins)}</td>
                      <td>{dash(p.gtin)}</td>
                      <td>{dash(p.cst_cbs)}</td>
                      <td>{dash(p.cclass_trib)}</td>
                      <td className="num">{formatPercent(p.aliquota_cbs)}</td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ficha-note">
        Uso interno · um SKU por linha · dimensões nominais (não volume físico) · especificação sob
        medida vive no ORC/PED.
      </p>

      <footer className="ficha-footer">
        <span>
          Ficha gerencial · produtos / SKU · emitido por {emitidoPor}
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
