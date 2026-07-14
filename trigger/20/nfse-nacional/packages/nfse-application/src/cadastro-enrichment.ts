/**
 * Enriquecimento cadastral (cartão CNPJ Receita + IBGE).
 *
 * Política de Inscrição Municipal (IM):
 * - Não consta no cartão CNPJ da Receita Federal nem em APIs públicas de CNPJ.
 * - Prestador: somente `NFSE_INSCRICAO_MUNICIPAL` (.env), via `resolveEmitente`.
 * - Tomador: somente campo informado manualmente na emissão (API/console).
 * - Este módulo nunca preenche nem altera `inscricaoMunicipal`.
 */
import type { EmitirNfseInput, Endereco, Tomador } from '@nfse/domain';
import type { DadosCnpj, ICadastroConsultaGateway } from '@nfse/gov-client';
import type { EmitenteResolvido } from './emitente-resolver.js';

function isBlank(value?: string | null): boolean {
  return !value || value.trim() === '';
}

function mergeEndereco(existing: Endereco | undefined, fromApi: Endereco): Endereco {
  if (!existing) return fromApi;
  return {
    logradouro: existing.logradouro || fromApi.logradouro,
    numero: existing.numero || fromApi.numero,
    complemento: existing.complemento || fromApi.complemento,
    bairro: existing.bairro || fromApi.bairro,
    codigoMunicipio: existing.codigoMunicipio || fromApi.codigoMunicipio,
    uf: existing.uf || fromApi.uf,
    cep: existing.cep || fromApi.cep,
    nomeMunicipio: existing.nomeMunicipio || fromApi.nomeMunicipio,
  };
}

function mergeTomador(tomador: Tomador, dados: DadosCnpj | null): Tomador {
  if (!dados) return tomador;
  return {
    ...tomador,
    inscricaoMunicipal: tomador.inscricaoMunicipal,
    razaoSocial: tomador.razaoSocial || tomador.nome || dados.razaoSocial,
    nome: tomador.nome || tomador.razaoSocial || dados.razaoSocial,
    email: isBlank(tomador.email) ? dados.email : tomador.email,
    telefone: isBlank(tomador.telefone) ? dados.telefone : tomador.telefone,
    endereco: dados.endereco ? mergeEndereco(tomador.endereco, dados.endereco) : tomador.endereco,
  };
}

function mergeEmitente(emitente: EmitenteResolvido, dados: DadosCnpj | null): EmitenteResolvido {
  if (!dados) return emitente;
  return {
    ...emitente,
    inscricaoMunicipal: emitente.inscricaoMunicipal,
    razaoSocial: emitente.razaoSocial || dados.razaoSocial,
    nomeFantasia: emitente.nomeFantasia || dados.nomeFantasia,
    situacaoCadastral: emitente.situacaoCadastral || dados.situacaoCadastral,
    email: isBlank(emitente.email) ? dados.email : emitente.email,
    telefone: isBlank(emitente.telefone) ? dados.telefone : emitente.telefone,
    endereco: dados.endereco ? mergeEndereco(emitente.endereco, dados.endereco) : emitente.endereco,
    porte: emitente.porte || dados.porte,
    naturezaJuridica: emitente.naturezaJuridica || dados.naturezaJuridica,
    dataAbertura: emitente.dataAbertura || dados.dataAbertura,
    tipoEstabelecimento: emitente.tipoEstabelecimento || dados.tipoEstabelecimento,
    optanteSimples: emitente.optanteSimples ?? dados.optanteSimples,
    atividadePrincipal: emitente.atividadePrincipal ?? dados.atividadePrincipal,
    fonteCadastro: formatFonteCadastro(dados.fontes),
  };
}

function formatFonteCadastro(fontes?: string[]): string | undefined {
  if (!fontes?.length) return undefined;
  const labels: Record<string, string> = {
    brasilapi: 'Brasil API',
    receitaws: 'Receita WS',
  };
  return fontes.map((f) => labels[f] ?? f).join(' + ');
}

async function enrichEnderecoMunicipio(
  cadastro: ICadastroConsultaGateway,
  endereco: Endereco | undefined,
): Promise<Endereco | undefined> {
  if (!endereco?.codigoMunicipio) return endereco;

  const needsNome = !endereco.nomeMunicipio?.trim();
  const needsUf = !endereco.uf?.trim();
  if (!needsNome && !needsUf) return endereco;

  try {
    const dados = await cadastro.dadosMunicipio(endereco.codigoMunicipio);
    if (!dados) return endereco;

    return {
      ...endereco,
      nomeMunicipio: needsNome ? dados.nome : endereco.nomeMunicipio,
      uf: needsUf ? dados.uf : endereco.uf,
    };
  } catch {
    return endereco;
  }
}

export class CadastroEnrichmentService {
  private readonly isEnabledFn: () => boolean;

  constructor(
    private readonly cadastro: ICadastroConsultaGateway,
    isEnabled: boolean | (() => boolean) = true,
  ) {
    this.isEnabledFn = typeof isEnabled === 'function' ? isEnabled : () => isEnabled;
  }

  private get enabled(): boolean {
    return this.isEnabledFn();
  }

  async enriquecerEmissao(
    input: EmitirNfseInput,
    emitente: EmitenteResolvido,
  ): Promise<{ input: EmitirNfseInput; emitente: EmitenteResolvido }> {
    if (!this.enabled) return { input, emitente };

    let enrichedInput = { ...input, tomador: { ...input.tomador } };
    let enrichedEmitente = { ...emitente };

    try {
      if (input.tomador.tipo === 'PJ') {
        const cnpjTomador = input.tomador.cpfCnpj.replace(/\D/g, '');
        if (cnpjTomador.length === 14) {
          const dados = await this.cadastro.consultarCnpj(cnpjTomador);
          enrichedInput = {
            ...enrichedInput,
            tomador: mergeTomador(enrichedInput.tomador, dados),
          };
          if (enrichedInput.tomador.endereco) {
            enrichedInput = {
              ...enrichedInput,
              tomador: {
                ...enrichedInput.tomador,
                endereco: await enrichEnderecoMunicipio(this.cadastro, enrichedInput.tomador.endereco),
              },
            };
          }
        }
      }

      if (emitente.cnpj) {
        const dados = await this.cadastro.consultarCnpj(emitente.cnpj);
        enrichedEmitente = mergeEmitente(enrichedEmitente, dados);
      }

      if (!enrichedEmitente.nomeMunicipio && enrichedEmitente.codigoMunicipio) {
        const nome = await this.cadastro.nomeMunicipio(enrichedEmitente.codigoMunicipio);
        if (nome) enrichedEmitente = { ...enrichedEmitente, nomeMunicipio: nome };
      }

      if (enrichedEmitente.endereco) {
        enrichedEmitente = {
          ...enrichedEmitente,
          endereco: await enrichEnderecoMunicipio(this.cadastro, enrichedEmitente.endereco),
        };
      }
    } catch {
      // Enriquecimento é best-effort — não bloqueia emissão
    }

    return { input: enrichedInput, emitente: enrichedEmitente };
  }

  async consultarCnpj(cnpj: string) {
    return this.cadastro.consultarCnpj(cnpj.replace(/\D/g, ''));
  }

  /** Enriquece emitente para exibição (config/console) — best-effort. */
  async enriquecerEmitente(emitente: EmitenteResolvido): Promise<EmitenteResolvido> {
    if (!this.enabled || !emitente.cnpj) return emitente;

    try {
      const dados = await this.cadastro.consultarCnpj(emitente.cnpj);
      let enriched = mergeEmitente(emitente, dados);
      if (!enriched.nomeMunicipio && enriched.codigoMunicipio) {
        const nome = await this.cadastro.nomeMunicipio(enriched.codigoMunicipio);
        if (nome) enriched = { ...enriched, nomeMunicipio: nome };
      }
      if (enriched.endereco) {
        enriched = {
          ...enriched,
          endereco: await enrichEnderecoMunicipio(this.cadastro, enriched.endereco),
        };
      }
      return enriched;
    } catch {
      return emitente;
    }
  }

  async nomeMunicipio(codigoIbge: string) {
    return this.cadastro.nomeMunicipio(codigoIbge);
  }
}
