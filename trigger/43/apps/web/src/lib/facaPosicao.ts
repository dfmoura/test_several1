/** Posição da faca no cilindro — espelha App\Support\FacaPosicao (PHP). */
export const FACA_POSICOES = ['CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA'] as const;

export type FacaPosicaoCodigo = (typeof FACA_POSICOES)[number];

export const FACA_POSICAO_OPCOES: Array<{ codigo: FacaPosicaoCodigo; rotulo: string; simbolo: string }> = [
  { codigo: 'CIMA', rotulo: 'Cima', simbolo: '↑' },
  { codigo: 'BAIXO', rotulo: 'Baixo', simbolo: '↓' },
  { codigo: 'ESQUERDA', rotulo: 'Esquerda', simbolo: '←' },
  { codigo: 'DIREITA', rotulo: 'Direita', simbolo: '→' },
];

export function facaPosicaoLabel(code: string | null | undefined): string | null {
  const opt = FACA_POSICAO_OPCOES.find((o) => o.codigo === code);
  return opt ? `${opt.simbolo} ${opt.rotulo}` : null;
}

export function facaPosicaoSimbolo(code: string | null | undefined): string {
  return FACA_POSICAO_OPCOES.find((o) => o.codigo === code)?.simbolo ?? '';
}

export function isFacaPosicao(code: string | null | undefined): code is FacaPosicaoCodigo {
  return FACA_POSICOES.includes(code as FacaPosicaoCodigo);
}
