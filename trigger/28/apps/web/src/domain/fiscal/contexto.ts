/**
 * Resolução do contexto fiscal a partir dos cadastros mestres.
 */

import type {
  AmbienteFiscal,
  Empresa,
  IndicadorIeDest,
  NaturezaOperacao,
  ParametroFiscalEmpresa,
  Parceiro,
  SerieDocumentoFiscal,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { FISCAL_DEFAULTS, type ItemFiscal, type PlanoFiscalSaida } from "./defaults";

export type ParametroFiscalResolvido = {
  opSimpNac: number;
  regApTribSN: number;
  regEspTrib: number;
  pTotTribSN: number;
  pTotTribFederal: number | null;
  pTotTribEstadual: number | null;
  pTotTribMunicipal: number | null;
  csosnPadrao: string;
  cstPisPadrao: string;
  cstCofinsPadrao: string;
  serieDpsPadrao: number;
  serieNfePadrao: number;
  modalidadeFretePadrao: number;
  presencaCompradorPadrao: number;
  infCplPadrao: string | null;
  textoCreditoSn: string | null;
  naturezaMercadoria: NaturezaOperacao | null;
};

export type DestinatarioFiscal = {
  documento: string | null;
  nome: string;
  razaoSocial?: string | null;
  email: string | null;
  telefone?: string | null;
  ie: string | null;
  im: string | null;
  indicadorIeDest: IndicadorIeDest;
  consumidorFinal: boolean;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoMunicipioIbge: string | null;
  paisCodigo: string;
};

export type ContextoFiscal = {
  empresa: Empresa;
  parametros: ParametroFiscalResolvido;
  destinatario: DestinatarioFiscal;
  serieNfe: SerieDocumentoFiscal | null;
  serieNfse: SerieDocumentoFiscal | null;
  simular: boolean;
  ambiente: AmbienteFiscal;
};

function parametrosFromDb(
  p: (ParametroFiscalEmpresa & { naturezaMercadoria: NaturezaOperacao | null }) | null,
): ParametroFiscalResolvido {
  if (!p) {
    return {
      opSimpNac: FISCAL_DEFAULTS.opSimpNac,
      regApTribSN: FISCAL_DEFAULTS.regApTribSN,
      regEspTrib: FISCAL_DEFAULTS.regEspTrib,
      pTotTribSN: FISCAL_DEFAULTS.pTotTribSN,
      pTotTribFederal: null,
      pTotTribEstadual: null,
      pTotTribMunicipal: null,
      csosnPadrao: FISCAL_DEFAULTS.csosn,
      cstPisPadrao: FISCAL_DEFAULTS.cstPis,
      cstCofinsPadrao: FISCAL_DEFAULTS.cstCofins,
      serieDpsPadrao: FISCAL_DEFAULTS.serieDps,
      serieNfePadrao: FISCAL_DEFAULTS.serieNfe,
      modalidadeFretePadrao: FISCAL_DEFAULTS.modalidadeFrete,
      presencaCompradorPadrao: FISCAL_DEFAULTS.presencaComprador,
      infCplPadrao: null,
      textoCreditoSn: null,
      naturezaMercadoria: null,
    };
  }
  return {
    opSimpNac: p.opSimpNac,
    regApTribSN: p.regApTribSN,
    regEspTrib: p.regEspTrib,
    pTotTribSN: Number(p.pTotTribSN),
    pTotTribFederal: p.pTotTribFederal != null ? Number(p.pTotTribFederal) : null,
    pTotTribEstadual: p.pTotTribEstadual != null ? Number(p.pTotTribEstadual) : null,
    pTotTribMunicipal: p.pTotTribMunicipal != null ? Number(p.pTotTribMunicipal) : null,
    csosnPadrao: p.csosnPadrao,
    cstPisPadrao: p.cstPisPadrao,
    cstCofinsPadrao: p.cstCofinsPadrao,
    serieDpsPadrao: p.serieDpsPadrao,
    serieNfePadrao: p.serieNfePadrao,
    modalidadeFretePadrao: p.modalidadeFretePadrao,
    presencaCompradorPadrao: p.presencaCompradorPadrao,
    infCplPadrao: p.infCplPadrao,
    textoCreditoSn: p.textoCreditoSn,
    naturezaMercadoria: p.naturezaMercadoria,
  };
}

export function destinatarioFromParceiro(
  parceiro: Parceiro | null | undefined,
  fallbackNome: string,
): DestinatarioFiscal {
  return {
    documento: parceiro?.documento ?? null,
    nome: parceiro?.razaoSocial || parceiro?.nome || fallbackNome,
    razaoSocial: parceiro?.razaoSocial,
    email: parceiro?.emailFiscal || parceiro?.email || null,
    telefone: parceiro?.telefone,
    ie: parceiro?.inscricaoEstadual ?? null,
    im: parceiro?.inscricaoMunicipal ?? null,
    indicadorIeDest: parceiro?.indicadorIeDest ?? "NAO_CONTRIBUINTE",
    consumidorFinal: parceiro?.consumidorFinal ?? false,
    cep: parceiro?.cep ?? null,
    logradouro: parceiro?.logradouro ?? null,
    numero: parceiro?.numero ?? null,
    complemento: parceiro?.complemento ?? null,
    bairro: parceiro?.bairro ?? null,
    cidade: parceiro?.cidade ?? null,
    uf: parceiro?.uf ?? null,
    codigoMunicipioIbge: parceiro?.codigoMunicipioIbge ?? null,
    paisCodigo: parceiro?.paisCodigo || FISCAL_DEFAULTS.paisCodigo,
  };
}

export async function resolveContextoFiscal(opts: {
  empresa: Empresa;
  clienteParceiro?: Parceiro | null;
  clienteNome: string;
}): Promise<ContextoFiscal> {
  const ambiente = opts.empresa.ambienteFiscal;
  const [paramDb, series] = await Promise.all([
    prisma.parametroFiscalEmpresa.findUnique({
      where: { empresaId: opts.empresa.id },
      include: { naturezaMercadoria: true },
    }),
    prisma.serieDocumentoFiscal.findMany({
      where: { empresaId: opts.empresa.id, ambiente, ativo: true },
    }),
  ]);

  const parametros = parametrosFromDb(paramDb);
  const serieNfe =
    series.find(
      (s) => s.tipo === "NFE" && s.serie === parametros.serieNfePadrao,
    ) ||
    series.find((s) => s.tipo === "NFE") ||
    null;
  const serieNfse =
    series.find(
      (s) => s.tipo === "NFSE_DPS" && s.serie === parametros.serieDpsPadrao,
    ) ||
    series.find((s) => s.tipo === "NFSE_DPS") ||
    null;

  return {
    empresa: opts.empresa,
    parametros,
    destinatario: destinatarioFromParceiro(opts.clienteParceiro, opts.clienteNome),
    serieNfe,
    serieNfse,
    simular: opts.empresa.simularProducao || ambiente === "HOMOLOGACAO",
    ambiente,
  };
}

/** Consome próximo número da série de forma atômica. */
export async function reservarNumeroSerie(
  serieId: string,
): Promise<{ serie: number; numero: number }> {
  const updated = await prisma.serieDocumentoFiscal.update({
    where: { id: serieId },
    data: { proximoNumero: { increment: 1 } },
  });
  return {
    serie: updated.serie,
    numero: updated.proximoNumero - 1,
  };
}

export function itemFiscalFromProdutoLinha(opts: {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  produto?: {
    codigo?: string | null;
    ncm?: string | null;
    cest?: string | null;
    ean?: string | null;
    origem?: number | null;
    cfopVendaPadrao?: string | null;
    cTribNac?: string | null;
    cNbs?: string | null;
    tipo?: ItemFiscal["tipoProduto"];
    documentoSaidaPadrao?: ItemFiscal["documentoSaidaPadrao"];
    csosn?: string | null;
    cstIcms?: string | null;
    cstPis?: string | null;
    cstCofins?: string | null;
    tributacaoIss?: number | null;
    issRetido?: boolean | null;
    codigoMunicipioPrestacao?: string | null;
    ibsCbsSituacaoTributaria?: string | null;
    ibsCbsClassificacaoTributaria?: string | null;
    infAdProdPadrao?: string | null;
    unidadeTributavel?: string | null;
  } | null;
  infAdProd?: string | null;
}): ItemFiscal {
  const p = opts.produto;
  return {
    id: opts.id,
    descricao: opts.descricao,
    quantidade: opts.quantidade,
    unidade: opts.unidade,
    valorUnitario: opts.valorUnitario,
    valorTotal: opts.valorTotal,
    ncm: p?.ncm,
    cest: p?.cest,
    ean: p?.ean,
    cfop: p?.cfopVendaPadrao,
    cTribNac: p?.cTribNac,
    cNbs: p?.cNbs,
    codigo: p?.codigo,
    tipoProduto: p?.tipo,
    documentoSaidaPadrao: p?.documentoSaidaPadrao,
    origem: p?.origem,
    csosn: p?.csosn,
    cstIcms: p?.cstIcms,
    cstPis: p?.cstPis,
    cstCofins: p?.cstCofins,
    tributacaoIss: p?.tributacaoIss,
    issRetido: p?.issRetido,
    codigoMunicipioPrestacao: p?.codigoMunicipioPrestacao,
    ibsCbsSituacaoTributaria: p?.ibsCbsSituacaoTributaria,
    ibsCbsClassificacaoTributaria: p?.ibsCbsClassificacaoTributaria,
    unidadeTributavel: p?.unidadeTributavel,
    infAdProd: opts.infAdProd || p?.infAdProdPadrao,
  };
}

export type ChecklistItem = {
  codigo: string;
  severidade: "erro" | "aviso";
  mensagem: string;
  cadastro?: "empresa" | "parceiro" | "produto" | "serie" | "parametro";
};

export function checklistPreEmissao(opts: {
  ctx: ContextoFiscal;
  plano: PlanoFiscalSaida;
}): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const { empresa, destinatario, parametros, serieNfe, serieNfse } = opts.ctx;

  if (!empresa.codigoMunicipioIbge) {
    items.push({
      codigo: "empresa.ibge",
      severidade: "erro",
      mensagem: "Empresa sem código IBGE do município.",
      cadastro: "empresa",
    });
  }
  if (!empresa.cnpj) {
    items.push({
      codigo: "empresa.cnpj",
      severidade: "erro",
      mensagem: "Empresa sem CNPJ.",
      cadastro: "empresa",
    });
  }
  if (opts.plano.emitirNfse && !empresa.inscricaoMunicipal) {
    items.push({
      codigo: "empresa.im",
      severidade: "aviso",
      mensagem: "Empresa sem inscrição municipal (recomendado para NFS-e).",
      cadastro: "empresa",
    });
  }

  if (!destinatario.documento) {
    items.push({
      codigo: "parceiro.documento",
      severidade: "erro",
      mensagem: "Cliente sem CPF/CNPJ.",
      cadastro: "parceiro",
    });
  }
  const destSeveridade = opts.ctx.simular ? "aviso" : "erro";
  if (!destinatario.codigoMunicipioIbge) {
    items.push({
      codigo: "parceiro.ibge",
      severidade: destSeveridade,
      mensagem: "Cliente sem código IBGE do município.",
      cadastro: "parceiro",
    });
  }
  if (!destinatario.logradouro || !destinatario.bairro || !destinatario.cep) {
    items.push({
      codigo: "parceiro.endereco",
      severidade: destSeveridade,
      mensagem: "Cliente com endereço incompleto (logradouro, bairro, CEP).",
      cadastro: "parceiro",
    });
  }
  if (
    opts.plano.emitirNfe &&
    destinatario.indicadorIeDest === "CONTRIBUINTE" &&
    !destinatario.ie
  ) {
    items.push({
      codigo: "parceiro.ie",
      severidade: "erro",
      mensagem: "Cliente contribuinte ICMS sem inscrição estadual.",
      cadastro: "parceiro",
    });
  }

  if (opts.plano.nfe) {
    if (!serieNfe) {
      items.push({
        codigo: "serie.nfe",
        severidade: "aviso",
        mensagem: `Série NF-e ${parametros.serieNfePadrao} não cadastrada — será usada numeração do pedido.`,
        cadastro: "serie",
      });
    }
    for (const it of opts.plano.nfe.itens) {
      if (!it.ncm) {
        items.push({
          codigo: "produto.ncm",
          severidade: "erro",
          mensagem: `Item "${it.descricao}" sem NCM.`,
          cadastro: "produto",
        });
      }
    }
  }

  if (opts.plano.nfse) {
    if (!serieNfse) {
      items.push({
        codigo: "serie.nfse",
        severidade: "aviso",
        mensagem: `Série DPS ${parametros.serieDpsPadrao} não cadastrada — será usada numeração padrão.`,
        cadastro: "serie",
      });
    }
    for (const it of opts.plano.nfse.itens) {
      if (!it.cTribNac) {
        items.push({
          codigo: "produto.cTribNac",
          severidade: "erro",
          mensagem: `Serviço "${it.descricao}" sem código de tributação nacional (cTribNac).`,
          cadastro: "produto",
        });
      }
    }
  }

  return items;
}

export function validatePreEmissao(opts: {
  ctx: ContextoFiscal;
  plano: PlanoFiscalSaida;
}): void {
  const erros = checklistPreEmissao(opts).filter((i) => i.severidade === "erro");
  if (erros.length) {
    throw Object.assign(
      new Error(`Cadastro fiscal incompleto: ${erros.map((e) => e.mensagem).join(" ")}`),
      { status: 400, checklist: erros },
    );
  }
}
