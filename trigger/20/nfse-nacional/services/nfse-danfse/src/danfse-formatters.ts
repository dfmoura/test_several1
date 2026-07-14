import type { EnderecoNacional, NfseDocument } from '@nfse/xml';
import {
  descricaoNbs,
  descricaoTributacaoNacional,
  formatCodigoNbsComDescricao,
  formatCodigoTribComDescricao,
  isRetencaoContribSociais,
  labelRegimeEspecial,
  labelRetencaoIssqn,
  labelSuspensaoExigibilidade,
  labelTipoImunidade,
  labelTpRetPisCofins,
} from '@nfse/domain';

export function fmtCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function fmtCurrencyRs(value?: number | null): string {
  const v = fmtCurrency(value);
  return v ? `R$ ${v}` : '';
}

export function fmtDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    const normalized = iso.replace(/([+-]\d{2}:\d{2})$/, '');
    const d = new Date(normalized);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

export function fmtDoc(cnpj?: string, cpf?: string): string {
  const d = (cnpj ?? cpf ?? '').replace(/\D/g, '');
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj ?? cpf ?? '';
}

export function fmtCep(cep?: string): string {
  const d = (cep ?? '').replace(/\D/g, '');
  if (d.length !== 8) return cep ?? '';
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

export function fmtTelefone(fone?: string): string {
  const d = (fone ?? '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return fone ?? '';
}

export function fmtCodigoTrib(code?: string): string {
  if (!code) return '';
  const d = code.replace(/\D/g, '');
  if (d.length < 6) return code;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

export function fmtEndereco(end?: EnderecoNacional): string {
  if (!end) return '';
  const parts = [
    [end.logradouro, end.numero].filter(Boolean).join(' '),
    end.complemento,
    end.bairro ? `- ${end.bairro}` : undefined,
  ].filter(Boolean);
  return parts.join(' ').trim();
}

export function fmtMunicipio(nome?: string, uf?: string, codigo?: string): string {
  if (nome && uf) return `${nome} - ${uf}`;
  if (nome) return nome;
  if (codigo) return `IBGE ${codigo}`;
  return '';
}

function localidadeJaTemUf(nome?: string): boolean {
  return Boolean(nome?.trim() && / - [A-Z]{2}$/.test(nome.trim()));
}

function resolveUfPorCodigoFromDoc(doc: NfseDocument, codigo?: string): string | undefined {
  if (!codigo) return undefined;

  const prest = doc.prestador.endereco;
  if (prest?.codigoMunicipio === codigo && prest.uf?.trim()) return prest.uf;

  const toma = doc.tomador.endereco;
  if (toma?.codigoMunicipio === codigo && toma.uf?.trim()) return toma.uf;

  return undefined;
}

/** Fallback quando o código IBGE não está disponível: mesmo nome textual de outra localidade do documento. */
function resolveUfPorNomeLocalidade(doc: NfseDocument, nome?: string): string | undefined {
  const n = nome?.trim();
  if (!n || localidadeJaTemUf(n)) return undefined;

  const prestEnd = doc.prestador.endereco;
  if (prestEnd?.uf?.trim() && doc.xLocEmi?.trim() === n) return prestEnd.uf;

  const tomaEnd = doc.tomador.endereco;
  if (tomaEnd?.uf?.trim() && tomaEnd.nomeMunicipio?.trim() === n) return tomaEnd.uf;

  if (prestEnd?.uf?.trim() && doc.xLocPrestacao?.trim() === n) return prestEnd.uf;

  return undefined;
}

function resolveUfLocalPrestacao(doc: NfseDocument, nome?: string): string | undefined {
  return (
    doc.servico.ufMunicipioPrestacao
    ?? resolveUfPorCodigoFromDoc(doc, doc.servico.codigoMunicipioPrestacao)
    ?? resolveUfPorNomeLocalidade(doc, nome)
  );
}

function resolveUfLocalIncidencia(doc: NfseDocument, nome?: string): string | undefined {
  return (
    doc.ufMunicipioIncidencia
    ?? resolveUfPorCodigoFromDoc(doc, doc.codigoMunicipioIncidencia)
    ?? resolveUfPorCodigoFromDoc(doc, doc.servico.codigoMunicipioPrestacao)
    ?? resolveUfPorNomeLocalidade(doc, nome)
  );
}

/** Local da prestação no padrão DANFSe: "Município - UF" (layout oficial JasperReports). */
export function fmtLocalPrestacao(doc: NfseDocument): string {
  const nome = doc.xLocPrestacao?.trim();
  if (nome && localidadeJaTemUf(nome)) return nome;
  return fmtMunicipio(nome, resolveUfLocalPrestacao(doc, nome), doc.servico.codigoMunicipioPrestacao);
}

/** Município de incidência do ISSQN no padrão DANFSe: "Município - UF". */
export function fmtLocalIncidencia(doc: NfseDocument): string {
  const nome = doc.xLocIncid?.trim();
  if (nome && localidadeJaTemUf(nome)) return nome;
  return fmtMunicipio(nome, resolveUfLocalIncidencia(doc, nome), doc.codigoMunicipioIncidencia);
}

/** Código BACEN 105 = Brasil. */
export function fmtPais(codigo?: string): string {
  if (!codigo || codigo === '105') return 'Brasil';
  return codigo;
}

/** País resultado da prestação (cPaisConsum) — padrão Brasil para operações no território nacional. */
export function fmtPaisResultado(doc: NfseDocument): string {
  if (doc.servico.codigoPaisResultado) return fmtPais(doc.servico.codigoPaisResultado);
  if (doc.tributacao?.tribISSQN === '3') return '';
  return 'Brasil';
}

export function buildQrUrl(chave: string, tpAmb?: string): string {
  const host = tpAmb === '1' ? 'https://www.nfse.gov.br' : 'https://www.producaorestrita.nfse.gov.br';
  return `${host}/ConsultaPublica/?tpc=1&chave=${chave}`;
}

const SIMPLES_NACIONAL: Record<string, string> = {
  '1': 'Não Optante',
  '2': 'Optante - Microempreendedor Individual (MEI)',
  '3': 'Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)',
};

const REG_AP_TRIB_SN: Record<string, string> = {
  '1': 'Regime de apuração dos tributos federais e municipal pelo SN',
  '2': 'Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal do tributo',
  '3': 'Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legilações federal e municipal de cada tributo',
};

const TRIB_ISSQN: Record<string, string> = {
  '1': 'Operação tributável',
  '2': 'Imunidade',
  '3': 'Exportação de serviço',
  '4': 'Não Incidência',
};


export function labelSimplesNacional(code?: string): string {
  return (code && SIMPLES_NACIONAL[code]) || '';
}

export function labelRegApTribSN(code?: string): string {
  return (code && REG_AP_TRIB_SN[code]) || '';
}

export { labelRegimeEspecial, labelRetencaoIssqn, labelSuspensaoExigibilidade, labelTipoImunidade };

export function labelTribIssqn(code?: string): string {
  return (code && TRIB_ISSQN[code]) || '';
}

export function labelRetencaoPisCofins(code?: string): string {
  return labelTpRetPisCofins(code);
}

export function fmtBeneficioMunicipal(nBM?: string): string {
  return nBM?.trim() ?? '';
}

export function totalTributacaoFederal(doc: NfseDocument): number {
  const v = doc.valores;
  return (v.valorIr ?? 0) + (v.valorInss ?? 0) + (v.valorCsll ?? 0) + (v.valorPis ?? 0) + (v.valorCofins ?? 0);
}

export function totalPisCofinsRetidos(doc: NfseDocument): number {
  if (!isRetencaoContribSociais(doc.tributacao?.tpRetPisCofins)) return 0;
  return doc.valores.valorCsll ?? 0;
}

export function fmtTributoAproximado(valor?: number, percentual?: number): string {
  if (valor !== undefined && valor > 0) return fmtCurrencyRs(valor);
  if (percentual !== undefined && percentual > 0) return `${fmtCurrency(percentual)}%`;
  return '';
}

export function codigoTribComDescricao(doc: NfseDocument): string {
  const codigo = doc.servico.codigoTributacaoNacional ?? '';
  const descCatalogo = codigo ? descricaoTributacaoNacional(codigo) : null;
  const desc = descCatalogo || doc.xTribNac?.trim() || '';
  return formatCodigoTribComDescricao(codigo, desc);
}

export function codigoNbsComDescricao(doc: NfseDocument): string {
  const codigo = doc.servico.codigoNBS ?? '';
  if (!codigo) return '';
  const descCatalogo = descricaoNbs(codigo);
  const desc = descCatalogo || doc.xNBS?.trim() || '';
  return formatCodigoNbsComDescricao(codigo, desc);
}

/** Discriminação para exibição — somente texto digitado em Discriminação, sem repetir xDescServ. */
export function discriminacaoExibicao(doc: NfseDocument): string {
  const disc = doc.servico.discriminacao?.trim() ?? '';
  if (!disc) return '';
  const desc = doc.servico.descricao?.trim() ?? '';
  if (desc && disc === desc) return '';
  return disc;
}
