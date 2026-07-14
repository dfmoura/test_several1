import { GovApiError, type Ambiente, getGovEndpoints } from '@nfse/shared';
import { gzipBase64, gunzipBase64 } from '@nfse/xml';
import type {
  ISefinGateway,
  ResultadoEmissao,
  ResultadoEvento,
  EventoGov,
  GovErrorResponse,
} from './ports.js';

export class SefinAdapter implements ISefinGateway {
  constructor(
    private readonly ambiente: Ambiente,
    private readonly httpsAgent?: unknown,
  ) {}

  private get baseUrl(): string {
    return getGovEndpoints(this.ambiente).sefin;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        // @ts-expect-error Node fetch agent
        agent: this.httpsAgent,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as GovErrorResponse;
        const govErro = errorBody.erros?.[0];
        throw new GovApiError(
          govErro?.Descricao ?? `Erro SEFIN HTTP ${response.status}`,
          'GOV_SEFIN_ERROR',
          response.status,
          govErro?.Codigo,
          errorBody,
        );
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async emitir(dpsXmlGZipB64: string): Promise<ResultadoEmissao> {
    const data = await this.request<{
      chaveAcesso: string;
      idDps: string;
      nfseXmlGZipB64: string;
      alertas?: string[];
    }>('POST', '/nfse', { dpsXmlGZipB64 });

    return {
      chaveAcesso: data.chaveAcesso,
      idDps: data.idDps,
      nfseXml: gunzipBase64(data.nfseXmlGZipB64),
      alertas: data.alertas,
    };
  }

  async consultarNfse(chave: string): Promise<string> {
    const data = await this.request<{ nfseXmlGZipB64: string }>('GET', `/nfse/${chave}`);
    return gunzipBase64(data.nfseXmlGZipB64);
  }

  async consultarDps(id: string): Promise<string | null> {
    try {
      const data = await this.request<{ chaveAcesso: string }>('GET', `/dps/${id}`);
      return data.chaveAcesso;
    } catch (e) {
      if (e instanceof GovApiError && e.statusCode === 404) return null;
      throw e;
    }
  }

  async verificarDps(id: string): Promise<boolean> {
    const url = `${this.baseUrl}/dps/${id}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  }

  async registrarEvento(chave: string, pedidoXmlGZipB64: string): Promise<ResultadoEvento> {
    const data = await this.request<{
      tipoEvento: string;
      nSeqEvento: number;
      eventoXmlGZipB64: string;
      status: string;
    }>('POST', `/nfse/${chave}/eventos`, { pedidoRegEventoXmlGZipB64: pedidoXmlGZipB64 });

    return {
      tipo: data.tipoEvento as ResultadoEvento['tipo'],
      sequencial: data.nSeqEvento,
      xmlEvento: gunzipBase64(data.eventoXmlGZipB64),
      status: data.status === 'REGISTRADO' ? 'REGISTRADO' : 'REJEITADO',
    };
  }

  async listarEventos(chave: string): Promise<EventoGov[]> {
    const data = await this.request<{ eventos: Array<{
      tipoEvento: string;
      nSeqEvento: number;
      eventoXmlGZipB64: string;
      dhRegEvento: string;
    }> }>('GET', `/nfse/${chave}/eventos`);

    return (data.eventos ?? []).map((e) => ({
      tipo: e.tipoEvento as EventoGov['tipo'],
      sequencial: e.nSeqEvento,
      xml: gunzipBase64(e.eventoXmlGZipB64),
      dataRegistro: e.dhRegEvento,
    }));
  }
}

export { gzipBase64 };
