/** Situação perante o Simples Nacional (opSimpNac) — prest/regTrib. */
export const OP_SIMP_NAC_OPTIONS = [
  { value: '1', label: 'Não Optante' },
  { value: '2', label: 'Optante — Microempreendedor Individual (MEI)' },
  { value: '3', label: 'Optante — Microempresa ou Empresa de Pequeno Porte (ME/EPP)' },
] as const;

/** Regime de apuração dos tributos no Simples Nacional (regApTribSN) — quando opSimpNac = 2 ou 3. */
export const REG_AP_TRIB_SN_OPTIONS = [
  {
    value: '1',
    label: 'Regime de apuração dos tributos federais e municipal pelo SN',
  },
  {
    value: '2',
    label:
      'Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal do tributo',
  },
  {
    value: '3',
    label:
      'Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federal e municipal de cada tributo',
  },
] as const;

/** Modo de informação do valor aproximado dos tributos (totTrib). */
export const MODO_TOT_TRIB_OPTIONS = [
  {
    value: 'valores',
    label: 'Preencher os valores monetários em cada NFS-e emitida',
  },
  {
    value: 'percentuais',
    label: 'Configurar os valores percentuais correspondentes',
  },
  {
    value: 'aliquota_sn',
    label: 'Informar alíquota do Simples Nacional',
  },
] as const;

export type OpSimpNac = (typeof OP_SIMP_NAC_OPTIONS)[number]['value'];
export type RegApTribSN = (typeof REG_AP_TRIB_SN_OPTIONS)[number]['value'];
export type ModoTotTrib = (typeof MODO_TOT_TRIB_OPTIONS)[number]['value'];

const OP_SIMP_NAC_LABELS = Object.fromEntries(OP_SIMP_NAC_OPTIONS.map((o) => [o.value, o.label]));
const REG_AP_TRIB_SN_LABELS = Object.fromEntries(REG_AP_TRIB_SN_OPTIONS.map((o) => [o.value, o.label]));

export function labelOpSimpNac(code?: string): string {
  return (code && OP_SIMP_NAC_LABELS[code]) || '';
}

export function labelRegApTribSN(code?: string): string {
  return (code && REG_AP_TRIB_SN_LABELS[code]) || '';
}

export function isOptanteSimplesNacional(opSimpNac?: string): boolean {
  return opSimpNac === '2' || opSimpNac === '3';
}

/** Default opSimpNac a partir do cadastro Receita (optanteSimples). ME/EPP é o caso mais comum. */
export function defaultOpSimpNac(optanteSimples?: boolean): OpSimpNac {
  return optanteSimples ? '3' : '1';
}

/** Preenche defaults oficiais antes da validação/emissão. */
export function applyEmissaoDefaults(
  input: import('./entities.js').EmitirNfseInput,
  optanteSimples?: boolean,
): import('./entities.js').EmitirNfseInput {
  const opSimpNac = input.opSimpNac ?? defaultOpSimpNac(optanteSimples);
  const regApTribSN =
    input.regApTribSN ?? (isOptanteSimplesNacional(opSimpNac) ? ('1' as RegApTribSN) : undefined);

  return {
    ...input,
    opSimpNac,
    regApTribSN,
    totTrib: input.totTrib ?? {
      modo: 'aliquota_sn',
      aliquotaSimplesNacional: 6,
    },
  };
}
