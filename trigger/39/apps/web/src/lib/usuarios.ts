/** Perfis oficiais — ORGANIZACAO_USUARIOS_PERFIS_ACESSO.txt §2 */
export const ROLE_CATALOG = [
  {
    id: 'ADMIN',
    label: 'Admin',
    summary: 'Parametrização, usuários e cadastros estruturais. Não operar rotina.',
    tone: 'admin',
  },
  {
    id: 'FISCAL',
    label: 'Fiscal',
    summary: 'NF-e/NFS-e, escrituração e cadastro fiscal de produto/parceiro.',
    tone: 'ops',
  },
  {
    id: 'FINANCEIRO',
    label: 'Financeiro',
    summary: 'Contas, bancos, conciliação, limite de crédito e dados bancários.',
    tone: 'ops',
  },
  {
    id: 'COMERCIAL',
    label: 'Comercial',
    summary: 'Pedidos de venda e cadastro comercial de clientes.',
    tone: 'ops',
  },
  {
    id: 'PRODUCAO',
    label: 'Produção',
    summary: 'Ordens, apontamentos e movimentação de estoque (sem custos).',
    tone: 'ops',
  },
  {
    id: 'COMPRAS',
    label: 'Compras',
    summary: 'Pedidos de compra, fornecedores e entrada de XML.',
    tone: 'ops',
  },
  {
    id: 'EXPEDICAO',
    label: 'Expedição',
    summary: 'Separação, romaneio e confirmação de entrega (balcão ou transporte).',
    tone: 'ops',
  },
  {
    id: 'CONSULTA',
    label: 'Consulta',
    summary: 'Somente leitura — contador externo, auditoria e consultas.',
    tone: 'read',
  },
] as const;

export type RoleId = (typeof ROLE_CATALOG)[number]['id'];

const SOD_PAIRS: Array<{ a: RoleId; b: RoleId; message: string }> = [
  {
    a: 'ADMIN',
    b: 'FINANCEIRO',
    message: 'ADMIN não deve operar rotina financeira — use um segundo usuário operacional.',
  },
  {
    a: 'ADMIN',
    b: 'FISCAL',
    message: 'ADMIN não deve operar rotina fiscal — use um segundo usuário operacional.',
  },
  {
    a: 'ADMIN',
    b: 'COMERCIAL',
    message: 'ADMIN não deve operar rotina comercial — use um segundo usuário operacional.',
  },
  {
    a: 'ADMIN',
    b: 'COMPRAS',
    message: 'ADMIN não deve operar rotina de compras — use um segundo usuário operacional.',
  },
  {
    a: 'ADMIN',
    b: 'PRODUCAO',
    message: 'ADMIN não deve operar rotina de produção — use um segundo usuário operacional.',
  },
  {
    a: 'ADMIN',
    b: 'EXPEDICAO',
    message: 'ADMIN não deve operar rotina de expedição — use um segundo usuário operacional.',
  },
  {
    a: 'COMERCIAL',
    b: 'FINANCEIRO',
    message: 'Quem emite pedido de venda não pode alterar limite de crédito no mesmo login.',
  },
  {
    a: 'COMPRAS',
    b: 'FINANCEIRO',
    message: 'Quem cadastra fornecedor não deve acumular liberação financeira no mesmo login.',
  },
];

export function findSodConflict(roles: string[]): string | null {
  const set = new Set(roles);
  for (const pair of SOD_PAIRS) {
    if (set.has(pair.a) && set.has(pair.b)) {
      return pair.message;
    }
  }
  return null;
}

export function rolesCompatibleWith(selected: string[], candidate: string): boolean {
  return findSodConflict([...selected.filter((r) => r !== candidate), candidate]) === null;
}

export function roleLabel(role: string): string {
  return ROLE_CATALOG.find((r) => r.id === role)?.label ?? role;
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) issues.push('uma letra maiúscula');
  if (!/[a-z]/.test(password)) issues.push('uma letra minúscula');
  if (!/[0-9]/.test(password)) issues.push('um número');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('um símbolo');
  return issues;
}

export function formatApiFieldErrors(
  details?: Record<string, string[]>,
  fallback = 'Não foi possível salvar.',
): string {
  if (!details) return fallback;
  const messages = Object.values(details).flat().filter(Boolean);
  return messages[0] ?? fallback;
}
