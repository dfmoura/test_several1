export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type ApiError = { code: string; message: string };

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: ApiError }).error ?? {
      code: 'HTTP_ERROR',
      message: res.statusText,
    };
    throw err;
  }
  return (json as { data: T }).data;
}

export const api = {
  login: (email: string, senha: string) =>
    request<LoginResult>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),
  me: (token: string) => request<MeResult>('/api/v1/auth/me', { token }),
  logout: (token: string) =>
    request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST', token }),
  trocarEmpresa: (token: string, empresaCodigo: string) =>
    request<{ token: string; empresa: Empresa }>(
      '/api/v1/auth/trocar-empresa',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ empresaCodigo }),
      },
    ),
  parametros: (token: string) =>
    request<Parametro[]>('/api/v1/parametros', { token }),
  auditoria: (token: string) =>
    request<AuditItem[]>('/api/v1/auditoria?limit=80', { token }),
  health: () => fetch(`${API_URL}/api/v1/health`).then((r) => r.json()),

  parceiros: (token: string, params?: { q?: string; papel?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.papel) qs.set('papel', params.papel);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<Parceiro[]>(`/api/v1/parceiros${suffix}`, { token });
  },
  criarParceiro: (token: string, body: Record<string, unknown>) =>
    request<Parceiro>('/api/v1/parceiros', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  produtos: (token: string, params?: { q?: string; familia?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.familia) qs.set('familia', params.familia);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<Produto[]>(`/api/v1/produtos${suffix}`, { token });
  },
  criarProduto: (token: string, body: Record<string, unknown>) =>
    request<Produto>('/api/v1/produtos', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  unidades: (token: string) => request<Unidade[]>('/api/v1/unidades', { token }),
  criarUnidade: (
    token: string,
    body: { codigo: string; nome: string; casasDecimais?: number },
  ) =>
    request<Unidade>('/api/v1/unidades', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  facas: (token: string) => request<Faca[]>('/api/v1/facas', { token }),
  criarFaca: (token: string, body: Record<string, unknown>) =>
    request<Faca>('/api/v1/facas', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  orcamentos: (token: string) => request<Orcamento[]>('/api/v1/orcamentos', { token }),
  criarOrcamento: (token: string, body: Record<string, unknown>) =>
    request<Orcamento>('/api/v1/orcamentos', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  enviarAceite: (token: string, id: string) =>
    request<{ linkAceite: string; expiraEm: string; orcamento: Orcamento }>(
      `/api/v1/orcamentos/${id}/enviar-aceite`,
      { method: 'POST', token, body: '{}' },
    ),
  converterPedido: (token: string, id: string) =>
    request<Pedido>(`/api/v1/orcamentos/${id}/converter-pedido`, {
      method: 'POST',
      token,
      body: '{}',
    }),
  pedidos: (token: string) => request<Pedido[]>('/api/v1/pedidos', { token }),
  liberarCredito: (token: string, id: string, motivo?: string) =>
    request<Pedido>(`/api/v1/pedidos/${id}/liberar-credito`, {
      method: 'POST',
      token,
      body: JSON.stringify({ motivo }),
    }),
  propostaPublica: (tokenAceite: string) =>
    request<{ proposta: Orcamento; expiraEm: string }>(
      `/api/v1/publico/aceite/${tokenAceite}`,
    ),
  responderAceite: (tokenAceite: string, acao: 'APROVAR' | 'RECUSAR') =>
    request<{
      status: string;
      orcamento: Orcamento;
      pedido: Pedido | null;
      bloqueioConversao?: string | null;
    }>(`/api/v1/publico/aceite/${tokenAceite}`, {
      method: 'POST',
      body: JSON.stringify({ acao }),
    }),

  saldos: (token: string) =>
    request<SaldoEstoque[]>('/api/v1/estoque/saldos', { token }),
  movimentos: (token: string) =>
    request<MovimentoEstoque[]>('/api/v1/estoque/movimentos?limit=40', { token }),
  ajusteEstoque: (
    token: string,
    body: {
      produtoId: string;
      tipo: 'ENTRADA' | 'SAIDA';
      quantidade: string;
      custoUnitario?: string | null;
      motivoTexto?: string | null;
      entradaInicial?: boolean;
    },
  ) =>
    request<MovimentoEstoque>('/api/v1/estoque/ajustes', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  separarItem: (
    token: string,
    pedidoId: string,
    itemId: string,
    quantidade?: string | null,
  ) =>
    request<{
      movimento: MovimentoEstoque;
      pedidoCodigo: string;
      pedidoStatus: string;
      quantidadeSeparadaAgora: string;
      quantidadeRestanteItem: string;
    }>(`/api/v1/estoque/pedidos/${pedidoId}/itens/${itemId}/separar`, {
      method: 'POST',
      token,
      body: JSON.stringify({ quantidade: quantidade ?? null }),
    }),

  ordens: (token: string) =>
    request<OrdemTrabalho[]>('/api/v1/producao/ordens', { token }),
  abrirOp: (token: string, pedidoId: string, pedidoItemId: string) =>
    request<OrdemTrabalho>('/api/v1/producao/op', {
      method: 'POST',
      token,
      body: JSON.stringify({ pedidoId, pedidoItemId }),
    }),
  abrirOs: (token: string, pedidoId: string, pedidoItemId: string) =>
    request<OrdemTrabalho>('/api/v1/producao/os', {
      method: 'POST',
      token,
      body: JSON.stringify({ pedidoId, pedidoItemId }),
    }),
  apontarOp: (token: string, id: string, quantidade: string) =>
    request<OrdemTrabalho>(`/api/v1/producao/op/${id}/apontar`, {
      method: 'POST',
      token,
      body: JSON.stringify({ quantidade }),
    }),
  apontarOs: (token: string, id: string, quantidade: string) =>
    request<OrdemTrabalho>(`/api/v1/producao/os/${id}/apontar`, {
      method: 'POST',
      token,
      body: JSON.stringify({ quantidade }),
    }),
  consumirMp: (token: string, id: string, produtoId: string, quantidade: string) =>
    request<OrdemTrabalho>(`/api/v1/producao/op/${id}/consumir-mp`, {
      method: 'POST',
      token,
      body: JSON.stringify({ produtoId, quantidade }),
    }),
  retornarPa: (
    token: string,
    id: string,
    quantidade: string,
    custoUnitario?: string,
  ) =>
    request<OrdemTrabalho>(`/api/v1/producao/op/${id}/retornar-pa`, {
      method: 'POST',
      token,
      body: JSON.stringify({ quantidade, custoUnitario }),
    }),
  concluirOp: (token: string, id: string) =>
    request<OrdemTrabalho>(`/api/v1/producao/op/${id}/concluir`, {
      method: 'POST',
      token,
      body: '{}',
    }),
  concluirOs: (token: string, id: string) =>
    request<OrdemTrabalho>(`/api/v1/producao/os/${id}/concluir`, {
      method: 'POST',
      token,
      body: '{}',
    }),

  documentosFiscais: (token: string) =>
    request<DocumentoFiscal[]>('/api/v1/documentos-fiscais', { token }),
  emitirNf: (
    token: string,
    body: {
      pedidoId: string;
      pedidoItemIds?: string[];
      idempotencyKey?: string;
    },
  ) =>
    request<DocumentoFiscal & { replay?: boolean }>(
      '/api/v1/documentos-fiscais/emitir',
      {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      },
    ),

  titulos: (token: string) => request<Titulo[]>('/api/v1/titulos', { token }),
  baixarTitulo: (
    token: string,
    id: string,
    body?: {
      valor?: string;
      idempotencyKey?: string;
      observacoes?: string;
    },
  ) =>
    request<{ titulo: Titulo; replay: boolean }>(`/api/v1/titulos/${id}/baixar`, {
      method: 'POST',
      token,
      body: JSON.stringify(body ?? {}),
    }),
  emitirCobranca: (token: string, tituloId: string, idempotencyKey?: string) =>
    request<{ cobranca: Cobranca; titulo: Titulo; replay: boolean }>(
      `/api/v1/titulos/${tituloId}/cobrancas`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ idempotencyKey }),
      },
    ),
  registrarEntrega: (
    token: string,
    pedidoId: string,
    body?: { volumes?: number; observacoes?: string; confirmarAgora?: boolean },
  ) =>
    request<Entrega>(`/api/v1/pedidos/${pedidoId}/entregas`, {
      method: 'POST',
      token,
      body: JSON.stringify(body ?? { confirmarAgora: true }),
    }),

  inventarios: (token: string) =>
    request<Inventario[]>('/api/v1/estoque/inventarios', { token }),
  abrirInventario: (token: string) =>
    request<Inventario>('/api/v1/estoque/inventarios', {
      method: 'POST',
      token,
      body: '{}',
    }),
  submeterInventario: (token: string, id: string) =>
    request<Inventario>(`/api/v1/estoque/inventarios/${id}/submeter`, {
      method: 'POST',
      token,
      body: '{}',
    }),
  aprovarInventario: (token: string, id: string) =>
    request<Inventario>(`/api/v1/estoque/inventarios/${id}/aprovar`, {
      method: 'POST',
      token,
      body: '{}',
    }),

  cancelarNf: (
    token: string,
    id: string,
    body: { justificativa: string; idempotencyKey: string },
  ) =>
    request<DocumentoFiscal & { replay?: boolean }>(
      `/api/v1/documentos-fiscais/${id}/cancelar`,
      { method: 'POST', token, body: JSON.stringify(body) },
    ),
  emitirCce: (
    token: string,
    id: string,
    body: { correcao: string; idempotencyKey: string },
  ) =>
    request<{ documento: DocumentoFiscal; cce: { sequencia: number; protocolo: string } }>(
      `/api/v1/documentos-fiscais/${id}/cce`,
      { method: 'POST', token, body: JSON.stringify(body) },
    ),
  artefatosNf: (token: string, id: string) =>
    request<{
      xmlRef: string | null;
      pdfRef: string | null;
      manifesto: Record<string, unknown>;
    }>(`/api/v1/documentos-fiscais/${id}/artefatos`, { token }),

  titulosAging: (token: string) =>
    request<{
      buckets: { current: string; d1_30: string; d31_60: string; d60_plus: string };
      total: string;
    }>('/api/v1/titulos/aging', { token }),

  solicitarAdiantamento: (token: string, pedidoId: string, valorPct?: string) =>
    request<{ pedido: Pedido; titulo: Titulo }>(
      `/api/v1/pedidos/${pedidoId}/solicitar-adiantamento`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ valorPct }),
      },
    ),

  ordensCompra: (token: string) =>
    request<OrdemCompra[]>('/api/v1/compras/ordens', { token }),
  criarOrdemCompra: (
    token: string,
    body: {
      fornecedorId: string;
      urgente?: boolean;
      ordemProducaoId?: string | null;
      itens: Array<{ produtoId: string; quantidade: string; precoUnitario: string }>;
    },
  ) =>
    request<OrdemCompra>('/api/v1/compras/ordens', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  entradasCompra: (token: string) =>
    request<NfeCompra[]>('/api/v1/compras/entradas', { token }),
  importarXmlCompra: (
    token: string,
    body: {
      xml: string;
      ordemCompraId?: string | null;
      permitirSemOc?: boolean;
      criarSkuAusente?: boolean;
      mapeamentos?: Record<string, string>;
      idempotencyKey?: string;
    },
  ) =>
    request<{ replay: boolean; entrada: NfeCompra }>('/api/v1/compras/entradas/xml', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  opsAguardandoMaterial: (token: string) =>
    request<OpAguardandoMaterial[]>('/api/v1/compras/ops-aguardando-material', { token }),
};

export type Empresa = {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  vendaAtiva: boolean;
  estoqueAtivo?: boolean;
  padrao?: boolean;
};

export type LoginResult = {
  token: string;
  usuario: {
    id: string;
    email: string;
    nome: string;
    perfis: string[];
    permissoes: string[];
  };
  empresa: Empresa;
  empresas: Empresa[];
};

export type MeResult = Omit<LoginResult, 'token'>;

export type Parametro = {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  descricao: string | null;
  statusRatificacao: string;
};

export type AuditItem = {
  id: string;
  ocorridoEm: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  sucesso: boolean;
  usuario: { email: string; nome: string } | null;
  ip: string | null;
};

export type Parceiro = {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string | null;
  situacao: string;
  ehProspect: boolean;
  cadastroFiscalCompleto: boolean;
  papeis: {
    cliente: boolean;
    fornecedor: boolean;
    transportadora: boolean;
    colaborador: boolean;
    banco: boolean;
    contador: boolean;
  };
};

export type Produto = {
  id: string;
  codigo: string;
  familia: string;
  descricao: string;
  ncm: string | null;
  situacao: string;
  unidadeEstoque: { id: string; codigo: string };
  unidadeComercial: { id: string; codigo: string };
};

export type Unidade = {
  id: string;
  codigo: string;
  nome: string;
  casasDecimais: number;
  ativo: boolean;
};

export type Faca = {
  id: string;
  codigo: string;
  descricao: string;
  modeloRef: string | null;
  jaCobrado: boolean;
  situacao: string;
};

export type OrcamentoItem = {
  id?: string;
  sequencia: number;
  descricao: string;
  quantidade: string;
  unidadeCodigo: string;
  precoUnitario: string;
  valorTotal: string;
  tipoItem?: string;
};

export type Orcamento = {
  id: string;
  codigo: string;
  versao: number;
  status: string;
  valorTotal: string;
  valorImpostoEstimado: string;
  subtotal?: string;
  pedidoId: string | null;
  pedidoCodigo: string | null;
  parceiro: {
    id: string;
    codigo: string;
    razaoSocial: string;
    ehProspect?: boolean;
    cadastroFiscalCompleto?: boolean;
  };
  impostoEhEstimativa?: boolean;
  cenarios?: Array<{ label: string; ativo: boolean; itens: OrcamentoItem[] }>;
  itens: OrcamentoItem[];
};

export type Pedido = {
  id: string;
  codigo: string;
  status: string;
  orcamentoCodigo: string;
  orcamentoVersao: number;
  valorTotal: string;
  parceiro: { id: string; codigo: string; razaoSocial: string };
  itens?: PedidoItem[];
};

export type PedidoItem = {
  id: string;
  sequencia: number;
  produtoId: string | null;
  produtoCodigo: string | null;
  descricao: string;
  tipoItem: string;
  quantidade: string;
  unidadeCodigo: string;
};

export type SaldoEstoque = {
  id: string;
  quantidade: string;
  custoMedio: string;
  atualizadoEm: string;
  produto: {
    id: string;
    codigo: string;
    descricao: string;
    familia: string;
    controlaEstoque: boolean;
    unidadeEstoque: { id: string; codigo: string };
  };
};

export type MovimentoEstoque = {
  id: string;
  codigo: string;
  tipo: string;
  motivo: string;
  quantidade: string;
  custoUnitario: string;
  custoTotal: string;
  saldoApos: string;
  custoMedioApos: string;
  motivoTexto: string | null;
  pedidoId: string | null;
  criadoEm: string;
  produto: {
    id: string;
    codigo: string;
    descricao: string;
    familia: string;
  };
};

export type OrdemTrabalho = {
  tipo: 'OP' | 'OS';
  id: string;
  codigo: string;
  status: string;
  quantidadePlanejada: string;
  quantidadeApontada: string;
  quantidadePaRetornada?: string;
  pedido: { id: string; codigo: string; status: string };
  item: {
    id: string;
    sequencia: number;
    produtoId: string | null;
    produtoCodigo: string | null;
    descricao: string;
    tipoItem: string;
    quantidade: string;
  };
  movimentos?: Array<{
    id: string;
    codigo: string;
    tipo: string;
    motivo: string;
    quantidade: string;
    produtoCodigo: string;
  }>;
};

export type DocumentoFiscal = {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  serie: string | null;
  numero: string | null;
  chave44: string | null;
  protocolo: string | null;
  valorTotal: string;
  adapter: string;
  tituloGerado: boolean;
  tituloCodigo?: string | null;
  replay?: boolean;
  pedido: {
    id: string;
    codigo: string;
    status: string;
    parceiro: { codigo: string; razaoSocial: string };
  };
};

export type Titulo = {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  naturezaGerencial: string;
  valorOriginal: string;
  valorAberto: string;
  valorBaixado: string;
  vencimentoEm: string;
  parceiro: { id: string; codigo: string; razaoSocial: string };
  pedido: { id: string; codigo: string };
  documentoFiscal: {
    id: string;
    codigo: string;
    tipo: string;
    chave44: string | null;
    numero: string | null;
    serie: string | null;
  } | null;
  origem?: string;
  cobrancas?: Cobranca[];
};

export type Cobranca = {
  id: string;
  codigo: string;
  status: string;
  valor: string;
  nossoNumero: string | null;
  linhaDigitavel: string | null;
  pdfRef: string | null;
  adapter: string;
};

export type Entrega = {
  id: string;
  codigo: string;
  status: string;
  volumes: number;
  pedido: { id: string; codigo: string; status: string };
};

export type Inventario = {
  id: string;
  codigo: string;
  status: string;
  itens: Array<{
    produtoId: string;
    produtoCodigo: string;
    qtdeSistema: string;
    qtdeContada: string | null;
    diferenca: string | null;
  }>;
};

export type OrdemCompra = {
  id: string;
  codigo: string;
  status: string;
  urgente: boolean;
  valorTotal: string;
  fornecedor: { id: string; codigo: string; razaoSocial: string };
  itens: Array<{
    id: string;
    produtoId: string;
    quantidade: string;
    precoUnitario: string;
    valorTotal: string;
    produto: { id: string; codigo: string; descricao: string };
  }>;
};

export type NfeCompra = {
  id: string;
  codigo: string;
  status: string;
  chave44: string;
  valorTotal: string;
  itens: Array<{
    id: string;
    sequencia: number;
    cProd: string;
    descricao: string;
    quantidade: string;
    produtoId: string | null;
  }>;
};

export type OpAguardandoMaterial = {
  id: string;
  codigo: string;
  status: string;
  materialFalta: {
    produtoId: string;
    produtoCodigo: string;
    quantidade: string | null;
    observacoes: string | null;
  } | null;
};
