import type { CnaeSecundario, CnpjConsulta } from './api';
import { onlyDigits } from './format';
import { suggestAreaIncentivada } from './parceiroFiscal';

/**
 * Mistura o cartão CNPJ na ficha do parceiro.
 *
 * Campo vazio da Receita é "não sei": não apaga logradouro, número nem complemento
 * já digitados ou gravados. Consulta ao abrir só completa endereço em branco.
 * O botão Consultar atualiza identidade, CNAE e regime, preenche esses três
 * campos só quando estão vazios e avisa se o cartão divergir — sem trocar sozinho.
 */

export type CnpjMergeMode = 'silent' | 'explicit';

export type EnderecoCnpjCampo = 'logradouro' | 'numero' | 'complemento';

export type ParceiroCnpjAlvo = {
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge: string;
  telefone: string;
  email: string;
  regime: string;
  regime_desde: string;
  area_incentivada: boolean;
  suframa: string;
  cnae: string;
  cnaes_secundarios: CnaeSecundario[];
};

export type CnpjAplicado<T extends ParceiroCnpjAlvo> = {
  ficha: T;
  divergencias: EnderecoCnpjCampo[];
  mensagem: string;
};

function texto(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function igualEndereco(a: string, b: string): boolean {
  const normal = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();
  return normal(a) === normal(b);
}

function fundirLivre(
  atual: string,
  vindo: string | null | undefined,
  mode: CnpjMergeMode,
): { valor: string; divergiu: boolean } {
  const atualTxt = texto(atual);
  const vindoTxt = texto(vindo);
  if (!vindoTxt) return { valor: atual, divergiu: false };
  if (!atualTxt) return { valor: vindoTxt, divergiu: false };
  if (igualEndereco(atualTxt, vindoTxt)) return { valor: atual, divergiu: false };
  if (mode === 'silent') return { valor: atual, divergiu: false };
  return { valor: atual, divergiu: true };
}

/** CEP, bairro, município, UF e IBGE: ao abrir só preenche vazio; no botão, a Receita atualiza. */
function fundirRenovavel(
  atual: string,
  vindo: string,
  mode: CnpjMergeMode,
): string {
  if (!vindo) return atual;
  if (mode === 'silent' && texto(atual)) return atual;
  return vindo;
}

function ibgeDe(consulta: CnpjConsulta): string {
  if (texto(consulta.ibge)) return onlyDigits(consulta.ibge ?? '').slice(0, 7);
  if (consulta.codigo_municipio_ibge != null && texto(String(consulta.codigo_municipio_ibge))) {
    return onlyDigits(String(consulta.codigo_municipio_ibge)).slice(0, 7);
  }
  return '';
}

function cnaeDe(consulta: CnpjConsulta): string {
  const bruto =
    consulta.cnae ??
    (consulta.cnae_fiscal != null ? String(consulta.cnae_fiscal).padStart(7, '0') : '');
  return onlyDigits(bruto).slice(0, 7);
}

function normalizarCnaes(
  items: CnpjConsulta['cnaes_secundarios'],
): CnaeSecundario[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    codigo: item.codigo,
    descricao: item.descricao ?? '',
  }));
}

const ROTULO: Record<EnderecoCnpjCampo, string> = {
  logradouro: 'logradouro',
  numero: 'número',
  complemento: 'complemento',
};

export function mensagemCnpjImportado(
  ficha: Pick<ParceiroCnpjAlvo, 'logradouro' | 'numero'>,
  divergencias: EnderecoCnpjCampo[],
): string {
  const partes = [
    'Dados do CNPJ importados (identidade, CNAE e regime). Confira as abas Atividades, Fiscal e Sócios.',
  ];
  if (!texto(ficha.logradouro) || !texto(ficha.numero)) {
    partes.push('Complete logradouro e número. Complemento, se houver, é opcional.');
  }
  if (divergencias.length > 0) {
    const quais = divergencias.map((campo) => ROTULO[campo]).join(', ');
    partes.push(
      `O cartão CNPJ informa outro ${quais}. A ficha manteve o que já estava preenchido.`,
    );
  }
  return partes.join(' ');
}

export function aplicarCnpjNoParceiro<T extends ParceiroCnpjAlvo>(
  atual: T,
  consulta: CnpjConsulta,
  mode: CnpjMergeMode,
): CnpjAplicado<T> {
  const logradouro = fundirLivre(atual.logradouro, consulta.logradouro, mode);
  const numero = fundirLivre(atual.numero, consulta.numero, mode);
  const complemento = fundirLivre(atual.complemento, consulta.complemento, mode);

  const divergencias: EnderecoCnpjCampo[] = [];
  if (logradouro.divergiu) divergencias.push('logradouro');
  if (numero.divergiu) divergencias.push('numero');
  if (complemento.divergiu) divergencias.push('complemento');

  const patch: Partial<ParceiroCnpjAlvo> = {};

  if (logradouro.valor !== atual.logradouro) patch.logradouro = logradouro.valor;
  if (numero.valor !== atual.numero) patch.numero = numero.valor;
  if (complemento.valor !== atual.complemento) patch.complemento = complemento.valor;

  const bairro = fundirRenovavel(atual.bairro, texto(consulta.bairro), mode);
  const municipio = fundirRenovavel(atual.municipio, texto(consulta.municipio), mode);
  const uf = fundirRenovavel(atual.uf, texto(consulta.uf).toUpperCase().slice(0, 2), mode);
  const cep = fundirRenovavel(atual.cep, onlyDigits(consulta.cep ?? '').slice(0, 8), mode);
  const ibge = fundirRenovavel(atual.ibge, ibgeDe(consulta), mode);

  if (bairro !== atual.bairro) patch.bairro = bairro;
  if (municipio !== atual.municipio) patch.municipio = municipio;
  if (uf !== atual.uf) patch.uf = uf;
  if (cep !== atual.cep) patch.cep = cep;
  if (ibge !== atual.ibge) patch.ibge = ibge;

  if (mode === 'explicit') {
    const razao = texto(consulta.razao_social);
    const fantasia = texto(consulta.nome_fantasia);
    const email = texto(consulta.email);
    const telefone = onlyDigits(consulta.telefone ?? consulta.ddd_telefone_1 ?? '');
    const regime = texto(consulta.regime_sugerido);
    const cnae = cnaeDe(consulta);

    if (razao) patch.razao_social = razao;
    if (fantasia) patch.nome_fantasia = fantasia;
    if (email) patch.email = email;
    if (telefone) patch.telefone = telefone;
    if (regime) {
      patch.regime = regime;
      if (!texto(atual.regime_desde)) {
        patch.regime_desde = new Date().toISOString().slice(0, 10);
      }
    }
    if (cnae) patch.cnae = cnae;
    if (Array.isArray(consulta.cnaes_secundarios)) {
      patch.cnaes_secundarios = normalizarCnaes(consulta.cnaes_secundarios);
    }
  }

  const ufEfetiva = patch.uf ?? atual.uf;
  if (
    suggestAreaIncentivada(ufEfetiva, atual.suframa) &&
    !atual.area_incentivada &&
    (mode === 'explicit' || patch.uf)
  ) {
    patch.area_incentivada = true;
  }

  const ficha = { ...atual, ...patch };
  return {
    ficha,
    divergencias,
    mensagem: mode === 'explicit' ? mensagemCnpjImportado(ficha, divergencias) : '',
  };
}
