import { markSessaoServerTouch } from './sessaoTouch';

const TOKEN_KEY = 'flexorc_token';
const EMPRESA_KEY = 'flexorc_empresa_id';

export const AUTH_EXPIRED_EVENT = 'flexorc-auth-expired';
export const AUTH_EXPIRED_MSG_KEY = 'flexorc_auth_msg';

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  payload?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    details?: Record<string, string[]>,
    payload?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.payload = payload;
  }

  get code(): string | undefined {
    const code = this.payload?.code;
    return typeof code === 'string' ? code : undefined;
  }
}

function notifyAuthExpired(message: string, code?: string): void {
  if (!getToken()) {
    return;
  }
  try {
    sessionStorage.setItem(AUTH_EXPIRED_MSG_KEY, message);
  } catch {
    /* ignore quota / private mode */
  }
  setToken(null);
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { message, code } }),
  );
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getEmpresaId(): number | null {
  const raw = localStorage.getItem(EMPRESA_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export function setEmpresaId(id: number | null): void {
  if (id) {
    localStorage.setItem(EMPRESA_KEY, String(id));
  } else {
    localStorage.removeItem(EMPRESA_KEY);
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  empresaId?: number | null;
  skipAuth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined && !options.formData) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const empresaId = options.empresaId ?? getEmpresaId();
    if (empresaId) {
      headers['X-Empresa-Id'] = String(empresaId);
    }
  }

  const response = await fetch(`/api/v1${path}`, {
    method: options.method ?? (options.body !== undefined || options.formData ? 'POST' : 'GET'),
    headers,
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ??
      `Erro ${response.status}`;
    const details = (payload as { errors?: Record<string, string[]> })?.errors;
    const jsonPayload =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
    if (response.status === 401 && !options.skipAuth) {
      notifyAuthExpired(
        message,
        typeof jsonPayload?.code === 'string' ? jsonPayload.code : undefined,
      );
    }
    throw new ApiError(message, response.status, details, jsonPayload);
  }

  if (!options.skipAuth && getToken()) {
    markSessaoServerTouch();
  }

  return payload as T;
}

async function downloadFile(path: string, filename: string, empresaId?: number | null): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'text/csv, application/octet-stream, */*',
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const empId = empresaId ?? getEmpresaId();
  if (empId) {
    headers['X-Empresa-Id'] = String(empId);
  }

  const response = await fetch(`/api/v1${path}`, { headers });
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    let jsonPayload: Record<string, unknown> | undefined;
    try {
      const payload = await response.json();
      jsonPayload =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
      message = (payload as { message?: string })?.message ?? message;
    } catch {
      // ignore
    }
    if (response.status === 401) {
      notifyAuthExpired(
        message,
        typeof jsonPayload?.code === 'string' ? jsonPayload.code : undefined,
      );
    }
    throw new ApiError(message, response.status, undefined, jsonPayload);
  }

  if (getToken()) {
    markSessaoServerTouch();
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string, empresaId?: number | null) =>
    request<T>(path, { empresaId }),

  /** Sem Sanctum / empresa — link público do cliente. */
  publicGet: <T>(path: string) => request<T>(path, { skipAuth: true }),

  post: <T>(path: string, body?: unknown, empresaId?: number | null) =>
    request<T>(path, { method: 'POST', body, empresaId }),

  publicPost: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body, skipAuth: true }),

  postForm: <T>(path: string, formData: FormData, empresaId?: number | null) =>
    request<T>(path, { method: 'POST', formData, empresaId }),

  put: <T>(path: string, body: unknown, empresaId?: number | null) =>
    request<T>(path, { method: 'PUT', body, empresaId }),

  patch: <T>(path: string, body?: unknown, empresaId?: number | null) =>
    request<T>(path, { method: 'PATCH', body, empresaId }),

  delete: <T>(path: string, empresaId?: number | null) =>
    request<T>(path, { method: 'DELETE', empresaId }),

  download: (path: string, filename: string, empresaId?: number | null) =>
    downloadFile(path, filename, empresaId),

  login: (
    email: string,
    password: string,
    conta?: string,
    opts?: { encerrarSessaoAnterior?: boolean },
  ) =>
    request<{
      token: string;
      token_type: string;
      user: { id: number; codigo: string; name: string; email: string };
      empresas: { id: number; codigo: string; razao_social: string; nome_fantasia: string | null }[];
    }>('/auth/login', {
      method: 'POST',
      body: {
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(conta?.trim() ? { conta: conta.trim() } : {}),
        password,
        ...(opts?.encerrarSessaoAnterior ? { encerrar_sessao_anterior: true } : {}),
      },
      skipAuth: true,
    }),

  registerConta: (body: { admin_name: string; admin_email: string; admin_password: string }) =>
    request<{
      token: string;
      token_type: string;
      user: { id: number; codigo: string; email: string; name: string };
    }>('/auth/registrar-conta', {
      method: 'POST',
      body,
      skipAuth: true,
    }),

  registerEmpresa: (body: Record<string, string>) =>
    request<{
      token: string;
      token_type: string;
      empresa: { id: number; codigo: string; razao_social: string };
      user: { id: number; codigo?: string; email: string; name: string };
    }>('/auth/registrar-empresa', {
      method: 'POST',
      body,
      skipAuth: true,
    }),

  abrirEmpresa: (body: Record<string, string>) =>
    request<{
      empresa: { id: number; codigo: string; razao_social: string };
      user: { id: number; codigo: string; email: string; name: string };
    }>('/auth/abrir-empresa', {
      method: 'POST',
      body,
    }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => request<AuthMeResponse>('/auth/me'),

  /** Presence keepalive — renova last_used_at sem montar o /me. */
  pingSessao: () =>
    request<{ ok: boolean; sessao: SessaoAcessoPolitica }>('/auth/ping', { method: 'POST' }),

  plataformaMetricas: () => request<{ data: PlataformaMetricas }>('/plataforma/metricas'),

  plataformaContas: (params?: { q?: string; saude?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.saude && params.saude !== 'todas') qs.set('saude', params.saude);
    if (params?.status) qs.set('status', params.status);
    if (params?.page && params.page > 1) qs.set('page', String(params.page));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ data: PlataformaContaResumo[]; meta: PlataformaListaMeta }>(
      `/plataforma/contas${suffix}`,
    );
  },

  plataformaCriarConta: (body: {
    name: string;
    email: string;
    password?: string;
    cortesia_dias?: number;
    cortesia_motivo?: string;
  }) =>
    request<{ data: PlataformaContaResumo & { senha_temporaria?: string } }>('/plataforma/contas', {
      method: 'POST',
      body,
    }),

  plataformaConta: (id: number) =>
    request<{ data: PlataformaContaDetalhe }>(`/plataforma/contas/${id}`),

  plataformaBonificarConta: (
    id: number,
    body: { dias?: number; ate?: string; motivo?: string; encerrar?: boolean; revogar?: boolean },
  ) =>
    request<{ data: PlataformaContaResumo }>(`/plataforma/contas/${id}/cortesia`, {
      method: 'POST',
      body,
    }),

  plataformaInterIntegracao: () =>
    request<{ data: InterIntegracaoData }>('/plataforma/integracoes/inter'),

  plataformaSalvarInterIntegracao: (body: Record<string, string | boolean>) =>
    request<{ data: InterIntegracaoData }>('/plataforma/integracoes/inter', {
      method: 'PUT',
      body,
    }),

  plataformaTestarInterIntegracao: () =>
    request<{ data: { ok: boolean; mensagem: string } }>('/plataforma/integracoes/inter/testar', {
      method: 'POST',
      body: {},
    }),

  plataformaBillingCatalogo: () =>
    request<{ data: BillingCatalogoData }>('/plataforma/billing/catalogo'),

  plataformaSalvarBillingCatalogo: (body: { valor: number; ciclo?: string; descricao?: string }) =>
    request<{ data: BillingCatalogoData }>('/plataforma/billing/catalogo', {
      method: 'PUT',
      body,
    }),

  plataformaAuditoria: (page?: number) => {
    const suffix = page && page > 1 ? `?page=${page}` : '';
    return request<{ data: PlataformaAuditoriaItem[]; meta: PlataformaListaMeta }>(
      `/plataforma/auditoria${suffix}`,
    );
  },
};

export type AuthUser = {
  id: number;
  codigo: string;
  name: string;
  email: string;
  ativo: boolean;
  empresa_default_id: number | null;
  parceiro_id: number | null;
  ultimo_login_em: string | null;
  vigencia_ate?: string | null;
};

export type AuthEmpresa = {
  id: number;
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  padrao: boolean;
  venda_ativa?: boolean;
  estoque_ativo?: boolean;
  origem_latitude?: string | null;
  origem_longitude?: string | null;
};

export type ProdutoFlexorcSuperficie = {
  ate_envio_link: boolean;
  sinal: boolean;
  financeiro: boolean;
};

export type BillingAviso = {
  tipo: 'cortesia' | 'cortesia_encerrada' | 'pendente' | 'suspensa' | string;
  titulo: string;
  mensagem: string;
  acao: string;
  to: string;
  dias_restantes: number | null;
  valor_formatado: string | null;
};

export type SessaoAcessoPolitica = {
  idle_minutes: number;
  max_usuarios_simultaneos: number;
};

export type AuthMeResponse = {
  user: AuthUser;
  roles: string[];
  permissions: string[];
  empresas: AuthEmpresa[];
  empresa_contexto: { id: number; codigo: string } | null;
  conta_flexorc?: { max_empresas: number; empresas_count: number };
  billing_aviso?: BillingAviso | null;
  produto_flexorc?: ProdutoFlexorcSuperficie;
  console_plataforma?: boolean;
  sessao?: SessaoAcessoPolitica;
};

export type PlataformaListaMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type InterIntegracaoData = {
  configurado: boolean;
  ativo: boolean;
  operador: string | null;
  ambiente: string;
  tem_client_id: boolean;
  tem_client_secret: boolean;
  tem_certificado: boolean;
  tem_chave: boolean;
  tem_webhook_secret: boolean;
  billing_provider_atual: string;
  webhook_url: string;
  documentacao: string;
  front_base: string;
};

export type BillingCatalogoData = {
  fonte: 'banco' | 'env';
  valor: number;
  ciclo: string;
  ciclo_label: string;
  descricao: string;
  vigente_desde: string | null;
  atualizado_em: string | null;
  billing_provider: string;
  impacto: {
    contas_em_dia: number;
    mrr_estimado: number;
  };
  env_fallback: {
    valor: number;
    ciclo: string;
    descricao: string;
  };
  sync?: {
    pix_invalidados: number;
    asaas_atualizadas: number;
    asaas_ignoradas: number;
    asaas_erros: string[];
  };
  alterado?: boolean;
};

export type PlataformaMetricas = {
  contas: {
    total: number;
    em_dia: number;
    cortesia: number;
    pendente: number;
    suspensa: number;
  };
  novas_7d: number;
  novas_30d: number;
  mrr_estimado: number;
  valor_mensalidade: number;
  ciclo: string;
  max_empresas_conta: number;
};

export type PlataformaCortesia = {
  vigente: boolean;
  ate: string;
  ate_formatada: string;
  dias_restantes: number | null;
  motivo: string | null;
  concedida_em?: string | null;
};

export type PlataformaContaResumo = {
  id: number;
  user_id: number;
  master: {
    id: number;
    codigo: string;
    name: string;
    email: string;
    ativo: boolean;
    ultimo_login_em: string | null;
    created_at: string | null;
  } | null;
  billing_status: string;
  billing_provider: string | null;
  billing_customer_ref: string | null;
  billing_subscription_ref: string | null;
  billing_metodo_em: string | null;
  pagamento_autenticado: boolean;
  acesso_liberado?: boolean;
  cortesia: PlataformaCortesia | null;
  saude: 'em_dia' | 'cortesia' | 'pendente' | 'suspensa' | string;
  saude_label: string;
  empresas_count: number;
  usuarios_count: number;
  max_empresas: number;
  created_at: string | null;
  senha_temporaria?: string;
};

export type PlataformaContaDetalhe = PlataformaContaResumo & {
  empresas: {
    id: number;
    codigo: string;
    cnpj: string | null;
    razao_social: string;
    nome_fantasia: string | null;
    situacao: string;
    self_service: boolean;
    billing_status: string | null;
    catalogo_conferido: boolean;
  }[];
  usuarios: {
    id: number;
    codigo: string;
    name: string;
    email: string;
    ativo: boolean;
    ultimo_login_em: string | null;
    roles: string[];
    empresas: { id: number; codigo: string }[];
  }[];
  fatura: {
    valor: number;
    ciclo: string;
    descricao: string;
    fornecedor: string;
    produto: string;
  };
};

export type PlataformaAuditoriaItem = {
  id: number;
  acao: string;
  entidade: string | null;
  entidade_id: number | null;
  para: Record<string, unknown> | null;
  ip: string | null;
  created_at: string | null;
  user: { id: number; name: string; email: string; codigo: string } | null;
};

export type PainelCard = {
  id: string;
  label: string;
  hint: string;
  valor: number | string;
  formato: 'inteiro' | 'moeda';
  to: string;
  alerta: boolean;
};

export type PainelFila = {
  id: string;
  label: string;
  hint: string;
  count: number;
  to: string;
};

export type PainelData = {
  empresa: {
    id: number;
    codigo: string;
    nome: string;
    venda_ativa: boolean;
    estoque_ativo: boolean;
  } | null;
  modulos: {
    comercial: boolean;
    pedidos: boolean;
    producao: boolean;
    expedicao: boolean;
    compras: boolean;
    estoque: boolean;
    financeiro: boolean;
  };
  cadeia: PainelCard[];
  filas: PainelFila[];
  ativacao?: AtivacaoData;
};

export type AtivacaoPasso = {
  id: string;
  label: string;
  hint: string;
  feito: boolean;
  obrigatorio: boolean;
  fase?: 'alta' | 'operacao';
  to: string | null;
};

export type ContaFlexorcFatura = {
  produto: string;
  fornecedor: string;
  pagador: {
    codigo: string;
    razao_social: string;
    cnpj: string;
  };
  plano: string;
  periodicidade: string;
  periodicidade_label: string;
  descricao: string;
  valor: number;
  valor_cobranca: number;
  valor_formatado: string;
  meios: string[];
  cofre: string;
  status: string;
  status_label: string;
  modo?: 'pago' | 'cortesia' | 'cortesia_encerrada' | 'pendente' | 'suspensa' | string;
  paga: boolean;
  pagamento_autenticado?: boolean;
  pago_em: string | null;
  proxima_cobranca_em?: string | null;
  proxima_cobranca_formatada?: string | null;
  dias_ate_proxima?: number | null;
  renovacao_label?: string;
  cobranca_antecipada?: boolean;
  primeira_cobranca_em?: string | null;
  primeira_cobranca_formatada?: string | null;
  alerta_cortesia?: boolean;
  alerta_cortesia_nivel?: 'info' | 'warning' | 'urgent' | null;
  cortesia?: {
    vigente: boolean;
    ate: string;
    ate_formatada: string;
    dias_restantes: number | null;
    motivo: string | null;
    alerta?: boolean;
    alerta_nivel?: 'info' | 'warning' | 'urgent' | null;
  } | null;
  camada_esta: string;
  camada_nao_e: string;
  pix_copia_cola?: string | null;
  pix_qr_base64?: string | null;
  pix_vencimento?: string | null;
  pix_expira_em?: string | null;
  pode_gerar_pix?: boolean;
};

export type AtivacaoData = {
  origem: 'self_service' | 'legado';
  pronta: boolean;
  pagamento_pendente?: boolean;
  certificado_a1_pendente?: boolean;
  certificado_a1_alerta?: boolean;
  certificado_a1_alerta_nivel?: 'info' | 'warning' | 'urgent' | null;
  certificado_a1_status?: string | null;
  certificado_a1_dias_para_vencer?: number | null;
  certificado_a1_valido_ate?: string | null;
  certificado_a1_mensagem?: string | null;
  pode_enviar_orcamento: boolean;
  billing_provider: string;
  billing_status: string;
  checkout_url: string | null;
  pix_copia_cola?: string | null;
  pix_qr_base64?: string | null;
  pix_vencimento?: string | null;
  pix_expira_em?: string | null;
  pix_expirado?: boolean;
  pode_gerar_pix?: boolean;
  pode_confirmar_demo: boolean;
  proximo: string | null;
  passos: AtivacaoPasso[];
  conta?: ContaFlexorcFatura | null;
};

export type ImplantacaoStatus = 'PENDENTE' | 'OK' | 'RECUSADO' | 'NA';

export type ImplantacaoEvidencia = {
  ok: boolean;
  label: string;
};

export type ImplantacaoItem = {
  codigo: string;
  nome: string;
  porque: string;
  onda: number;
  onda_nome: string;
  superficie: 'flexorc' | 'erp';
  elo: boolean;
  paralelo: boolean;
  rota: string | null;
  linha: string;
  status_dev: ImplantacaoStatus;
  status_cliente: ImplantacaoStatus;
  obs_dev: string | null;
  obs_cliente: string | null;
  validado_dev_em: string | null;
  validado_cliente_em: string | null;
  validado_dev_por_nome: string | null;
  validado_cliente_por_nome: string | null;
  evidencia: ImplantacaoEvidencia | null;
};

export type ImplantacaoResumoBloco = {
  total: number;
  aceitos: number;
  prontos_para_cliente: number;
  pendentes_dev: number;
  bloqueados: number;
  na: number;
  pct_aceitos: number;
};

export type ImplantacaoMatriz = {
  empresa: { id: number; codigo: string; nome: string };
  resumo: {
    geral: ImplantacaoResumoBloco;
    flexorc: ImplantacaoResumoBloco;
    erp: ImplantacaoResumoBloco;
    ja_operamos_ate: { codigo: string; nome: string } | null;
    proximo_elo: { codigo: string; nome: string; linha?: string } | null;
  };
  ondas: { onda: number; nome: string }[];
  itens: ImplantacaoItem[];
};

export type EmpresaFiscalHistorico = {
  id: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ie: string | null;
  im: string | null;
  iest: string | null;
  ie_status: string | null;
  regime: string | null;
  crt: number | null;
  motivo: string | null;
};

export type EmpresaContaFinanceira = {
  id?: number;
  codigo?: string;
  tipo: string;
  descricao: string;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix_chave: string | null;
  principal: boolean;
  ativa: boolean;
  ordem?: number;
  saldo_abertura: string | number | null;
  saldo_abertura_em: string | null;
  observacao: string | null;
};

/** Metadados do cofre A1 — nunca inclui PFX/senha. */
export type EmpresaCertificadoA1 = {
  cadastrado: boolean;
  arquivo_nome?: string | null;
  tamanho_bytes?: number | null;
  subject_cn?: string | null;
  issuer_cn?: string | null;
  serial?: string | null;
  fingerprint_sha256?: string | null;
  cnpj_certificado?: string | null;
  cnpj_bate_com_empresa?: boolean | null;
  apto_operacao?: boolean;
  valido_de?: string | null;
  valido_ate?: string | null;
  dias_para_vencer?: number | null;
  status?: 'VIGENTE' | 'A_VENCER' | 'VENCIDO' | 'AINDA_NAO_VALIDO' | string;
  alerta?: boolean;
  alerta_nivel?: 'info' | 'warning' | 'urgent' | null;
  pendencias?: string[];
  uploaded_at?: string | null;
  uploaded_by?: number | null;
  tem_senha?: boolean;
  aviso?: string;
  aviso_cofre?: string;
  message?: string;
};

export type UsuarioRef = {
  id: number;
  name: string;
};

export type Empresa = {
  id: number;
  codigo: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  ie: string | null;
  ie_status: string | null;
  ie_consultado_em: string | null;
  im: string | null;
  im_obrigatoria_nfse?: boolean;
  iest: string | null;
  regime: string | null;
  crt: number | null;
  regime_desde: string | null;
  cnae: string | null;
  cnaes_secundarios: Array<{ codigo: string; descricao?: string | null }> | null;
  email: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ibge: string | null;
  origem_latitude?: string | null;
  origem_longitude?: string | null;
  venda_ativa: boolean;
  estoque_ativo: boolean;
  logo_path: string | null;
  situacao: string;
  cadastro_fiscal_completo: boolean;
  apto_emissao_nfe?: boolean;
  apto_emissao_nfse?: boolean;
  fiscal_pendencias?: string[];
  fiscal_pendencias_emissao?: string[];
  fiscal_pendencias_nfse?: string[];
  fiscal_pendencias_emissao_nfse?: string[];
  fiscais_historico?: EmpresaFiscalHistorico[];
  contas_financeiras?: EmpresaContaFinanceira[];
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ParceiroContato = {
  id?: number;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  principal: boolean;
  autorizado_aprovar?: boolean;
  ordem?: number;
};

export type ParceiroContaBancaria = {
  id?: number;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  pix_chave: string | null;
  tipo_conta: string | null;
  principal: boolean;
  ordem?: number;
};

export type ParceiroEnderecoEntrega = {
  id?: number;
  apelido: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ibge: string | null;
  latitude?: string | null;
  longitude?: string | null;
  distancia_km?: string | null;
  distancia_fonte?: string | null;
  distancia_calculada_em?: string | null;
  distancia_empresa_id?: number | null;
  responsavel_nome: string;
  responsavel_telefone: string | null;
  responsavel_documento: string | null;
  observacoes: string | null;
  principal: boolean;
  ordem?: number;
};

export type BancoConsulta = {
  code: string | null;
  name: string;
  fullName: string | null;
  ispb: string | null;
};

export type ParceiroFiscalHistorico = {
  id: number;
  parceiro_id: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ie: string | null;
  im: string | null;
  ind_ie_dest: number | null;
  ie_status: string | null;
  regime: string | null;
  finalidade: string | null;
  consumidor_final: boolean;
  suframa: string | null;
  area_incentivada: boolean;
  motivo: string | null;
};

/** Resumo de PAR aninhado (vendedor no ORC/PED/cliente) — não é o cadastro completo. */
export type ParceiroVinculo = {
  id: number;
  codigo: string;
  razao_social: string;
  nome_fantasia?: string | null;
  comissao_percentual?: string | null;
  papel_vendedor?: boolean;
  is_prospect?: boolean;
  cnpj_cpf?: string | null;
  municipio?: string | null;
  uf?: string | null;
};

export type Parceiro = {
  id: number;
  empresa_id: number;
  codigo: string;
  tipo_pessoa: string | null;
  cnpj_cpf: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  ie: string | null;
  im: string | null;
  suframa: string | null;
  area_incentivada: boolean;
  ind_ie_dest: number | null;
  ie_status: string | null;
  ie_consultado_em: string | null;
  consumidor_final: boolean;
  finalidade: string | null;
  regime: string | null;
  regime_desde: string | null;
  cnae: string | null;
  cnaes_secundarios: Array<{ codigo: string; descricao?: string | null }> | null;
  situacao: string;
  is_prospect: boolean;
  origem_lead: string | null;
  cadastro_fiscal_completo: boolean;
  emite_documento_fiscal: boolean;
  apto_emissao_nfe?: boolean;
  fiscal_pendencias?: string[];
  fiscal_pendencias_emissao?: string[];
  papel_cliente: boolean;
  papel_fornecedor: boolean;
  papel_colaborador: boolean;
  papel_transportadora: boolean;
  papel_banco: boolean;
  papel_entidade: boolean;
  papel_vendedor: boolean;
  papel_contador: boolean;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ibge: string | null;
  latitude?: string | null;
  longitude?: string | null;
  distancia_km?: string | null;
  distancia_fonte?: string | null;
  distancia_calculada_em?: string | null;
  distancia_empresa_id?: number | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  email_xml: string | null;
  contato_nome: string | null;
  contato_funcao: string | null;
  contatos?: ParceiroContato[];
  contas_bancarias?: ParceiroContaBancaria[];
  enderecos_entrega?: ParceiroEnderecoEntrega[];
  fiscais_historico?: ParceiroFiscalHistorico[];
  limite_credito: string | null;
  credito_utilizado: string | null;
  condicao_pagamento: string | null;
  forma_pagamento: string | null;
  vendedor_parceiro_id?: number | null;
  comissao_percentual?: string | null;
  vendedor?: ParceiroVinculo | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  pix_chave: string | null;
  tipo_fornecimento: string | null;
  cfop_entrada_padrao: string | null;
  vinculo: string | null;
  cargo: string | null;
  departamento_id: number | null;
  departamento: string | null;
  departamento_ref?: { id: number; codigo: string; nome: string; ativo: boolean } | null;
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProdutoDescricaoSugestao = {
  descricao_fiscal: string;
  descricao_comercial: string;
  origem: string;
  racional: string;
  avisos: string[];
  similares: Array<{
    id: number;
    codigo: string;
    descricao_fiscal: string;
    similaridade: number;
  }>;
};

export type Produto = {
  id: number;
  empresa_id: number;
  codigo: string;
  familia: string;
  grupo_id: number | null;
  descricao_fiscal: string;
  descricao_comercial: string | null;
  grupo: string | null;
  ncm: string | null;
  cest: string | null;
  origem: number | null;
  tipo_item_sped: string | null;
  unidade_comercial: string | null;
  unidade_interna: string | null;
  fator_conversao: string | null;
  cfop_saida_padrao: string | null;
  cfop_entrada_padrao: string | null;
  csosn: string | null;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  cst_cbs: string | null;
  cclass_trib: string | null;
  aliquota_cbs: string | null;
  preco_tabela: string | null;
  custo_medio: string | null;
  estoque_minimo: string | null;
  lead_time_dias: number | null;
  controla_lote?: boolean;
  controla_validade?: boolean;
  prazo_validade_dias?: number | null;
  gtin: string | null;
  situacao: string;
  atributos: Record<string, unknown> | null;
  grupo_catalogo?: ProdutoGrupo | null;
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProdutoGrupo = {
  id: number;
  codigo: string;
  nome: string;
  familia: string;
  natureza: string;
  tipo_item_sped: string;
  grupo_estoque_padrao: string | null;
  grupos_estoque: Array<{ codigo: string; nome: string }> | null;
  ncm_padrao: string | null;
  unidade_comercial_padrao: string | null;
  unidade_interna_padrao: string | null;
  cfop_entrada_padrao: string | null;
  cfop_saida_padrao: string | null;
  exige_dimensao_sku: boolean;
  ncm_confirmado: boolean;
  ordenacao: number;
  situacao: string;
  observacao: string | null;
};

export type BemPatrimonial = {
  id: number;
  empresa_id: number;
  codigo: string;
  descricao: string;
  categoria: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  adquirido_em: string | null;
  valor_aquisicao: string | null;
  nf_numero: string | null;
  fornecedor_id: number | null;
  fornecedor?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  local: string | null;
  departamento_id: number | null;
  departamento?: { id: number; codigo: string; nome: string; ativo: boolean } | null;
  responsavel: string | null;
  responsavel_user_id: number | null;
  status: string;
  garantia_ate: string | null;
  placa: string | null;
  renavam: string | null;
  vida_util_meses: number | null;
  orc_catalogo_maquina_id: number | null;
  grupo_hora_maquina?: { id: number; nome: string; ativo: boolean } | null;
  capitalizado: boolean;
  observacao: string | null;
  baixado_em: string | null;
  motivo_baixa: string | null;
  capitalizacao?: {
    valor_minimo: number;
    abaixo_do_minimo: boolean;
    mensagem: string | null;
  } | null;
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CessaoBem = {
  id: number;
  codigo: string;
  tipo: string;
  status: string;
  iniciado_em: string | null;
  encerra_previsto_em: string | null;
  encerrado_em: string | null;
  motivo_encerramento: string | null;
  valor_mensal: string | null;
  documento_fiscal: string;
  observacao: string | null;
  aviso_fiscal: string;
  bem?: { id: number; codigo: string; descricao: string; status: string } | null;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
};

/** Natureza gerencial financeira (NAT-1.01.01). ≠ produto_grupos.natureza. */
export type Departamento = {
  id: number;
  empresa_id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Feriado = {
  id: number;
  empresa_id: number;
  data: string;
  nome: string;
  tipo: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL' | 'EMPRESA';
  recorrente_anual: boolean;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PrazoEntregaPrevisao = {
  prazo_efetivo_dias: number;
  prazo_referencia_em: string;
  data_entrega_prevista: string | null;
};

export type CondicaoPagamentoSugestao = {
  id: number;
  empresa_id: number;
  texto: string;
  ordenacao: number;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BacklogItem = {
  id: number;
  empresa_id: number;
  codigo: string;
  tarefa: string;
  situacao: 'ABERTO' | 'CONCLUIDO';
  lancado_em: string | null;
  concluido_em: string | null;
  observacao_conclusao: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type NaturezaGerencial = {
  id: number;
  codigo: string;
  codigo_exibicao: string;
  grupo: number;
  grupo_nome: string;
  nivel: number;
  parent_id: number | null;
  nome: string;
  descricao: string | null;
  aceita_lancamento: boolean;
  ativo: boolean;
  ordenacao: number;
  children?: NaturezaGerencial[];
};

export type CompraNecessidade = {
  id: number;
  codigo: string;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    descricao_comercial: string | null;
  } | null;
  qtde: string;
  unidade: string;
  necessario_em: string | null;
  motivo: string | null;
  prioridade: string;
  status: string;
  observacao: string | null;
};

export type CotacaoItem = {
  id: number;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    descricao_comercial?: string | null;
  } | null;
  qtde: string;
  unidade: string;
};

export type CotacaoProposta = {
  id: number;
  cotacao_item_id: number;
  fornecedor_id: number;
  fornecedor?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  valor_unitario: string;
  frete: string | null;
  prazo_dias: number | null;
  validade: string | null;
  condicao_pagamento: string | null;
  vencedora: boolean;
};

export type Cotacao = {
  id: number;
  codigo: string;
  status: string;
  necessidade_id: number | null;
  prazo_resposta: string | null;
  observacao: string | null;
  itens?: CotacaoItem[];
  propostas?: CotacaoProposta[];
  ordem_compra?: { id: number; codigo: string } | null;
};

export type OrdemCompraItem = {
  id: number;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    descricao_comercial?: string | null;
    familia?: string;
    unidade_comercial?: string | null;
    unidade_interna?: string | null;
    controla_lote?: boolean;
    controla_validade?: boolean;
    prazo_validade_dias?: number | null;
  } | null;
  qtde_pedida: string;
  qtde_recebida: string;
  unidade: string;
  valor_unitario: string;
  valor_total: string;
};

export type OrdemCompra = {
  id: number;
  codigo: string;
  fornecedor_id: number;
  fornecedor?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  cotacao_id: number | null;
  necessidade_id: number | null;
  origem: string;
  urgente: boolean;
  status: string;
  condicao_pagamento: string | null;
  previsao_entrega: string | null;
  valor_total: string;
  observacao: string | null;
  itens?: OrdemCompraItem[];
  nfe_entradas?: NfeEntradaResumo[];
};

export type NfeEntradaEspelho = {
  nat_op: string | null;
  id_dest: string | null;
  modelo: string | null;
  serie: string | null;
  numero: string | null;
  emit_uf: string | null;
  emit_crt: string | null;
  totais: {
    v_bc: string | null;
    v_icms: string | null;
    v_ipi: string | null;
    v_pis: string | null;
    v_cofins: string | null;
    v_st: string | null;
    v_nf: string | null;
  };
  itens: Array<{
    n_item: number;
    cfop: string | null;
    ncm: string | null;
    orig: string | null;
    cst: string | null;
    p_icms: string | null;
    v_icms: string | null;
    v_ipi: string | null;
    v_pis: string | null;
    v_cofins: string | null;
    v_prod: string | null;
  }>;
};

export type NfeEntradaResumo = {
  id: number;
  chave: string;
  modelo: string | null;
  serie: string | null;
  numero: string | null;
  nat_op: string | null;
  id_dest: string | null;
  emit_uf?: string | null;
  emit_crt?: string | null;
  emit_nome?: string | null;
  xml_armazenado: boolean;
  espelho?: NfeEntradaEspelho;
};

export type ReceberXmlWarning = {
  nivel: 'INFO' | 'ALERTA' | 'CRITICO' | string;
  codigo: string;
  mensagem: string;
};

export type ReceberXmlParcela = {
  n_dup: string | null;
  vencimento: string;
  valor: string;
};

export type ReceberXmlPreview = {
  nf: {
    chave: string | null;
    numero: string | null;
    serie: string | null;
    data_emissao: string | null;
    vencimento_sugerido: string | null;
    valor_nf: string | null;
    totais?: Record<string, string | null> | null;
    parcelas?: ReceberXmlParcela[];
    destinatario?: { cnpj_cpf: string | null; ie?: string | null; uf?: string | null };
    emitente: {
      cnpj_cpf: string | null;
      razao_social: string | null;
      nome_fantasia: string | null;
      ie?: string | null;
      uf?: string | null;
      crt?: string | null;
    };
    nat_op?: string | null;
    id_dest?: string | null;
    modelo?: string | null;
  };
  espelho?: NfeEntradaEspelho;
  warnings: ReceberXmlWarning[];
  linhas: Array<{
    n_item: number;
    c_prod: string;
    x_prod: string | null;
    ncm: string | null;
    u_com: string | null;
    q_com: string;
    v_un_com: string;
    v_prod: string;
    cfop: string | null;
    match: {
      ordem_compra_item_id: number | null;
      produto_id: number | null;
      confianca: string;
      motivo: string;
    };
  }>;
  sugerido_receber: {
    nf_chave: string | null;
    nf_numero: string | null;
    nf_data: string | null;
    nf_valor?: string | null;
    nf_totais?: Record<string, string | null> | null;
    vencimento: string | null;
    parcelas?: ReceberXmlParcela[];
    itens: Array<{
      ordem_compra_item_id: number;
      qtde_recebida: string;
      lote_codigo?: string | null;
      lote_data_entrada?: string | null;
      lote_data_validade?: string | null;
      lote_data_fabricacao?: string | null;
    }>;
  };
};

export type EstoqueLote = {
  id: number;
  produto_id: number;
  produto?: { id: number; codigo: string; descricao_fiscal: string } | null;
  codigo: string;
  data_entrada: string | null;
  data_fabricacao: string | null;
  data_validade: string | null;
  qtde: string;
  unidade: string;
  origem_tipo: string;
  status: string;
  status_label: string;
};

export type EstoqueSaldo = {
  id: number;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    descricao_comercial?: string | null;
    familia?: string;
    unidade_interna?: string | null;
    controla_lote?: boolean;
    controla_validade?: boolean;
  } | null;
  qtde: string;
  unidade: string;
  custo_medio: string;
  controla_lote?: boolean;
  lotes_count?: number;
  validade_status?: string | null;
  proxima_validade?: string | null;
  lotes?: EstoqueLote[];
};

export type EstoqueMovimentoItem = {
  id: number;
  produto_id: number;
  produto?: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  lote?: { id: number; codigo: string; data_validade?: string | null } | null;
};

export type EstoqueMovimento = {
  id: number;
  codigo: string;
  tipo: string;
  nf_chave: string | null;
  nf_numero: string | null;
  nf_data: string | null;
  nf_valor?: string | null;
  conferido_em: string;
  observacao?: string | null;
  motivo_codigo?: string | null;
  ajuste_id?: number | null;
  fornecedor?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia?: string | null;
  } | null;
  ordem_compra?: { id: number; codigo: string } | null;
  nfe_entrada?: { id: number; numero: string | null; xml_armazenado: boolean } | null;
  itens?: EstoqueMovimentoItem[];
};

export type ReposicaoItem = {
  produto_id: number;
  produto: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    grupo: string | null;
    unidade_comercial: string | null;
    unidade_interna: string | null;
    fator_conversao: string;
    custo_medio: string;
    lead_time_dias: number | null;
  };
  estoque_minimo: string;
  saldo: string;
  em_transito: string;
  disponivel: string;
  faltante_interna: string;
  faltante_comercial: string;
  unidade_interna: string;
  unidade_comercial: string;
};

export type EstoqueAjuste = {
  id: number;
  codigo: string;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    unidade_interna: string | null;
  } | null;
  origem: string;
  motivo_codigo: string;
  motivo_nome: string | null;
  motivo_complemento: string | null;
  qtde_sistema: string;
  qtde_contada: string;
  qtde_diferenca: string;
  valor_ajuste?: string | null;
  alcada?: string | null;
  unidade: string;
  checklist_confirmado: boolean;
  status: string;
  solicitado_por?: { id: number; name: string } | null;
  aprovado_por?: { id: number; name: string } | null;
  aprovado_em: string | null;
  movimento_id: number | null;
  movimento?: { id: number; codigo: string; tipo: string } | null;
  observacao: string | null;
  causa_raiz?: string | null;
  ciencia_diretoria?: boolean;
  ciencia_contabilidade?: boolean;
  divergencia_relevante?: boolean;
  aviso_fiscal?: string | null;
  inventario_item_id?: number | null;
  inventario_id?: number | null;
  created_at: string | null;
};

export type EstoqueAjusteMeta = {
  origens: string[];
  statuses: string[];
  alcadas?: string[];
  faixas?: { lider_ate: string; gestor_ate: string };
  motivos: Array<{ codigo: string; nome: string }>;
};

export type EstoqueInventarioItem = {
  id: number;
  inventario_id: number;
  produto_id: number;
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    unidade_interna: string | null;
  } | null;
  unidade: string;
  qtde_sistema_corte?: string;
  qtde_1: string | null;
  contado_por_1?: { id: number; name: string } | null;
  qtde_2: string | null;
  contado_por_2?: { id: number; name: string } | null;
  qtde_final: string | null;
  qtde_diferenca?: string | null;
  status: string;
  ajuste_id: number | null;
  ajuste?: { id: number; codigo: string; status: string } | null;
  checklist_confirmado: boolean;
};

export type EstoqueInventario = {
  id: number;
  codigo: string;
  tipo: string;
  status: string;
  iniciado_em: string | null;
  encerrado_em: string | null;
  acuracidade_pct: string | null;
  skus_contados: number | null;
  skus_ok: number | null;
  itens_count: number;
  pode_cancelar?: boolean;
  observacao: string | null;
  itens?: EstoqueInventarioItem[];
  created_at: string | null;
};

export type EstoqueInventarioMeta = {
  tipos: string[];
  statuses: string[];
  item_statuses: string[];
  motivos?: Array<{ codigo: string; nome: string }>;
};

export type EstoqueExtrato = {
  produto: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    unidade_interna: string | null;
    controla_lote?: boolean;
    controla_validade?: boolean;
  };
  saldo: { qtde: string; unidade: string; custo_medio: string };
  lotes?: EstoqueLote[];
  movimentos: Array<{
    movimento_id: number | null;
    movimento_codigo: string | null;
    tipo: string | null;
    motivo_codigo: string | null;
    ajuste_id?: number | null;
    ordem_compra_id?: number | null;
    nf_numero?: string | null;
    nf_data?: string | null;
    qtde: string;
    unidade: string;
    valor_unitario: string;
    valor_total: string;
    custo_medio_apos: string;
    lote?: { id: number; codigo: string; data_entrada?: string | null; data_validade?: string | null } | null;
    conferido_em: string | null;
    created_at: string | null;
  }>;
  movimentos_count: number;
};

export type TituloBaixa = {
  id: number;
  codigo: string;
  valor: string;
  pago_em: string | null;
  forma: string | null;
  observacao: string | null;
  conta_financeira?: { id: number; codigo: string; descricao: string } | null;
};

export type TituloAgingFaixa = {
  id: string;
  label: string;
  count: number;
  saldo: string;
};

export type TituloCarteiraMeta = {
  tipo: string;
  statuses: string[];
  formas: string[];
  faixas: Array<{ id: string; label: string }>;
  aging: TituloAgingFaixa[];
  aberto: { count: number; saldo: string };
  previsao: {
    receber_saldo: string;
    pagar_saldo: string;
    liquido: string;
    legenda: string;
  };
};

export type Titulo = {
  id: number;
  codigo: string;
  tipo: string;
  origem?: string | null;
  parceiro_id: number;
  parceiro?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  natureza_id: number;
  natureza?: {
    id: number;
    codigo: string;
    codigo_exibicao: string;
    nome: string;
  } | null;
  ordem_compra_id?: number | null;
  ordem_compra?: { id: number; codigo: string } | null;
  orcamento_id?: number | null;
  orcamento?: { id: number; codigo: string; financeiro_status: string | null } | null;
  pedido_id?: number | null;
  pedido?: { id: number; codigo: string } | null;
  faturamento_id?: number | null;
  faturamento?: { id: number; codigo: string } | null;
  documento: string | null;
  parcela?: number | null;
  n_dup?: string | null;
  emissao: string;
  vencimento: string;
  valor: string;
  saldo: string;
  status: string;
  observacao?: string | null;
  dias_atraso?: number;
  faixa_aging?: string | null;
  vencido?: boolean;
  cobrancas?: Array<{
    id: number;
    codigo: string;
    provider: string;
    status: string;
    pix_copia_cola: string | null;
    pix_qr_base64: string | null;
    linha_digitavel: string | null;
    vencimento: string | null;
  }>;
  baixas?: TituloBaixa[];
};

export type Usuario = {
  id: number;
  codigo: string | null;
  name: string;
  email: string;
  ativo: boolean;
  tipo?: 'colaborador' | 'conta';
  parceiro_id: number | null;
  empresa_default_id: number | null;
  vigencia_ate?: string | null;
  ultimo_login_em?: string | null;
  sessao_ativa?: boolean;
  roles?: string[];
  empresas?: Array<{
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    padrao?: boolean;
  }>;
  parceiro?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia?: string | null;
    cargo?: string | null;
    empresa_id?: number;
    email?: string | null;
  };
};

export type ColaboradorDisponivel = {
  id: number;
  codigo: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cargo?: string | null;
  empresa_id: number;
  email?: string | null;
};

export type Parametro = {
  id: number;
  empresa_id: number;
  chave: string;
  valor: string | null;
  status: string;
  versao: number;
};

export type IaProvedor = {
  id: number;
  nome: string;
  provedor: string;
  base_url: string | null;
  modelo: string | null;
  api_key_mascara: string;
  prioridade: number;
  ativo: boolean;
  ultimo_teste_em: string | null;
  ultimo_teste_ok: boolean | null;
  ultimo_teste_msg: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FiscalHub = {
  id: number;
  empresa_id: number;
  codigo: string;
  nome: string;
  provedor: string;
  ambiente_ativo: 'homologacao' | 'producao' | string;
  padrao: boolean;
  ativo: boolean;
  base_url_homologacao: string | null;
  base_url_producao: string | null;
  base_url_homologacao_efetiva: string | null;
  base_url_producao_efetiva: string | null;
  token_homologacao_mascara: string;
  token_producao_mascara: string;
  tem_token_homologacao: boolean;
  tem_token_producao: boolean;
  ultimo_teste_ambiente: string | null;
  ultimo_teste_em: string | null;
  ultimo_teste_ok: boolean | null;
  ultimo_teste_msg: string | null;
  emissao_habilitada?: boolean;
  emissao_habilitada_em?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CnaeSecundario = {
  codigo: number | string;
  descricao: string;
};

export type SocioQsa = {
  nome_socio?: string;
  qualificacao_socio?: string;
  cnpj_cpf_do_socio?: string;
  data_entrada_sociedade?: string;
  faixa_etaria?: string;
  pais?: string | null;
  nome_representante_legal?: string;
  qualificacao_representante_legal?: string;
};

export type CnpjConsulta = {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  descricao_situacao_cadastral?: string;
  situacao_rfb?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  telefone?: string;
  email?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  cnae?: string;
  cnae_descricao?: string;
  cnaes_secundarios?: CnaeSecundario[];
  qsa?: SocioQsa[];
  codigo_municipio_ibge?: number | string;
  ibge?: string;
  opcao_pelo_simples?: boolean;
  opcao_pelo_mei?: boolean;
  regime_sugerido?: string;
  data_inicio_atividade?: string;
  data_opcao_pelo_simples?: string | null;
  porte?: string;
  natureza_juridica?: string;
  capital_social?: number | string;
  descricao_identificador_matriz_filial?: string;
  qualificacao_do_responsavel?: string;
};

export type CepConsulta = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  fonte?: string;
  latitude?: string | null;
  longitude?: string | null;
  geo_fonte?: string | null;
  geo_cache?: boolean;
  geo_erro?: string | null;
  geo_sem_ponto?: boolean;
  sem_ponto?: boolean;
  erro?: string | null;
  distancia_km?: string | null;
  distancia_fonte?: string | null;
  distancia_cache?: boolean;
  distancia_atribuicao?: string | null;
  distancia_erro?: string | null;
  origem_latitude?: string | null;
  origem_longitude?: string | null;
};

/** Preenche endereço sem apagar o que o operador já digitou quando a API omite o campo. */
export function patchEnderecoFromCep(
  d: CepConsulta,
  current: {
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    ibge?: string;
  },
): {
  logradouro: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  ibge: string;
} {
  return {
    logradouro: d.logradouro?.trim() || current.logradouro || '',
    complemento: d.complemento?.trim() || current.complemento || '',
    bairro: d.bairro?.trim() || current.bairro || '',
    municipio: d.localidade?.trim() || current.municipio || '',
    uf: (d.uf?.trim() || current.uf || '').toUpperCase(),
    ibge: d.ibge?.trim() || current.ibge || '',
  };
}

export function mensagemCepImportado(d: CepConsulta, entrega = false): string {
  const prefix = entrega ? 'Endereço de entrega importado via CEP' : 'Endereço importado via CEP';
  if (!d.logradouro?.trim() || !d.bairro?.trim()) {
    return `${prefix} — complete logradouro e bairro se estiverem vazios.`;
  }
  if (!d.ibge?.trim()) {
    return `${prefix} — confira o código IBGE.`;
  }
  return `${prefix}.`;
}

export type FiscalCatalogItem = {
  codigo: string;
  descricao: string;
  fonte?: string;
  destaque?: boolean;
  regime?: string;
  tipo?: string;
  grupo?: string;
  segmento?: string | null;
  observacao?: string | null;
  vinculado_ncm?: boolean;
  meta?: string | null;
  /** Unidades de medida (estudo 32). */
  uso?: string;
};

export type OrcamentoFaixaResult = {
  quantidade: number;
  metragem: number;
  m2: number;
  hora_maq: number;
  hora_troca_prod: number;
  hora_troca_bobina: number;
  perda_acerto: number;
  perda_acabamento: number;
  perda_papel_troca_produto: number;
  perda_bobina_m2: number;
  rolos: number;
  qtde_caixas: number;
  rolos_por_caixa: number;
  caixa_medida: string | null;
  valor_papel: number;
  valor_maquina: number;
  valor_troca_produto: number;
  valor_troca_bobina: number;
  valor_papel_troca_produto: number;
  valor_tinta: number;
  valor_acabamento: number;
  valor_rebobinacao: number;
  valor_tubete: number;
  valor_caixa: number;
  valor_servico: number;
  comissao: number;
  imposto: number;
  base: number;
  valor_etiqueta: number;
  valor_matriz: number;
  valor_total: number;
  valor_faca_nova?: number;
  valor_total_com_faca?: number;
  valor_total_proposta?: string | number | null;
  kg_est?: string | number | null;
  faixa_frete_kg_ate?: string | number | null;
  preco_por_km?: string | number | null;
  minimo_rs?: string | number | null;
  valor_frete?: string | number | null;
  frete_somavel?: boolean;
};

export type OrcamentoFreteSnap = {
  modo: 'RETIRAR' | 'ENTREGA_PROPRIA' | 'ENTREGA_TERCEIROS' | 'ENTREGAR' | string;
  km?: string | number | null;
  destino?: 'fiscal' | 'entrega' | string | null;
  destino_label?: string | null;
  valor_informado?: string | number | null;
  a_definir?: boolean;
  motivo?: string | null;
  /** @deprecated Legado em snapshots anteriores. */
  origem?: string | null;
  /** @deprecated Legado em snapshots anteriores. */
  peso_caixa_kg?: string | number | null;
};

export type OrcamentoResult = {
  tipo_operacao?: string;
  tipo_servico?: string;
  chave_matriz: string | null;
  cobra_matriz: boolean;
  valor_matriz: number;
  motor_version?: number;
  faixas: OrcamentoFaixaResult[];
  catalog_snapshot?: Record<string, unknown>;
  faca_nova?: boolean;
  valor_faca_nova?: number;
  prazo_faca_dias?: number | null;
  formato_faca?: string | null;
  prazo_efetivo_dias?: number;
  prazo_referencia_em?: string | null;
  data_entrega_prevista?: string | null;
  frete?: OrcamentoFreteSnap | null;
};

export type Orcamento = {
  id: number;
  empresa_id: number;
  ano: number;
  numero: number;
  codigo: string;
  versao: number;
  parceiro_id: number;
  vendedor_parceiro_id?: number | null;
  cliente_nome: string;
  status: string;
  status_exibicao?: string | null;
  editavel: boolean;
  enviavel?: boolean;
  aguardando_cliente?: boolean;
  tipo_operacao?: string;
  input_snapshot: Record<string, unknown> | null;
  result_snapshot: OrcamentoResult | null;
  chave_matriz: string | null;
  cobra_matriz: boolean;
  valor_matriz: string | number;
  prazo_entrega_dias: number;
  validade_dias: number;
  prazo_efetivo_dias?: number;
  prazo_referencia_em?: string | null;
  data_entrega_prevista?: string | null;
  tolerancia_qtd_pct: string | number;
  observacao: string | null;
  enviado_em?: string | null;
  visualizado_em?: string | null;
  decidido_em?: string | null;
  canal_aprovacao?: string | null;
  aceite_nome_cliente?: string | null;
  aceite_faixa_index?: number | null;
  motivo_decisao?: string | null;
  financeiro_status?: string | null;
  adiantamento_titulo_id?: number | null;
  link_aprovacao?: {
    ativo: boolean;
    expira_em: string | null;
    visualizacoes: number;
    usado_em: string | null;
    destino_nome?: string | null;
    destino_funcao?: string | null;
    canal_envio?: string | null;
    url?: string | null;
  } | null;
  parceiro?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    is_prospect: boolean;
  } | null;
  vendedor?: ParceiroVinculo | null;
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PedidoItem = {
  id: number;
  ordem: number;
  necessidade: string;
  familia_fiscal: string | null;
  descricao: string;
  especificacao?: Record<string, unknown> | null;
  qtde_pedida: string;
  qtde_produzida: string;
  qtde_faturavel: string;
  unidade: string;
  preco_unitario: string | null;
  valor_total: string | null;
  status: string;
  produto_pa?: { id: number; codigo: string; descricao_fiscal: string } | null;
};

export type Pedido = {
  id: number;
  codigo: string;
  status: string;
  faixa_index: number;
  tolerancia_qtd_pct: string;
  prazo_entrega_dias: number | null;
  prazo_efetivo_dias?: number;
  prazo_referencia_em?: string | null;
  data_entrega_prevista?: string | null;
  observacao: string | null;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
  vendedor?: { id: number; codigo: string; razao_social: string } | null;
  orcamento?: {
    id: number;
    codigo: string;
    status?: string | null;
    financeiro_status?: string | null;
  } | null;
  itens: PedidoItem[];
  ordens_producao?: Array<{
    id: number;
    codigo: string;
    status: string;
    pedido_item_id?: number;
    qtde_planejada: string;
    qtde_boa: string | null;
  }>;
  ordens_servico?: Array<{
    id: number;
    codigo: string;
    status: string;
    pedido_item_id?: number;
    qtde_planejada: string;
    qtde_executada: string | null;
  }>;
  snapshot?: Record<string, unknown> | null;
  apto_faturar?: boolean;
  faturamento?: {
    id: number;
    codigo: string;
    status: string;
    nf_status: string;
    valor_bruto: string;
    valor_adiantamento: string;
    valor_a_cobrar: string;
  } | null;
  rastreio?: RastreioDocumento;
  created_at: string | null;
};

export type FaturamentoParcela = {
  parcela: number;
  dias: number;
  valor: string;
  vencimento: string;
  rotulo: string;
  sinal?: boolean;
};

export type DocumentoFiscalPreviaItem = {
  numero: number | string;
  codigo?: string | null;
  descricao: string;
  ncm?: string;
  cfop?: string;
  csosn?: string;
  unidade?: string;
  quantidade?: string;
  valor_unitario?: string;
  valor?: string;
};

export type DocumentoFiscalPrevia = {
  oficial: boolean;
  simulada?: boolean;
  formato_envio: string;
  rotulo: string;
  modelo?: string;
  aviso: string;
  natureza?: string;
  informacoes_adicionais?: string;
  data_emissao?: string;
  competencia?: string;
  serie_envio?: number | null;
  numero?: number | null;
  chave?: string | null;
  protocolo?: string | null;
  emitente?: {
    nome?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string;
    ie?: string | null;
    im?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    endereco?: string | null;
    municipio?: string | null;
    uf?: string | null;
    cep?: string | null;
    telefone?: string | null;
    crt?: number | null;
  };
  destinatario?: {
    nome?: string;
    documento?: string;
    endereco?: string | null;
    bairro?: string | null;
    municipio?: string | null;
    uf?: string | null;
    cep?: string;
    email?: string;
    ie?: string;
  };
  itens?: DocumentoFiscalPreviaItem[];
  duplicatas?: Array<{ numero: string; vencimento: string; valor: string }>;
  valor_total?: string;
  pedido?: string | null;
  faturamento?: string | null;
};

export type DocumentoFiscalSaida = {
  id: number;
  codigo: string;
  tipo: string;
  modelo: string;
  status: string;
  autorizacao_origem?: string | null;
  ambiente: string | null;
  ref: string;
  serie: number | null;
  numero: number | null;
  chave: string | null;
  protocolo: string | null;
  mensagem: string | null;
  valor: string;
  enviado_em?: string | null;
  autorizado_em?: string | null;
  saida_estoque?: {
    id: number;
    codigo: string;
    tipo: string;
    nf_chave?: string | null;
    itens?: Array<{
      produto_id: number;
      produto_codigo?: string | null;
      qtde: string;
      unidade: string;
    }>;
  } | null;
  previa?: DocumentoFiscalPrevia;
  envio_hub?: Record<string, unknown> | null;
};

export type FiscalPreview = {
  documentos: Array<{ tipo: string; rotulo: string; valor: string; itens: number }>;
  hub: {
    apto: boolean;
    mensagem: string;
    codigo: string | null;
    ambiente: string | null;
    emissao_habilitada: boolean;
  };
  apto_emissao: boolean;
  apto_cadastro?: boolean;
  emissao_automatica: boolean;
  emissor_teste?: { ativo: boolean; mensagem: string };
  pendencias: string[];
  avisos: string[];
  precisa_nfe: boolean;
  precisa_nfse: boolean;
};

export type FaturamentoPreview = {
  ja_faturado: boolean;
  apto: boolean;
  pode_estornar?: boolean;
  faturamento?: Faturamento | null;
  fiscal?: FiscalPreview;
  valor_itens?: string;
  valor_matriz?: string;
  valor_faca?: string;
  preco_unitario?: string;
  qtde_faturavel?: string;
  qtde_pedida?: string;
  valor_bruto?: string;
  valor_adiantamento?: string;
  valor_a_cobrar?: string;
  adiantamento?: { id: number; codigo: string; valor: string; status: string } | null;
  condicao_pagamento?: string;
  forma_pagamento?: string;
  emite_cobranca?: boolean;
  itens?: Array<{
    pedido_item_id: number;
    descricao: string;
    qtde: string;
    unidade: string;
    preco_unitario: string | null;
    valor: string;
  }>;
  parcelas?: FaturamentoParcela[];
  avisos?: string[];
  bloqueios?: string[];
};

export type Faturamento = {
  id: number;
  codigo: string;
  status: string;
  nf_status: string;
  nf_simulada?: boolean;
  valor_bruto: string;
  valor_adiantamento: string;
  valor_a_cobrar: string;
  condicao_pagamento?: string | null;
  forma_pagamento?: string | null;
  faturado_em?: string | null;
  estornado_em?: string | null;
  motivo_estorno?: string | null;
  pode_estornar?: boolean;
  bloqueios_estorno?: string[];
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
  pedido?: { id: number; codigo: string; status: string } | null;
  orcamento?: { id: number; codigo: string } | null;
  itens?: Array<{
    id: number;
    descricao: string;
    qtde: string;
    unidade: string | null;
    preco_unitario: string | null;
    valor: string;
  }>;
  titulos?: Titulo[];
  adiantamento?: { id: number; codigo: string; valor: string; status: string } | null;
  documentos_fiscais?: DocumentoFiscalSaida[];
  created_at: string | null;
};

export type EntregaDestino = {
  tipo?: string;
  label?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  responsavel?: string | null;
};

export type Entrega = {
  id: number;
  codigo: string;
  modo: string;
  tipo_saida: string;
  status: string;
  volumes: number;
  peso_kg?: string | null;
  qtde: string;
  unidade?: string | null;
  rastreio?: string | null;
  expedido_em?: string | null;
  confirmado_em?: string | null;
  destino?: EntregaDestino | null;
  observacao?: string | null;
  prova_tipo?: string | null;
  prova_nome?: string | null;
  prova_documento?: string | null;
  prova_obs?: string | null;
  motivo_recusa?: string | null;
  motivo_cancelamento?: string | null;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
  pedido?: { id: number; codigo: string; status: string } | null;
  faturamento?: { id: number; codigo: string; nf_status: string } | null;
  transportadora?: { id: number; codigo: string; razao_social: string } | null;
  titulos_abertos?: Array<{
    id: number;
    codigo: string;
    saldo: string;
    vencimento: string | null;
    status: string;
  }>;
  created_at: string | null;
};

export type EntregaPreview = {
  ja_expedido: boolean;
  apto: boolean;
  pode_confirmar?: boolean;
  pode_cancelar?: boolean;
  pode_recusar?: boolean;
  acao: string;
  modo: string;
  tipo_saida_sugerido: string;
  destino?: EntregaDestino | null;
  qtde?: string;
  unidade?: string | null;
  descricao?: string | null;
  faturamento?: {
    id: number;
    codigo: string;
    nf_status: string;
    valor_a_cobrar?: string;
    condicao_pagamento?: string | null;
    forma_pagamento?: string | null;
  } | null;
  titulos_abertos?: Entrega['titulos_abertos'];
  avisos?: string[];
  bloqueios?: string[];
  entrega?: Entrega | null;
};

export type EntregaFilaItem = {
  pedido_id: number;
  pedido_codigo: string;
  pedido_status: string;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
  modo: string;
  tipo_saida_sugerido: string;
  destino_label?: string | null;
  apto: boolean;
  acao: string;
  entrega?: Entrega | null;
  faturamento?: EntregaPreview['faturamento'];
  bloqueios?: string[];
};

export type OrdemProducaoMaterial = {
  id: number;
  produto: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    unidade_interna: string | null;
    familia: string;
  } | null;
  componente?: string | null;
  origem_texto?: string | null;
  qtde_planejada?: string;
  qtde_requisitada: string;
  qtde_consumida: string;
  qtde_retorno: string;
  qtde_perda: string;
  unidade: string;
  pendente?: boolean;
  saida_movimento_id: number | null;
  retorno_movimento_id: number | null;
};

export type OrdemProducao = {
  id: number;
  codigo: string;
  status: string;
  qtde_planejada: string;
  qtde_boa: string | null;
  qtde_refugo: string;
  fora_tolerancia: boolean;
  motivo_fora_tolerancia: string | null;
  custo_materiais: string | null;
  pedido?: {
    id: number;
    codigo: string;
    status: string;
    tolerancia_qtd_pct?: string | null;
  } | null;
  pedido_item?: {
    id: number;
    descricao: string;
    necessidade: string;
    qtde_pedida?: string;
  } | null;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
  materiais?: OrdemProducaoMaterial[];
  pa_movimento?: { id: number; codigo: string; tipo: string } | null;
  observacao?: string | null;
  pode_devolver_ao_pedido?: boolean;
  motivo_cancelamento?: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  cancelada_em?: string | null;
  created_at: string | null;
  rastreio?: RastreioDocumento;
};

export type RastreioParceiro = {
  id: number;
  codigo?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
};

export type RastreioOrigem = {
  tipo: string;
  movimento_id: number | null;
  movimento_codigo: string | null;
  qtde: string;
  unidade: string;
  nf_numero: string | null;
  nf_chave: string | null;
  nf_data: string | null;
  oc?: { id: number; codigo: string } | null;
  fornecedor?: RastreioParceiro | null;
  nfe_entrada?: {
    id: number;
    numero: string | null;
    serie: string | null;
    chave: string | null;
    data_emissao: string | null;
    xml_armazenado: boolean;
  } | null;
  ajuste?: { id: number; codigo: string; motivo: string | null } | null;
  created_at: string | null;
  fallback_lote?: boolean;
};

export type RastreioLoteLinha = {
  lote: {
    id: number;
    codigo: string;
    data_entrada: string | null;
    data_fabricacao: string | null;
    data_validade: string | null;
    origem_tipo: string;
    nf_numero: string | null;
  } | null;
  qtde_baixada: string;
  unidade: string;
  origens: RastreioOrigem[];
  lote_misto: boolean;
  rastreavel_fornecedor: boolean;
  observacao: string | null;
};

export type RastreioInsumo = {
  material_id: number;
  componente?: string | null;
  origem_texto?: string | null;
  produto: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    unidade_interna: string | null;
    controla_lote: boolean;
  } | null;
  unidade: string;
  qtde_planejada: string;
  qtde_requisitada: string;
  qtde_retorno: string;
  qtde_perda: string;
  qtde_liquida: string;
  pendente: boolean;
  saida_movimento?: { id: number; codigo: string; created_at: string | null } | null;
  lotes: RastreioLoteLinha[];
  sem_lote: boolean;
  rastreavel_fornecedor: boolean;
  observacao: string | null;
};

export type RastreioResumo = {
  insumos_com_saida: number;
  lotes: number;
  notas: number;
  fornecedores: number;
  sem_rastro_fornecedor: number;
  pronto_para_fornecedor: boolean;
};

export type RastreioOpRef = {
  id: number;
  codigo: string;
  status: string;
  qtde_boa: string | null;
  concluida_em: string | null;
  item?: string | null;
};

export type RastreioDocumento = {
  tipo: 'OP' | 'PED' | 'LOTE';
  op?: RastreioOpRef | null;
  pedido?: { id: number; codigo: string; status: string } | null;
  cliente?: RastreioParceiro | null;
  pa?: { movimento_id: number; codigo: string; qtde_boa: string | null } | null;
  insumos?: RastreioInsumo[];
  ops?: Array<{ op: RastreioOpRef; resumo: RastreioResumo; insumos: RastreioInsumo[] }>;
  lote?: {
    id: number;
    codigo: string;
    data_entrada: string | null;
    data_fabricacao: string | null;
    data_validade: string | null;
    origem_tipo: string;
    nf_numero: string | null;
  };
  produto?: {
    id: number;
    codigo: string;
    descricao_fiscal: string;
    familia: string;
    unidade_interna: string | null;
    controla_lote: boolean;
  } | null;
  origens?: RastreioOrigem[];
  consumos?: Array<{
    qtde: string;
    unidade: string;
    movimento: { id: number; codigo: string; created_at: string | null };
    op: RastreioOpRef;
    pedido: { id: number; codigo: string; status: string } | null;
    cliente: RastreioParceiro | null;
  }>;
  resumo?: RastreioResumo & { ops?: number; notas?: number; rastreavel_fornecedor?: boolean };
};

export type RastreioHit = {
  tipo: 'OP' | 'PED' | 'LOTE' | 'NF';
  id: number;
  codigo: string;
  rotulo: string;
  status?: string;
  produto_id?: number;
  movimento_id?: number;
  lote_ids?: number[];
};

export type OrcamentoEnvioAprovacao = {
  url: string;
  token: string;
  mensagem: string;
  /** Deep link wa.me / mailto com a mensagem pronta (quando o canal permite). */
  canal_url?: string | null;
  expira_em: string | null;
  reutilizado: boolean;
  /** Motor da instalação enviou e-mail ao cadastro (ADR_ORC_EMAIL_PROPOSTA). */
  email_enviado?: boolean;
  email_destino?: string | null;
  email_motivo?: string | null;
  /** Motor ViaZap enviou WhatsApp ao cadastro (ADR_ORC_WHATSAPP_VIAZAP). */
  zap_enviado?: boolean;
  zap_destino?: string | null;
  zap_motivo?: string | null;
  destinatario?: {
    parceiro_contato_id: number | null;
    nome: string | null;
    funcao: string | null;
    canal: string | null;
    destino: string | null;
  };
  orcamento: Orcamento;
};

export type OrcamentoDestinatarioAprovacao = {
  parceiro_contato_id: number | null;
  nome: string;
  funcao: string | null;
  whatsapp: string | null;
  email: string | null;
  telefone: string | null;
  canal: string;
  destino: string;
  autorizado_aprovar: boolean;
  principal: boolean;
  legado: boolean;
};

export type OrcamentoAdiantamentoPublico = {
  exigido: boolean;
  financeiro_status: string | null;
  status_exibicao?: string | null;
  titulo_codigo: string;
  titulo_status: string;
  cob_codigo: string | null;
  cob_status: string | null;
  provider?: string | null;
  pode_simular_pagamento?: boolean;
  valor: string;
  saldo: string;
  percentual: string;
  vencimento: string | null;
  pix_copia_cola: string | null;
  pix_qr_base64: string | null;
  linha_digitavel: string | null;
  pago: boolean;
};

export type OrcamentoPropostaPublica = {
  modo?: 'proposta' | 'pagamento' | 'preview' | string;
  mensagem?: string;
  status_exibicao?: string | null;
  codigo: string;
  versao: number;
  status: string;
  vencido: boolean;
  disponivel: boolean;
  somente_leitura?: boolean;
  financeiro_status?: string | null;
  expira_em: string | null;
  cliente_nome: string;
  destinatario?: {
    nome: string | null;
    funcao: string | null;
    instrucao: string;
  };
  empresa: {
    nome_fantasia: string | null;
    razao_social: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    municipio: string | null;
    uf: string | null;
  };
  descricao?: {
    medida: string | null;
    papel: string | null;
    acabamento: string | null;
    cores: string | null;
    etiq_por_rolo: number | null;
    largura_cm: number | null;
    puxada_cm: number | null;
    formato_faca: string | null;
    faca_nova: boolean;
    faca_colunas_mapa?: string | null;
    faca_posicao?: string | null;
    faca_contorno_svg?: string | null;
    faca_diametro_cm?: number | string | null;
    modelos?: number | null;
    modelos_composicao?: Array<{
      ordem: number;
      nome: string;
      percentual: number;
    }> | null;
    tipo_servico?: string | null;
    descricao_servico?: string | null;
    material_cliente?: boolean | null;
    unidade?: string | null;
  };
  tipo_operacao?: string;
  prazo_entrega_dias?: number;
  prazo_efetivo_dias?: number;
  prazo_referencia_em?: string | null;
  data_entrega_prevista?: string | null;
  validade_dias?: number;
  tolerancia_qtd_pct?: number;
  condicao_pagamento?: string | null;
  forma_pagamento?: string | null;
  frete?: {
    modo: string;
    texto: string;
    somavel: boolean;
  } | null;
  cobra_matriz?: boolean;
  valor_matriz?: number;
  matriz_nota?: string | null;
  faixas?: Array<{
    index: number;
    quantidade: number;
    valor_total: number;
    valor_unitario: number | null;
    valor_etiqueta: number;
    valor_rolo: number | null;
    rolos: number | null;
    valor_matriz: number;
    valor_faca_nova: number;
    valor_frete?: number | null;
    frete_somavel?: boolean;
  }>;
  observacao_comercial?: string | null;
  /** URL pública da prova de arte (PDF/imagem/Drive…). Só http(s). */
  url_arte?: string | null;
  adiantamento?: OrcamentoAdiantamentoPublico | null;
};

export type OrcamentoCatalogo = {
  papeis: string[];
  acabamentos: string[];
  tubetes: string[];
  maquinas: string[];
  /** Compatibilidade API — campo operacional legado; não usado no preço nem na UI. */
  maquinas_roda_servico?: string[];
  tipos_troca_produto: string[];
  imposto_pct_default: number;
  /** Tarifa vigente R$/cm² (GERACAO §4.12) — mesma fonte do motor. */
  matriz_cm2: number;
};

export type OrcCatalogoResumo = {
  papeis: number;
  acabamentos: number;
  tipos_troca: number;
  maquinas: number;
  parametros?: number;
  estruturas?: number;
  matriz_cm2?: number;
  matriz_cm2_fonte?: 'database' | 'json_fallback' | string;
  fonte: 'database' | 'json_fallback' | string;
  nota: string;
};

export const fiscalConsulta = {
  ncm: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/ncm?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  cest: (q = '', ncm = '', limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (q) params.set('q', q);
    if (ncm) params.set('ncm', ncm);
    return api.get<{ data: FiscalCatalogItem[] }>(`/consulta/cest?${params}`);
  },
  csosn: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/csosn?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  cfop: (q = '', tipo?: 'ENTRADA' | 'SAIDA', limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (q) params.set('q', q);
    if (tipo) params.set('tipo', tipo);
    return api.get<{ data: FiscalCatalogItem[] }>(`/consulta/cfop?${params}`);
  },
  cstIcms: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/cst-icms?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  cstPisCofins: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/cst-pis-cofins?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  cstCbs: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/cst-cbs?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  cClassTrib: (q = '', limit = 20) =>
    api.get<{ data: FiscalCatalogItem[] }>(
      `/consulta/cclass-trib?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  tiposItemSped: () =>
    api.get<{ data: FiscalCatalogItem[] }>('/consulta/tipos-item-sped'),
  origens: () =>
    api.get<{ data: FiscalCatalogItem[] }>('/consulta/origens-mercadoria'),
  unidades: () =>
    api.get<{ data: FiscalCatalogItem[] }>('/consulta/unidades'),
  fatorConversao: (params: {
    de?: string;
    para?: string;
    largura_mm?: string;
    comprimento_m?: string;
    gramatura_g_m2?: string;
    qtd_por_caixa?: string;
    densidade_g_ml?: string;
    metragem_por_milheiro?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, v);
    });
    return api.get<{
      data: {
        status: string;
        fator: string | null;
        formula: string | null;
        origem: string | null;
        faltando: string[];
        mensagem: string | null;
        de: string | null;
        para: string | null;
      };
    }>(`/consulta/fator-conversao?${qs}`);
  },
  produtoGrupos: (familia?: string, natureza?: string) => {
    const params = new URLSearchParams();
    if (familia) params.set('familia', familia);
    if (natureza) params.set('natureza', natureza);
    const qs = params.toString();
    return api.get<{ data: ProdutoGrupo[] }>(
      `/consulta/produto-grupos${qs ? `?${qs}` : ''}`
    );
  },
};

export type Comissao = {
  id: number;
  codigo: string;
  status: string;
  origem_evento: string;
  aliquota: string;
  base_valor: string;
  valor: string;
  observacao?: string | null;
  vendedor?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia?: string | null;
  } | null;
  pedido?: { id: number; codigo: string } | null;
  orcamento?: { id: number; codigo: string } | null;
  faturamento?: { id: number; codigo: string } | null;
  titulo?: { id: number; codigo: string } | null;
  fechamento?: { id: number; codigo: string; status: string } | null;
  titulo_pagar?: { id: number; codigo: string; status: string; saldo: string } | null;
  created_at?: string | null;
};

export type ComissaoFechamento = {
  id: number;
  codigo: string;
  status: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  vencimento: string | null;
  valor_total: string;
  observacao?: string | null;
  comissoes?: Comissao[];
  created_at?: string | null;
};

export type ComissaoPedidoResumo = {
  pedido_id: number;
  pedido_codigo: string;
  vendedor?: {
    id: number;
    codigo?: string;
    razao_social?: string;
    nome_fantasia?: string | null;
  } | null;
  aliquota: string | null;
  base_etiquetas: string | null;
  comissao_potencial: string | null;
  totais: Record<string, string>;
  linhas: Comissao[];
  elegivel: boolean;
};

export function sugerirDescricaoProduto(payload: {
  grupo_id: number;
  texto_livre?: string;
  largura_mm?: string;
  comprimento_m?: string;
  produto_id?: number;
}) {
  return api.post<{ data: ProdutoDescricaoSugestao }>('/produtos/sugerir-descricao', payload);
}

