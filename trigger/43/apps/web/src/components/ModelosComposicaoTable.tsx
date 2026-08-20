import {
  alocarQuantidadePorModelo,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';

export type ModeloComposicaoRow = {
  ordem?: number;
  nome?: string;
  percentual?: number;
};

/** Faixa de quantidade do ORC — base do rateio inteiro por %. */
export type FaixaQuantidadeRef = {
  key: string | number;
  quantidade: number;
  /** Destaca a coluna da faixa selecionada (proposta ao cliente). */
  highlighted?: boolean;
};

type Variant = 'pub' | 'data' | 'ficha';

type Props = {
  modelos: ModeloComposicaoRow[];
  /** 1+ faixas do ORC; qtd inteira = floor(Q×% / 100), resto no último. */
  faixas?: FaixaQuantidadeRef[];
  variant?: Variant;
  className?: string;
  /** Omitir título quando o pai já renderiza o heading. */
  title?: string | null;
  hint?: string | null;
};

function formatPct(value: number | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function formatQtd(value: number): string {
  return Math.max(0, Math.floor(value) || 0).toLocaleString('pt-BR');
}

function toFormRows(modelos: ModeloComposicaoRow[]): ModeloComposicaoForm[] {
  return modelos.map((m, i) => ({
    ordem: Number(m.ordem) || i + 1,
    nome: String(m.nome ?? '').trim(),
    percentual: Number(m.percentual) || 0,
  }));
}

/**
 * Tabela canônica: nome + % + quantidade(s) inteira(s) por faixa.
 * Visual apenas — mesmo rateio de `alocarQuantidadePorModelo` / PED futuro.
 */
export function ModelosComposicaoTable({
  modelos,
  faixas = [],
  variant = 'data',
  className,
  title = 'Composição dos modelos',
  hint,
}: Props) {
  const rows = toFormRows(modelos).filter((m) => m.nome !== '');
  if (rows.length === 0) return null;

  const faixasOk = faixas.filter((f) => Number.isFinite(f.quantidade) && f.quantidade > 0);
  const alocPorFaixa = faixasOk.map((fx) => ({
    ...fx,
    alocados: alocarQuantidadePorModelo(fx.quantidade, rows),
  }));

  const defaultHint =
    alocPorFaixa.length === 0
      ? 'Distribuição percentual da quantidade por arte neste serviço.'
      : alocPorFaixa.length === 1
        ? 'Distribuição da quantidade por arte neste serviço (% e quantidade inteira).'
        : 'Distribuição por arte: % fixo e quantidade inteira em cada faixa.';

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
              <th
                style={variant === 'ficha' ? { width: '7rem' } : undefined}
                className="orc-modelo-pct-col"
              >
                % quantidade
              </th>
              {alocPorFaixa.map((fx) => (
                <th
                  key={fx.key}
                  className={`orc-modelo-qtd-col${fx.highlighted ? ' is-active' : ''}`}
                  title={
                    alocPorFaixa.length > 1
                      ? `Quantidade inteira na faixa de ${formatQtd(fx.quantidade)}`
                      : 'Quantidade inteira (rateio do %)'
                  }
                >
                  {alocPorFaixa.length === 1 ? 'Quantidade' : formatQtd(fx.quantidade)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={`${m.ordem}-${m.nome}`}>
                <td>{m.ordem || i + 1}</td>
                <td>{m.nome}</td>
                <td className="orc-modelo-pct-col">{formatPct(m.percentual)}</td>
                {alocPorFaixa.map((fx) => (
                  <td
                    key={fx.key}
                    className={`orc-modelo-qtd-col${fx.highlighted ? ' is-active' : ''}`}
                  >
                    {formatQtd(fx.alocados[i]?.quantidade ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
