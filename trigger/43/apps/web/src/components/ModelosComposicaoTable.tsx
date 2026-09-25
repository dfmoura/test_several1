import {
  alocarQuantidadePorModelo,
  reconciliarMatrizFaixaRow,
  somaValorArteModelos,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';
import { formatCurrency } from '../lib/format';
import { normalizeTintas } from '../lib/modeloTintas';
import { ModeloArteTrigger } from './ModeloArteOverlay';
import { ModeloTintasTags } from './ModeloTintasTags';

export type ModeloComposicaoRow = {
  ordem?: number;
  nome?: string;
  percentual?: number;
  valor_arte?: number;
  arte_url?: string | null;
  tintas?: string[] | null;
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
  /** Matriz [faixaIdx][modeloIdx] do snapshot — colunas independentes por faixa. */
  quantidadesPorFaixa?: number[][];
  variant?: Variant;
  className?: string;
  /** Omitir título quando o pai já renderiza o heading. */
  title?: string | null;
  hint?: string | null;
  /** Exibir coluna Vlr. Arte (default: só se algum valor > 0). */
  showValorArte?: boolean;
  /** Eco discreto no overlay da arte (proposta / ficha-cliente). */
  arteCaption?: string | null;
  /** Código de saída do item — desenho + rótulo no overlay. */
  arteSaida?: string | null;
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
    arte_url: String(m.arte_url ?? '').trim() || null,
    tintas: normalizeTintas(m.tintas),
  }));
}

/**
 * Tabela canônica: nome + valor da arte + quantidade(s) inteira(s) por faixa.
 * Visual apenas — mesmo rateio de `alocarQuantidadePorModelo` / PED futuro.
 */
export function ModelosComposicaoTable({
  modelos,
  faixas = [],
  quantidadesPorFaixa,
  variant = 'data',
  className,
  title = 'Composição dos modelos',
  hint,
  showValorArte,
  arteCaption,
  arteSaida,
}: Props) {
  const rows = toFormRows(modelos).filter((m) => m.nome !== '');
  if (rows.length === 0) return null;

  const faixasOk = faixas.filter((f) => Number.isFinite(f.quantidade) && f.quantidade > 0);
  const alocPorFaixa = faixasOk.map((fx) => {
    const faixaIdx = typeof fx.key === 'number' ? fx.key : Number(fx.key) || 0;
    const stored = quantidadesPorFaixa?.[faixaIdx];
    const qs =
      Array.isArray(stored) && stored.length === rows.length
        ? reconciliarMatrizFaixaRow(stored, fx.quantidade)
        : alocarQuantidadePorModelo(fx.quantidade, rows).map((r) => r.quantidade);
    return { ...fx, qs };
  });

  const somaArtes = somaValorArteModelos(rows);
  const exibirArte = showValorArte ?? somaArtes > 0;

  const defaultHint =
    variant === 'pub'
      ? null
      : alocPorFaixa.length === 0
        ? 'Distribuição da quantidade por arte neste serviço.'
        : alocPorFaixa.length === 1
          ? 'Quantidade de cada arte neste serviço.'
          : 'Quantidade de cada arte em cada faixa de quantidade.';

  const isPub = variant === 'pub';
  const tableClass = isPub
    ? 'orc-pub-modelos-table'
    : variant === 'ficha'
      ? 'ficha-table'
      : 'data-table orc-modelos-table';

  const wrapClass = isPub
    ? `orc-pub-modelos${className ? ` ${className}` : ''}`
    : `orc-modelos-detalhe${className ? ` ${className}` : ''}`;

  const TitleTag = isPub ? 'h3' : 'h4';
  /** Pub: mesmo subtítulo denso de Faixas (`orc-pub-item-sub`). */
  const titleClass = isPub ? 'orc-pub-item-sub' : 'orc-subsection-title';
  const numClass = isPub ? 'orc-pub-num orc-modelo-qtd-col' : 'orc-modelo-qtd-col';
  const arteClass = isPub ? 'orc-pub-num orc-modelo-arte-col' : 'orc-modelo-arte-col';
  const resolvedHint = hint !== undefined ? hint : defaultHint;

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
      {resolvedHint ? (
        <p
          className={isPub ? 'orc-pub-hint orc-pub-hint--tight' : 'form-hint'}
          style={{ marginTop: title ? 0 : undefined, marginBottom: '0.45rem' }}
        >
          {resolvedHint}
        </p>
      ) : null}
      <div className={isPub || variant === 'data' ? 'table-wrap' : undefined}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th
                className={isPub ? 'orc-pub-modelos-ord' : undefined}
                style={variant === 'ficha' ? { width: '3rem' } : undefined}
              >
                #
              </th>
              <th>{isPub ? 'Modelo' : 'Modelo (arte)'}</th>
              {exibirArte ? (
                <th className={arteClass}>{isPub ? 'Arte' : 'Vlr. Arte'}</th>
              ) : null}
              {alocPorFaixa.length === 0 ? (
                <th className={numClass}>{isPub ? 'Qtd' : 'Quantidade'}</th>
              ) : (
                alocPorFaixa.map((fx) => (
                  <th
                    key={fx.key}
                    className={`${numClass}${fx.highlighted ? ' is-active' : ''}`}
                    title={
                      alocPorFaixa.length > 1
                        ? `Quantidade inteira na faixa de ${formatQtd(fx.quantidade)}`
                        : 'Quantidade inteira por arte'
                    }
                  >
                    {alocPorFaixa.length === 1
                      ? isPub
                        ? 'Qtd'
                        : 'Quantidade'
                      : formatQtd(fx.quantidade)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={`${m.ordem}-${m.nome}`}>
                <td className={isPub ? 'orc-pub-modelos-ord' : undefined}>
                  {m.ordem || i + 1}
                </td>
                <td>
                  <span className="orc-modelo-nome-com-arte">
                    {(m.arte_url || '').trim() ? (
                      <ModeloArteTrigger
                        nome={m.nome}
                        arteUrl={m.arte_url}
                        dense
                        caption={arteCaption}
                        saidaEtiqueta={arteSaida}
                      />
                    ) : null}
                    <span>{m.nome}</span>
                  </span>
                  <ModeloTintasTags tintas={m.tintas} />
                </td>
                {exibirArte ? (
                  <td className={arteClass}>
                    {m.valor_arte > 0 ? formatCurrency(m.valor_arte) : '—'}
                  </td>
                ) : null}
                {alocPorFaixa.length === 0 ? (
                  <td className={numClass}>—</td>
                ) : (
                  alocPorFaixa.map((fx) => (
                    <td
                      key={fx.key}
                      className={`${numClass}${fx.highlighted ? ' is-active' : ''}`}
                    >
                      {formatQtd(fx.qs[i] ?? 0)}
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
                  <td className={arteClass}>{formatCurrency(somaArtes)}</td>
                ) : null}
                {alocPorFaixa.length === 0 ? (
                  <td className={numClass}>—</td>
                ) : (
                  alocPorFaixa.map((fx) => (
                    <td
                      key={fx.key}
                      className={`${numClass}${fx.highlighted ? ' is-active' : ''}`}
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
