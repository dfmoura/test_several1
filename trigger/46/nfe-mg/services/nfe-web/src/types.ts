export interface Emitente {
  id: string;
  apelido: string;
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  crt: string;
  endereco: Record<string, string>;
  ambiente: string;
  seriePadrao: number;
  ultimoNumero: number;
  credenciadoSiare: boolean;
  certificado: {
    presente: boolean;
    cnpj?: string | null;
    validade?: string | null;
    alerta: string;
    diasParaExpirar: number | null;
  };
  ativo: boolean;
}

export interface NfeRow {
  id: string;
  chaveAcesso: string;
  situacao: string;
  serie: number;
  numero: number;
  destRazaoSocial: string;
  destCpfCnpj: string;
  valorNf: number;
  nProt?: string | null;
  cStat?: string | null;
  dhEmi: string;
}

export interface DashboardData {
  totais: { nfe: number; emitentes: number; outboxPendente: number; lotesProcessando: number };
  nfePorSituacao: { situacao: string; total: number }[];
  nfeRecentes: NfeRow[];
  ultimosEventos: { id: string; action: string; entity: string; entityId: string; createdAt: string }[];
  certificados: { emitenteId: string; apelido: string; cnpj: string; presente: boolean; diasParaExpirar: number | null }[];
}

export interface SystemConfig {
  ambiente: string;
  sefazMock: boolean;
  uf: string;
  cUF: string;
  modelo: string;
  layout: string;
}

export const EMITENTE_KEY = 'nfe.emitenteId';
