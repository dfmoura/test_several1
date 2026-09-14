/** Sentido de saída da etiqueta na bobina — espelha App\Support\SaidaEtiqueta (PHP). */

export const SAIDA_ETIQUETAS = ['ESQUERDA', 'DIREITA', 'DEITADA', 'PE'] as const;

export type SaidaEtiquetaCodigo = (typeof SAIDA_ETIQUETAS)[number];

export const SAIDA_ETIQUETA_OPCOES: Array<{
  codigo: SaidaEtiquetaCodigo;
  /** Rótulo completo (ficha, proposta, guia). */
  rotulo: string;
  /** Rótulo curto no picker compacto. */
  rotuloCurto: string;
  /** Path em public/ */
  asset: string;
}> = [
  {
    codigo: 'ESQUERDA',
    rotulo: 'Saída à esquerda',
    rotuloCurto: 'Esquerda',
    asset: '/orcamento/saida-etiqueta/esquerda.svg',
  },
  {
    codigo: 'DIREITA',
    rotulo: 'Saída à direita',
    rotuloCurto: 'Direita',
    asset: '/orcamento/saida-etiqueta/direita.svg',
  },
  {
    codigo: 'DEITADA',
    rotulo: 'Saída deitada',
    rotuloCurto: 'Deitada',
    asset: '/orcamento/saida-etiqueta/deitada.svg',
  },
  {
    codigo: 'PE',
    rotulo: 'Saída de pé',
    rotuloCurto: 'De pé',
    asset: '/orcamento/saida-etiqueta/pe.svg',
  },
];

export function saidaEtiquetaLabel(code: string | null | undefined): string | null {
  const opt = SAIDA_ETIQUETA_OPCOES.find((o) => o.codigo === code);
  return opt ? opt.rotulo : null;
}

export function saidaEtiquetaAsset(code: string | null | undefined): string | null {
  return SAIDA_ETIQUETA_OPCOES.find((o) => o.codigo === code)?.asset ?? null;
}

export function isSaidaEtiqueta(code: string | null | undefined): code is SaidaEtiquetaCodigo {
  return SAIDA_ETIQUETAS.includes(code as SaidaEtiquetaCodigo);
}
