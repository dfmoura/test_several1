import { decisaoModeloCliente, type DecisaoModeloCliente } from '../lib/modeloDecisao';

type Props = {
  decisao?: DecisaoModeloCliente | null;
  /** Quando não há decisão, mostra Pendente. Sem isto, não renderiza. */
  pendente?: boolean;
};

const ROTULO: Record<DecisaoModeloCliente | 'PENDENTE', string> = {
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  PENDENTE: 'Pendente',
};

export function ModeloDecisaoSelo({ decisao, pendente = false }: Props) {
  const valor = decisaoModeloCliente(decisao);
  if (!valor && !pendente) return null;
  const key = valor ?? 'PENDENTE';
  const classe =
    key === 'APROVADO' ? 'aprovado' : key === 'REPROVADO' ? 'reprovado' : 'pendente';

  return <span className={`modelo-decisao modelo-decisao--${classe}`}>{ROTULO[key]}</span>;
}
