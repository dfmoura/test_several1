class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
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

  settings: () => request<import('./types').AppSettings>('/v1/admin/settings'),

  updateSettings: (body: import('./types').UpdateSettingsPayload) =>
    request<import('./types').AppSettings>('/v1/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  resetSetting: (field: string) =>
    request<import('./types').AppSettings>('/v1/admin/settings/reset', {
      method: 'POST',
      body: JSON.stringify({ field }),
    }),

  updateConsolePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/v1/admin/settings/console-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  healthReady: () => request<import('./types').HealthReady>('/health/ready'),

  listNfse: (params?: {
    situacao?: string;
    chave?: string;
    de?: string;
    ate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.situacao) q.set('situacao', params.situacao);
    if (params?.chave) q.set('chave', params.chave);
    if (params?.de) q.set('de', params.de);
    if (params?.ate) q.set('ate', params.ate);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return request<import('./types').NfseListagem>(`/v1/nfse${qs ? `?${qs}` : ''}`);
  },

  listNfseRecebidas: (params?: {
    chave?: string;
    de?: string;
    ate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.chave) q.set('chave', params.chave);
    if (params?.de) q.set('de', params.de);
    if (params?.ate) q.set('ate', params.ate);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return request<import('./types').NfseRecebidasListagem>(`/v1/nfse/recebidas${qs ? `?${qs}` : ''}`);
  },

  getNfseRecebida: (chave: string) =>
    request<import('./types').NfseRecebida>(`/v1/nfse/recebidas/${chave}`),

  getNfse: (chave: string, refresh = false) =>
    request<import('./types').Nfse>(`/v1/nfse/${chave}${refresh ? '?refresh=true' : ''}`),

  getEventos: (chave: string) =>
    request<import('./types').EventoNfse[]>(`/v1/nfse/${chave}/eventos`),

  emitir: (body: unknown, idempotencyKey: string) =>
    request('/v1/nfse', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),

  cancelar: (chave: string, body: { codigoMotivo: string; motivo: string }) =>
    request(`/v1/nfse/${chave}/cancelar`, { method: 'POST', body: JSON.stringify(body) }),

  substituir: (chave: string, body: unknown, idempotencyKey: string) =>
    request(`/v1/nfse/${chave}/substituir`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),

  syncDfe: () => request<{ processados: number; ultimoNsu: string }>('/v1/sync/dfe', { method: 'POST' }),

  audit: (limit = 50, offset = 0) =>
    request<{ total: number; items: unknown[] }>(`/v1/admin/audit?limit=${limit}&offset=${offset}`),

  outbox: (limit = 50, offset = 0, published?: boolean) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (published !== undefined) q.set('published', String(published));
    return request<{ total: number; items: unknown[] }>(`/v1/admin/outbox?${q}`);
  },

  dfe: (limit = 50, offset = 0, processado?: boolean) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (processado !== undefined) q.set('processado', String(processado));
    return request<{ total: number; items: unknown[] }>(`/v1/admin/dfe?${q}`);
  },

  dps: (limit = 50, offset = 0, status?: string) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) q.set('status', status);
    return request<{ total: number; items: unknown[] }>(`/v1/admin/dps?${q}`);
  },

  nsu: () => request<{ ultimoNsu: string; dfePendente: number; syncIntervalSec: number }>('/v1/admin/nsu'),

  xmlUrl: (chave: string) => `/api/v1/nfse/${chave}/xml`,
  xmlRecebidaUrl: (chave: string) => `/api/v1/nfse/recebidas/${chave}/xml`,
  pdfUrl: (chave: string) => `/api/v1/nfse/${chave}/danfse`,

  consultarCnpj: (cnpj: string) =>
    request<import('./types').CartaoCnpjData & { fonte: string }>(
      `/v1/cadastro/cnpj/${cnpj.replace(/\D/g, '')}`,
    ),

  buscarTributacaoNacional: (q: string, limit = 20) =>
    request<{ total: number; items: import('./types').TributacaoNacionalItem[] }>(
      `/v1/cadastro/tributacao-nacional?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  consultarTributacaoNacional: (codigo: string) =>
    request<import('./types').TributacaoNacionalItem>(
      `/v1/cadastro/tributacao-nacional/${codigo.replace(/\D/g, '')}`,
    ),

  buscarNbs: (q: string, limit = 20, codigoTribNac?: string) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (codigoTribNac) params.set('codigoTribNac', codigoTribNac.replace(/\D/g, ''));
    return request<{ total: number; items: import('./types').NbsItem[] }>(
      `/v1/cadastro/nbs?${params.toString()}`,
    );
  },

  consultarNbs: (codigo: string) =>
    request<import('./types').NbsItem>(`/v1/cadastro/nbs/${codigo.replace(/\D/g, '')}`),
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Formata chave de acesso NFS-e (50 dígitos) em blocos de 4. */
export function formatChaveAcesso(chave: string) {
  const d = chave.replace(/\D/g, '');
  if (d.length !== 50) return chave;
  return d.match(/.{1,4}/g)?.join(' ') ?? chave;
}

export function formatTelefoneDisplay(fone: string) {
  const d = fone.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return fone;
}

export function truncate(str: string, len = 20) {
  if (str.length <= len) return str;
  return `${str.slice(0, len)}…`;
}
