import { descricaoTributacaoNacional } from '@nfse/domain';
import type { EnderecoNacional, NfseDocument } from './nfse-parser.js';

/** Resolve código IBGE → nome e UF (ex.: API IBGE). */
export interface MunicipioResolver {
  dadosMunicipio(codigoIbge: string): Promise<{ nome: string; uf: string } | null>;
}

function localidadeJaTemUf(nome?: string): boolean {
  return Boolean(nome?.trim() && / - [A-Z]{2}$/.test(nome.trim()));
}

function resolveUfPorCodigoSync(doc: NfseDocument, codigo?: string): string | undefined {
  if (!codigo) return undefined;

  const prest = doc.prestador.endereco;
  if (prest?.codigoMunicipio === codigo && prest.uf?.trim()) return prest.uf;

  const toma = doc.tomador.endereco;
  if (toma?.codigoMunicipio === codigo && toma.uf?.trim()) return toma.uf;

  return undefined;
}

async function resolveUfPorCodigo(
  doc: NfseDocument,
  codigo: string | undefined,
  resolver?: MunicipioResolver,
): Promise<string | undefined> {
  const sync = resolveUfPorCodigoSync(doc, codigo);
  if (sync) return sync;
  if (!codigo || !resolver) return undefined;

  try {
    const dados = await resolver.dadosMunicipio(codigo);
    return dados?.uf;
  } catch {
    return undefined;
  }
}

function enrichLocalPrestacaoSync(doc: NfseDocument): NfseDocument['servico'] {
  const { servico } = doc;
  if (localidadeJaTemUf(doc.xLocPrestacao) || servico.ufMunicipioPrestacao?.trim()) {
    return servico;
  }

  const uf = resolveUfPorCodigoSync(doc, servico.codigoMunicipioPrestacao);
  return uf ? { ...servico, ufMunicipioPrestacao: uf } : servico;
}

async function enrichLocalPrestacao(
  doc: NfseDocument,
  resolver?: MunicipioResolver,
): Promise<NfseDocument['servico']> {
  const servico = enrichLocalPrestacaoSync(doc);
  if (localidadeJaTemUf(doc.xLocPrestacao) || servico.ufMunicipioPrestacao?.trim()) {
    return servico;
  }

  const uf = await resolveUfPorCodigo(doc, servico.codigoMunicipioPrestacao, resolver);
  return uf ? { ...servico, ufMunicipioPrestacao: uf } : servico;
}

function enrichIncidenciaSync(doc: NfseDocument): Pick<NfseDocument, 'ufMunicipioIncidencia'> {
  if (localidadeJaTemUf(doc.xLocIncid) || doc.ufMunicipioIncidencia?.trim()) {
    return {};
  }

  const uf = resolveUfPorCodigoSync(doc, doc.codigoMunicipioIncidencia);
  return uf ? { ufMunicipioIncidencia: uf } : {};
}

async function enrichIncidencia(
  doc: NfseDocument,
  resolver?: MunicipioResolver,
): Promise<Pick<NfseDocument, 'ufMunicipioIncidencia'>> {
  const sync = enrichIncidenciaSync(doc);
  if (Object.keys(sync).length > 0 || localidadeJaTemUf(doc.xLocIncid) || doc.ufMunicipioIncidencia?.trim()) {
    return sync;
  }

  const uf = await resolveUfPorCodigo(doc, doc.codigoMunicipioIncidencia, resolver);
  return uf ? { ufMunicipioIncidencia: uf } : {};
}

async function enrichEndereco(
  end: EnderecoNacional | undefined,
  resolver: MunicipioResolver,
): Promise<EnderecoNacional | undefined> {
  if (!end?.codigoMunicipio) return end;

  const needsNome = !end.nomeMunicipio?.trim();
  const needsUf = !end.uf?.trim();
  if (!needsNome && !needsUf) return end;

  try {
    const dados = await resolver.dadosMunicipio(end.codigoMunicipio);
    if (!dados) return end;

    return {
      ...end,
      nomeMunicipio: needsNome ? dados.nome : end.nomeMunicipio,
      uf: needsUf ? dados.uf : end.uf,
    };
  } catch {
    return end;
  }
}

/**
 * Enriquece nomes de município/UF para exibição no DANFSe.
 * O XML NFS-e Nacional traz apenas cMun no endereço do tomador (norma padrão);
 * o PDF resolve nome + UF via código IBGE, como o layout oficial JasperReports.
 */
export async function enrichNfseDocumentLocalidades(
  doc: NfseDocument,
  resolver?: MunicipioResolver,
): Promise<NfseDocument> {
  const withTributacao = enrichNfseDocumentTributacao(doc);
  if (!resolver) {
    return {
      ...withTributacao,
      ...enrichIncidenciaSync(withTributacao),
      servico: enrichLocalPrestacaoSync(withTributacao),
    };
  }

  const [prestadorEndereco, tomadorEndereco] = await Promise.all([
    enrichEndereco(withTributacao.prestador.endereco, resolver),
    enrichEndereco(withTributacao.tomador.endereco, resolver),
  ]);

  const withEnderecos: NfseDocument = {
    ...withTributacao,
    prestador: { ...withTributacao.prestador, endereco: prestadorEndereco },
    tomador: { ...withTributacao.tomador, endereco: tomadorEndereco },
  };

  const [servico, incidencia] = await Promise.all([
    enrichLocalPrestacao(withEnderecos, resolver),
    enrichIncidencia(withEnderecos, resolver),
  ]);

  return {
    ...withEnderecos,
    ...incidencia,
    servico,
  };
}

/**
 * Preenche xTribNac a partir da base nacional LC 116 quando ausente ou divergente no XML.
 * O padrão oficial separa xTribNac (descrição LC 116) de xDescServ (discriminação do prestador).
 */
export function enrichNfseDocumentTributacao(doc: NfseDocument): NfseDocument {
  const codigo = doc.servico.codigoTributacaoNacional;
  if (!codigo) return doc;

  const descricaoOficial = descricaoTributacaoNacional(codigo);
  if (!descricaoOficial) return doc;

  if (doc.xTribNac?.trim() === descricaoOficial) return doc;

  return { ...doc, xTribNac: descricaoOficial };
}
