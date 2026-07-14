import { ValidationError } from '@nfse/shared';

export class Cnpj {
  private constructor(public readonly value: string) {}

  static create(value: string): Cnpj {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new ValidationError('CNPJ deve ter 14 dígitos');
    }
    return new Cnpj(digits);
  }

  toString(): string {
    return this.value;
  }
}

export class Cpf {
  private constructor(public readonly value: string) {}

  static create(value: string): Cpf {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) {
      throw new ValidationError('CPF deve ter 11 dígitos');
    }
    return new Cpf(digits);
  }

  toString(): string {
    return this.value;
  }
}

export class ChaveAcesso {
  private constructor(public readonly value: string) {}

  static create(value: string): ChaveAcesso {
    if (value.length !== 50) {
      throw new ValidationError('Chave de acesso deve ter 50 caracteres');
    }
    return new ChaveAcesso(value);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * nDPS no elemento XML — TSNumDPS: [1-9]{1}[0-9]{0,14}, sem zeros à esquerda.
 * Ex.: sequencial 5 → "5" (como no Emissor Nacional).
 */
export function formatNumeroDpsElement(numero: string | number): string {
  const digits = String(numero).replace(/\D/g, '');
  const normalized = digits.replace(/^0+/, '') || '';
  if (!/^[1-9][0-9]{0,14}$/.test(normalized)) {
    throw new ValidationError('Número DPS inválido para o layout NFS-e');
  }
  return normalized;
}

/**
 * nDPS na composição do Id infDPS — 15 posições numéricas com zeros à esquerda.
 * Ex.: sequencial 5 → "000000000000005".
 */
export function formatNumeroDpsId(numero: string | number): string {
  const element = formatNumeroDpsElement(numero);
  return element.padStart(15, '0');
}

/** @deprecated use formatNumeroDpsId ou formatNumeroDpsElement */
export function formatNumeroDps(numero: string | number): string {
  return formatNumeroDpsId(numero);
}

export class IdentificadorDps {
  private constructor(public readonly value: string) {}

  /**
   * Composição: {cMun 7}{tipoInsc 1}{inscFederal 14}{serie 5}{nDPS 15} = 42 chars
   * Atributo infDPS Id: "DPS" + 42 dígitos = 45 chars (TSIdDPS).
   */
  static create(params: {
    codigoMunicipio: string;
    tipoInscricao: '1' | '2';
    inscricaoFederal: string;
    serie: string;
    numeroDps: string;
  }): IdentificadorDps {
    const { codigoMunicipio, tipoInscricao, inscricaoFederal, serie, numeroDps } = params;
    const nDpsFmt = formatNumeroDpsId(numeroDps);
    const id = `${codigoMunicipio}${tipoInscricao}${inscricaoFederal.padStart(14, '0')}${serie.padStart(5, '0')}${nDpsFmt}`;
    if (id.length !== 42) {
      throw new ValidationError(`Identificador DPS inválido: ${id.length} caracteres`);
    }
    return new IdentificadorDps(id);
  }

  static fromString(value: string): IdentificadorDps {
    if (value.length !== 42) {
      throw new ValidationError('Identificador DPS deve ter 42 caracteres');
    }
    return new IdentificadorDps(value);
  }

  toString(): string {
    return this.value;
  }
}

export class Dinheiro {
  private constructor(public readonly centavos: number) {}

  static fromReais(reais: number): Dinheiro {
    if (reais < 0) throw new ValidationError('Valor não pode ser negativo');
    return new Dinheiro(Math.round(reais * 100));
  }

  toReais(): number {
    return this.centavos / 100;
  }

  toFixed(decimals = 2): string {
    return this.toReais().toFixed(decimals);
  }
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  uf: string;
  cep: string;
  /** Nome do município (enriquecimento cadastral — não serializado no XML). */
  nomeMunicipio?: string;
}

export interface Tomador {
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  nome?: string;
  /** Cadastro municipal — somente informada manualmente; não consta no cartão CNPJ da Receita. */
  inscricaoMunicipal?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
}

export interface Servico {
  codigoServico: string;
  /** Código NBS (cNBS) — 9 dígitos, ANEXO_B NFS-e Nacional. */
  codigoNbs?: string;
  descricao: string;
  codigoMunicipioIncidencia: string;
  /** Código de tributação municipal (cTribMun) — quando exigido pelo município. */
  codigoTributacaoMunicipal?: string;
  /** País da prestação — BACEN 105 = Brasil (padrão serviço no território nacional). */
  codigoPaisPrestacao?: string;
  /** País onde se verificou o resultado da prestação (cPaisConsum) — BACEN 105 = Brasil. */
  codigoPaisResultado?: string;
  aliquotaIss?: number;
  /** Tributação do ISSQN (tribISSQN) — padrão: 1 (operação tributável). */
  tributacaoIssqn?: '1' | '2' | '3' | '4';
  /** Tipo de imunidade (tpImunidade) — quando tribISSQN = 2. */
  tipoImunidade?: '0' | '1' | '2' | '3' | '4' | '5';
  /** Suspensão da exigibilidade (exigSusp/tpSusp): 1 = judicial, 2 = administrativo. */
  suspensaoExigibilidade?: '1' | '2';
  /** Número do processo de suspensão (exigSusp/nProcesso). */
  numeroProcessoSuspensao?: string;
  /** Benefício municipal (nBM). */
  beneficioMunicipal?: string;
  /** Retenção do ISSQN (tpRetISSQN) — padrão: 1 (não retido). */
  retencaoIssqn?: '1' | '2' | '3';
  /** Descrição das contribuições sociais retidas (piscofins/tpRetPisCofins). */
  tpRetPisCofins?: import('./tributacao-federal.js').TpRetPisCofins;
}

/** Regime especial de tributação do prestador (regEspTrib) — prest/regTrib. */
export type RegimeEspecialTributacao = '0' | '1' | '2' | '3' | '4' | '5' | '6';

/** Valor aproximado dos tributos (totTrib) — modos mutuamente exclusivos no layout NFS-e Nacional. */
export interface TotTrib {
  /** Preencher valores monetários, percentuais ou alíquota SN. */
  modo: import('./tributacao-simples-nacional.js').ModoTotTrib;
  /** Modo valores — vTotTribFed/Est/Mun. */
  valorFederal?: number;
  valorEstadual?: number;
  valorMunicipal?: number;
  /** Modo percentuais — pTotTrib/pTotTribFed/Est/Mun. */
  percentualFederal?: number;
  percentualEstadual?: number;
  percentualMunicipal?: number;
  /** Modo alíquota SN — pTotTribSN. */
  aliquotaSimplesNacional?: number;
}

export interface Valores {
  valorServico: number;
  /** Valor recebido pelo intermediário (vReceb). */
  valorRecebidoIntermediario?: number;
  /** Desconto incondicionado (vDescIncond). */
  descontoIncondicionado?: number;
  /** Desconto condicionado (vDescCond). */
  descontoCondicionado?: number;
  valorDeducoes?: number;
  /** PIS — débito de apuração própria (piscofins/vPis). */
  valorPis?: number;
  /** COFINS — débito de apuração própria (piscofins/vCofins). */
  valorCofins?: number;
  /** Contribuição previdenciária retida (tribFed/vRetCP). */
  valorInss?: number;
  /** IRRF retido (tribFed/vRetIRRF). */
  valorIr?: number;
  /** Contribuições sociais retidas — soma PIS+COFINS+CSLL (tribFed/vRetCSLL). */
  valorCsll?: number;
  valorIss?: number;
  valorLiquido?: number;
}

/** TSString — tiposSimples_v1.01.xsd (sem espaço nas extremidades). */
const TS_STRING_PATTERN = /^[!-ÿ](?:[ -ÿ]*[!-ÿ])?$/;

/** TSMotivo — cancelamento/substituição: 15–255 chars sobre TSString. */
export function validarMotivoCancelamento(value: string): string {
  const motivo = value.trim();
  if (motivo.length < 15 || motivo.length > 255) {
    throw new ValidationError('Motivo deve ter entre 15 e 255 caracteres');
  }
  if (!TS_STRING_PATTERN.test(motivo)) {
    throw new ValidationError(
      'Motivo inválido: não pode começar ou terminar com espaço (padrão TSMotivo da SEFIN)',
    );
  }
  return motivo;
}
