/** Helpers de preenchimento “só vazios” — dado externo é sugestão. */

export type EnderecoForm = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
};

export type CnpjConsulta = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  cnae?: string;
  cnaeDescricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  codigoMunicipio?: string;
  telefone?: string;
  email?: string;
  fonte: string;
  cacheHit: boolean;
};

export type CepConsulta = {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  codigoMunicipio: string;
  fonte: string;
  cacheHit: boolean;
};

function empty(v?: string | null): boolean {
  return v == null || String(v).trim() === '';
}

function fill(current: string, next?: string | null): string {
  if (!empty(current)) return current;
  return next?.trim() ?? '';
}

/** Preenche apenas campos vazios do endereço a partir do CEP. */
export function patchEnderecoFromCep(current: EnderecoForm, cep: CepConsulta): EnderecoForm {
  return {
    ...current,
    cep: fill(current.cep, cep.cep) || current.cep,
    logradouro: fill(current.logradouro, cep.logradouro),
    complemento: fill(current.complemento, cep.complemento),
    bairro: fill(current.bairro, cep.bairro),
    municipio: fill(current.municipio, cep.municipio),
    uf: fill(current.uf, cep.uf),
    codigoMunicipio: fill(current.codigoMunicipio, cep.codigoMunicipio),
    numero: current.numero,
  };
}

export function applyCnpjToParceiro(input: {
  apelido: string;
  razaoSocial: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cnae: string;
  endereco: EnderecoForm;
}, cnpj: CnpjConsulta) {
  const end = patchEnderecoFromCep(input.endereco, {
    cep: cnpj.cep ?? '',
    logradouro: cnpj.logradouro ?? '',
    complemento: cnpj.complemento,
    bairro: cnpj.bairro ?? '',
    municipio: cnpj.municipio ?? '',
    uf: cnpj.uf ?? '',
    codigoMunicipio: cnpj.codigoMunicipio ?? '',
    fonte: cnpj.fonte,
    cacheHit: cnpj.cacheHit,
  });
  if (cnpj.numero) end.numero = fill(end.numero, cnpj.numero);

  return {
    ...input,
    cpfCnpj: cnpj.cnpj,
    razaoSocial: fill(input.razaoSocial, cnpj.razaoSocial),
    apelido: fill(input.apelido, cnpj.nomeFantasia || cnpj.razaoSocial),
    email: fill(input.email, cnpj.email),
    telefone: fill(input.telefone, cnpj.telefone),
    cnae: fill(input.cnae, cnpj.cnae),
    endereco: end,
  };
}

export function applyCnpjToEmitente(form: Record<string, string>, cnpj: CnpjConsulta): Record<string, string> {
  return {
    ...form,
    cnpj: cnpj.cnpj,
    razaoSocial: fill(form.razaoSocial, cnpj.razaoSocial),
    apelido: fill(form.apelido, cnpj.nomeFantasia || cnpj.razaoSocial),
    nomeFantasia: fill(form.nomeFantasia ?? '', cnpj.nomeFantasia),
    cnae: fill(form.cnae ?? '', cnpj.cnae),
    email: fill(form.email ?? '', cnpj.email),
    telefone: fill(form.telefone ?? '', cnpj.telefone),
    logradouro: fill(form.logradouro, cnpj.logradouro),
    numero: fill(form.numero, cnpj.numero),
    complemento: fill(form.complemento ?? '', cnpj.complemento),
    bairro: fill(form.bairro, cnpj.bairro),
    municipio: fill(form.municipio, cnpj.municipio),
    uf: fill(form.uf, cnpj.uf),
    cep: fill(form.cep, cnpj.cep),
    codigoMunicipio: fill(form.codigoMunicipio, cnpj.codigoMunicipio),
  };
}

export function deriveIndIeDestClient(ie: string): '1' | '2' | '9' {
  const n = ie.trim().toUpperCase();
  if (!n) return '9';
  if (['ISENTO', 'ISENTA', 'IE ISENTO', 'IE ISENTA'].includes(n)) return '2';
  if (/\d/.test(n)) return '1';
  return '9';
}

export function suggestAreaIncentivada(uf?: string, suframa?: string): boolean {
  if (suframa && suframa.trim()) return true;
  return ['AM', 'AC', 'RO', 'RR', 'AP'].includes((uf ?? '').toUpperCase());
}
