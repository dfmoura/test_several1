/** Catálogo NCM curado + busca (local first; BrasilAPI no BFF). */

export interface NcmItem {
  codigo: string;
  descricao: string;
  destaque?: boolean;
}

export interface CestItem {
  codigo: string;
  descricao: string;
  observacao?: string;
  ncms: string[];
}

export const NCM_CATALOG: NcmItem[] = [
  { codigo: '39191010', descricao: 'Chapas/folhas/tiras autoadesivas de plásticos, rolos ≤ 20 cm — polipropileno', destaque: true },
  { codigo: '39191090', descricao: 'Chapas/folhas/tiras autoadesivas de plásticos, rolos ≤ 20 cm — outras', destaque: true },
  { codigo: '39199010', descricao: 'Chapas/folhas/tiras autoadesivas de plásticos — outras — polipropileno', destaque: true },
  { codigo: '39199090', descricao: 'Chapas/folhas/tiras autoadesivas de plásticos — outras — outras', destaque: true },
  { codigo: '48114190', descricao: 'Papel e cartão gomados ou adesivos — autoadesivos — outros', destaque: true },
  { codigo: '48114110', descricao: 'Papel e cartão autoadesivos — rolos largura ≤ 15 cm' },
  { codigo: '48114900', descricao: 'Outros papéis/cartões gomados ou adesivos' },
  { codigo: '32151100', descricao: 'Tintas de impressão — pretas' },
  { codigo: '32151900', descricao: 'Tintas de impressão — outras' },
  { codigo: '96121000', descricao: 'Fitas impressoras (ribbons)', destaque: true },
  { codigo: '84713012', descricao: 'Máquinas automáticas de processamento de dados, portáteis, peso ≤ 10 kg' },
  { codigo: '84714110', descricao: 'Máquinas digitais de processamento de dados' },
  { codigo: '85285200', descricao: 'Monitores capazes de conexão direta a máquina automática' },
  { codigo: '85044010', descricao: 'Carregadores de acumuladores' },
  { codigo: '22021000', descricao: 'Águas, incluindo águas minerais e gaseificadas, com açúcar' },
  { codigo: '22030000', descricao: 'Cervejas de malte' },
  { codigo: '24022000', descricao: 'Cigarros contendo tabaco' },
  { codigo: '27101932', descricao: 'Óleos combustíveis' },
  { codigo: '30049099', descricao: 'Medicamentos — outros' },
  { codigo: '87032310', descricao: 'Automóveis de passageiros' },
];

export const CEST_CATALOG: CestItem[] = [
  {
    codigo: '1001000',
    descricao: 'Tubos, tubos e mangueiras de plásticos — para construções',
    observacao: 'Só aplica se destinado a construções — tipicamente NÃO a etiquetas',
    ncms: ['39191010', '39191090', '39199010', '39199090'],
  },
  {
    codigo: '2003600',
    descricao: 'Tintas e vernizes',
    ncms: ['32151100', '32151900'],
  },
  {
    codigo: '2805800',
    descricao: 'Papéis autoadesivos (hipótese ST — validar com contador)',
    ncms: ['48114190', '48114110', '48114900'],
  },
];

export function buscarNcm(query: string, limit = 20): NcmItem[] {
  const q = query.trim().toLowerCase().replace(/\D/g, '').length >= 4 && /^\d/.test(query.trim())
    ? query.trim().replace(/\D/g, '')
    : query.trim().toLowerCase();
  if (!q) {
    return [...NCM_CATALOG].sort((a, b) => Number(b.destaque) - Number(a.destaque)).slice(0, limit);
  }
  const digits = q.replace(/\D/g, '');
  return NCM_CATALOG.filter((n) => {
    if (digits.length >= 2 && /^\d+$/.test(q.replace(/\./g, ''))) {
      return n.codigo.includes(digits);
    }
    return n.codigo.includes(digits) || n.descricao.toLowerCase().includes(q);
  }).slice(0, limit);
}

export function buscarCest(query: string, ncm?: string, limit = 20): CestItem[] {
  const q = query.trim().toLowerCase();
  let list = CEST_CATALOG;
  if (ncm) {
    const n = ncm.replace(/\D/g, '');
    list = list.filter((c) => c.ncms.some((x) => x.startsWith(n.slice(0, 4)) || x === n));
  }
  if (!q) return list.slice(0, limit);
  const digits = q.replace(/\D/g, '');
  return list.filter(
    (c) => c.codigo.includes(digits) || c.descricao.toLowerCase().includes(q),
  ).slice(0, limit);
}
