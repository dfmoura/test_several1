class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function emitenteHeaders(): Record<string, string> {
  const id = localStorage.getItem('nfe.emitenteId');
  return id ? { 'X-Emitente-Id': id } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...emitenteHeaders(),
      ...init?.headers,
    },
    credentials: 'include',
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    window.location.href = '/login';
    throw new ApiError('Não autenticado', 401);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err.detail ?? err.error ?? 'Erro na requisição', res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as Promise<T>;
}

export { ApiError };

export const api = {
  login: (password: string) =>
    request<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ authenticated: boolean }>('/auth/me'),
  dashboard: () => request<import('./types').DashboardData>('/v1/admin/dashboard'),
  config: () => request<import('./types').SystemConfig>('/v1/admin/config'),
  healthReady: () => request<{ status: string; sefazMock?: boolean; certificados?: unknown[] }>('/health/ready'),
  listEmitentes: () => request<import('./types').Emitente[]>('/v1/emitentes'),
  getEmitente: (id: string) => request<import('./types').Emitente>(`/v1/emitentes/${id}`),
  criarEmitente: (body: unknown) => request('/v1/emitentes', { method: 'POST', body: JSON.stringify(body) }),
  atualizarEmitente: (id: string, body: unknown) =>
    request(`/v1/emitentes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  statusServico: (id: string) =>
    request<{ cStat: string; xMotivo: string; mock: boolean }>(`/v1/emitentes/${id}/status-servico`, { method: 'POST' }),
  listNfe: (params?: { situacao?: string; chave?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.situacao) q.set('situacao', params.situacao);
    if (params?.chave) q.set('chave', params.chave);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return request<{ total: number; valorTotal: number; items: import('./types').NfeRow[]; porSituacao: { situacao: string; total: number }[] }>(`/v1/nfe${qs ? `?${qs}` : ''}`);
  },
  getNfe: (chave: string) => request<import('./types').NfeRow & { itens: unknown[]; eventos: unknown[] }>(`/v1/nfe/${chave}`),
  emitir: (body: unknown, idempotencyKey: string) =>
    request('/v1/nfe', { method: 'POST', body: JSON.stringify(body), headers: { 'X-Idempotency-Key': idempotencyKey } }),
  cancelar: (chave: string, motivo: string) =>
    request(`/v1/nfe/${chave}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
  cce: (chave: string, correcao: string) =>
    request(`/v1/nfe/${chave}/cce`, { method: 'POST', body: JSON.stringify({ correcao }) }),
  inutilizar: (body: unknown) => request('/v1/inutilizacoes', { method: 'POST', body: JSON.stringify(body) }),
  listInutilizacoes: () => request<{ total: number; items: unknown[] }>('/v1/inutilizacoes'),
  listDestinatarios: () => request<unknown[]>('/v1/parceiros'),
  criarDestinatario: (body: unknown) => request('/v1/parceiros', { method: 'POST', body: JSON.stringify(body) }),
  atualizarDestinatario: (id: string, body: unknown) =>
    request(`/v1/parceiros/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listProdutos: () => request<unknown[]>('/v1/produtos'),
  criarProduto: (body: unknown) => request('/v1/produtos', { method: 'POST', body: JSON.stringify(body) }),
  atualizarProduto: (id: string, body: unknown) =>
    request(`/v1/produtos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  catalogos: () => request<Record<string, unknown>>('/v1/catalogos'),

  consultaCnpj: (cnpj: string) =>
    request<import('./cadastroFill').CnpjConsulta>(`/v1/consulta/cnpj/${cnpj.replace(/\D/g, '')}`),
  consultaCep: (cep: string) =>
    request<import('./cadastroFill').CepConsulta>(`/v1/consulta/cep/${cep.replace(/\D/g, '')}`),
  consultaNcm: (q = '', limit = 20) =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(
      `/v1/consulta/ncm?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
  consultaCest: (q = '', ncm?: string) => {
    const params = new URLSearchParams({ q });
    if (ncm) params.set('ncm', ncm);
    return request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cest?${params}`);
  },
  consultaCfop: (q = '', tipo?: 'entrada' | 'saida') => {
    const params = new URLSearchParams({ q });
    if (tipo) params.set('tipo', tipo);
    return request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cfop?${params}`);
  },
  consultaCsosn: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/csosn?q=${encodeURIComponent(q)}`),
  consultaCstIcms: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cst-icms?q=${encodeURIComponent(q)}`),
  consultaCstPisCofins: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cst-pis-cofins?q=${encodeURIComponent(q)}`),
  consultaCstIbsCbs: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cst-ibs-cbs?q=${encodeURIComponent(q)}`),
  consultaCclassTrib: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cclass-trib?q=${encodeURIComponent(q)}`),
  consultaCstIs: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/cst-is?q=${encodeURIComponent(q)}`),
  consultaTipoItemSped: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/tipos-item-sped?q=${encodeURIComponent(q)}`),
  consultaOrigem: (q = '') =>
    request<import('@/components/FiscalCombobox').FiscalOption[]>(`/v1/consulta/origens?q=${encodeURIComponent(q)}`),
  audit: (limit = 50) => request<{ total: number; items: unknown[] }>(`/v1/admin/audit?limit=${limit}`),
  outbox: () => request<{ total: number; items: unknown[] }>('/v1/admin/outbox'),
  lotes: () => request<{ total: number; items: unknown[] }>('/v1/admin/lotes'),
};

export function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v;
}

export function truncate(s: string, n = 44) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function xmlUrl(chave: string) {
  return `/api/v1/nfe/${chave}/xml`;
}

export function danfeUrl(chave: string) {
  return `/api/v1/nfe/${chave}/danfe`;
}
