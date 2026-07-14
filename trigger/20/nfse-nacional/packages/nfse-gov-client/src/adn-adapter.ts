import { GovApiError, type Ambiente, getGovEndpoints } from '@nfse/shared';
import { gunzipBase64 } from '@nfse/xml';
import type { IAdnGateway, LoteDfe, EventoGov } from './ports.js';

export class AdnAdapter implements IAdnGateway {
  constructor(
    private readonly ambiente: Ambiente,
    private readonly httpsAgent?: unknown,
  ) {}

  private get baseUrl(): string {
    return getGovEndpoints(this.ambiente).adn;
  }

  private async request<T>(method: string, path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      // @ts-expect-error Node fetch agent
      agent: this.httpsAgent,
    });

    if (!response.ok) {
      throw new GovApiError(
        `Erro ADN HTTP ${response.status}`,
        'GOV_ADN_ERROR',
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  async sincronizarDfe(ultimoNsu: string): Promise<LoteDfe> {
    const data = await this.request<{
      LoteDFe: Array<{ NSU: string; tipoDFe: string; chaveAcesso: string; arquivoXmlGZipB64: string }>;
      ultNSU: string;
      maxNSU: string;
    }>('GET', `/contribuintes/DFe/${ultimoNsu}`);

    return {
      documentos: (data.LoteDFe ?? []).map((d) => ({
        nsu: d.NSU,
        tipoDfe: d.tipoDFe,
        chave: d.chaveAcesso,
        xml: gunzipBase64(d.arquivoXmlGZipB64),
      })),
      ultimoNsu: data.ultNSU,
      maxNsu: data.maxNSU,
    };
  }

  async baixarDanfse(chave: string): Promise<Buffer | null> {
    const url = `${this.baseUrl}/danfse/${chave}`;
    const response = await fetch(url, {
      // @ts-expect-error Node fetch agent
      agent: this.httpsAgent,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new GovApiError('Erro ao baixar DANFSe', 'DANFSE_ERROR', response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async listarEventosNfse(chave: string): Promise<EventoGov[]> {
    const data = await this.request<{ eventos: Array<{
      tipoEvento: string;
      nSeqEvento: number;
      eventoXmlGZipB64: string;
      dhRegEvento: string;
    }> }>('GET', `/contribuintes/NFSe/${chave}/Eventos`);

    return (data.eventos ?? []).map((e) => ({
      tipo: e.tipoEvento as EventoGov['tipo'],
      sequencial: e.nSeqEvento,
      xml: gunzipBase64(e.eventoXmlGZipB64),
      dataRegistro: e.dhRegEvento,
    }));
  }
}
