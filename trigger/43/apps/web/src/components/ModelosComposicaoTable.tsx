import {
  alocarQuantidadePorModelo,
  somaValorArteModelos,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';
import { formatCurrency } from '../lib/format';

export type ModeloComposicaoRow = {
  ordem?: number;
  nome?: string;
  percentual?: number;
  valor_arte?: number;
};

/** Faixa de quantidade do ORC — base do rateio inteiro por modelo. */
export type FaixaQuantidadeRef = {
  key: string | number;
  quantidade: number;
  /** Destaca a coluna da faixa selecionada (proposta ao cliente). */
  highlighted?: boolean;
};

type Variant = 'pub' | 'data' | 'ficha';

type Props = {
  modelos: ModeloComposicaoRow[];
  /** 1+ faixas do ORC; quantidade inteira por arte (rateio canônico). */
  faixas?: FaixaQuantidadeRef[];
  variant?: Variant;
  className?: string;
  /** Omitir título quando o pai já renderiza o heading. */
  title?: string | null;
  hint?: string | null;
  /** Exibir coluna Vlr. Arte (default: só se algum valor > 0). */
  showValorArte?: boolean;
};

function formatQtd(value: number): string {
  return Math.max(0, Math.floor(value) || 0).toLocaleString('pt-BR');
}

function toFormRows(modelos: ModeloComposicaoRow[]): ModeloComposicaoForm[] {
  return modelos.map((m, i) => ({
    ordem: Number(m.ordem) || i + 1,
    nome: String(m.nome ?? '').trim(),
    percentual: Number(m.percentual) || 0,
    valor_arte: Math.max(0, Number(m.valor_arte) || 0),
  }));
}

/**
 * Tabela canônica: nome + valor da arte + quantidade(s) inteira(s) por faixa.
 * Visual apenas — mesmo rateio de `alocarQuantidadePorModelo` / PED futuro.
 */
export function ModelosComposicaoTable({
  modelos,
  faixas = [],
  variant = 'data',
  className,
  title = 'Composição dos modelos',
  hint,
  showValorArte,
}: Props) {
  const rows = toFormRows(modelos).filter((m) => m.nome !== '');
  if (rows.length === 0) return null;

  const faixasOk = faixas.filter((f) => Number.isFinite(f.quantidade) && f.quantidade > 0);
  const alocPorFaixa = faixasOk.map((fx) => ({
    ...fx,
    alocados: alocarQuantidadePorModelo(fx.quantidade, rows),
  }));

  const somaArtes = somaValorArteModelos(rows);
  const exibirArte = showValorArte ?? somaArtes > 0;

  const defaultHint =
    alocPorFaixa.length === 0
      ? 'Distribuição da quantidade por arte neste serviço.'
      : alocPorFaixa.length === 1
        ? 'Quantidade de cada arte neste serviço.'
        : 'Quantidade de cada arte em cada faixa de quantidade.';

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
              <th style={variant === 'ficha' ? { width: '3rem' } : undefined}>#</th>
              <th>{variant === 'pub' ? 'Modelo' : 'Modelo (arte)'}</th>
              {exibirArte ? (
                <th className="orc-modelo-arte-col">Vlr. Arte</th>
              ) : null}
              {alocPorFaixa.length === 0 ? (
                <th className="orc-modelo-qtd-col">Quantidade</th>
              ) : (
                alocPorFaixa.map((fx) => (
                  <th
                    key={fx.key}
                    className={`orc-modelo-qtd-col${fx.highlighted ? ' is-active' : ''}`}
                    title={
                      alocPorFaixa.length > 1
                        ? `Quantidade inteira na faixa de ${formatQtd(fx.quantidade)}`
                        : 'Quantidade inteira por arte'
                    }
                  >
                    {alocPorFaixa.length === 1 ? 'Quantidade' : formatQtd(fx.quantidade)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={`${m.ordem}-${m.nome}`}>
                <td>{m.ordem || i + 1}</td>
                <td>{m.nome}</td>
                {exibirArte ? (
                  <td className="orc-modelo-arte-col">
                    {m.valor_arte > 0 ? formatCurrency(m.valor_arte) : '—'}
                  </td>
                ) : null}
                {alocPorFaixa.length === 0 ? (
                  <td className="orc-modelo-qtd-col">—</td>
                ) : (
                  alocPorFaixa.map((fx) => (
                    <td
                      key={fx.key}
                      className={`orc-modelo-qtd-col${fx.highlighted ? ' is-active' : ''}`}
                    >
                      {formatQtd(fx.alocados[i]?.quantidade ?? 0)}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
          {alocPorFaixa.length > 1 || exibirArte ? (
            <tfoot>
              <tr className="orc-modelos-table-total">
                <td colSpan={2}>Total</td>
                {exibirArte ? (
                  <td className="orc-modelo-arte-col">{formatCurrency(somaArtes)}</td>
                ) : null}
                {alocPorFaixa.length === 0 ? (
                  <td className="orc-modelo-qtd-col">—</td>
                ) : (
                  alocPorFaixa.map((fx) => (
                    <td
                      key={fx.key}
                      className={`orc-modelo-qtd-col${fx.highlighted ? ' is-active' : ''}`}
                    >
                      {formatQtd(fx.quantidade)}
                    </td>
                  ))
                )}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
