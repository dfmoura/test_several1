import { normalizeTintas } from '../lib/modeloTintas';

type Props = {
  tintas?: string[] | null;
  className?: string;
};

/** Eco somente-leitura das cores da arte (fichas / proposta / detalhe). */
export function ModeloTintasTags({ tintas, className }: Props) {
  const tags = normalizeTintas(tintas);
  if (tags.length === 0) return null;

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
