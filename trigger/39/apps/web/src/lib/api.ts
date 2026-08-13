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
  venda_ativa?: boolean;
  estoque_ativo?: boolean;
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
  enderecos_entrega?: ParceiroEnderecoEntrega[];
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
    destinatario?: { cnpj_cpf: string | null };
    emitente: {
      cnpj_cpf: string | null;
      razao_social: string | null;
      nome_fantasia: string | null;
    };
  };
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

export type EstoqueMovimento = {
  id: number;
  codigo: string;
  tipo: string;
  nf_chave: string | null;
  nf_numero: string | null;
  nf_data: string | null;
  conferido_em: string;
  motivo_codigo?: string | null;
  ajuste_id?: number | null;
  ordem_compra?: { id: number; codigo: string } | null;
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
  orcamento_id?: number | null;
  orcamento?: { id: number; codigo: string; financeiro_status: string | null } | null;
  documento: string | null;
  parcela?: number | null;
  n_dup?: string | null;
  emissao: string;
  vencimento: string;
  valor: string;
  saldo: string;
  status: string;
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
  status_exibicao?: string | null;
  editavel: boolean;
  enviavel?: boolean;
  aguardando_cliente?: boolean;
  input_snapshot: Record<string, unknown> | null;
  result_snapshot: OrcamentoResult | null;
  chave_matriz: string | null;
  cobra_matriz: boolean;
  valor_matriz: string | number;
  prazo_entrega_dias: number;
  validade_dias: number;
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
  } | null;
  parceiro?: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    is_prospect: boolean;
  } | null;
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
  observacao: string | null;
  parceiro?: { id: number; codigo: string; razao_social: string } | null;
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
  created_at: string | null;
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
};

export type OrcamentoEnvioAprovacao = {
  url: string;
  token: string;
  mensagem: string;
  /** Deep link wa.me / mailto com a mensagem pronta (quando o canal permite). */
  canal_url?: string | null;
  expira_em: string | null;
  reutilizado: boolean;
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
    modelos?: number | null;
    modelos_composicao?: Array<{
      ordem: number;
      nome: string;
      percentual: number;
    }> | null;
  };
  prazo_entrega_dias?: number;
  validade_dias?: number;
  tolerancia_qtd_pct?: number;
  condicao_pagamento?: string | null;
  forma_pagamento?: string | null;
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
  }>;
  observacao_comercial?: string | null;
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

export function sugerirDescricaoProduto(payload: {
  grupo_id: number;
  texto_livre?: string;
  largura_mm?: string;
  comprimento_m?: string;
  produto_id?: number;
}) {
  return api.post<{ data: ProdutoDescricaoSugestao }>('/produtos/sugerir-descricao', payload);
}

