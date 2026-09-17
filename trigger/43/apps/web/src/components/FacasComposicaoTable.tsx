import { formatCurrency } from '../lib/format';
import {
  facasFromSnapshot,
  rotuloFacaLinha,
  somaValorFacas,
  type FacaComposicaoForm,
} from '../lib/orcamentoForm';
import { facaDimensoesExibicao } from '../lib/facasMapa';
import { formatoLabel } from './FacaShapeIcon';

export type FacaComposicaoRow = {
  ordem?: number;
  principal?: boolean;
  n_facas?: number | null;
  label?: string | null;
  medida?: string | null;
  formato?: string | null;
  largura_cm?: number | string | null;
  diametro_cm?: number | string | null;
  tamanho_raw?: string | null;
  tamanho_tipo?: string | null;
  faca_nova?: boolean;
  valor_faca?: number | null;
  prazo_faca_dias?: number | null | '';
};

type Variant = 'pub' | 'data' | 'ficha';

type Props = {
  facas: FacaComposicaoRow[] | FacaComposicaoForm[];
  variant?: Variant;
  className?: string;
  title?: string | null;
  hint?: string | null;
  /** Default: só se algum valor > 0. */
  showValor?: boolean;
};

function toFormRows(facas: Array<FacaComposicaoRow | FacaComposicaoForm>): FacaComposicaoForm[] {
  return facasFromSnapshot({ facas });
}

/**
 * Tabela canônica das facas do ORC (espelho de ModelosComposicaoTable).
 * Principal = geometria; extras = ferramental do mesmo job.
 */
export function FacasComposicaoTable({
  facas,
  variant = 'data',
  className,
  title = 'Facas do orçamento',
  hint,
  showValor,
}: Props) {
  const rows = toFormRows(facas);
  if (rows.length === 0) return null;

  const soma = somaValorFacas(rows);
  const exibirValor = showValor ?? soma > 0;

  const defaultHint =
    rows.length === 1
      ? 'Faca deste serviço (geometria do cálculo).'
      : 'Principal define a geometria do cálculo; extras são ferramental do mesmo job.';

  const tableClass =
    variant === 'pub'
      ? 'orc-pub-modelos-table'
      : variant === 'ficha'
        ? 'ficha-table'
        : 'data-table orc-modelos-table';

  const wrapClass =
    variant === 'pub'
      ? `orc-pub-modelos${className ? ` ${className}` : ''}`
      : `orc-modelos-detalhe${className ? ` ${className}` : ''}`;

  const TitleTag = variant === 'pub' ? 'h3' : 'h4';
  const titleClass =
    variant === 'pub' ? 'orc-pub-modelos-title' : 'orc-subsection-title';

  return (
    <div className={wrapClass}>
      {title ? (
        <TitleTag
          className={titleClass}
          style={variant === 'data' ? { marginBottom: '0.35rem' } : undefined}
        >
          {title}
        </TitleTag>
      ) : null}
      {hint !== null ? (
        <p
          className={variant === 'pub' ? 'orc-pub-hint' : 'form-hint'}
          style={{ marginTop: title ? 0 : undefined, marginBottom: '0.45rem' }}
        >
          {hint ?? defaultHint}
        </p>
      ) : null}
      <div className={variant === 'data' ? 'table-wrap' : undefined}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className="orc-modelo-ord-col">#</th>
              <th>Faca</th>
              <th>Formato · L × T</th>
              {exibirValor ? <th className="orc-modelo-arte-col num">Ferramental</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => {
              const dim = facaDimensoesExibicao({
                medida: f.medida,
                formato: f.formato,
                largura_faca: f.largura_cm ?? null,
                diametro_cm: f.diametro_cm ?? null,
                tamanho_raw: f.tamanho_raw ?? null,
                tamanho_tipo: f.tamanho_tipo ?? null,
              });
              const dims =
                dim.titulo && dim.titulo !== '—'
                  ? dim.titulo
                  : null;
              return (
              <tr key={`${f.ordem}-${i}`}>
                <td className="orc-modelo-ord-col">{f.ordem || i + 1}</td>
                <td>
                  {rotuloFacaLinha(f)}
                  {f.principal ? (
                    <span className="orc-facas-badge" style={{ marginLeft: '0.4rem' }}>
                      Principal
                    </span>
                  ) : null}
                  {f.faca_nova ? (
                    <span className="orc-facas-badge warn" style={{ marginLeft: '0.35rem' }}>
                      Nova
                    </span>
                  ) : null}
                </td>
                <td>
                  {[f.formato ? formatoLabel(f.formato) : null, dims].filter(Boolean).join(' · ') ||
                    '—'}
                </td>
                {exibirValor ? (
                  <td className="orc-modelo-arte-col num">
                    {f.valor_faca > 0 ? formatCurrency(f.valor_faca) : '—'}
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
          {exibirValor && rows.length > 1 ? (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>
                  Total ferramental
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {formatCurrency(soma)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
