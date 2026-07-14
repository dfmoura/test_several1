import type { DadosCnpj } from './types.js';

function isBlank(value?: string | null): boolean {
  return !value || value.trim() === '';
}

function isValidIbge(code?: string): boolean {
  const digits = (code ?? '').replace(/\D/g, '');
  return digits.length === 7 && digits !== '0000000';
}

function mergeEndereco(
  primary: DadosCnpj['endereco'] | undefined,
  secondary: DadosCnpj['endereco'] | undefined,
): DadosCnpj['endereco'] {
  const base = primary ?? secondary;
  if (!base) {
    return {
      logradouro: 'NÃO INFORMADO',
      numero: 'S/N',
      bairro: 'NÃO INFORMADO',
      codigoMunicipio: '0000000',
      uf: '',
      cep: '',
    };
  }

  const other = primary ? secondary : undefined;
  if (!other) return base;

  return {
    logradouro: isBlank(base.logradouro) || base.logradouro === 'NÃO INFORMADO' ? other.logradouro : base.logradouro,
    numero: isBlank(base.numero) || base.numero === 'S/N' ? other.numero : base.numero,
    complemento: base.complemento || other.complemento,
    bairro: isBlank(base.bairro) || base.bairro === 'NÃO INFORMADO' ? other.bairro : base.bairro,
    codigoMunicipio: isValidIbge(base.codigoMunicipio) ? base.codigoMunicipio : other.codigoMunicipio,
    uf: base.uf || other.uf,
    cep: base.cep || other.cep,
    nomeMunicipio: base.nomeMunicipio || other.nomeMunicipio,
  };
}

/**
 * Combina dados de CNPJ de múltiplas fontes (Brasil API, Receita WS).
 * Valores já preenchidos na fonte primária têm precedência; lacunas são preenchidas pela secundária.
 */
export function mergeDadosCnpj(
  primary: DadosCnpj | null,
  secondary: DadosCnpj | null,
): DadosCnpj | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  const fontes = [...new Set([...(primary.fontes ?? []), ...(secondary.fontes ?? [])])];

  return {
    cnpj: primary.cnpj || secondary.cnpj,
    razaoSocial: primary.razaoSocial || secondary.razaoSocial,
    nomeFantasia: primary.nomeFantasia || secondary.nomeFantasia,
    situacaoCadastral: primary.situacaoCadastral || secondary.situacaoCadastral,
    email: isBlank(primary.email) ? secondary.email : primary.email,
    telefone: isBlank(primary.telefone) ? secondary.telefone : primary.telefone,
    endereco: mergeEndereco(primary.endereco, secondary.endereco),
    porte: primary.porte || secondary.porte,
    naturezaJuridica: primary.naturezaJuridica || secondary.naturezaJuridica,
    dataAbertura: primary.dataAbertura || secondary.dataAbertura,
    tipoEstabelecimento: primary.tipoEstabelecimento || secondary.tipoEstabelecimento,
    optanteSimples: primary.optanteSimples ?? secondary.optanteSimples,
    atividadePrincipal: primary.atividadePrincipal ?? secondary.atividadePrincipal,
    fontes: fontes.length > 0 ? fontes : undefined,
  };
}
