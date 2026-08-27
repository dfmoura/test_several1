import type {
  AptidacaoFiscal,
  Destinatario,
  Endereco,
  FinalidadeParceiro,
  IeStatus,
  RegimeParceiro,
} from './entities.js';

export const FINALIDADES: FinalidadeParceiro[] = ['REVENDA', 'INDUSTRIALIZACAO', 'USO_CONSUMO'];
export const REGIMES: RegimeParceiro[] = [
  'SIMPLES_NACIONAL', 'MEI', 'PRESUMIDO', 'REAL', 'ISENTO', 'OUTRO',
];
export const UFS_AREA_INCENTIVADA = ['AM', 'AC', 'RO', 'RR', 'AP'] as const;

export function normalizeIe(ie?: string | null): string | undefined {
  if (ie == null) return undefined;
  const value = ie.trim().toUpperCase();
  return value === '' ? undefined : value;
}

export function isIeIsento(ie?: string | null): boolean {
  const n = normalizeIe(ie);
  if (!n) return false;
  const compact = n.replace(/\s+/g, ' ');
  return ['ISENTO', 'ISENTA', 'IE ISENTO', 'IE ISENTA'].includes(compact);
}

export function isIeNumerica(ie?: string | null): boolean {
  const n = normalizeIe(ie);
  if (!n || isIeIsento(n)) return false;
  return /\d/.test(n);
}

/** Deriva indIEDest (NT 2015/003) a partir da IE. */
export function deriveIndIeDest(ie?: string | null): '1' | '2' | '9' {
  if (isIeIsento(ie)) return '2';
  if (isIeNumerica(ie)) return '1';
  return '9';
}

export function syncIeInd(input: {
  inscricaoEstadual?: string | null;
  indIEDest?: '1' | '2' | '9' | null;
  ieStatus?: IeStatus | null;
}): { inscricaoEstadual?: string; indIEDest: '1' | '2' | '9'; ieStatus: IeStatus } {
  let ie = normalizeIe(input.inscricaoEstadual);
  let derived = deriveIndIeDest(ie);
  const sent = input.indIEDest;

  if (sent && sent !== derived) {
    if (sent === '2' && !ie) {
      ie = 'ISENTO';
      derived = '2';
    } else if (sent === '9' && isIeIsento(ie)) {
      ie = undefined;
      derived = '9';
    } else {
      throw new Error(
        `indIEDest informado (${sent}) diverge da IE. Para IE "${ie ?? ''}" o valor correto é ${derived}.`,
      );
    }
  }

  let ieStatus: IeStatus = input.ieStatus ?? 'NAO_VERIFICADA';
  if (derived === '2' && ieStatus === 'NAO_VERIFICADA') ieStatus = 'ISENTA';
  if (derived === '9' && (ieStatus === 'BAIXADA' || ieStatus === 'NAO_HABILITADA')) {
    ieStatus = 'NAO_VERIFICADA';
  }

  return { inscricaoEstadual: ie, indIEDest: derived, ieStatus };
}

export function suggestAreaIncentivada(uf?: string | null, suframa?: string | null): boolean {
  if (suframa && suframa.trim() !== '') return true;
  const u = uf?.trim().toUpperCase();
  return !!u && (UFS_AREA_INCENTIVADA as readonly string[]).includes(u);
}

export type ParceiroFiscalAttrs = Partial<Destinatario> & {
  endereco?: Endereco | null;
};

/**
 * Avalia completude e aptidão para emissão NF-e + prontidão reforma.
 * Cadastro-first: não bloqueia CRUD; orquestra checklist de emissão.
 */
export function evaluateParceiroFiscal(attrs: ParceiroFiscalAttrs): AptidacaoFiscal {
  const pendencias: string[] = [];
  const pendenciasEmissao: string[] = [];
  const pendenciasReforma: string[] = [];

  const papelCliente = attrs.papelCliente ?? true;
  const papelFornecedor = attrs.papelFornecedor ?? false;
  const papelTransportadora = attrs.papelTransportadora ?? false;
  const needsTrade = papelCliente || papelFornecedor || papelTransportadora;
  const emite = attrs.emiteDocumentoFiscal ?? true;
  const razao = (attrs.razaoSocial ?? attrs.apelido ?? '').trim();
  const tipo = attrs.tipo ?? 'PJ';
  const doc = (attrs.cpfCnpj ?? '').replace(/\D/g, '');

  if (!razao) pendencias.push('Razão social / nome');

  if (!needsTrade) {
    return {
      completo: razao.length > 0,
      aptoEmissaoNfe: false,
      aptoReforma: false,
      pendencias: razao ? [] : ['Razão social / nome'],
      pendenciasEmissao: [],
      pendenciasReforma: [],
    };
  }

  if (!emite) {
    return {
      completo: razao.length > 0,
      aptoEmissaoNfe: false,
      aptoReforma: false,
      pendencias: razao ? [] : ['Razão social / nome'],
      pendenciasEmissao: ['Parceiro marcado como não destinatário/emitente de NF-e'],
      pendenciasReforma: [],
    };
  }

  if (tipo === 'PJ' && doc.length !== 14) pendencias.push('CNPJ (14 dígitos)');
  if (tipo === 'PF' && doc.length !== 11) pendencias.push('CPF (11 dígitos)');
  if (tipo === 'EX' && !doc && !(attrs.idEstrangeiro ?? '').trim()) {
    pendencias.push('Identificação do estrangeiro (idEstrangeiro)');
  }

  const end = attrs.endereco;
  if (!end?.logradouro?.trim()) pendencias.push('Logradouro');
  if (!end?.numero?.trim()) pendencias.push('Número');
  if (!end?.bairro?.trim()) pendencias.push('Bairro');
  if (!end?.municipio?.trim()) pendencias.push('Município');
  if ((end?.uf ?? '').trim().length !== 2) pendencias.push('UF');
  if ((end?.cep ?? '').replace(/\D/g, '').length !== 8) pendencias.push('CEP (8 dígitos)');
  if ((end?.codigoMunicipio ?? '').replace(/\D/g, '').length !== 7) {
    pendencias.push('Código IBGE do município (7 dígitos)');
  }

  const ie = normalizeIe(attrs.inscricaoEstadual);
  const ind = attrs.indIEDest ?? deriveIndIeDest(ie);
  if (ind === '1' && !isIeNumerica(ie)) pendencias.push('IE numérica (contribuinte ICMS)');
  if (ind === '2' && !isIeIsento(ie)) pendencias.push('IE deve ser ISENTO quando indIEDest=2');

  if (papelCliente) {
    if (!attrs.finalidade || !FINALIDADES.includes(attrs.finalidade)) {
      pendencias.push('Finalidade (revenda / industrialização / uso e consumo)');
    }
    const emailXml = (attrs.emailXml ?? attrs.email ?? '').trim();
    if (!emailXml) pendencias.push('E-mail para envio de XML/DANFE');
  }

  if (papelFornecedor && !attrs.regime) {
    pendencias.push('Regime tributário do fornecedor');
  }

  const completo = pendencias.length === 0;
  const ieStatus: IeStatus = attrs.ieStatus ?? 'NAO_VERIFICADA';
  const ativo = attrs.ativo ?? true;

  if (ind === '1' && ieStatus !== 'OK') {
    pendenciasEmissao.push('IE validada no cadastro estadual (status OK)');
  }
  if (ieStatus === 'BAIXADA' || ieStatus === 'NAO_HABILITADA') {
    pendenciasEmissao.push('IE baixada ou não habilitada — emissão bloqueada');
  }
  if (!ativo) pendenciasEmissao.push('Parceiro precisa estar ativo');

  // Reforma: destinatário não carrega CST IBS/CBS, mas UF/IBGE e indIEDest
  // são pré-requisitos para apuração territorial do IBS.
  if (!end?.uf || (end.codigoMunicipio ?? '').replace(/\D/g, '').length !== 7) {
    pendenciasReforma.push('Endereço fiscal completo (UF + IBGE) para IBS territorial');
  }
  if (papelCliente && !attrs.finalidade) {
    pendenciasReforma.push('Finalidade da operação (impacto CFOP / transição IBS-CBS)');
  }

  return {
    completo,
    aptoEmissaoNfe: completo && pendenciasEmissao.length === 0,
    aptoReforma: completo && pendenciasReforma.length === 0,
    pendencias,
    pendenciasEmissao,
    pendenciasReforma,
  };
}
