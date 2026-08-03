import axios, { type AxiosError } from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export const TOKEN_KEY = 'rlp_token';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as {
      detail?: string | { msg?: string }[] | { message?: string; detail?: string };
      message?: string;
    } | undefined;
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).join('; ');
    if (data?.detail && typeof data.detail === 'object') {
      const d = data.detail as { message?: string; detail?: string };
      if (d.message) return d.message;
      if (typeof d.detail === 'string') return d.detail;
    }
    return data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido';
}

export function formatMoney(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
}

export function formatQty(value: string | number | null | undefined, decimals = 4): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCnpj(value: string | null | undefined): string {
  if (!value) return '';
  const d = value.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dayjs(iso).format('DD/MM/YYYY HH:mm');
}

export type Usuario = {
  id: number;
  email: string;
  nome: string;
  role: string;
  perfil?: string;
  empresa_id: number;
  ativo?: boolean;
  permissoes?: string[];
};

export const PERFIS = [
  'ADMIN',
  'FISCAL',
  'COMERCIAL',
  'FINANCEIRO',
  'PRODUCAO',
  'COMPRAS',
  'EXPEDICAO',
  'CONSULTA',
] as const;

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: Usuario }>('/api/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<Usuario>('/api/auth/me').then((r) => r.data),
};

export const usuariosApi = {
  list: () => api.get<Usuario[]>('/api/usuarios').then((r) => r.data),
  create: (body: { email: string; nome: string; password: string; role: string }) =>
    api.post<Usuario>('/api/usuarios', body).then((r) => r.data),
  update: (id: number, body: { nome?: string; role?: string; password?: string }) =>
    api.put<Usuario>(`/api/usuarios/${id}`, body).then((r) => r.data),
  bloquear: (id: number, ativo: boolean, motivo?: string) =>
    api.post<Usuario>(`/api/usuarios/${id}/bloquear`, { ativo, motivo }).then((r) => r.data),
};

export const plataformaApi = {
  status: () => api.get('/api/health').then((r) => ({
    ambiente: r.data.environment,
    versao: '1.0.0',
    banco: 'postgresql',
    simular: r.data.simular_integracoes,
    integracoes: [
      { nome: 'Focus NFe', status: r.data.simular_integracoes ? 'SIMULADO' : 'ATIVO' },
      { nome: 'Banco (Inter/Sicoob)', status: r.data.simular_integracoes ? 'SIMULADO' : 'ATIVO' },
    ],
  })),
};

export const homologacaoApi = {
  resumo: () => api.get('/api/homologacao/resumo').then((r) => r.data),
  criterios: () => api.get('/api/homologacao/criterios').then((r) => r.data),
  atualizar: (id: string, body: { status: string; evidencias?: string }) =>
    api.put(`/api/homologacao/criterios/${id}`, body).then((r) => r.data),
  goNogo: () => api.get('/api/homologacao/go-nogo').then((r) => r.data),
  seedJornada: () => api.post('/api/homologacao/seed-jornada').then((r) => r.data),
};

export const jornadaApi = {
  contagens: () =>
    api.get('/api/homologacao/resumo').then((r) => ({
      ...r.data.contagens,
      filas: r.data.filas,
      etapas: r.data.etapas,
    })),
};

export const metaApi = {
  etapas: () => api.get('/api/meta/etapas').then((r) => r.data),
  catalog: () => api.get('/api/catalog').then((r) => r.data),
  rbac: () => api.get('/api/meta/rbac').then((r) => r.data),
};

export const lookupApi = {
  cnpj: (cnpj: string) => api.get(`/api/lookups/cnpj/${cnpj.replace(/\D/g, '')}`).then((r) => r.data),
  cep: (cep: string) => api.get(`/api/lookups/cep/${cep.replace(/\D/g, '')}`).then((r) => r.data),
  ncmSearch: (search: string) =>
    api.get('/api/lookups/ncm', { params: { search } }).then((r) => r.data as NcmLookupItem[]),
  ncmCodigo: (codigo: string) =>
    api.get(`/api/lookups/ncm/codigo/${codigo.replace(/\D/g, '')}`).then((r) => r.data as NcmLookupDetail),
  cest: (ncm: string) =>
    api.get('/api/lookups/cest', { params: { ncm: ncm.replace(/\D/g, '') } }).then((r) => r.data as CestLookup),
  ncmPorLargura: (largura_mm: number, material: string = 'PP') =>
    api
      .get('/api/lookups/ncm-sugestao-largura', { params: { largura_mm, material } })
      .then((r) => r.data as NcmLarguraSugestao),
  cfopSearch: (search?: string, tipo?: string) =>
    api
      .get('/api/lookups/cfop', { params: { search: search || '', tipo } })
      .then((r) => r.data as CfopItem[]),
  fiscalProduto: (tipo: string) =>
    api.get('/api/lookups/fiscal-produto', { params: { tipo } }).then((r) => r.data as FiscalProdutoSugestao),
  origens: () => api.get('/api/lookups/origens').then((r) => r.data as CodeLabel[]),
  tiposItemSped: () => api.get('/api/lookups/tipos-item-sped').then((r) => r.data as CodeLabel[]),
};

export type CodeLabel = { codigo: string; descricao: string };

export type CfopItem = CodeLabel & { tipo?: string };

export type FiscalProdutoSugestao = {
  tipo_produto: string;
  tipo_item_sped: string;
  origem: string;
  csosn: string;
  cfop_entrada: CfopItem | null;
  cfop_saida_dentro: CfopItem | null;
  cfop_saida_fora: CfopItem | null;
  mensagem: string;
  origens: CodeLabel[];
  tipos_item_sped: CodeLabel[];
  fonte?: string;
};

export type NcmLookupItem = {
  codigo: string;
  codigo_formatado?: string;
  descricao?: string;
};

export type CestCandidato = {
  codigo: string;
  codigo_formatado?: string;
  descricao?: string;
  segmento?: string;
  recomendado_rlp?: boolean;
  justificativa?: string;
};

export type CestLookup = {
  ncm: string;
  ncm_formatado?: string;
  cest_recomendado: string | null;
  sugerir_vazio: boolean;
  candidatos: CestCandidato[];
  mensagem: string;
  fonte?: string;
};

export type NcmLookupDetail = NcmLookupItem & {
  cest?: CestLookup;
  data_inicio?: string;
  data_fim?: string;
};

export type NcmLarguraSugestao = {
  largura_mm: number;
  limite_mm: number;
  faixa: string;
  material: string;
  ncm: string;
  ncm_formatado?: string;
  descricao_regra: string;
};

export const parceirosApi = {
  list: (params?: { q?: string; tipo?: string; com_credito?: boolean }) =>
    api.get('/api/parceiros', { params }).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/api/parceiros', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.put(`/api/parceiros/${id}`, body).then((r) => r.data),
  credito: (id: number) => api.get(`/api/parceiros/${id}/credito`).then((r) => r.data),
  sugerirLimite: (id: number, body: { compra_mensal_estimada: number; restricao_bureau?: boolean }) =>
    api.post(`/api/parceiros/${id}/credito/sugerir-limite`, body).then((r) => r.data),
};

export const produtosApi = {
  list: (params?: { q?: string; tipo?: string }) =>
    api.get('/api/produtos', { params }).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/api/produtos', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.put(`/api/produtos/${id}`, body).then((r) => r.data),
};

export type FacasListResponse = {
  items: Record<string, unknown>[];
  total: number;
  formatos?: string[];
  meta?: Record<string, string>;
};

export const facasApi = {
  list: (params?: {
    q?: string;
    medida?: string;
    maquina?: string;
    formato?: string;
    so_completas?: boolean;
    completas?: boolean;
  }) =>
    api
      .get<FacasListResponse>('/api/facas', {
        params: {
          q: params?.q,
          medida: params?.medida,
          maquina: params?.maquina,
          formato: params?.formato,
          so_completas: params?.so_completas ?? params?.completas ?? false,
        },
      })
      .then((r) => r.data),
};

export const orcamentosApi = {
  list: () => api.get('/api/orcamentos').then((r) => r.data),
  get: (id: number) => api.get(`/api/orcamentos/${id}`).then((r) => r.data),
  calcular: (body: Record<string, unknown>) =>
    api.post('/api/orcamentos/calcular', body).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/api/orcamentos', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.put(`/api/orcamentos/${id}`, body).then((r) => r.data),
  enviar: (id: number) => api.post(`/api/orcamentos/${id}/enviar`).then((r) => r.data),
  decidir: (id: number, body: { aprovado: boolean; faixa_index?: number; motivo?: string }) =>
    api.post(`/api/orcamentos/${id}/decidir`, body).then((r) => r.data),
};

export const pedidosApi = {
  list: () => api.get('/api/pedidos').then((r) => r.data),
  get: (id: number) => api.get(`/api/pedidos/${id}`).then((r) => r.data),
  filaCredito: () => api.get('/api/credito/fila').then((r) => r.data),
  liberar: (
    id: number,
    modo: 'credito' | 'adiantamento' = 'credito',
    justificativa?: string,
  ) => api.post(`/api/pedidos/${id}/liberar`, { modo, justificativa }).then((r) => r.data),
  iniciarProducao: (id: number) =>
    api.post(`/api/pedidos/${id}/iniciar-producao`).then((r) => r.data),
  faturar: (id: number, tipo: 'NFE' | 'NFSE' = 'NFSE', justificativa_credito?: string) =>
    api.post(`/api/pedidos/${id}/faturar`, { tipo, justificativa_credito }).then((r) => r.data),
  entregar: (id: number, body?: Record<string, unknown>) =>
    api.post(`/api/pedidos/${id}/entregar`, body ?? { volumes: 1 }).then((r) => r.data),
};

export const producaoApi = {
  list: () => api.get('/api/producao').then((r) => r.data),
  concluir: (id: number) => api.post(`/api/producao/${id}/concluir`).then((r) => r.data),
};

export const estoqueApi = {
  saldos: () => api.get('/api/estoque/saldos').then((r) => r.data),
  movimentos: () => api.get('/api/estoque/movimentos').then((r) => r.data),
  criarMovimento: (body: Record<string, unknown>) =>
    api.post('/api/estoque/movimentos', body).then((r) => r.data),
  reservar: (body: Record<string, unknown>) =>
    api.post('/api/estoque/reservas', body).then((r) => r.data),
  liberarReserva: (body: Record<string, unknown>) =>
    api.post('/api/estoque/reservas/liberar', body).then((r) => r.data),
};

export const comprasApi = {
  necessidades: (status?: string) =>
    api.get('/api/compras/necessidades', { params: status ? { status } : undefined }).then((r) => r.data),
  criarNecessidade: (body: Record<string, unknown>) =>
    api.post('/api/compras/necessidades', body).then((r) => r.data),
  gerarReposicao: () => api.post('/api/compras/necessidades/gerar-reposicao').then((r) => r.data),
  cancelarNecessidade: (id: number) =>
    api.post(`/api/compras/necessidades/${id}/cancelar`).then((r) => r.data),
  ordens: (status?: string) =>
    api.get('/api/compras/ordens', { params: status ? { status } : undefined }).then((r) => r.data),
  criarOrdem: (body: Record<string, unknown>) =>
    api.post('/api/compras/ordens', body).then((r) => r.data),
  statusOrdem: (id: number, status: string) =>
    api.post(`/api/compras/ordens/${id}/status`, { status }).then((r) => r.data),
};

export const nfeApi = {
  list: () => api.get('/api/nfe').then((r) => r.data),
  upload: (files: FileList | File[]) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    return api.post('/api/nfe/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  aceitar: (id: number, itens: Array<Record<string, unknown>>, ordem_compra_id?: number | null) =>
    api
      .post(`/api/nfe/${id}/accept`, {
        itens,
        ordem_compra_id: ordem_compra_id ?? undefined,
      })
      .then((r) => r.data),
  rejeitar: (id: number) => api.post(`/api/nfe/${id}/reject`).then((r) => r.data),
};

export const fiscalApi = {
  list: () => api.get('/api/fiscal').then((r) => r.data),
};

export const financeiroApi = {
  titulos: (tipo?: string) =>
    api.get('/api/financeiro/titulos', { params: tipo ? { tipo } : undefined }).then((r) => r.data),
  baixar: (id: number, body?: Record<string, unknown>) =>
    api.post(`/api/financeiro/titulos/${id}/baixar`, body ?? {}).then((r) => r.data),
};

export const entregaApi = {
  list: () => api.get('/api/entregas').then((r) => r.data),
  confirmar: (id: number) => api.post(`/api/entregas/${id}/confirmar`).then((r) => r.data),
};

export const empresasApi = {
  list: () => api.get('/api/empresas').then((r) => r.data),
  atual: () => api.get('/api/empresas/atual').then((r) => r.data),
};

export const naturezasApi = {
  list: (params?: { grupo?: number; so_lancamento?: boolean }) =>
    api.get('/api/naturezas', { params }).then((r) => r.data),
};

export const patrimonioApi = {
  list: () => api.get('/api/patrimonio').then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/api/patrimonio', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.patch(`/api/patrimonio/${id}`, body).then((r) => r.data),
};

export const devolucoesApi = {
  list: () => api.get('/api/devolucoes').then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/api/devolucoes', body).then((r) => r.data),
};

export default api;
