import { createHash } from 'node:crypto';
import { GovApiError } from '@nfse/shared';
import { descricaoTributacaoNacional, descricaoNbs } from '@nfse/domain';
import {
  gunzipBase64,
  NfseXmlBuilder,
  extractDpsEmissionMeta,
  padNumeroDps,
  extractTag,
} from '@nfse/xml';
import type { ICadastroConsultaGateway } from './ports.js';
import type {
  ISefinGateway,
  ResultadoEmissao,
  ResultadoEvento,
  EventoGov,
} from './ports.js';

let nfseSequence = 0;

function gerarChaveAcesso(cMun: string, cnpj: string, numeroNfse: string): string {
  const base = `${cMun.padStart(7, '0').slice(0, 7)}2${cnpj.replace(/\D/g, '').padStart(14, '0')}${padNumeroDps(numeroNfse)}`;
  const hash = createHash('sha256').update(base).digest('hex').toUpperCase();
  return (base + hash).slice(0, 50);
}

export class MockSefinAdapter implements ISefinGateway {
  private readonly nfseStore = new Map<string, { idDps: string; xml: string }>();
  private readonly dpsIndex = new Map<string, string>();
  private readonly eventos = new Map<string, EventoGov[]>();
  private readonly nfseBuilder = new NfseXmlBuilder();

  constructor(private readonly cadastro?: ICadastroConsultaGateway) {}

  async emitir(dpsXmlGZipB64: string): Promise<ResultadoEmissao> {
    const dpsXml = gunzipBase64(dpsXmlGZipB64);
    const idMatch = dpsXml.match(/Id="([^"]+)"/);
    const idDps = idMatch?.[1] ?? 'unknown';

    if (this.dpsIndex.has(idDps)) {
      const chave = this.dpsIndex.get(idDps)!;
      const existing = this.nfseStore.get(chave)!;
      return { chaveAcesso: chave, idDps, nfseXml: existing.xml };
    }

    const meta = extractDpsEmissionMeta(dpsXml);
    const codigoTribNac = meta.codigoTributacaoNacional ?? extractTag(dpsXml, 'cTribNac') ?? '';
    const xTribNacOficial = descricaoTributacaoNacional(codigoTribNac);
    const codigoNbs = meta.codigoNbs ?? extractTag(dpsXml, 'cNBS') ?? '';
    const xNBS = codigoNbs ? descricaoNbs(codigoNbs) ?? undefined : undefined;
    nfseSequence += 1;
    const nNfse = String(nfseSequence);
    const chaveAcesso = gerarChaveAcesso(meta.codigoMunicipio, meta.cnpjPrestador, meta.numeroDps);

    const [xLocEmi, xLocPrestacao, xLocIncid, prestadorCadastro] = await Promise.all([
      this.resolveMunicipio(meta.codigoMunicipio),
      this.resolveMunicipio(meta.codigoMunicipioIncidencia),
      this.resolveMunicipio(meta.codigoMunicipioIncidencia),
      this.resolvePrestadorCadastro(meta.cnpjPrestador),
    ]);

    const nfseXml = this.nfseBuilder.build({
      signedDpsXml: dpsXml,
      chaveAcesso,
      nNfse,
      nDFSe: nNfse,
      xLocEmi,
      xLocPrestacao,
      xLocIncid,
      xTribNac: xTribNacOficial ?? meta.descricaoServico,
      xNBS,
      valores: {
        vLiq: meta.vLiq,
        vServico: meta.valorServico,
        ...(meta.vBC !== undefined ? { vBC: meta.vBC } : {}),
        ...(meta.pAliq !== undefined ? { pAliqAplic: meta.pAliq } : {}),
        ...(meta.vISSQN !== undefined ? { vISSQN: meta.vISSQN } : {}),
      },
      emit: {
        cnpj: meta.cnpjPrestador,
        razaoSocial: meta.razaoSocial,
        inscricaoMunicipal: meta.inscricaoMunicipal,
        email: meta.prestadorEmail ?? prestadorCadastro?.email,
        telefone: meta.prestadorTelefone ?? prestadorCadastro?.telefone,
        endereco: prestadorCadastro?.endereco,
      },
    });

    this.nfseStore.set(chaveAcesso, { idDps, xml: nfseXml });
    this.dpsIndex.set(idDps, chaveAcesso);
    this.eventos.set(chaveAcesso, []);

    return { chaveAcesso, idDps, nfseXml, alertas: [] };
  }

  async consultarNfse(chave: string): Promise<string> {
    const nfse = this.nfseStore.get(chave);
    if (!nfse) throw new GovApiError('NFS-e não encontrada', 'NFSE_NOT_FOUND', 404);
    return nfse.xml;
  }

  async consultarDps(id: string): Promise<string | null> {
    return this.dpsIndex.get(id) ?? null;
  }

  async verificarDps(id: string): Promise<boolean> {
    return this.dpsIndex.has(id);
  }

  async registrarEvento(chave: string, _pedidoXmlGZipB64: string): Promise<ResultadoEvento> {
    const nfse = this.nfseStore.get(chave);
    if (!nfse) throw new GovApiError('NFS-e não encontrada', 'NFSE_NOT_FOUND', 404);

    const eventos = this.eventos.get(chave) ?? [];
    const sequencial = eventos.length + 1;
    const evento: EventoGov = {
      tipo: 'e101101',
      sequencial,
      xml: `<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infEvento Id="EVT${chave}${sequencial}"><chNFSe>${chave}</chNFSe><tpEvento>e101101</tpEvento><nSeqEvento>${sequencial}</nSeqEvento></infEvento></evento>`,
      dataRegistro: new Date().toISOString(),
    };
    eventos.push(evento);
    this.eventos.set(chave, eventos);

    return {
      tipo: 'e101101',
      sequencial,
      xmlEvento: evento.xml,
      status: 'REGISTRADO',
    };
  }

  async listarEventos(chave: string): Promise<EventoGov[]> {
    return this.eventos.get(chave) ?? [];
  }

  private async resolveMunicipio(codigoIbge: string): Promise<string> {
    if (!codigoIbge) return '';
    if (this.cadastro) {
      try {
        const nome = await this.cadastro.nomeMunicipio(codigoIbge);
        if (nome) return nome;
      } catch {
        // fallback abaixo
      }
    }
    return `Município IBGE ${codigoIbge}`;
  }

  private async resolvePrestadorCadastro(cnpj: string) {
    if (!this.cadastro || !cnpj) return null;
    try {
      return await this.cadastro.consultarCnpj(cnpj);
    } catch {
      return null;
    }
  }
}
