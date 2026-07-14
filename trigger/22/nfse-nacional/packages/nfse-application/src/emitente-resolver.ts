import type { AppConfig } from '@nfse/shared';
import type { CertificadoInfo } from '@nfse/xml';
import type { Endereco } from '@nfse/domain';
import type { EffectivePrestadorConfig } from './settings-service.js';

export interface EmitenteResolvido {
  cnpj: string;
  razaoSocial: string;
  codigoMunicipio: string;
  /** Cadastro municipal do prestador — somente `NFSE_INSCRICAO_MUNICIPAL` (.env). */
  inscricaoMunicipal?: string;
  /** true quando certificado A1 real está carregado (não mock). */
  certificadoAtivo: boolean;
  /** Cartão CNPJ (Receita) — somente exibição. */
  nomeFantasia?: string;
  situacaoCadastral?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
  nomeMunicipio?: string;
  porte?: string;
  naturezaJuridica?: string;
  dataAbertura?: string;
  tipoEstabelecimento?: string;
  optanteSimples?: boolean;
  atividadePrincipal?: { codigo: string; descricao: string };
  fonteCadastro?: string;
}

/**
 * Dados do prestador/emitente para DPS e eventos.
 * Com certificado real: CNPJ e razão social vêm do A1.
 * Município emissor e inscrição municipal são sempre manuais (.env) — não vêm do certificado nem do cartão CNPJ.
 */
export function resolveEmitente(
  config: AppConfig,
  cert: CertificadoInfo,
  prestador?: EffectivePrestadorConfig,
): EmitenteResolvido {
  const certificadoAtivo = !cert.mock;
  const base = prestador ?? {
    codigoMunicipio: config.codigoMunicipio,
    dpsSerie: config.dpsSerie,
    razaoSocial: config.razaoSocial,
    inscricaoMunicipal: config.inscricaoMunicipal,
  };

  return {
    cnpj: certificadoAtivo && cert.cnpj ? cert.cnpj : config.cnpj,
    razaoSocial:
      certificadoAtivo && cert.razaoSocial ? cert.razaoSocial : base.razaoSocial,
    codigoMunicipio: base.codigoMunicipio,
    inscricaoMunicipal: base.inscricaoMunicipal,
    certificadoAtivo,
  };
}
