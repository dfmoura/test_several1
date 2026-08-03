/**
 * Tipos Focus NFe / NFS-e Nacional (campos principais das APIs).
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://doc.focusnfe.com.br/reference/nfse-nacional
 */

export type FocusNfeItem = {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  codigo_ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  unidade_tributavel?: string;
  quantidade_tributavel?: number;
  valor_unitario_tributavel?: number;
  icms_origem?: number;
  icms_situacao_tributaria?: string;
  pis_situacao_tributaria?: string;
  cofins_situacao_tributaria?: string;
  codigo_cest?: string;
  codigo_barras_comercial?: string;
  informacoes_adicionais_item?: string;
  ibs_cbs_situacao_tributaria?: string;
  ibs_cbs_classificacao_tributaria?: string;
};

export type FocusNfeRequest = {
  natureza_operacao: string;
  data_emissao: string;
  tipo_documento: number;
  finalidade_emissao?: number;
  local_destino?: number;
  consumidor_final?: number;
  presenca_comprador?: number;
  cnpj_emitente: string;
  nome_destinatario: string;
  cnpj_destinatario?: string;
  cpf_destinatario?: string;
  inscricao_estadual_destinatario?: string;
  indicador_inscricao_estadual_destinatario?: number;
  email_destinatario?: string;
  logradouro_destinatario?: string;
  numero_destinatario?: string;
  bairro_destinatario?: string;
  municipio_destinatario?: string;
  uf_destinatario?: string;
  cep_destinatario?: string;
  codigo_municipio_destinatario?: string;
  serie?: number;
  numero?: number;
  items: FocusNfeItem[];
  valor_produtos: number;
  valor_total: number;
  modalidade_frete?: number;
  informacoes_adicionais_contribuinte?: string;
  formas_pagamento?: Array<{
    indicador_pagamento?: number;
    forma_pagamento?: number;
    valor_pagamento?: number;
  }>;
};

export type FocusNfseNacionalRequest = {
  data_emissao: string;
  serie_dps: number;
  numero_dps: number;
  data_competencia?: string;
  emitente_dps?: number | string;
  codigo_municipio_emissora: number;
  cnpj_prestador: string;
  inscricao_municipal_prestador?: string;
  codigo_opcao_simples_nacional?: number | string;
  regime_apuracao_tributos_sn?: number | string;
  regime_especial_tributacao?: number | string;
  cnpj_tomador?: string;
  cpf_tomador?: string;
  nome_tomador?: string;
  email_tomador?: string;
  inscricao_municipal_tomador?: string;
  logradouro_tomador?: string;
  numero_tomador?: string;
  bairro_tomador?: string;
  cep_tomador?: string;
  codigo_municipio_tomador?: string;
  uf_tomador?: string;
  codigo_municipio_prestacao: string | number;
  codigo_tributacao_nacional_iss: string;
  codigo_nbs?: string;
  descricao_servico: string;
  valor_servico: number;
  tributacao_iss?: number;
  iss_retido?: boolean;
  percentual_total_tributos_simples_nacional?: number;
  percentual_total_tributos_federais?: number;
  percentual_total_tributos_estaduais?: number;
  percentual_total_tributos_municipais?: number;
  ibs_cbs_situacao_tributaria?: string;
  ibs_cbs_classificacao_tributaria?: string;
};

export type FocusStatus =
  | "autorizado"
  | "processando_autorizacao"
  | "erro_autorizacao"
  | "cancelado";

export type FocusApiResponse = {
  status?: string;
  ref?: string;
  protocolo?: string;
  chave?: string;
  numero?: string | number;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  mensagem?: string;
  codigo?: string;
  [key: string]: unknown;
};
