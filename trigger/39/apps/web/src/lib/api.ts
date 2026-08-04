const TOKEN_KEY = 'erp_rlp_token';
const EMPRESA_KEY = 'erp_rlp_empresa_id';

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
    throw new ApiError(
      message,
      response.status,
      details,
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined,
    );
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
    try {
      const payload = await response.json();
      message = (payload as { message?: string })?.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
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

  post: <T>(path: string, body?: unknown, empresaId?: number | null) =>
    request<T>(path, { method: 'POST', body, empresaId }),

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

  login: (email: string, password: string) =>
    request<{ token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => request<AuthMeResponse>('/auth/me'),
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
};

export type AuthMeResponse = {
  user: AuthUser;
  roles: string[];
  permissions: string[];
  empresas: AuthEmpresa[];
  empresa_contexto: { id: number; codigo: string } | null;
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
  venda_ativa: boolean;
  estoque_ativo: boolean;
  logo_path: string | null;
  situacao: string;
  cadastro_fiscal_completo: boolean;
  apto_emissao_nfe?: boolean;
  fiscal_pendencias?: string[];
  fiscal_pendencias_emissao?: string[];
  fiscais_historico?: EmpresaFiscalHistorico[];
};

export type ParceiroContato = {
  id?: number;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  principal: boolean;
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
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  email_xml: string | null;
  contato_nome: string | null;
  contato_funcao: string | null;
  contatos?: ParceiroContato[];
  contas_bancarias?: ParceiroContaBancaria[];
  fiscais_historico?: ParceiroFiscalHistorico[];
  limite_credito: string | null;
  credito_utilizado: string | null;
  condicao_pagamento: string | null;
  forma_pagamento: string | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  pix_chave: string | null;
  tipo_fornecimento: string | null;
  cfop_entrada_padrao: string | null;
  vinculo: string | null;
  cargo: string | null;
  departamento: string | null;
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
  preco_tabela: string | null;
  custo_medio: string | null;
  estoque_minimo: string | null;
  lead_time_dias: number | null;
  gtin: string | null;
  situacao: string;
  atributos: Record<string, unknown> | null;
  grupo_catalogo?: ProdutoGrupo | null;
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

export type Usuario = {
  id: number;
  codigo: string;
  name: string;
  email: string;
  ativo: boolean;
  parceiro_id: number | null;
  empresa_default_id: number | null;
  vigencia_ate?: string | null;
  ultimo_login_em?: string | null;
  roles?: { name: string }[] | string[];
  empresas?: Empresa[];
  parceiro?: Parceiro;
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
};

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
};

export type OrcamentoResult = {
  chave_matriz: string;
  cobra_matriz: boolean;
  valor_matriz: number;
  faixas: OrcamentoFaixaResult[];
  catalog_snapshot?: Record<string, unknown>;
  faca_nova?: boolean;
  valor_faca_nova?: number;
  prazo_faca_dias?: number | null;
  formato_faca?: string | null;
};

export type Orcamento = {
  id: number;
  empresa_id: number;
  ano: number;
  numero: number;
  codigo: string;
  versao: number;
  parceiro_id: number;
  cliente_nome: string;
  status: string;
  editavel: boolean;
  input_snapshot: Record<string, unknown> | null;
  result_snapshot: OrcamentoResult | null;
  chave_matriz: string | null;
  cobra_matriz: boolean;
  valor_matriz: string | number;
  prazo_entrega_dias: number;
  validade_dias: number;
  tolerancia_qtd_pct: string | number;
  observacao: string | null;
  parceiro?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    is_prospect: boolean;
  } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type OrcamentoCatalogo = {
  papeis: string[];
  acabamentos: string[];
  tubetes: string[];
  maquinas: string[];
  maquinas_roda_servico: string[];
  tipos_troca_produto: string[];
  imposto_pct_default: number;
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
  tiposItemSped: () =>
    api.get<{ data: FiscalCatalogItem[] }>('/consulta/tipos-item-sped'),
  origens: () =>
    api.get<{ data: FiscalCatalogItem[] }>('/consulta/origens-mercadoria'),
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
