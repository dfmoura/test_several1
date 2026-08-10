import type { ReactNode } from 'react';
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

/** Fallbacks estáticos — mesmas opções usadas no formulário quando a API não responde. */
const ORIGEM_LABEL: Record<number, string> = {
  0: 'Nacional',
  1: 'Estrangeira — importação direta',
  2: 'Estrangeira — adquirida no mercado interno',
  3: 'Nacional — mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%',
  4: 'Nacional — produção em conformidade com processos produtivos básicos',
  5: 'Nacional — mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%',
  6: 'Estrangeira — importação direta, sem similar nacional, constante em lista da CAMEX',
  7: 'Estrangeira — adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX',
  8: 'Nacional — mercadoria ou bem com Conteúdo de Importação superior a 70%',
};

const TIPO_SPED_LABEL: Record<string, string> = {
  '00': 'Mercadoria para revenda',
  '01': 'Matéria-prima',
  '02': 'Embalagem',
  '03': 'Produto em processo',
  '04': 'Produto acabado',
  '05': 'Subproduto',
  '06': 'Produto intermediário',
  '07': 'Material de uso e consumo',
  '08': 'Ativo imobilizado',
  '09': 'Serviços',
  '10': 'Outros insumos',
  '99': 'Outras',
};

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function situacaoLabel(s: string | null | undefined): string {
  const map: Record<string, string> = {
    ATIVO: 'Ativo',
    INATIVO: 'Inativo',
  };
  return s ? (map[s] ?? s) : '—';
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

function origemLabel(origem: number | null | undefined): string {
  if (origem == null) return '—';
  const desc = ORIGEM_LABEL[origem];
  return desc ? `${origem} — ${desc}` : String(origem);
}

function tipoSpedLabel(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  const desc = TIPO_SPED_LABEL[codigo];
  return desc ? `${codigo} — ${desc}` : codigo;
}

function attrStr(
  attrs: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!attrs || attrs[key] == null) return null;
  const v = String(attrs[key]).trim();
  return v === '' ? null : v;
}

type KvProps = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

function Kv({ label, value, wide }: KvProps) {
  return (
    <div className={`ficha-kv${wide ? ' ficha-kv-wide' : ''}`}>
      <span className="ficha-kv-label">{label}</span>
      <span className="ficha-kv-value">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ficha-section ${className}`.trim()}>
      <h3>{title}</h3>
      <div className="ficha-section-body">{children}</div>
    </section>
  );
}

export type ProdutoFichaSheetProps = {
  produto: Produto;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

export function ProdutoFichaSheet({
  produto: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: ProdutoFichaSheetProps) {
  const grupoCodigo = p.grupo_catalogo?.codigo ?? p.grupo;
  const grupoNome = p.grupo_catalogo?.nome;
  const natureza = p.grupo_catalogo?.natureza;

  const largura = attrStr(p.atributos, 'largura_mm');
  const comprimento = attrStr(p.atributos, 'comprimento_m');
  const gramatura = attrStr(p.atributos, 'gramatura_g_m2');
  const grupoEstoque = attrStr(p.atributos, 'grupo_estoque');
  const showDimensoes = Boolean(largura || comprimento || gramatura || grupoEstoque);

  const showReforma = Boolean(
    p.cst_cbs || p.cclass_trib || p.aliquota_cbs,
  );

  const ncmFmt = p.ncm ? formatNcm(p.ncm) || p.ncm : '—';
  const cestFmt = p.cest ? formatCest(p.cest) || p.cest : '—';

  return (
    <article className="ficha-sheet" aria-label={`Ficha do produto ${p.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha cadastral · Produto (SKU)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{p.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{p.descricao_fiscal}</h2>
          {p.descricao_comercial && p.descricao_comercial !== p.descricao_fiscal ? (
            <p className="ficha-fantasia">{p.descricao_comercial}</p>
          ) : null}
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip situacao-${(p.situacao ?? '').toLowerCase()}`}>
            {situacaoLabel(p.situacao)}
          </span>
          <span className="ficha-chip ficha-chip-papel">
            {p.familia} — {familiaLabel(p.familia)}
          </span>
          {grupoCodigo ? (
            <span className="ficha-chip ficha-chip-muted">
              {grupoCodigo}
              {grupoNome ? ` · ${grupoNome}` : ''}
            </span>
          ) : null}
          {natureza ? (
            <span className="ficha-chip ficha-chip-muted">{naturezaGrupoLabel(natureza)}</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="Código" value={p.codigo} />
        <Kv label="NCM" value={ncmFmt} />
        <Kv label="Unidade comercial" value={dash(p.unidade_comercial)} />
        <Kv label="GTIN" value={dash(p.gtin) === '—' ? 'SEM GTIN' : dash(p.gtin)} />
      </div>

      <div className="ficha-columns">
        <Section title="Identificação">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Família" value={`${p.familia} — ${familiaLabel(p.familia)}`} wide />
            <Kv
              label="Grupo canônico"
              value={
                grupoCodigo
                  ? grupoNome
                    ? `${grupoCodigo} — ${grupoNome}`
                    : grupoCodigo
                  : '—'
              }
              wide
            />
            <Kv label="Descrição fiscal" value={dash(p.descricao_fiscal)} wide />
            <Kv label="Descrição comercial" value={dash(p.descricao_comercial)} wide />
            <Kv label="Situação" value={situacaoLabel(p.situacao)} />
            <Kv
              label="Natureza"
              value={natureza ? naturezaGrupoLabel(natureza) : '—'}
            />
          </div>
        </Section>

        <Section title="Unidades e conversão">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Unidade comercial" value={dash(p.unidade_comercial)} />
            <Kv
              label="Unidade de estoque"
              value={dash(p.unidade_interna ?? p.unidade_comercial)}
            />
            <Kv label="Fator de conversão" value={formatFactor(p.fator_conversao)} wide />
            <Kv
              label="Convenção"
              value={
                p.unidade_comercial
                  ? `1 ${p.unidade_comercial} = ${formatFactor(p.fator_conversao) ?? '…'} × ${
                      p.unidade_interna || p.unidade_comercial
                    }`
                  : '—'
              }
              wide
            />
          </div>
        </Section>
      </div>

      <Section title="Classificação fiscal">
        <div className="ficha-kv-grid cols-4">
          <Kv label="NCM" value={ncmFmt} />
          <Kv label="CEST" value={cestFmt} />
          <Kv label="Origem" value={origemLabel(p.origem)} wide />
          <Kv label="Tipo item SPED" value={tipoSpedLabel(p.tipo_item_sped)} wide />
          <Kv label="CFOP saída padrão" value={dash(p.cfop_saida_padrao)} />
          <Kv label="CFOP entrada padrão" value={dash(p.cfop_entrada_padrao)} />
          <Kv label="CSOSN" value={dash(p.csosn)} />
          <Kv label="CST ICMS" value={dash(p.cst_icms)} />
          <Kv label="CST PIS" value={dash(p.cst_pis)} />
          <Kv label="CST COFINS" value={dash(p.cst_cofins)} />
        </div>
      </Section>

      {showReforma ? (
        <Section title="Reforma tributária (CBS)">
          <div className="ficha-kv-grid cols-4">
            <Kv label="CST CBS" value={dash(p.cst_cbs)} />
            <Kv label="cClassTrib" value={dash(p.cclass_trib)} />
            <Kv label="Alíquota CBS" value={formatPercent(p.aliquota_cbs)} />
          </div>
        </Section>
      ) : null}

      <Section title="Comercial">
        <div className="ficha-kv-grid cols-4">
          <Kv label="Preço de tabela" value={formatUnitPrice(p.preco_tabela)} />
          <Kv label="Custo médio" value={formatUnitPrice(p.custo_medio)} />
          <Kv label="Estoque mínimo" value={formatQty(p.estoque_minimo)} />
          <Kv
            label="Lead time"
            value={p.lead_time_dias != null ? `${p.lead_time_dias} dia(s)` : '—'}
          />
        </div>
      </Section>

      {showDimensoes ? (
        <Section title="Atributos / bobina (insumos da conversão)">
          <div className="ficha-kv-grid cols-4">
            <Kv
              label="Largura (mm)"
              value={
                largura
                  ? formatDecimalBr(largura, DECIMAL_SCALE.dim)
                  : '—'
              }
            />
            <Kv
              label="Comprimento (m)"
              value={
                comprimento
                  ? formatDecimalBr(comprimento, DECIMAL_SCALE.dim)
                  : '—'
              }
            />
            <Kv
              label="Gramatura total (g/m²)"
              value={
                gramatura
                  ? formatDecimalBr(gramatura, DECIMAL_SCALE.gramatura)
                  : '—'
              }
            />
            <Kv label="Grupo de estoque" value={dash(grupoEstoque)} />
          </div>
        </Section>
      ) : null}

      <p className="ficha-note">
        Família fiscal permanente (Camada A) · especificação sob medida vive no ORC/PED — não
        neste cadastro (estudo 32).
      </p>

      <footer className="ficha-footer">
        <span>
          Uso interno · produto / SKU · emitido por {emitidoPor}
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
