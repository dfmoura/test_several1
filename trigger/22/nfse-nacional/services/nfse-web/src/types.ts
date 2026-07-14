export interface Nfse {
  chaveAcesso: string;
  idDps: string;
  situacao: string;
  valorServico: number;
  emitidaEm: string;
  createdAt?: string;
  updatedAt?: string;
  chaveSubstituida?: string;
  chaveSubstituta?: string;
  xml?: string;
}

export interface NfseListagem {
  total: number;
  items: Nfse[];
  resumo: {
    totalGeral: number;
    valorTotalGeral: number;
    porSituacao: { situacao: string; total: number }[];
    emitente: {
      cnpj: string;
      razaoSocial: string;
      codigoMunicipio: string;
      nomeMunicipio?: string;
      inscricaoMunicipal?: string;
      ambiente: string;
      certificadoAtivo: boolean;
    };
    certificado: {
      mock: boolean;
      cnpj?: string;
      validade?: string;
      diasParaExpirar?: number;
      clientAuth?: boolean;
    };
  };
}

/** NFS-e recebida via ADN — emitida por outro prestador, tomador = CNPJ do certificado. */
export interface NfseRecebida {
  chave: string;
  nsu: string;
  tipoDfe: string;
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  tomadorCnpj: string;
  tomadorRazaoSocial?: string;
  valorServico: number;
  emitidaEm?: string;
  situacao?: string;
  recebidoEm: string;
  processado: boolean;
}

export interface NfseRecebidasListagem {
  total: number;
  items: NfseRecebida[];
  resumo: {
    cnpjTomador: string;
    totalGeral: number;
    valorTotalGeral: number;
    ultimoNsu?: string;
    fonte: 'ADN';
  };
}

export interface EventoNfse {
  id: string;
  chaveAcesso: string;
  tipo: string;
  sequencial: number;
  statusRegistro: string;
  motivo?: string;
  createdAt: string;
}

export interface DashboardData {
  totais: {
    nfse: number;
    dps: number;
    dfe: number;
    outboxPendente: number;
    dfePendente: number;
  };
  nfsePorSituacao: { situacao: string; total: number }[];
  dpsPorStatus: { status: string; total: number }[];
  nfseRecentes: { chaveAcesso: string; situacao: string; valorServico: number; emitidaEm: string }[];
  ultimosEventos: { id: string; action: string; entity: string; entityId: string; ip?: string; createdAt: string }[];
}

export interface SystemConfig {
  ambiente: string;
  cnpj: string;
  razaoSocial: string;
  codigoMunicipio: string;
  nomeMunicipio?: string;
  dpsSerie: string;
  /** Prestador — somente `NFSE_INSCRICAO_MUNICIPAL` (.env); não vem de APIs de CNPJ. */
  inscricaoMunicipal?: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  email?: string;
  telefone?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigoMunicipio: string;
    uf: string;
    cep: string;
    nomeMunicipio?: string;
  };
  porte?: string;
  naturezaJuridica?: string;
  dataAbertura?: string;
  tipoEstabelecimento?: string;
  optanteSimples?: boolean;
  atividadePrincipal?: { codigo: string; descricao: string };
  fonteCadastro?: string;
  govMock: boolean;
  syncIntervalSec: number;
  cadastroEnabled?: boolean;
  certificadoAtivo?: boolean;
}

/**
 * Dados retornados pela consulta ao cartão CNPJ (Receita Federal — Brasil API + Receita WS).
 * Inscrição municipal não faz parte deste contrato — informada manualmente na emissão ou via .env (prestador).
 */
export interface CartaoCnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  email?: string;
  telefone?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigoMunicipio: string;
    uf: string;
    cep: string;
    nomeMunicipio?: string;
  };
  porte?: string;
  naturezaJuridica?: string;
  dataAbertura?: string;
  tipoEstabelecimento?: string;
  optanteSimples?: boolean;
  atividadePrincipal?: { codigo: string; descricao: string };
  fonte?: string;
}

export interface HealthReady {
  status: string;
  database?: string;
  certificado?: {
    mock: boolean;
    cnpj?: string;
    subject?: string;
    clientAuth?: boolean;
    diasParaExpirar: number;
    validade: string;
  };
  error?: string;
}

/** Item da base nacional LC 116 (cTribNac). */
export interface TributacaoNacionalItem {
  codigo: string;
  codigoFormatado?: string;
  item: string;
  subitem: string;
  desdobro: string;
  descricao: string;
}

/** Item da base oficial NBS (cNBS). */
export interface NbsItem {
  codigo: string;
  codigoFormatado?: string;
  descricao: string;
}

export interface AppSettings {
  prestador: {
    cnpj: string;
    razaoSocial: string;
    codigoMunicipio: string;
    inscricaoMunicipal?: string;
    dpsSerie: string;
    certificadoAtivo: boolean;
  };
  prestadorOverrides: Record<string, boolean>;
  integracao: {
    syncIntervalSec: number;
    cadastroEnabled: boolean;
    cadastroCacheTtlSec: number;
    govMock: boolean;
    govEndpoints: { sefin: string; adn: string };
  };
  integracaoOverrides: Record<string, boolean>;
  ambiente: {
    value: string;
    editable: false;
    requiresRestart: true;
  };
  observabilidade: {
    logLevel: string;
  };
  observabilidadeOverrides: Record<string, boolean>;
  console: {
    webPasswordConfigured: boolean;
    webPasswordOverridden: boolean;
  };
  infra: {
    certPath?: string;
    certRequired: boolean;
    certPasswordConfigured: boolean;
    databaseConfigured: boolean;
    redisConfigured: boolean;
    rabbitmqConfigured: boolean;
    minioConfigured: boolean;
    hostPorts: {
      api: number;
      web: number;
      danfse: number;
      traefikDashboard: number;
      rabbitmqUi: number;
      minioConsole: number;
      postgres: number;
      grafana: number;
      prometheus: number;
    };
  };
  restartRequired: string[];
  updatedAt?: string;
}

export interface UpdateSettingsPayload {
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;
  dpsSerie?: string;
  razaoSocial?: string;
  syncIntervalSec?: number;
  cadastroEnabled?: boolean;
  cadastroCacheTtlSec?: number;
  logLevel?: string;
}

export interface TomadorEnderecoCadastro {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio?: string;
  uf: string;
  cep: string;
}

export interface TomadorCadastro {
  id: string;
  apelido: string;
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  email?: string;
  telefone?: string;
  inscricaoMunicipal?: string;
  endereco?: TomadorEnderecoCadastro;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TomadorCadastroInput {
  apelido: string;
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  email?: string;
  telefone?: string;
  inscricaoMunicipal?: string;
  endereco?: TomadorEnderecoCadastro | null;
  ativo?: boolean;
}

export interface TomadorCadastroListagem {
  total: number;
  items: TomadorCadastro[];
}
