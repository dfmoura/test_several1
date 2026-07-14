const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body != null && init.body !== '';

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText }));
    throw new Error(err.detail ?? err.title ?? err.error ?? 'Erro na requisição');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (password: string) =>
    request<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ ok: boolean }>('/auth/me'),

  status: () => request<StatusResponse>('/status'),

  emitir: (payload: EmitirPayload) =>
    request<EmitirResult>('/nfse/emitir', { method: 'POST', body: JSON.stringify(payload) }),

  listarEmitidas: () => request<ListaEmitidas>('/nfse/emitidas'),

  consultarEmitida: (chave: string) => request<NotaEmitida>(`/nfse/emitidas/${chave}`),

  cancelar: (chave: string, motivo: string) =>
    request<{ chaveAcesso: string; situacao: string }>(`/nfse/emitidas/${chave}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ codigoMotivo: '1', motivo }),
    }),

  listarRecebidas: () => request<ListaRecebidas>('/nfse/recebidas'),

  sincronizar: () => request<{ processados: number; ultimoNsu: string }>('/sync', { method: 'POST' }),

  downloadUrl: (path: string) => `${BASE}${path}`,
};

export interface StatusResponse {
  ambiente: string;
  ambienteLabel: string;
  govMock: boolean;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    codigoMunicipio: string;
    inscricaoMunicipal?: string;
    certificadoAtivo: boolean;
  };
  certificado: {
    ativo: boolean;
    cnpj?: string;
    validade?: string;
    diasParaExpirar?: number;
    erro?: string;
  };
  totais: { emitidas: number; recebidas: number; canceladas: number };
}

export interface EmitirPayload {
  tomador: { tipo: 'PF' | 'PJ'; cpfCnpj: string; razaoSocial?: string; nome?: string };
  servico: {
    codigoServico: string;
    codigoNbs: string;
    descricao: string;
    codigoMunicipioIncidencia: string;
  };
  valores: { valorServico: number };
  opSimpNac?: '1' | '2' | '3';
  regApTribSN?: '1' | '2' | '3';
}

export interface EmitirResult {
  chaveAcesso: string;
  situacao: string;
  valorServico: number;
  emitidaEm: string;
}

export interface NotaEmitida {
  chaveAcesso: string;
  situacao: string;
  valorServico: number;
  tomadorNome?: string;
  tomadorDoc?: string;
  descricao?: string;
  emitidaEm: string;
}

export interface ListaEmitidas {
  total: number;
  items: NotaEmitida[];
}

export interface NotaRecebida {
  chave: string;
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  valorServico: number;
  emitidaEm?: string;
  situacao?: string;
  recebidoEm: string;
}

export interface ListaRecebidas {
  total: number;
  items: NotaRecebida[];
  cnpjTomador: string;
}
