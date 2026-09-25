import { normalizeTintas, tintasDeComposicao } from '../lib/modeloTintas';

type Props = {
  tintas?: string[] | null;
  className?: string;
  empty?: string | null;
};

/** Eco somente-leitura das cores da arte (fichas / proposta / detalhe). */
export function ModeloTintasTags({ tintas, className, empty = null }: Props) {
  const tags = normalizeTintas(tintas);
  if (tags.length === 0) {
    return empty != null ? <span className="modelo-tintas-empty">{empty}</span> : null;
  }

  return (
    <ul
      className={`modelo-tintas-tags${className ? ` ${className}` : ''}`}
      aria-label="Cores da arte"
    >
      {tags.map((nome) => (
        <li key={nome.toLocaleLowerCase('pt-BR')} className="modelo-tinta-tag">
          {nome}
        </li>
      ))}
    </ul>
  );
}

/** Resumo por arte — grid de spec das fichas (não mistura com estações). */
export function ModeloTintasPorModelo({
  modelos,
  className,
}: {
  modelos: unknown;
  className?: string;
}) {
  const rows = tintasDeComposicao(modelos);
  if (rows.length === 0) return null;
  if (rows.length === 1) {
    return <ModeloTintasTags tintas={rows[0].tintas} className={className} />;
  }

  return (
    <ul className={`modelo-tintas-por-modelo${className ? ` ${className}` : ''}`}>
      {rows.map((m) => (
        <li key={m.nome}>
          <span className="modelo-tintas-por-modelo__nome">{m.nome}</span>
          <ModeloTintasTags tintas={m.tintas} />
        </li>
      ))}
    </ul>
  );
}
