/** Tributação do ISSQN (tribISSQN) — layout DANFSe / NFS-e Nacional. */
export const TRIBUTACAO_ISSQN_OPTIONS = [
  { value: '1', label: 'Operação tributável' },
  { value: '2', label: 'Imunidade' },
  { value: '3', label: 'Exportação de serviço' },
  { value: '4', label: 'Não Incidência' },
] as const;

/** Tipo de imunidade (tpImunidade) — quando tribISSQN = 2. */
export const TIPO_IMUNIDADE_OPTIONS = [
  { value: '0', label: 'Imunidade (tipo não informado na nota de origem)' },
  { value: '1', label: 'Patrimônio, renda ou serviços, uns dos outros (CF88, Art 150, VI, a)' },
  { value: '2', label: 'Templos de qualquer culto (CF88, Art 150, VI, b)' },
  {
    value: '3',
    label:
      'Patrimônio, renda ou serviços dos partidos políticos, inclusive suas fundações, das entidades sindicais dos trabalhadores, das instituições de educação e de assistência social, sem fins lucrativos (CF88, Art 150, VI, c)',
  },
  { value: '4', label: 'Livros, jornais, periódicos e o papel destinado a sua impressão (CF88, Art 150, VI, d)' },
  {
    value: '5',
    label:
      'Fonogramas e videofonogramas musicais produzidos no Brasil contendo obras musicais ou literomusicais de autores brasileiros (CF88, Art 150, VI, e)',
  },
] as const;

/** Suspensão da exigibilidade do ISSQN (exigSusp/tpSusp). */
export const SUSPENSAO_EXIGIBILIDADE_OPTIONS = [
  { value: '', label: 'Não' },
  { value: '1', label: 'Exigibilidade do ISSQN Suspensa por Decisão Judicial' },
  { value: '2', label: 'Exigibilidade do ISSQN Suspensa por Processo Administrativo' },
] as const;

/** Regime especial de tributação do prestador (regEspTrib) — layout NFS-e Nacional. */
export const REGIME_ESPECIAL_TRIBUTACAO_OPTIONS = [
  { value: '0', label: 'Nenhum' },
  { value: '1', label: 'Ato Cooperado (Cooperativa)' },
  { value: '2', label: 'Estimativa' },
  { value: '3', label: 'Microempresa Municipal' },
  { value: '4', label: 'Notário ou Registrador' },
  { value: '5', label: 'Profissional Autônomo' },
  { value: '6', label: 'Sociedade de Profissionais' },
] as const;

/** Retenção do ISSQN (tpRetISSQN) — grupo tribMun. */
export const RETENCAO_ISSQN_OPTIONS = [
  { value: '1', label: 'Não Retido' },
  { value: '2', label: 'Retido pelo Tomador' },
  { value: '3', label: 'Retido pelo Intermediário' },
] as const;

const TRIB_ISSQN_LABELS = Object.fromEntries(TRIBUTACAO_ISSQN_OPTIONS.map((o) => [o.value, o.label]));
const TP_IMUNIDADE_LABELS = Object.fromEntries(TIPO_IMUNIDADE_OPTIONS.map((o) => [o.value, o.label]));
const REG_ESP_TRIB_LABELS = Object.fromEntries(REGIME_ESPECIAL_TRIBUTACAO_OPTIONS.map((o) => [o.value, o.label]));
const TP_RET_ISSQN_LABELS = Object.fromEntries(RETENCAO_ISSQN_OPTIONS.map((o) => [o.value, o.label]));
const TP_SUSP_LABELS: Record<string, string> = {
  '1': 'Exigibilidade do ISSQN Suspensa por Decisão Judicial',
  '2': 'Exigibilidade do ISSQN Suspensa por Processo Administrativo',
};

export function labelTributacaoIssqn(code?: string): string {
  return (code && TRIB_ISSQN_LABELS[code]) || '';
}

export function labelTipoImunidade(code?: string): string {
  return (code !== undefined && code !== '' && TP_IMUNIDADE_LABELS[code]) || '';
}

export function labelSuspensaoExigibilidade(code?: string): string {
  if (!code) return 'Não';
  return TP_SUSP_LABELS[code] || '';
}

export function labelRegimeEspecial(code?: string): string {
  if (!code || code === '0') return 'Nenhum';
  return REG_ESP_TRIB_LABELS[code] || 'Nenhum';
}

export function labelRetencaoIssqn(code?: string): string {
  return (code && TP_RET_ISSQN_LABELS[code]) || '';
}
