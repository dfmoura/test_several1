/**
 * Tributação federal (tribFed) — layout DANFSe NT-007/008.
 * vRetIRRF, vRetCP, vRetCSLL (soma PIS+COFINS+CSLL retidos), piscofins/vPis e vCofins (apuração própria).
 */

/** Tipo de retenção PIS/COFINS/CSLL (piscofins/tpRetPisCofins). */
export const TP_RET_PIS_COFINS_OPTIONS = [
  { value: '0', label: 'PIS/COFINS/CSLL Não Retidos' },
  { value: '1', label: 'PIS/COFINS Retidos (transição)' },
  { value: '2', label: 'PIS/COFINS Não Retidos (transição)' },
  { value: '3', label: 'PIS/COFINS/CSLL Retidos' },
  { value: '4', label: 'PIS/COFINS Retidos, CSLL Não Retido' },
  { value: '5', label: 'PIS Retido, COFINS/CSLL Não Retidos' },
  { value: '6', label: 'COFINS Retido, PIS/CSLL Não Retidos' },
  { value: '7', label: 'PIS Não Retido, COFINS/CSLL Retidos' },
  { value: '8', label: 'PIS/COFINS Não Retidos, CSLL Retido' },
  { value: '9', label: 'COFINS Não Retido, PIS/CSLL Retidos' },
] as const;

export type TpRetPisCofins = (typeof TP_RET_PIS_COFINS_OPTIONS)[number]['value'];

const TP_RET_PIS_COFINS_LABELS = Object.fromEntries(
  TP_RET_PIS_COFINS_OPTIONS.map((o) => [o.value, o.label]),
);

export function labelTpRetPisCofins(code?: string): string {
  return (code !== undefined && code !== '' && TP_RET_PIS_COFINS_LABELS[code]) || '';
}

/** Indica retenção de contribuições sociais (PIS/COFINS/CSLL) conforme tpRetPisCofins. */
export function isRetencaoContribSociais(code?: string): boolean {
  if (!code) return false;
  return code !== '0' && code !== '2';
}
