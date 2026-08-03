import type { EtapaDef } from '../types';

export const ETAPAS: EtapaDef[] = [
  {
    ordem: 0,
    codigo: 'PLT',
    titulo: 'Plataforma',
    href: '/',
    modo: 'OPERACIONAL',
    regra: 'Auth, RBAC, multi-empresa e auditoria antes do fluxo operacional.',
  },
  {
    ordem: 1,
    codigo: 'CAD',
    titulo: 'Cadastros',
    href: '/parceiros',
    modo: 'OPERACIONAL',
    regra: 'Parceiros e produtos únicos — prospect pode orçar, PED exige cadastro completo.',
  },
  {
    ordem: 2,
    codigo: 'ORC',
    titulo: 'Orçamento',
    href: '/orcamentos',
    modo: 'HOMOLOGAVEL',
    regra: 'Motor R1–R20 com faixas; aceite formal gera PED com snapshot travado.',
  },
  {
    ordem: 3,
    codigo: 'PED',
    titulo: 'Pedido',
    href: '/pedidos',
    modo: 'HOMOLOGAVEL',
    regra: 'PED é documento-mestre; crédito/sinal libera produção.',
  },
  {
    ordem: 4,
    codigo: 'PRD',
    titulo: 'Produção',
    href: '/producao',
    modo: 'HOMOLOGAVEL',
    regra: 'OP/OS consome MP, registra sobra e retorna PA.',
  },
  {
    ordem: 5,
    codigo: 'EST',
    titulo: 'Estoque',
    href: '/estoque',
    modo: 'HOMOLOGAVEL',
    regra: 'Saldos dual; disponível/reservado; NF-e × OC alimenta MOV.',
  },
  {
    ordem: 6,
    codigo: 'FIS',
    titulo: 'Fiscal',
    href: '/fiscal',
    modo: 'HOMOLOGAVEL',
    regra: 'NF saída idempotente via Focus; metadados no ERP.',
  },
  {
    ordem: 7,
    codigo: 'FIN',
    titulo: 'Financeiro',
    href: '/financeiro',
    modo: 'HOMOLOGAVEL',
    regra: 'TIT → COB → BX com webhook idempotente.',
  },
  {
    ordem: 8,
    codigo: 'ENT',
    titulo: 'Entrega',
    href: '/entrega',
    modo: 'HOMOLOGAVEL',
    regra: 'Romaneio e confirmação; NF antes de expedir quando política exige.',
  },
  {
    ordem: 9,
    codigo: 'HML',
    titulo: 'Homologação',
    href: '/homologacao',
    modo: 'OPERACIONAL',
    regra: 'CA-01…CA-12 com evidência PASS antes do go-live.',
  },
];

export function etapaPorPath(pathname: string): EtapaDef {
  if (pathname.startsWith('/produtos')) return ETAPAS[1];
  if (pathname.startsWith('/nfe') || pathname.startsWith('/compras')) return ETAPAS[5];
  if (pathname.startsWith('/jornada')) return ETAPAS[2];
  const found = ETAPAS.find((e) => e.href === pathname || (e.href !== '/' && pathname.startsWith(e.href)));
  return found ?? ETAPAS[0];
}
