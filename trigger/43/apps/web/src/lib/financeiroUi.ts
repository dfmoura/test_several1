/** Labels da carteira TIT (BL-064). */

const ORIGEM: Record<string, string> = {
  FATURA: 'Faturamento',
  ADIANTAMENTO: 'Adiantamento',
  COMISSAO: 'Comissão',
  AVULSO: 'Lançamento pontual',
};

const FORMA: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  TED: 'TED / transferência',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  COMPENSACAO: 'Compensação',
  PERMUTA: 'Permuta / acordo',
};

const FAIXA: Record<string, string> = {
  A_VENCER: 'A vencer',
  VENCE_HOJE: 'Vence hoje',
  D_1_30: '1–30 dias',
  D_31_60: '31–60 dias',
  D_61_90: '61–90 dias',
  D_90_MAIS: '90+ dias',
  VENCIDO: 'Vencido',
};

export const TIT_FORMAS = Object.keys(FORMA);

export function titOrigemLabel(origem: string | null | undefined): string {
  if (!origem) return '—';
  return ORIGEM[origem] ?? origem.replace(/_/g, ' ');
}

export function titFormaLabel(forma: string | null | undefined): string {
  if (!forma) return '—';
  return FORMA[forma] ?? forma.replace(/_/g, ' ');
}

export function titFaixaLabel(faixa: string | null | undefined): string {
  if (!faixa) return '—';
  return FAIXA[faixa] ?? faixa.replace(/_/g, ' ');
}
