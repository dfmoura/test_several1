import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CnaeAtividadesPanel } from '../components/CnaeAtividadesPanel';
import { CnpjConsultaMetaStrip } from '../components/CnpjConsultaMetaStrip';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { RegistroMetaStrip, type RegistroAutoria } from '../components/RegistroMetaStrip';
import { QsaSociosPanel } from '../components/QsaSociosPanel';
import { SortableTh } from '../components/SortableTh';
import { onAbrirFichaClick } from '../lib/fichaNav';
import {
  api,
  mensagemCepImportado,
  patchEnderecoFromCep,
  type BancoConsulta,
  type CepConsulta,
  type CnaeSecundario,
  type CnpjConsulta,
  type Departamento,
  type Parceiro,
  type ParceiroVinculo,
  type ParceiroContaBancaria,
  type ParceiroContato,
  type ParceiroEnderecoEntrega,
  type ParceiroFiscalHistorico,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { DECIMAL_SCALE, decimalStep, formatCep, formatCnpjCpf, formatKmCarro, formatKmCarroDaEmpresa, formatLatLng, formatPhone, kmCarroEhZero, onlyDigits } from '../lib/format';
import {
  CONDICOES_PAGAMENTO_SUGESTOES,
  FORMAS_PAGAMENTO,
  isFormaPagamentoCanonica,
} from '../lib/condicoesComerciais';
import {
  deriveIndIeDest,
  indIeDestLabel,
  ieStatusLabel,
  suggestAreaIncentivada,
} from '../lib/parceiroFiscal';
import { useTableSort } from '../lib/useTableSort';

const PAPEIS = [
  { key: 'papel_cliente', label: 'Cliente' },
  { key: 'papel_fornecedor', label: 'Fornecedor' },
  { key: 'papel_colaborador', label: 'Colaborador' },
  { key: 'papel_transportadora', label: 'Transportadora' },
  { key: 'papel_banco', label: 'Banco' },
  { key: 'papel_entidade', label: 'Entidade' },
  { key: 'papel_vendedor', label: 'Vendedor' },
  { key: 'papel_contador', label: 'Contador' },
] as const;

const BASE_TABS = ['Identificação', 'Endereço', 'Entrega', 'Fiscal', 'Contatos', 'Papéis', 'Financeiro'] as const;
const PJ_ONLY_TABS = ['Atividades', 'Sócios'] as const;
type BaseTab = (typeof BASE_TABS)[number];
type PjTab = (typeof PJ_ONLY_TABS)[number];
type Tab = BaseTab | PjTab;

function tabsForTipoPessoa(tipo: string): Tab[] {
  if (tipo === 'PJ') {
    return [
      'Identificação',
      'Atividades',
      'Endereço',
      'Entrega',
      'Fiscal',
      'Sócios',
      'Contatos',
      'Papéis',
      'Financeiro',
    ];
  }
  return [...BASE_TABS];
}

function normalizeCnaesSecundarios(
  items: Array<{ codigo: string | number; descricao?: string | null }> | null | undefined,
): CnaeSecundario[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    codigo: item.codigo,
    descricao: item.descricao ?? '',
  }));
}

type ContatoForm = {
  key: string;
  nome: string;
  funcao: string;
  telefone: string;
  whatsapp: string;
  email: string;
  principal: boolean;
  autorizado_aprovar: boolean;
};

type ContaForm = {
  key: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  pix_chave: string;
  tipo_conta: string;
  principal: boolean;
};

type EnderecoEntregaForm = {
  key: string;
  apelido: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge: string;
  latitude: string;
  longitude: string;
  distancia_km: string;
  distancia_fonte: string;
  distancia_calculada_em: string;
  distancia_empresa_id: number | null;
  responsavel_nome: string;
  responsavel_telefone: string;
  responsavel_documento: string;
  observacoes: string;
  principal: boolean;
};

type ParceiroFormData = {
  tipo_pessoa: string;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia: string;
  ie: string;
  im: string;
  suframa: string;
  area_incentivada: boolean;
  ind_ie_dest: number;
  ie_status: string;
  ie_consultado_em: string;
  consumidor_final: boolean;
  finalidade: string;
  regime: string;
  regime_desde: string;
  cnae: string;
  cnaes_secundarios: CnaeSecundario[];
  situacao: string;
  is_prospect: boolean;
  cadastro_fiscal_completo: boolean;
  emite_documento_fiscal: boolean;
  apto_emissao_nfe: boolean;
  fiscal_pendencias: string[];
  fiscal_pendencias_emissao: string[];
  motivo_vigencia_fiscal: string;
  papel_cliente: boolean;
  papel_fornecedor: boolean;
  papel_colaborador: boolean;
  papel_transportadora: boolean;
  papel_banco: boolean;
  papel_entidade: boolean;
  papel_vendedor: boolean;
  papel_contador: boolean;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge: string;
  latitude: string;
  longitude: string;
  distancia_km: string;
  distancia_fonte: string;
  distancia_calculada_em: string;
  distancia_empresa_id: number | null;
  telefone: string;
  whatsapp: string;
  email: string;
  email_xml: string;
  limite_credito: string;
  condicao_pagamento: string;
  forma_pagamento: string;
  vendedor_parceiro_id: number | '';
  comissao_percentual: string;
  tipo_fornecimento: string;
  cfop_entrada_padrao: string;
  vinculo: string;
  cargo: string;
  departamento_id: string;
  departamento_nome: string;
  entrega_mesmo_fiscal: boolean;
  enderecos_entrega: EnderecoEntregaForm[];
  contatos: ContatoForm[];
  contas: ContaForm[];
  historico: ParceiroFiscalHistorico[];
  codigo?: string;
};

function applyCnpjToParceiroForm(
  form: ParceiroFormData,
  d: CnpjConsulta,
): Partial<ParceiroFormData> {
  const cnae =
    d.cnae ??
    (d.cnae_fiscal != null ? String(d.cnae_fiscal).padStart(7, '0') : form.cnae);

  return {
    razao_social: d.razao_social ?? form.razao_social,
    nome_fantasia: d.nome_fantasia ?? form.nome_fantasia,
    logradouro: d.logradouro ?? form.logradouro,
    numero: d.numero ?? form.numero,
    complemento: d.complemento ?? form.complemento,
    bairro: d.bairro ?? form.bairro,
    municipio: d.municipio ?? form.municipio,
    uf: d.uf ?? form.uf,
    cep: d.cep ? onlyDigits(d.cep) : form.cep,
    ibge: d.ibge ?? (d.codigo_municipio_ibge != null ? String(d.codigo_municipio_ibge) : form.ibge),
    telefone: d.telefone ?? d.ddd_telefone_1 ?? form.telefone,
    email: d.email ?? form.email,
    regime: d.regime_sugerido ?? form.regime,
    regime_desde:
      d.regime_sugerido && !form.regime_desde
        ? new Date().toISOString().slice(0, 10)
        : form.regime_desde,
    area_incentivada:
      suggestAreaIncentivada(d.uf ?? form.uf, form.suframa) || form.area_incentivada,
    cnae: onlyDigits(cnae).slice(0, 7),
    cnaes_secundarios: d.cnaes_secundarios
      ? normalizeCnaesSecundarios(d.cnaes_secundarios)
      : form.cnaes_secundarios,
  };
}

let uid = 0;
function nextKey(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

function emptyContato(principal = false): ContatoForm {
  return {
    key: nextKey('ct'),
    nome: '',
    funcao: '',
    telefone: '',
    whatsapp: '',
    email: '',
    principal,
    autorizado_aprovar: principal,
  };
}

function emptyConta(principal = false): ContaForm {
  return {
    key: nextKey('cb'),
    banco_codigo: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    pix_chave: '',
    tipo_conta: 'CORRENTE',
    principal,
  };
}

function emptyEnderecoEntrega(principal = false): EnderecoEntregaForm {
  return {
    key: nextKey('ee'),
    apelido: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    ibge: '',
    latitude: '',
    longitude: '',
    distancia_km: '',
    distancia_fonte: '',
    distancia_calculada_em: '',
    distancia_empresa_id: null,
    responsavel_nome: '',
    responsavel_telefone: '',
    responsavel_documento: '',
    observacoes: '',
    principal,
  };
}

const emptyForm = (): ParceiroFormData => ({
  tipo_pessoa: 'PJ',
  cnpj_cpf: '',
  razao_social: '',
  nome_fantasia: '',
  ie: '',
  im: '',
  suframa: '',
  area_incentivada: false,
  ind_ie_dest: 9,
  ie_status: 'NAO_VERIFICADA',
  ie_consultado_em: '',
  consumidor_final: false,
  finalidade: '',
  regime: '',
  regime_desde: '',
  cnae: '',
  cnaes_secundarios: [],
  situacao: 'ATIVO',
  is_prospect: false,
  cadastro_fiscal_completo: false,
  emite_documento_fiscal: true,
  apto_emissao_nfe: false,
  fiscal_pendencias: [],
  fiscal_pendencias_emissao: [],
  motivo_vigencia_fiscal: '',
  papel_cliente: false,
  papel_fornecedor: false,
  papel_colaborador: false,
  papel_transportadora: false,
  papel_banco: false,
  papel_entidade: false,
  papel_vendedor: false,
  papel_contador: false,
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: '',
  cep: '',
  ibge: '',
  latitude: '',
  longitude: '',
  distancia_km: '',
  distancia_fonte: '',
  distancia_calculada_em: '',
  distancia_empresa_id: null,
  telefone: '',
  whatsapp: '',
  email: '',
  email_xml: '',
  limite_credito: '',
  condicao_pagamento: '',
  forma_pagamento: '',
  vendedor_parceiro_id: '',
  comissao_percentual: '',
  tipo_fornecimento: '',
  cfop_entrada_padrao: '',
  vinculo: '',
  cargo: '',
  departamento_id: '',
  departamento_nome: '',
  entrega_mesmo_fiscal: true,
  enderecos_entrega: [emptyEnderecoEntrega(true)],
  contatos: [emptyContato(true)],
  contas: [emptyConta(true)],
  historico: [],
});

function mapContatos(p: Parceiro): ContatoForm[] {
  if (p.contatos && p.contatos.length > 0) {
    return p.contatos.map((c: ParceiroContato) => ({
      key: nextKey('ct'),
      nome: c.nome ?? '',
      funcao: c.funcao ?? '',
      telefone: c.telefone ?? '',
      whatsapp: c.whatsapp ?? '',
      email: c.email ?? '',
      principal: Boolean(c.principal),
      autorizado_aprovar: Boolean(c.autorizado_aprovar ?? c.principal),
    }));
  }

  if (p.contato_nome || p.contato_funcao || p.telefone || p.whatsapp || p.email) {
    return [
      {
        key: nextKey('ct'),
        nome: p.contato_nome ?? '',
        funcao: p.contato_funcao ?? '',
        telefone: p.telefone ?? '',
        whatsapp: p.whatsapp ?? '',
        email: p.email ?? '',
        principal: true,
        autorizado_aprovar: true,
      },
    ];
  }

  return [emptyContato(true)];
}

function mapContas(p: Parceiro): ContaForm[] {
  if (p.contas_bancarias && p.contas_bancarias.length > 0) {
    return p.contas_bancarias.map((c: ParceiroContaBancaria) => ({
      key: nextKey('cb'),
      banco_codigo: c.banco_codigo ?? '',
      banco_nome: c.banco_nome ?? '',
      agencia: c.agencia ?? '',
      conta: c.conta ?? '',
      pix_chave: c.pix_chave ?? '',
      tipo_conta: c.tipo_conta ?? 'CORRENTE',
      principal: Boolean(c.principal),
    }));
  }

  if (p.banco_codigo || p.banco_nome || p.agencia || p.conta || p.pix_chave) {
    return [
      {
        key: nextKey('cb'),
        banco_codigo: p.banco_codigo ?? '',
        banco_nome: p.banco_nome ?? '',
        agencia: p.agencia ?? '',
        conta: p.conta ?? '',
        pix_chave: p.pix_chave ?? '',
        tipo_conta: 'CORRENTE',
        principal: true,
      },
    ];
  }

  return [emptyConta(true)];
}

function mapEnderecosEntrega(p: Parceiro): EnderecoEntregaForm[] {
  if (p.enderecos_entrega && p.enderecos_entrega.length > 0) {
    return p.enderecos_entrega.map((e: ParceiroEnderecoEntrega) => ({
      key: nextKey('ee'),
      apelido: e.apelido ?? '',
      logradouro: e.logradouro ?? '',
      numero: e.numero ?? '',
      complemento: e.complemento ?? '',
      bairro: e.bairro ?? '',
      municipio: e.municipio ?? '',
      uf: e.uf ?? '',
      cep: e.cep ?? '',
      ibge: e.ibge ?? '',
      latitude: e.latitude ?? '',
      longitude: e.longitude ?? '',
      distancia_km: e.distancia_km && !kmCarroEhZero(e.distancia_km) ? String(e.distancia_km) : '',
      distancia_fonte: e.distancia_fonte ?? '',
      distancia_calculada_em: e.distancia_calculada_em ?? '',
      distancia_empresa_id: e.distancia_empresa_id ?? null,
      responsavel_nome: e.responsavel_nome ?? '',
      responsavel_telefone: e.responsavel_telefone ?? '',
      responsavel_documento: e.responsavel_documento ?? '',
      observacoes: e.observacoes ?? '',
      principal: Boolean(e.principal),
    }));
  }

  return [emptyEnderecoEntrega(true)];
}

function fromParceiro(p: Parceiro): ParceiroFormData {
  const temEntrega = Boolean(p.enderecos_entrega && p.enderecos_entrega.length > 0);
  return {
    codigo: p.codigo,
    tipo_pessoa: p.tipo_pessoa ?? 'PJ',
    cnpj_cpf: p.cnpj_cpf ?? '',
    razao_social: p.razao_social,
    nome_fantasia: p.nome_fantasia ?? '',
    ie: p.ie ?? '',
    im: p.im ?? '',
    suframa: p.suframa ?? '',
    area_incentivada: Boolean(p.area_incentivada),
    ind_ie_dest: p.ind_ie_dest ?? deriveIndIeDest(p.ie),
    ie_status: p.ie_status ?? 'NAO_VERIFICADA',
    ie_consultado_em: p.ie_consultado_em ?? '',
    consumidor_final: p.consumidor_final,
    finalidade: p.finalidade ?? '',
    regime: p.regime ?? '',
    regime_desde: p.regime_desde ?? '',
    cnae: p.cnae ?? '',
    cnaes_secundarios: normalizeCnaesSecundarios(p.cnaes_secundarios),
    situacao: p.situacao,
    is_prospect: p.is_prospect,
    cadastro_fiscal_completo: p.cadastro_fiscal_completo,
    emite_documento_fiscal: p.emite_documento_fiscal ?? true,
    apto_emissao_nfe: Boolean(p.apto_emissao_nfe),
    fiscal_pendencias: p.fiscal_pendencias ?? [],
    fiscal_pendencias_emissao: p.fiscal_pendencias_emissao ?? [],
    motivo_vigencia_fiscal: '',
    papel_cliente: p.papel_cliente,
    papel_fornecedor: p.papel_fornecedor,
    papel_colaborador: p.papel_colaborador,
    papel_transportadora: p.papel_transportadora,
    papel_banco: p.papel_banco,
    papel_entidade: p.papel_entidade,
    papel_vendedor: p.papel_vendedor,
    papel_contador: p.papel_contador,
    logradouro: p.logradouro ?? '',
    numero: p.numero ?? '',
    complemento: p.complemento ?? '',
    bairro: p.bairro ?? '',
    municipio: p.municipio ?? '',
    uf: p.uf ?? '',
    cep: p.cep ?? '',
    ibge: p.ibge ?? '',
    latitude: p.latitude ?? '',
    longitude: p.longitude ?? '',
    distancia_km: p.distancia_km && !kmCarroEhZero(p.distancia_km) ? String(p.distancia_km) : '',
    distancia_fonte: p.distancia_fonte ?? '',
    distancia_calculada_em: p.distancia_calculada_em ?? '',
    distancia_empresa_id: p.distancia_empresa_id ?? null,
    telefone: p.telefone ?? '',
    whatsapp: p.whatsapp ?? '',
    email: p.email ?? '',
    email_xml: p.email_xml ?? '',
    limite_credito: p.limite_credito ?? '',
    condicao_pagamento: p.condicao_pagamento ?? '',
    forma_pagamento: p.forma_pagamento ?? '',
    vendedor_parceiro_id: p.vendedor_parceiro_id ?? '',
    comissao_percentual: p.comissao_percentual ?? '',
    tipo_fornecimento: p.tipo_fornecimento ?? '',
    cfop_entrada_padrao: p.cfop_entrada_padrao ?? '',
    vinculo: p.vinculo ?? '',
    cargo: p.cargo ?? '',
    departamento_id: p.departamento_id != null ? String(p.departamento_id) : '',
    departamento_nome: p.departamento_ref?.nome ?? p.departamento ?? '',
    entrega_mesmo_fiscal: !temEntrega,
    enderecos_entrega: mapEnderecosEntrega(p),
    contatos: mapContatos(p),
    contas: mapContas(p),
    historico: p.fiscais_historico ?? [],
  };
}

function ensurePrincipal<T extends { principal: boolean }>(rows: T[]): T[] {
  if (rows.length === 0) return rows;
  if (rows.some((r) => r.principal)) return rows;
  return rows.map((r, i) => ({ ...r, principal: i === 0 }));
}

function toPayload(form: ParceiroFormData): Record<string, unknown> {
  const contatos = ensurePrincipal(form.contatos)
    .filter((c) => c.nome || c.funcao || c.telefone || c.whatsapp || c.email)
    .map((c, index) => ({
      nome: c.nome || `Contato ${index + 1}`,
      funcao: c.funcao || null,
      telefone: c.telefone ? onlyDigits(c.telefone) : null,
      whatsapp: c.whatsapp ? onlyDigits(c.whatsapp) : null,
      email: c.email || null,
      principal: c.principal,
      autorizado_aprovar: c.autorizado_aprovar,
      ordem: index,
    }));

  const contas = ensurePrincipal(form.contas)
    .filter((c) => c.banco_codigo || c.banco_nome || c.agencia || c.conta || c.pix_chave)
    .map((c, index) => ({
      banco_codigo: c.banco_codigo || null,
      banco_nome: c.banco_nome || null,
      agencia: c.agencia || null,
      conta: c.conta || null,
      pix_chave: c.pix_chave || null,
      tipo_conta: c.tipo_conta || null,
      principal: c.principal,
      ordem: index,
    }));

  const enderecosEntrega = form.entrega_mesmo_fiscal
    ? []
    : ensurePrincipal(form.enderecos_entrega)
        .filter(
          (e) =>
            e.responsavel_nome ||
            e.logradouro ||
            e.numero ||
            e.bairro ||
            e.municipio ||
            e.uf ||
            e.cep ||
            e.apelido,
        )
        .map((e, index) => ({
          apelido: e.apelido || null,
          logradouro: e.logradouro || null,
          numero: e.numero || null,
          complemento: e.complemento || null,
          bairro: e.bairro || null,
          municipio: e.municipio || null,
          uf: e.uf || null,
          cep: e.cep ? onlyDigits(e.cep) : null,
          ibge: e.ibge ? onlyDigits(e.ibge) : null,
          latitude: e.latitude || null,
          longitude: e.longitude || null,
          distancia_km: kmCarroEhZero(e.distancia_km) ? null : e.distancia_km || null,
          distancia_fonte: e.distancia_fonte || null,
          distancia_calculada_em: e.distancia_calculada_em || null,
          responsavel_nome: e.responsavel_nome || null,
          responsavel_telefone: e.responsavel_telefone
            ? onlyDigits(e.responsavel_telefone)
            : null,
          responsavel_documento: e.responsavel_documento || null,
          observacoes: e.observacoes || null,
          principal: e.principal,
          ordem: index,
        }));

  const principalContato = contatos.find((c) => c.principal) ?? contatos[0];

  return {
    tipo_pessoa: form.tipo_pessoa,
    cnpj_cpf: form.cnpj_cpf ? onlyDigits(form.cnpj_cpf) : null,
    razao_social: form.razao_social,
    nome_fantasia: form.nome_fantasia || null,
    ie: form.ie || null,
    im: form.im || null,
    suframa: form.suframa ? onlyDigits(form.suframa) : null,
    area_incentivada: form.area_incentivada,
    ind_ie_dest: form.ind_ie_dest,
    ie_status: form.ie_status || 'NAO_VERIFICADA',
    consumidor_final: form.consumidor_final,
    finalidade: form.finalidade || null,
    regime: form.regime || null,
    regime_desde: form.regime_desde || null,
    cnae: form.tipo_pessoa === 'PJ' && form.cnae ? onlyDigits(form.cnae) : null,
    cnaes_secundarios:
      form.tipo_pessoa === 'PJ' && form.cnaes_secundarios.length > 0
        ? form.cnaes_secundarios.map((item) => ({
            codigo: String(item.codigo),
            descricao: item.descricao || null,
          }))
        : null,
    situacao: form.situacao,
    is_prospect: form.is_prospect,
    emite_documento_fiscal: form.emite_documento_fiscal,
    motivo_vigencia_fiscal: form.motivo_vigencia_fiscal || null,
    papel_cliente: form.papel_cliente,
    papel_fornecedor: form.papel_fornecedor,
    papel_colaborador: form.papel_colaborador,
    papel_transportadora: form.papel_transportadora,
    papel_banco: form.papel_banco,
    papel_entidade: form.papel_entidade,
    papel_vendedor: form.papel_vendedor,
    papel_contador: form.papel_contador,
    logradouro: form.logradouro || null,
    numero: form.numero || null,
    complemento: form.complemento || null,
    bairro: form.bairro || null,
    municipio: form.municipio || null,
    uf: form.uf || null,
    cep: form.cep ? onlyDigits(form.cep) : null,
    ibge: form.ibge ? onlyDigits(form.ibge) : null,
    latitude: form.latitude || null,
    longitude: form.longitude || null,
    distancia_km: kmCarroEhZero(form.distancia_km) ? null : form.distancia_km || null,
    distancia_fonte: form.distancia_fonte || null,
    distancia_calculada_em: form.distancia_calculada_em || null,
    telefone: form.telefone ? onlyDigits(form.telefone) : principalContato?.telefone ?? null,
    whatsapp: form.whatsapp ? onlyDigits(form.whatsapp) : principalContato?.whatsapp ?? null,
    email: form.email || principalContato?.email || null,
    email_xml: form.email_xml || null,
    limite_credito: form.limite_credito === '' ? undefined : form.limite_credito,
    condicao_pagamento: form.condicao_pagamento || null,
    forma_pagamento: form.forma_pagamento || null,
    vendedor_parceiro_id: form.vendedor_parceiro_id === '' ? null : form.vendedor_parceiro_id,
    comissao_percentual: form.comissao_percentual === '' ? null : form.comissao_percentual,
    tipo_fornecimento: form.tipo_fornecimento || null,
    cfop_entrada_padrao: form.cfop_entrada_padrao || null,
    vinculo: form.vinculo || null,
    cargo: form.cargo || null,
    departamento_id: form.departamento_id ? Number(form.departamento_id) : null,
    contatos,
    contas_bancarias: contas,
    enderecos_entrega: enderecosEntrega,
  };
}

function bankLabel(b: BancoConsulta): string {
  const code = b.code ? `${b.code} — ` : '';
  return `${code}${b.fullName || b.name}`;
}

/** Cadência Tipo A (estudo 32): pausa entre provedores no mesmo clique humano. */
function pausaEntreProvedores(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 800);
  });
}

const DISTANCIA_CAMPO_ERRO: Record<string, string> = {
  chave_ausente: 'Sem serviço de rota',
  chave_invalida: 'Sem serviço de rota',
  geo_impreciso: 'CEP impreciso — não é 0 km',
  sem_origem: 'Sem origem da empresa',
  cota: 'Cota temporária — tente de novo',
  sem_rota: 'Sem rota de carro',
  sem_ponto: 'CEP sem ponto no mapa',
  sem_destino: 'Sem posição do CEP',
  provedor_proibido: 'Rota não permitida',
  indisponivel: 'Rota indisponível',
};

const DISTANCIA_ERRO_HINT: Record<string, string> = {
  sem_origem:
    'Cadastre a origem operacional da empresa (aba Operação) — sem o ponto A o km fica vazio.',
  chave_ausente:
    'Serviço de rota não configurado. O sistema não inventa km.',
  chave_invalida:
    'Serviço de rota indisponível. O sistema não inventa km.',
  cota: 'Cota temporária do serviço de rota. Espere um pouco e clique de novo em Posição e distância.',
  sem_rota: 'Não há rota de carro até este ponto.',
  geo_impreciso:
    'O CEP do parceiro caiu no mesmo ponto do mapa que a origem. Isso não é 0 km — é falta de precisão de rua.',
  sem_destino: 'Sem posição do CEP ainda.',
  sem_ponto: 'Este CEP não tem ponto geográfico.',
  provedor_proibido: 'Provedor de rota não permitido.',
  indisponivel: 'Rota indisponível no momento. Espere um pouco e tente de novo.',
};

function DistanciaCarroField({
  km,
  fonte,
  distanciaEmpresaId,
  empresaId,
  fase,
  erro,
  origemLat,
  origemLng,
  destinoLat,
  destinoLng,
}: {
  km: string;
  fonte: string;
  distanciaEmpresaId: number | null;
  empresaId: number | null;
  fase?: 'posicao' | 'rota' | null;
  erro?: string | null;
  origemLat?: string;
  origemLng?: string;
  destinoLat?: string;
  destinoLng?: string;
}) {
  const txt = formatKmCarroDaEmpresa(km, fonte, distanciaEmpresaId, empresaId);
  const outraEmp =
    Boolean(km) &&
    !kmCarroEhZero(km) &&
    distanciaEmpresaId != null &&
    empresaId != null &&
    Number(distanciaEmpresaId) !== Number(empresaId);
  const zeroOuMesmoPonto = kmCarroEhZero(km) || fonte === 'mesmo_ponto';
  const pontoA = formatLatLng(origemLat, origemLng);
  const pontoB = formatLatLng(destinoLat, destinoLng);
  const pontosIguais = Boolean(pontoA && pontoB && pontoA === pontoB);

  const valor =
    fase === 'posicao'
      ? 'Pesquisando posição do parceiro…'
      : fase === 'rota'
        ? 'Calculando rota de carro…'
        : (erro && DISTANCIA_CAMPO_ERRO[erro])
          || (zeroOuMesmoPonto
            ? (fonte === 'mesmo_ponto' ? 'Mesmo ponto — não é rota' : '—')
            : txt || '—');

  const hint = txt && !zeroOuMesmoPonto
    ? 'Rota de carro da planta até este endereço. Recalcule se o endereço mudar. Salvar confirma.'
    : fase
      ? 'Aguarde — primeiro o ponto do parceiro, depois a rota (não inventa km).'
      : erro && DISTANCIA_ERRO_HINT[erro]
        ? DISTANCIA_ERRO_HINT[erro]
        : pontosIguais
          ? 'Origem e destino iguais — o CEP da cidade não é a planta. A origem fica na empresa (aba Operação).'
          : zeroOuMesmoPonto
            ? 'Zero não é distância de carro. Clique de novo em Posição e distância.'
            : outraEmp
              ? 'Há km de outra empresa. Use Posição e distância nesta empresa para gravar o km daqui.'
              : 'A = planta da empresa. B = endereço deste parceiro (pesquisado). A rota é entre esses dois pontos.';

  return (
    <div className="form-group span-2">
      <label>Distância de carro</label>
      <input
        readOnly
        value={valor}
        aria-label="Distância de carro"
        aria-busy={Boolean(fase)}
      />
      <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
        <strong>A (planta):</strong> {pontoA || '—'}
        {' · '}
        <strong>B (parceiro):</strong> {pontoB || '—'}
      </p>
      <p className="form-hint" style={{ margin: '0.2rem 0 0' }}>
        {hint}
      </p>
    </div>
  );
}

export function ParceiroFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'novo';
  const navigate = useNavigate();
  const { hasPermission, empresaId, empresas } = useAuth();
  const origemEmp = empresas.find((e) => e.id === empresaId);
  const canWrite = hasPermission('parceiro.escrever');
  const canCredito = hasPermission('credito.escrever');
  const canBancario = hasPermission('parceiro.bancario');

  const [tab, setTab] = useState<Tab>('Identificação');
  const [form, setForm] = useState<ParceiroFormData>(emptyForm());
  const [vendedorPadraoSel, setVendedorPadraoSel] = useState<ParceiroVinculo | null>(null);
  const [consulta, setConsulta] = useState<CnpjConsulta | null>(null);
  const [bancos, setBancos] = useState<BancoConsulta[]>([]);
  const [bancosLoading, setBancosLoading] = useState(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [consulting, setConsulting] = useState<
    'cnpj' | 'cep' | 'geo' | `cep-ee:${string}` | `geo-ee:${string}` | null
  >(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [distanciaFase, setDistanciaFase] = useState<'posicao' | 'rota' | null>(null);
  const [distanciaErro, setDistanciaErro] = useState<string | null>(null);
  const [distanciaAlvo, setDistanciaAlvo] = useState<'fiscal' | string | null>(null);
  const [autoria, setAutoria] = useState<RegistroAutoria | null>(null);
  const loadTokenRef = useRef(0);

  const visibleTabs = useMemo(() => tabsForTipoPessoa(form.tipo_pessoa), [form.tipo_pessoa]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab('Identificação');
    }
  }, [visibleTabs, tab]);

  useEffect(() => {
    if (isNew) return;
    const token = ++loadTokenRef.current;
    setNotFound(false);
    setError('');
    setLoading(true);
    void (async () => {
      try {
        const res = await api.get<{ data: Parceiro }>(`/parceiros/${id}`);
        if (token !== loadTokenRef.current) return;
        const mapped = fromParceiro(res.data);
        setForm(mapped);
        setVendedorPadraoSel(res.data.vendedor ?? null);
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        setConsulta(null);
        setNotFound(false);

        const digits = onlyDigits(mapped.cnpj_cpf);
        if (mapped.tipo_pessoa === 'PJ' && digits.length === 14) {
          void applyCnpjConsulta(digits, mapped, token, true);
        }
      } catch {
        if (token !== loadTokenRef.current) return;
        setNotFound(true);
        setError('Parceiro não encontrado.');
      } finally {
        if (token === loadTokenRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [id, isNew]);

  useEffect(() => {
    if (tab !== 'Financeiro' || bancos.length > 0 || bancosLoading) return;
    setBancosLoading(true);
    void (async () => {
      try {
        const res = await api.get<{ data: BancoConsulta[] }>('/consulta/bancos');
        setBancos(res.data);
      } catch {
        // Catálogo opcional — formulário continua editável.
      } finally {
        setBancosLoading(false);
      }
    })();
  }, [tab, bancos.length, bancosLoading]);

  useEffect(() => {
    if (!form.papel_colaborador || departamentos.length > 0) return;
    void (async () => {
      try {
        const res = await api.get<{ data: Departamento[] }>('/consulta/departamentos');
        setDepartamentos(res.data);
      } catch {
        // Picker opcional — colaborador continua editável.
      }
    })();
  }, [form.papel_colaborador, departamentos.length]);

  const departamentosOptions = useMemo(() => {
    const list = [...departamentos];
    const currentId = form.departamento_id ? Number(form.departamento_id) : null;
    if (currentId && !list.some((d) => d.id === currentId)) {
      list.unshift({
        id: currentId,
        empresa_id: 0,
        codigo: '',
        nome: form.departamento_nome || 'Departamento atual',
        ativo: false,
      });
    }
    return list;
  }, [departamentos, form.departamento_id, form.departamento_nome]);

  const bancosByCode = useMemo(() => {
    const map = new Map<string, BancoConsulta>();
    for (const b of bancos) {
      if (b.code) map.set(b.code, b);
    }
    return map;
  }, [bancos]);

  const update = (patch: Partial<ParceiroFormData>) => {
    if ('tipo_pessoa' in patch && patch.tipo_pessoa !== 'PJ') {
      setConsulta(null);
    }

    setForm((prev) => {
      const next = { ...prev, ...patch };

      if ('tipo_pessoa' in patch && patch.tipo_pessoa !== 'PJ') {
        next.cnae = '';
        next.cnaes_secundarios = [];
      }

      if ('ie' in patch) {
        next.ind_ie_dest = deriveIndIeDest(next.ie);
        if (next.ind_ie_dest === 2 && next.ie_status === 'NAO_VERIFICADA') {
          next.ie_status = 'ISENTA';
        }
      }

      if ('finalidade' in patch) {
        if (next.finalidade === 'USO_CONSUMO') {
          next.consumidor_final = true;
        }
      }

      if ('uf' in patch || 'suframa' in patch) {
        if (suggestAreaIncentivada(next.uf, next.suframa)) {
          next.area_incentivada = true;
        }
      }

      return next;
    });
  };

  const applyCnpjConsulta = async (
    digits: string,
    base: ParceiroFormData,
    token: number,
    silent = false,
  ) => {
    setConsulting('cnpj');
    if (!silent) {
      setError('');
      setMessage('');
    }
    try {
      const res = await api.get<{ data: CnpjConsulta }>(`/consulta/cnpj/${digits}`);
      if (token !== loadTokenRef.current) return;
      const d = res.data;
      setConsulta(d);
      update(applyCnpjToParceiroForm(base, d));
      if (!silent) {
        setMessage(
          'Dados do CNPJ importados (identidade, endereço, CNAE e regime). Confira as abas Atividades, Fiscal e Sócios.',
        );
      }
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Erro na consulta CNPJ.');
      }
    } finally {
      if (token === loadTokenRef.current) {
        setConsulting(null);
      }
    }
  };

  const updateContato = (key: string, patch: Partial<ContatoForm>) => {
    setForm((prev) => ({
      ...prev,
      contatos: prev.contatos.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    }));
  };

  const setContatoPrincipal = (key: string) => {
    setForm((prev) => ({
      ...prev,
      contatos: prev.contatos.map((c) => ({ ...c, principal: c.key === key })),
    }));
  };

  const addContato = () => {
    setForm((prev) => ({
      ...prev,
      contatos: [...prev.contatos, emptyContato(prev.contatos.length === 0)],
    }));
  };

  const removeContato = (key: string) => {
    setForm((prev) => {
      const next = prev.contatos.filter((c) => c.key !== key);
      return { ...prev, contatos: ensurePrincipal(next.length ? next : [emptyContato(true)]) };
    });
  };

  const setEntregaMesmoFiscal = (mesmo: boolean) => {
    setForm((prev) => ({
      ...prev,
      entrega_mesmo_fiscal: mesmo,
      enderecos_entrega: mesmo
        ? prev.enderecos_entrega
        : prev.enderecos_entrega.length > 0
          ? prev.enderecos_entrega
          : [emptyEnderecoEntrega(true)],
    }));
  };

  const updateEnderecoEntrega = (key: string, patch: Partial<EnderecoEntregaForm>) => {
    setForm((prev) => ({
      ...prev,
      enderecos_entrega: prev.enderecos_entrega.map((e) =>
        e.key === key ? { ...e, ...patch } : e,
      ),
    }));
  };

  const setEnderecoEntregaPrincipal = (key: string) => {
    setForm((prev) => ({
      ...prev,
      enderecos_entrega: prev.enderecos_entrega.map((e) => ({
        ...e,
        principal: e.key === key,
      })),
    }));
  };

  const addEnderecoEntrega = () => {
    setForm((prev) => ({
      ...prev,
      entrega_mesmo_fiscal: false,
      enderecos_entrega: [
        ...prev.enderecos_entrega,
        emptyEnderecoEntrega(prev.enderecos_entrega.length === 0),
      ],
    }));
  };

  const removeEnderecoEntrega = (key: string) => {
    setForm((prev) => {
      const next = prev.enderecos_entrega.filter((e) => e.key !== key);
      return {
        ...prev,
        enderecos_entrega: ensurePrincipal(
          next.length ? next : [emptyEnderecoEntrega(true)],
        ),
      };
    });
  };

  const consultarCepEntrega = async (key: string) => {
    const row = form.enderecos_entrega.find((e) => e.key === key);
    const digits = onlyDigits(row?.cep ?? '');
    if (digits.length !== 8) {
      setError('Informe um CEP válido com 8 dígitos no endereço de entrega.');
      return;
    }
    setConsulting(`cep-ee:${key}`);
    setError('');
    try {
      const res = await api.get<{ data: CepConsulta }>(`/consulta/cep/${digits}`);
      const d = res.data;
      updateEnderecoEntrega(key, patchEnderecoFromCep(d, row ?? {}));
      setMessage(mensagemCepImportado(d, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na consulta CEP.');
    } finally {
      setConsulting(null);
    }
  };

  const updateConta = (key: string, patch: Partial<ContaForm>) => {
    setForm((prev) => ({
      ...prev,
      contas: prev.contas.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    }));
  };

  const setContaPrincipal = (key: string) => {
    setForm((prev) => ({
      ...prev,
      contas: prev.contas.map((c) => ({ ...c, principal: c.key === key })),
    }));
  };

  const addConta = () => {
    setForm((prev) => ({
      ...prev,
      contas: [...prev.contas, emptyConta(prev.contas.length === 0)],
    }));
  };

  const removeConta = (key: string) => {
    setForm((prev) => {
      const next = prev.contas.filter((c) => c.key !== key);
      return { ...prev, contas: ensurePrincipal(next.length ? next : [emptyConta(true)]) };
    });
  };

  const aplicarBanco = (key: string, code: string) => {
    const bank = bancosByCode.get(code);
    updateConta(key, {
      banco_codigo: code,
      banco_nome: bank ? bank.fullName || bank.name : '',
    });
  };

  const consultarCnpj = async () => {
    const digits = onlyDigits(form.cnpj_cpf ?? '');
    if (digits.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    if (form.tipo_pessoa !== 'PJ') {
      setError('A consulta CNPJ na Receita aplica-se apenas a pessoa jurídica.');
      return;
    }
    const token = ++loadTokenRef.current;
    await applyCnpjConsulta(digits, form, token, false);
  };

  const consultarCep = async () => {
    const digits = onlyDigits(form.cep ?? '');
    if (digits.length !== 8) {
      setError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setConsulting('cep');
    setError('');
    try {
      const res = await api.get<{ data: CepConsulta }>(`/consulta/cep/${digits}`);
      const d = res.data;
      update({
        ...patchEnderecoFromCep(d, form),
        area_incentivada: suggestAreaIncentivada(d.uf ?? form.uf, form.suframa) || form.area_incentivada,
      });
      setMessage(mensagemCepImportado(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na consulta CEP.');
    } finally {
      setConsulting(null);
    }
  };

  const aplicarPosicaoEDistancia = (
    d: CepConsulta,
  ): {
    latitude: string;
    longitude: string;
    distancia_km: string;
    distancia_fonte: string;
    distancia_calculada_em: string;
    distancia_empresa_id: number | null;
    ok: boolean;
    aviso: string;
  } => {
    const vazio = {
      latitude: '',
      longitude: '',
      distancia_km: '',
      distancia_fonte: '',
      distancia_calculada_em: '',
      distancia_empresa_id: null as number | null,
    };
    const kmPatch = {
      distancia_km:
        d.distancia_erro || kmCarroEhZero(d.distancia_km) ? '' : (d.distancia_km ?? ''),
      distancia_fonte:
        d.distancia_erro || kmCarroEhZero(d.distancia_km) ? '' : (d.distancia_fonte ?? ''),
      distancia_calculada_em:
        d.distancia_erro || kmCarroEhZero(d.distancia_km) || !d.distancia_km
          ? ''
          : new Date().toISOString(),
      distancia_empresa_id:
        d.distancia_erro || kmCarroEhZero(d.distancia_km) || !d.distancia_km ? null : empresaId,
    };

    const avisoRota = (base: string): string => {
      if (d.distancia_erro) {
        switch (d.distancia_erro) {
          case 'sem_origem':
            return `${base} Cadastre a origem operacional da empresa para obter o km de carro.`;
          case 'cota':
            return `${base} Distância: —. Cota temporária; tente de novo em instantes.`;
          case 'geo_impreciso':
            return `${base} Distância: não é 0 km — o CEP não tem precisão de rua.`;
          case 'chave_ausente':
          case 'chave_invalida':
            return `${base} Distância: sem serviço de rota (não inventa km).`;
          case 'sem_rota':
            return `${base} Distância: —. Não há rota de carro até este ponto.`;
          case 'provedor_proibido':
            return `${base} Distância: —.`;
          default:
            return `${base} Distância: —.`;
        }
      }
      if (kmCarroEhZero(d.distancia_km) || d.distancia_fonte === 'mesmo_ponto') {
        return `${base} Distância: mesmo CEP — o sistema não grava 0 km.`;
      }
      const kmTxt = formatKmCarro(d.distancia_km, d.distancia_fonte);
      if (kmTxt) {
        const cache = d.distancia_cache ? ' (cache)' : '';
        return `${kmTxt}${cache}. Salve o cadastro para confirmar.`;
      }
      return `${base} Distância: —.`;
    };

    if (d.latitude && d.longitude) {
      const ponto = formatLatLng(d.latitude, d.longitude);
      const cache = d.geo_cache ? ' (cache)' : '';
      return {
        latitude: d.latitude,
        longitude: d.longitude,
        ...kmPatch,
        ok: true,
        aviso: avisoRota(`Posição preenchida (${ponto})${cache}.`),
      };
    }
    if (d.geo_sem_ponto) {
      return {
        ...vazio,
        ok: true,
        aviso: 'Este CEP não tem ponto geográfico. O cadastro pode ser salvo sem posição.',
      };
    }
    return {
      ...vazio,
      ok: false,
      aviso: 'Consulta de posição indisponível. Salve o cadastro normalmente.',
    };
  };

  const buscarGeoParceiro = async (endereco: {
    logradouro: string;
    numero: string;
    municipio: string;
    uf: string;
    cep: string;
  }): Promise<CepConsulta> => {
    const qs = new URLSearchParams();
    if (endereco.logradouro) qs.set('logradouro', endereco.logradouro);
    if (endereco.numero) qs.set('numero', endereco.numero);
    if (endereco.municipio) qs.set('municipio', endereco.municipio);
    if (endereco.uf) qs.set('uf', endereco.uf);
    const cepDigits = onlyDigits(endereco.cep);
    if (cepDigits.length === 8) qs.set('cep', cepDigits);
    const res = await api.get<{ data: CepConsulta }>(`/consulta/geo-endereco?${qs.toString()}`);
    return res.data;
  };

  const buscarRotaCarro = async (lat: string, lng: string): Promise<CepConsulta> => {
    const qs = new URLSearchParams({ lat, lng });
    const res = await api.get<{ data: CepConsulta }>(`/consulta/rota?${qs.toString()}`);
    return { ...res.data, latitude: lat, longitude: lng };
  };

  const consultarPosicao = async () => {
    const digits = onlyDigits(form.cep ?? '');
    const temEndereco = Boolean(form.logradouro && form.municipio && form.uf);
    const pontoExistente = Boolean(form.latitude && form.longitude);
    if (!temEndereco && digits.length !== 8 && !pontoExistente) {
      setError('Informe o endereço do parceiro (logradouro, município e UF) ou um CEP.');
      return;
    }
    setConsulting('geo');
    setDistanciaAlvo('fiscal');
    setDistanciaErro(null);
    setError('');
    try {
      setDistanciaFase('posicao');
      const geoRes = await buscarGeoParceiro({
        logradouro: form.logradouro,
        numero: form.numero,
        municipio: form.municipio,
        uf: form.uf,
        cep: form.cep,
      });
      const geo = aplicarPosicaoEDistancia(geoRes);
      const lat = geo.latitude || form.latitude;
      const lng = geo.longitude || form.longitude;
      update({
        latitude: lat,
        longitude: lng,
        distancia_km: '',
        distancia_fonte: '',
        distancia_calculada_em: '',
        distancia_empresa_id: null,
      });
      if (!lat || !lng) {
        setDistanciaErro(geoRes.erro ?? geoRes.geo_erro ?? (geoRes.sem_ponto || geoRes.geo_sem_ponto ? 'sem_ponto' : 'sem_destino'));
        setError('Não foi possível pesquisar o ponto deste endereço.');
        return;
      }
      setMessage(`Ponto do parceiro: ${formatLatLng(lat, lng)}. Calculando rota da planta…`);
      await pausaEntreProvedores();
      setDistanciaFase('rota');
      const rotaData = await buscarRotaCarro(lat, lng);
      const full = aplicarPosicaoEDistancia(rotaData);
      update({
        latitude: lat,
        longitude: lng,
        distancia_km: full.distancia_km,
        distancia_fonte: full.distancia_fonte,
        distancia_calculada_em: full.distancia_calculada_em,
        distancia_empresa_id: full.distancia_empresa_id,
      });
      setDistanciaErro(rotaData.distancia_erro ?? null);
      if (full.ok) setMessage(full.aviso);
      else setError(full.aviso);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consulta de posição indisponível.');
      setDistanciaErro('indisponivel');
    } finally {
      setDistanciaFase(null);
      setConsulting(null);
    }
  };

  const consultarPosicaoEntrega = async (key: string) => {
    const row = form.enderecos_entrega.find((e) => e.key === key);
    const digits = onlyDigits(row?.cep ?? '');
    const temEndereco = Boolean(row?.logradouro && row?.municipio && row?.uf);
    const pontoExistente = Boolean(row?.latitude && row?.longitude);
    if (!temEndereco && digits.length !== 8 && !pontoExistente) {
      setError('Informe o endereço de entrega (logradouro, município e UF) ou um CEP.');
      return;
    }
    setConsulting(`geo-ee:${key}`);
    setDistanciaAlvo(key);
    setDistanciaErro(null);
    setError('');
    try {
      setDistanciaFase('posicao');
      const geoRes = await buscarGeoParceiro({
        logradouro: row?.logradouro ?? '',
        numero: row?.numero ?? '',
        municipio: row?.municipio ?? '',
        uf: row?.uf ?? '',
        cep: row?.cep ?? '',
      });
      const geo = aplicarPosicaoEDistancia(geoRes);
      const lat = geo.latitude || row?.latitude || '';
      const lng = geo.longitude || row?.longitude || '';
      updateEnderecoEntrega(key, {
        latitude: lat,
        longitude: lng,
        distancia_km: '',
        distancia_fonte: '',
        distancia_calculada_em: '',
        distancia_empresa_id: null,
      });
      if (!lat || !lng) {
        setDistanciaErro(geoRes.erro ?? geoRes.geo_erro ?? (geoRes.sem_ponto || geoRes.geo_sem_ponto ? 'sem_ponto' : 'sem_destino'));
        setError('Não foi possível pesquisar o ponto deste endereço de entrega.');
        return;
      }
      setMessage(`Ponto do parceiro: ${formatLatLng(lat, lng)}. Calculando rota da planta…`);
      await pausaEntreProvedores();
      setDistanciaFase('rota');
      const rotaData = await buscarRotaCarro(lat, lng);
      const full = aplicarPosicaoEDistancia(rotaData);
      updateEnderecoEntrega(key, {
        latitude: lat,
        longitude: lng,
        distancia_km: full.distancia_km,
        distancia_fonte: full.distancia_fonte,
        distancia_calculada_em: full.distancia_calculada_em,
        distancia_empresa_id: full.distancia_empresa_id,
      });
      setDistanciaErro(rotaData.distancia_erro ?? null);
      if (full.ok) setMessage(full.aviso);
      else setError(full.aviso);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consulta de posição indisponível.');
      setDistanciaErro('indisponivel');
    } finally {
      setDistanciaFase(null);
      setConsulting(null);
    }
  };

  const handleSave = async () => {
    if (!canWrite && !canCredito && !canBancario) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = toPayload({
        ...form,
        cnaes_secundarios:
          form.tipo_pessoa === 'PJ'
            ? normalizeCnaesSecundarios(
                consulta?.cnaes_secundarios ?? form.cnaes_secundarios,
              )
            : [],
      });

      if (!canWrite) {
        delete payload.contatos;
        delete payload.enderecos_entrega;
        delete payload.telefone;
        delete payload.whatsapp;
        delete payload.email;
        delete payload.email_xml;
        delete payload.cnpj_cpf;
        delete payload.razao_social;
        delete payload.nome_fantasia;
        delete payload.logradouro;
        delete payload.numero;
        delete payload.complemento;
        delete payload.bairro;
        delete payload.municipio;
        delete payload.uf;
        delete payload.cep;
        delete payload.ibge;
        delete payload.latitude;
        delete payload.longitude;
        delete payload.distancia_km;
        delete payload.distancia_fonte;
        delete payload.distancia_calculada_em;
        delete payload.papel_cliente;
        delete payload.papel_fornecedor;
        delete payload.papel_colaborador;
        delete payload.papel_transportadora;
        delete payload.papel_banco;
        delete payload.papel_entidade;
        delete payload.papel_vendedor;
        delete payload.papel_contador;
        delete payload.tipo_pessoa;
        delete payload.ie;
        delete payload.im;
        delete payload.suframa;
        delete payload.area_incentivada;
        delete payload.ind_ie_dest;
        delete payload.ie_status;
        delete payload.consumidor_final;
        delete payload.finalidade;
        delete payload.regime;
        delete payload.regime_desde;
        delete payload.cnae;
        delete payload.cnaes_secundarios;
        delete payload.emite_documento_fiscal;
        delete payload.motivo_vigencia_fiscal;
        delete payload.tipo_fornecimento;
        delete payload.cfop_entrada_padrao;
        delete payload.situacao;
        delete payload.is_prospect;
        delete payload.condicao_pagamento;
        delete payload.forma_pagamento;
        delete payload.vinculo;
        delete payload.cargo;
        delete payload.departamento_id;
      }

      if (!canBancario) {
        delete payload.contas_bancarias;
      }

      if (!canCredito) {
        delete payload.limite_credito;
      }

      if (isNew) {
        const res = await api.post<{ data: Parceiro }>('/parceiros', payload);
        navigate(`/parceiros/${res.data.id}`);
      } else {
        const res = await api.put<{ data: Parceiro }>(`/parceiros/${id}`, payload);
        setForm(fromParceiro(res.data));
        setVendedorPadraoSel(res.data.vendedor ?? null);
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        setMessage('Parceiro salvo com sucesso.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando parceiro…</div>;

  if (notFound) {
    return (
      <>
        <PageHeader title="Parceiro" description="Não encontrado" />
        <div className="alert alert-error">{error || 'Parceiro não encontrado.'}</div>
        <Link to="/parceiros" className="btn btn-secondary">
          Voltar à lista
        </Link>
      </>
    );
  }

  const readOnly = !canWrite && !canCredito && !canBancario;
  const fieldDisabled = (area: 'write' | 'credito' | 'bancario') => {
    if (readOnly) return true;
    if (area === 'write') return !canWrite;
    if (area === 'credito') return !canCredito;
    return !canBancario;
  };

  const isPj = form.tipo_pessoa === 'PJ';
  const cnaePrincipalDesc =
    consulta?.cnae_descricao ?? consulta?.cnae_fiscal_descricao ?? '';
  const cnaesSecundarios =
    consulta?.cnaes_secundarios ??
    normalizeCnaesSecundarios(form.cnaes_secundarios);
  const socios = consulta?.qsa ?? [];

  /** Remove pendências já sanadas no formulário (antes do próximo save). */
  const pendenciasVisiveis = form.fiscal_pendencias.filter((item) => {
    if (item.includes('E-mail para envio de XML') && form.email_xml.trim()) return false;
    if (item.includes('Finalidade') && form.finalidade) return false;
    if (item.includes('Regime tributário') && form.regime) return false;
    if (item.includes('IE numérica') && /\d/.test(form.ie)) return false;
    if (item.includes('IE deve ser ISENTO') && /isento/i.test(form.ie)) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title={isNew ? 'Novo parceiro' : form.codigo ?? 'Parceiro'}
        description={isNew ? 'Cadastro de parceiro comercial' : form.razao_social}
        actions={
          <>
            {!isNew && id && (
              <a
                href={`/parceiros/${id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/parceiros/${id}/ficha`)}
              >
                Imprimir ficha
              </a>
            )}
            <Link to="/parceiros" className="btn btn-secondary">
              Voltar
            </Link>
          </>
        }
      />

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          {!isNew ? <RegistroMetaStrip registro={autoria} /> : null}
          {isPj && consulta && <CnpjConsultaMetaStrip consulta={consulta} />}

          <div className="tabs tabs-parceiro">
            {visibleTabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
                {t === 'Atividades' && cnaesSecundarios.length > 0
                  ? ` · ${cnaesSecundarios.length}`
                  : ''}
                {t === 'Sócios' && socios.length > 0 ? ` · ${socios.length}` : ''}
              </button>
            ))}
          </div>

          {tab === 'Identificação' && (
            <div className="form-section">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo pessoa</label>
                  <select
                    value={form.tipo_pessoa}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ tipo_pessoa: e.target.value })}
                  >
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="PF">Pessoa Física</option>
                    <option value="ESTRANGEIRO">Estrangeiro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>CNPJ/CPF</label>
                  <div className="input-action">
                    <input
                      value={formatCnpjCpf(form.cnpj_cpf)}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ cnpj_cpf: onlyDigits(e.target.value) })}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={fieldDisabled('write') || consulting === 'cnpj'}
                      onClick={consultarCnpj}
                    >
                      {consulting === 'cnpj' ? '…' : 'Consultar'}
                    </button>
                  </div>
                </div>
                <div className="form-group span-2">
                  <label>Razão social</label>
                  <input
                    value={form.razao_social}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ razao_social: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group span-2">
                  <label>Nome fantasia</label>
                  <input
                    value={form.nome_fantasia}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ nome_fantasia: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Situação</label>
                  <select
                    value={form.situacao}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ situacao: e.target.value })}
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Prospect</label>
                  <label className="checkbox-item" style={{ marginTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={form.is_prospect}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ is_prospect: e.target.checked })}
                    />
                    Orçamento sem cadastro fiscal completo
                  </label>
                </div>
                {form.papel_colaborador && (
                  <>
                    <div className="form-group">
                      <label>Cargo</label>
                      <input
                        value={form.cargo}
                        disabled={fieldDisabled('write')}
                        onChange={(e) => update({ cargo: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Departamento</label>
                      <select
                        value={form.departamento_id}
                        disabled={fieldDisabled('write')}
                        onChange={(e) => update({ departamento_id: e.target.value })}
                      >
                        <option value="">— Selecione —</option>
                        {departamentosOptions.map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {d.codigo ? `${d.codigo} — ${d.nome}` : d.nome}
                            {d.ativo === false ? ' (inativo)' : ''}
                          </option>
                        ))}
                      </select>
                      {canWrite ? (
                        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                          Cadastro em <Link to="/departamentos">Departamentos</Link>.
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'Atividades' && isPj && (
            <CnaeAtividadesPanel
              cnae={form.cnae}
              cnaeDescricao={cnaePrincipalDesc}
              cnaesSecundarios={cnaesSecundarios}
              canEdit={!fieldDisabled('write')}
              loading={consulting === 'cnpj' && !consulta}
              onCnaeChange={(digits) => update({ cnae: digits })}
            />
          )}

          {tab === 'Endereço' && (
            <div className="form-section">
              <div className="panel-title">
                <h3>Endereço fiscal</h3>
                <span className="form-hint">Sede / cartão CNPJ · NF-e enderDest</span>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>CEP</label>
                  <div className="input-action">
                    <input
                      value={formatCep(form.cep)}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => {
                        const cep = onlyDigits(e.target.value);
                        update({
                          cep,
                          ...(cep !== form.cep
                            ? {
                                latitude: '',
                                longitude: '',
                                distancia_km: '',
                                distancia_fonte: '',
                                distancia_calculada_em: '',
                                distancia_empresa_id: null,
                              }
                            : {}),
                        });
                        if (cep !== form.cep) {
                          setDistanciaAlvo(null);
                          setDistanciaErro(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={readOnly || consulting === 'cep'}
                      onClick={consultarCep}
                    >
                      {consulting === 'cep' ? '…' : 'Consultar'}
                    </button>
                  </div>
                </div>
                <div className="form-group span-2">
                  <label>Logradouro</label>
                  <input
                    value={form.logradouro}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ logradouro: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Número</label>
                  <input
                    value={form.numero}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ numero: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Complemento</label>
                  <input
                    value={form.complemento}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ complemento: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    value={form.bairro}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ bairro: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Município</label>
                  <input
                    value={form.municipio}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ municipio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>UF</label>
                  <input
                    value={form.uf}
                    maxLength={2}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ uf: e.target.value.toUpperCase().slice(0, 2) })}
                  />
                </div>
                <div className="form-group">
                  <label>IBGE</label>
                  <input
                    value={form.ibge}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ ibge: onlyDigits(e.target.value).slice(0, 7) })}
                  />
                </div>
                <div className="form-group span-2">
                  <label>Posição deste endereço</label>
                  <div className="input-action">
                    <input
                      readOnly
                      value={formatLatLng(form.latitude, form.longitude) || '—'}
                      disabled={fieldDisabled('write')}
                      aria-label="Latitude e longitude"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={readOnly || consulting === 'geo'}
                      onClick={() => void consultarPosicao()}
                    >
                      {consulting === 'geo' ? '…' : 'Posição e distância'}
                    </button>
                  </div>
                  <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                    Pesquisa o ponto do parceiro (rua) e calcula a rota até a planta da empresa.
                    A planta não é o CEP. Salvar confirma.
                  </p>
                </div>
                <DistanciaCarroField
                  km={form.distancia_km}
                  fonte={form.distancia_fonte}
                  distanciaEmpresaId={form.distancia_empresa_id}
                  empresaId={empresaId}
                  fase={distanciaAlvo === 'fiscal' ? distanciaFase : null}
                  erro={distanciaAlvo === 'fiscal' ? distanciaErro : null}
                  origemLat={origemEmp?.origem_latitude ?? ''}
                  origemLng={origemEmp?.origem_longitude ?? ''}
                  destinoLat={form.latitude}
                  destinoLng={form.longitude}
                />
              </div>
            </div>
          )}

          {tab === 'Entrega' && (
            <div className="form-section">
              <div className="panel-title">
                <h3>Endereço de entrega</h3>
                <span className="form-hint">
                  Locais padrão do cliente · no pedido futuro o endereço será snapshot
                </span>
              </div>

              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group span-2">
                  <label className="radio-pill" style={{ marginRight: '1rem' }}>
                    <input
                      type="radio"
                      name="entrega-modo"
                      checked={form.entrega_mesmo_fiscal}
                      disabled={fieldDisabled('write')}
                      onChange={() => setEntregaMesmoFiscal(true)}
                    />
                    Usar o mesmo do Endereço fiscal
                  </label>
                  <label className="radio-pill">
                    <input
                      type="radio"
                      name="entrega-modo"
                      checked={!form.entrega_mesmo_fiscal}
                      disabled={fieldDisabled('write')}
                      onChange={() => setEntregaMesmoFiscal(false)}
                    />
                    Cadastrar um ou mais endereços de entrega
                  </label>
                </div>
              </div>

              {form.entrega_mesmo_fiscal ? (
                <p className="form-hint">
                  A entrega usa o endereço fiscal cadastrado na aba Endereço — inclusive a
                  distância de carro. Nenhum local adicional será gravado.
                </p>
              ) : (
                <>
                  <div className="panel-title">
                    <h3>Locais de entrega</h3>
                    {!fieldDisabled('write') && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={addEnderecoEntrega}
                      >
                        Adicionar endereço
                      </button>
                    )}
                  </div>
                  <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                    Informe o responsável por receber em cada local e marque um como
                    principal.
                  </p>

                  <div className="repeatable-list">
                    {form.enderecos_entrega.map((end, index) => (
                      <div
                        key={end.key}
                        className={`repeatable-item${end.principal ? ' is-principal' : ''}`}
                      >
                        <div className="repeatable-item-header">
                          <strong>Entrega {index + 1}</strong>
                          <div className="repeatable-item-actions">
                            <label className="radio-pill">
                              <input
                                type="radio"
                                name="entrega-principal"
                                checked={end.principal}
                                disabled={fieldDisabled('write')}
                                onChange={() => setEnderecoEntregaPrincipal(end.key)}
                              />
                              Principal
                            </label>
                            {!fieldDisabled('write') && form.enderecos_entrega.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => removeEnderecoEntrega(end.key)}
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Apelido</label>
                            <input
                              value={end.apelido}
                              disabled={fieldDisabled('write')}
                              placeholder="Ex.: CD SP, Fábrica"
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, { apelido: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group span-2">
                            <label>Responsável por receber *</label>
                            <input
                              value={end.responsavel_nome}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  responsavel_nome: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Telefone do responsável</label>
                            <input
                              value={
                                formatPhone(end.responsavel_telefone) || end.responsavel_telefone
                              }
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  responsavel_telefone: onlyDigits(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Documento (portaria)</label>
                            <input
                              value={end.responsavel_documento}
                              disabled={fieldDisabled('write')}
                              placeholder="RG / CPF"
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  responsavel_documento: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>CEP *</label>
                            <div className="input-action">
                              <input
                                value={formatCep(end.cep)}
                                disabled={fieldDisabled('write')}
                                onChange={(e) => {
                                  updateEnderecoEntrega(end.key, {
                                    cep: onlyDigits(e.target.value),
                                    ...(onlyDigits(e.target.value) !== end.cep
                                      ? {
                                          latitude: '',
                                          longitude: '',
                                          distancia_km: '',
                                          distancia_fonte: '',
                                          distancia_calculada_em: '',
                                          distancia_empresa_id: null,
                                        }
                                      : {}),
                                  });
                                  if (onlyDigits(e.target.value) !== end.cep) {
                                    setDistanciaAlvo(null);
                                    setDistanciaErro(null);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={
                                  readOnly || consulting === `cep-ee:${end.key}`
                                }
                                onClick={() => void consultarCepEntrega(end.key)}
                              >
                                {consulting === `cep-ee:${end.key}` ? '…' : 'Consultar'}
                              </button>
                            </div>
                          </div>
                          <div className="form-group span-2">
                            <label>Logradouro *</label>
                            <input
                              value={end.logradouro}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  logradouro: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Número *</label>
                            <input
                              value={end.numero}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, { numero: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Complemento</label>
                            <input
                              value={end.complemento}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  complemento: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Bairro *</label>
                            <input
                              value={end.bairro}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, { bairro: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Município *</label>
                            <input
                              value={end.municipio}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  municipio: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>UF *</label>
                            <input
                              value={end.uf}
                              maxLength={2}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  uf: e.target.value.toUpperCase().slice(0, 2),
                                })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>IBGE</label>
                            <input
                              value={end.ibge}
                              disabled={fieldDisabled('write')}
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  ibge: onlyDigits(e.target.value).slice(0, 7),
                                })
                              }
                            />
                          </div>
                          <div className="form-group span-2">
                            <label>Posição deste local</label>
                            <div className="input-action">
                              <input
                                readOnly
                                value={formatLatLng(end.latitude, end.longitude) || '—'}
                                disabled={fieldDisabled('write')}
                                aria-label={`Latitude e longitude da entrega ${index + 1}`}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={readOnly || consulting === `geo-ee:${end.key}`}
                                onClick={() => void consultarPosicaoEntrega(end.key)}
                              >
                                {consulting === `geo-ee:${end.key}` ? '…' : 'Posição e distância'}
                              </button>
                            </div>
                          </div>
                          <DistanciaCarroField
                            km={end.distancia_km}
                            fonte={end.distancia_fonte}
                            distanciaEmpresaId={end.distancia_empresa_id}
                            empresaId={empresaId}
                            fase={distanciaAlvo === end.key ? distanciaFase : null}
                            erro={distanciaAlvo === end.key ? distanciaErro : null}
                            origemLat={origemEmp?.origem_latitude ?? ''}
                            origemLng={origemEmp?.origem_longitude ?? ''}
                            destinoLat={end.latitude}
                            destinoLng={end.longitude}
                          />
                          <div className="form-group span-2">
                            <label>Observações</label>
                            <input
                              value={end.observacoes}
                              disabled={fieldDisabled('write')}
                              placeholder="Ex.: entregar na portaria 2"
                              onChange={(e) =>
                                updateEnderecoEntrega(end.key, {
                                  observacoes: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'Fiscal' && (
            <div className="form-section">
              <div className="fiscal-status-row">
                <div
                  className={`fiscal-status-chip${form.cadastro_fiscal_completo ? ' is-ok' : ' is-warn'}`}
                >
                  {form.cadastro_fiscal_completo ? 'Cadastro fiscal completo' : 'Cadastro fiscal incompleto'}
                </div>
                <div className={`fiscal-status-chip${form.apto_emissao_nfe ? ' is-ok' : ' is-muted'}`}>
                  {form.apto_emissao_nfe ? 'Apto para emissão NF-e' : 'Não apto para emissão NF-e'}
                </div>
              </div>

              {!form.cadastro_fiscal_completo && pendenciasVisiveis.length > 0 && (
                <div className="alert alert-warning fiscal-pendencias">
                  <strong>Pendências de cadastro:</strong>
                  <ul>
                    {pendenciasVisiveis.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <span className="form-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
                    Preencha os campos desta aba e salve para atualizar o status.
                  </span>
                </div>
              )}

              {form.cadastro_fiscal_completo && form.fiscal_pendencias_emissao.length > 0 && (
                <div className="alert alert-warning fiscal-pendencias">
                  <strong>Bloqueios de emissão:</strong>
                  <ul>
                    {form.fiscal_pendencias_emissao.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!form.cadastro_fiscal_completo && pendenciasVisiveis.length === 0 && (
                <div className="alert alert-success fiscal-pendencias">
                  Campos da sessão preenchidos — clique em <strong>Salvar alterações</strong> para
                  confirmar o cadastro fiscal completo.
                </div>
              )}

              <div className="panel-title">
                <h3>Inscrições e indIEDest</h3>
                <span className="form-hint">IE determina indIEDest automaticamente (1 / 2 / 9)</span>
              </div>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label>Inscrição Estadual</label>
                  <input
                    value={form.ie}
                    disabled={fieldDisabled('write')}
                    placeholder="Número, ISENTO ou vazio"
                    onChange={(e) => update({ ie: e.target.value })}
                  />
                  <span className="form-hint">Vazio = não contribuinte · ISENTO = ind 2 · número = contribuinte</span>
                </div>
                <div className="form-group">
                  <label>indIEDest (calculado)</label>
                  <input value={indIeDestLabel(form.ind_ie_dest)} disabled />
                </div>
                <div className="form-group">
                  <label>Inscrição Municipal</label>
                  <input
                    value={form.im}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ im: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Status IE (SINTEGRA/CCC)</label>
                  <select
                    value={form.ie_status}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ ie_status: e.target.value })}
                  >
                    <option value="NAO_VERIFICADA">Não verificada</option>
                    <option value="OK">OK (habilitada)</option>
                    <option value="ISENTA">Isenta</option>
                    <option value="BAIXADA">Baixada</option>
                    <option value="NAO_HABILITADA">Não habilitada</option>
                  </select>
                  {form.ie_consultado_em && (
                    <span className="form-hint">
                      Última verificação: {new Date(form.ie_consultado_em).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>SUFRAMA</label>
                  <input
                    value={form.suframa}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ suframa: onlyDigits(e.target.value) })}
                    placeholder="Obrigatório ZFM quando houver"
                  />
                </div>
                <div className="form-group">
                  <label>Área incentivada (ZFM/ALC)</label>
                  <label className="checkbox-item" style={{ marginTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={form.area_incentivada}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ area_incentivada: e.target.checked })}
                    />
                    Fornecedor/cliente em área incentivada
                  </label>
                </div>
                <div className="form-group">
                  <label>Emite / recebe NF-e</label>
                  <label className="checkbox-item" style={{ marginTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={form.emite_documento_fiscal}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ emite_documento_fiscal: e.target.checked })}
                    />
                    Participa de documento fiscal (desmarque p/ entidade/banco)
                  </label>
                </div>
              </div>

              <div className="panel-title">
                <h3>Enquadramento e finalidade</h3>
              </div>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label>Regime tributário</label>
                  <select
                    value={form.regime}
                    disabled={fieldDisabled('write')}
                    onChange={(e) =>
                      update({
                        regime: e.target.value,
                        regime_desde: e.target.value && !form.regime_desde
                          ? new Date().toISOString().slice(0, 10)
                          : form.regime_desde,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                    <option value="MEI">MEI</option>
                    <option value="PRESUMIDO">Lucro Presumido</option>
                    <option value="REAL">Lucro Real</option>
                    <option value="ISENTO">Isento</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Regime desde</label>
                  <input
                    type="date"
                    value={form.regime_desde ? form.regime_desde.slice(0, 10) : ''}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ regime_desde: e.target.value })}
                  />
                </div>
                {(form.papel_cliente || form.is_prospect) && (
                  <div className="form-group">
                    <label>Finalidade padrão</label>
                    <select
                      value={form.finalidade}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ finalidade: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="REVENDA">Revenda</option>
                      <option value="INDUSTRIALIZACAO">Industrialização / insumo</option>
                      <option value="USO_CONSUMO">Uso e consumo</option>
                    </select>
                    <span className="form-hint">Orienta CFOP de saída; pode ser alterada no pedido</span>
                  </div>
                )}
                {(form.papel_cliente || form.is_prospect) && (
                  <div className="form-group">
                    <label>E-mail para XML/DANFE</label>
                    <input
                      type="email"
                      value={form.email_xml}
                      disabled={fieldDisabled('write')}
                      placeholder="xml@cliente.com.br"
                      onChange={(e) => update({ email_xml: e.target.value })}
                      required={form.papel_cliente}
                    />
                    <span className="form-hint">
                      Obrigatório para cliente — usado no envio automático da NF-e
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Consumidor final</label>
                  <label className="checkbox-item" style={{ marginTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={form.consumidor_final}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ consumidor_final: e.target.checked })}
                    />
                    indFinal = 1 na NF-e
                  </label>
                </div>
                {form.papel_fornecedor && (
                  <>
                    <div className="form-group">
                      <label>Tipo de fornecimento</label>
                      <select
                        value={form.tipo_fornecimento}
                        disabled={fieldDisabled('write')}
                        onChange={(e) => update({ tipo_fornecimento: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="MERCADORIA">Mercadoria</option>
                        <option value="SERVICO">Serviço</option>
                        <option value="UTILIDADE">Utilidade</option>
                        <option value="TRIBUTO">Tributo/taxa</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>CFOP entrada padrão</label>
                      <input
                        value={form.cfop_entrada_padrao}
                        disabled={fieldDisabled('write')}
                        maxLength={8}
                        onChange={(e) => update({ cfop_entrada_padrao: onlyDigits(e.target.value).slice(0, 4) })}
                      />
                    </div>
                  </>
                )}
                <div className="form-group span-2">
                  <label>Motivo da alteração fiscal (vigência)</label>
                  <input
                    value={form.motivo_vigencia_fiscal}
                    disabled={fieldDisabled('write')}
                    placeholder="Ex.: migração para Lucro Real · correção IE"
                    onChange={(e) => update({ motivo_vigencia_fiscal: e.target.value })}
                  />
                </div>
              </div>

              {form.historico.length > 0 && (
                <>
                  <div className="panel-title">
                    <h3>Histórico de vigência fiscal</h3>
                    <span className="form-hint">{form.historico.length} registro(s)</span>
                  </div>
                  <div className="table-wrap">
                    <ParceiroHistoricoFiscalTable rows={form.historico} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'Sócios' && isPj && (
            <QsaSociosPanel
              socios={socios}
              loading={consulting === 'cnpj' && !consulta}
              emptyHint={
                onlyDigits(form.cnpj_cpf).length === 14
                  ? 'Nenhum sócio retornado pela Receita para este CNPJ. Use “Consultar” na aba Identificação para atualizar o QSA.'
                  : 'Informe um CNPJ válido e consulte a Receita para carregar o quadro societário.'
              }
            />
          )}

          {tab === 'Contatos' && (
            <div className="form-section">
              <div className="panel-title">
                <h3>Canais gerais</h3>
                <span className="form-hint">Telefone e e-mail institucionais</span>
              </div>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    value={formatPhone(form.telefone) || form.telefone}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ telefone: onlyDigits(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input
                    value={formatPhone(form.whatsapp) || form.whatsapp}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ whatsapp: onlyDigits(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>E-mail XML / DANFE</label>
                  <input
                    type="email"
                    value={form.email_xml}
                    disabled={fieldDisabled('write')}
                    placeholder="xml@cliente.com.br"
                    onChange={(e) => update({ email_xml: e.target.value })}
                  />
                  <span className="form-hint">
                    {form.papel_cliente
                      ? 'Obrigatório no cadastro fiscal do cliente (também na aba Fiscal)'
                      : 'Para envio automático de XML/DANFE'}
                  </span>
                </div>
              </div>

              <div className="panel-title">
                <h3>Pessoas de contato</h3>
                {!fieldDisabled('write') && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addContato}>
                    Adicionar contato
                  </button>
                )}
              </div>
              <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                Cadastre contatos e marque quem está autorizado a aprovar orçamentos (estudo
                comercial). O envio do link usa somente esses contatos.
              </p>

              <div className="repeatable-list">
                {form.contatos.map((contato, index) => (
                  <div
                    key={contato.key}
                    className={`repeatable-item${contato.principal ? ' is-principal' : ''}`}
                  >
                    <div className="repeatable-item-header">
                      <strong>Contato {index + 1}</strong>
                      <div className="repeatable-item-actions">
                        <label className="radio-pill">
                          <input
                            type="radio"
                            name="contato-principal"
                            checked={contato.principal}
                            disabled={fieldDisabled('write')}
                            onChange={() => setContatoPrincipal(contato.key)}
                          />
                          Principal
                        </label>
                        <label className="radio-pill">
                          <input
                            type="checkbox"
                            checked={contato.autorizado_aprovar}
                            disabled={fieldDisabled('write')}
                            onChange={(e) =>
                              updateContato(contato.key, {
                                autorizado_aprovar: e.target.checked,
                              })
                            }
                          />
                          Autorizado a aprovar
                        </label>
                        {!fieldDisabled('write') && form.contatos.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeContato(contato.key)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nome</label>
                        <input
                          value={contato.nome}
                          disabled={fieldDisabled('write')}
                          onChange={(e) => updateContato(contato.key, { nome: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Função</label>
                        <input
                          value={contato.funcao}
                          disabled={fieldDisabled('write')}
                          onChange={(e) => updateContato(contato.key, { funcao: e.target.value })}
                          placeholder="Compras, Financeiro…"
                        />
                      </div>
                      <div className="form-group">
                        <label>Telefone</label>
                        <input
                          value={formatPhone(contato.telefone) || contato.telefone}
                          disabled={fieldDisabled('write')}
                          onChange={(e) =>
                            updateContato(contato.key, { telefone: onlyDigits(e.target.value) })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp</label>
                        <input
                          value={formatPhone(contato.whatsapp) || contato.whatsapp}
                          disabled={fieldDisabled('write')}
                          onChange={(e) =>
                            updateContato(contato.key, { whatsapp: onlyDigits(e.target.value) })
                          }
                        />
                      </div>
                      <div className="form-group span-2">
                        <label>E-mail</label>
                        <input
                          type="email"
                          value={contato.email}
                          disabled={fieldDisabled('write')}
                          onChange={(e) => updateContato(contato.key, { email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Papéis' && (
            <div className="form-section">
              <p className="form-hint" style={{ marginBottom: '1rem' }}>
                Selecione ao menos um papel para o parceiro.
              </p>
              <div className="checkbox-grid">
                {PAPEIS.map(({ key, label }) => (
                  <label key={key} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'Financeiro' && (
            <div className="form-section">
              <div className="panel-title">
                <h3>Condições comerciais</h3>
              </div>
              <p className="form-hint" style={{ marginBottom: '0.85rem' }}>
                Defaults do parceiro — sugerem OC/ORC; a condição efetiva fica no documento
                (snapshot). Não geram parcelas sozinhas.
              </p>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                {form.papel_cliente && (
                  <div className="form-group">
                    <label>Limite de crédito</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={decimalStep(DECIMAL_SCALE.money)}
                      value={form.limite_credito}
                      disabled={fieldDisabled('credito')}
                      onChange={(e) => update({ limite_credito: e.target.value })}
                    />
                    <span className="form-hint">
                      Padrão 0 = à vista / sinal. Monetário {DECIMAL_SCALE.money} casas.
                      {!canCredito ? ' Somente FINANCEIRO edita (SoD).' : ''}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Condição de pagamento padrão</label>
                  <input
                    list="par-condicao-pagamento-sugestoes"
                    value={form.condicao_pagamento}
                    disabled={fieldDisabled('write')}
                    placeholder="ex.: 28 DDL, 14/28/42, à vista"
                    maxLength={64}
                    onChange={(e) => update({ condicao_pagamento: e.target.value })}
                  />
                  <datalist id="par-condicao-pagamento-sugestoes">
                    {CONDICOES_PAGAMENTO_SUGESTOES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <span className="form-hint">Texto livre · sugestões do estudo · máx. 64.</span>
                </div>
                <div className="form-group">
                  <label>Forma de pagamento preferida</label>
                  <select
                    value={form.forma_pagamento}
                    disabled={fieldDisabled('write')}
                    onChange={(e) => update({ forma_pagamento: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {form.forma_pagamento && !isFormaPagamentoCanonica(form.forma_pagamento) ? (
                      <option value={form.forma_pagamento}>{form.forma_pagamento} (legado)</option>
                    ) : null}
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">PIX · boleto · transferência · cartão.</span>
                </div>
                {form.papel_cliente || form.is_prospect ? (
                  <div className="form-group span-full">
                    <ParceiroCombobox
                      label="Vendedor padrão"
                      papel="vendedor"
                      value={vendedorPadraoSel}
                      onChange={(v) => {
                        setVendedorPadraoSel(v);
                        update({ vendedor_parceiro_id: v ? v.id : '' });
                      }}
                      disabled={fieldDisabled('write')}
                      placeholder="Vendedor habitual deste cliente…"
                      hint="Prefill no orçamento. A comissão efetiva fica no documento (snapshot)."
                      emptyMessage="Nenhum vendedor cadastrado nesta EMP."
                    />
                  </div>
                ) : null}
                {form.papel_vendedor ? (
                  <div className="form-group">
                    <label>Comissão % padrão</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={decimalStep(DECIMAL_SCALE.percent)}
                      value={form.comissao_percentual}
                      disabled={fieldDisabled('write')}
                      onChange={(e) => update({ comissao_percentual: e.target.value })}
                    />
                    <span className="form-hint">
                      Alíquota sugerida no ORC. Paga-se o % da faixa aceita, após a baixa do
                      recebimento do cliente — não no faturar.
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="panel-title">
                <h3>Contas bancárias</h3>
                {!fieldDisabled('bancario') && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addConta}>
                    Adicionar conta
                  </button>
                )}
              </div>
              <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                Uma ou mais contas · marque a principal · bancos consultados automaticamente
                {bancosLoading ? ' · carregando catálogo…' : bancos.length ? ` · ${bancos.length} bancos` : ''}
              </p>

              {!canBancario && (
                <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                  Somente perfil com permissão bancária pode editar contas.
                </p>
              )}

              <div className="repeatable-list">
                {form.contas.map((conta, index) => (
                  <div
                    key={conta.key}
                    className={`repeatable-item${conta.principal ? ' is-principal' : ''}`}
                  >
                    <div className="repeatable-item-header">
                      <strong>Conta {index + 1}</strong>
                      <div className="repeatable-item-actions">
                        <label className="radio-pill">
                          <input
                            type="radio"
                            name="conta-principal"
                            checked={conta.principal}
                            disabled={fieldDisabled('bancario')}
                            onChange={() => setContaPrincipal(conta.key)}
                          />
                          Principal
                        </label>
                        {!fieldDisabled('bancario') && form.contas.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeConta(conta.key)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="form-grid">
                      <div className="form-group span-2">
                        <label>Banco</label>
                        {bancos.length > 0 ? (
                          <select
                            value={conta.banco_codigo}
                            disabled={fieldDisabled('bancario')}
                            onChange={(e) => aplicarBanco(conta.key, e.target.value)}
                          >
                            <option value="">Selecione o banco</option>
                            {conta.banco_codigo && !bancosByCode.has(conta.banco_codigo) && (
                              <option value={conta.banco_codigo}>
                                {conta.banco_codigo}
                                {conta.banco_nome ? ` — ${conta.banco_nome}` : ''}
                              </option>
                            )}
                            {bancos
                              .filter((b) => b.code)
                              .map((b) => (
                                <option key={`${b.code}-${b.ispb}`} value={b.code ?? ''}>
                                  {bankLabel(b)}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            value={conta.banco_nome}
                            disabled={fieldDisabled('bancario')}
                            placeholder="Nome do banco"
                            onChange={(e) => updateConta(conta.key, { banco_nome: e.target.value })}
                          />
                        )}
                      </div>
                      <div className="form-group">
                        <label>Código</label>
                        <input
                          value={conta.banco_codigo}
                          disabled={fieldDisabled('bancario')}
                          onChange={(e) =>
                            updateConta(conta.key, {
                              banco_codigo: onlyDigits(e.target.value).slice(0, 3),
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Tipo</label>
                        <select
                          value={conta.tipo_conta}
                          disabled={fieldDisabled('bancario')}
                          onChange={(e) => updateConta(conta.key, { tipo_conta: e.target.value })}
                        >
                          <option value="CORRENTE">Corrente</option>
                          <option value="POUPANCA">Poupança</option>
                          <option value="PAGAMENTO">Pagamento</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Agência</label>
                        <input
                          value={conta.agencia}
                          disabled={fieldDisabled('bancario')}
                          onChange={(e) => updateConta(conta.key, { agencia: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Conta</label>
                        <input
                          value={conta.conta}
                          disabled={fieldDisabled('bancario')}
                          onChange={(e) => updateConta(conta.key, { conta: e.target.value })}
                        />
                      </div>
                      <div className="form-group span-2">
                        <label>Chave PIX</label>
                        <input
                          value={conta.pix_chave}
                          disabled={fieldDisabled('bancario')}
                          onChange={(e) => updateConta(conta.key, { pix_chave: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            {!readOnly ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || consulting !== null}
                onClick={handleSave}
              >
                {saving ? 'Salvando…' : isNew ? 'Criar parceiro' : 'Salvar alterações'}
              </button>
            ) : (
              <p className="form-hint" style={{ margin: 0 }}>
                Sem permissão para editar este cadastro.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const PARCEIRO_HISTORICO_SORT = {
  inicio: (h: ParceiroFiscalHistorico) => h.vigencia_inicio,
  fim: (h: ParceiroFiscalHistorico) => h.vigencia_fim,
  ie: (h: ParceiroFiscalHistorico) => h.ie,
  ind: (h: ParceiroFiscalHistorico) =>
    h.ind_ie_dest != null ? Number(h.ind_ie_dest) : null,
  status: (h: ParceiroFiscalHistorico) => h.ie_status,
  regime: (h: ParceiroFiscalHistorico) => h.regime,
  finalidade: (h: ParceiroFiscalHistorico) => h.finalidade,
  motivo: (h: ParceiroFiscalHistorico) => h.motivo,
};

function ParceiroHistoricoFiscalTable({ rows }: { rows: ParceiroFiscalHistorico[] }) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, PARCEIRO_HISTORICO_SORT);

  return (
    <table className="data-table fiscal-historico-table">
      <thead>
        <tr>
          <SortableTh column="inicio" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Início
          </SortableTh>
          <SortableTh column="fim" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Fim
          </SortableTh>
          <SortableTh column="ie" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            IE
          </SortableTh>
          <SortableTh column="ind" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            ind
          </SortableTh>
          <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Status
          </SortableTh>
          <SortableTh column="regime" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Regime
          </SortableTh>
          <SortableTh column="finalidade" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Finalidade
          </SortableTh>
          <SortableTh column="motivo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
            Motivo
          </SortableTh>
        </tr>
      </thead>
      <tbody>
        {sorted.map((h) => (
          <tr key={h.id}>
            <td>{h.vigencia_inicio?.slice(0, 10)}</td>
            <td>{h.vigencia_fim ? h.vigencia_fim.slice(0, 10) : 'Atual'}</td>
            <td>{h.ie || '—'}</td>
            <td>{h.ind_ie_dest ?? '—'}</td>
            <td>{h.ie_status ? ieStatusLabel(h.ie_status) : '—'}</td>
            <td>{h.regime || '—'}</td>
            <td>{h.finalidade || '—'}</td>
            <td>{h.motivo || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
