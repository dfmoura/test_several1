import https from 'node:https';
import { GovApiError, type Ambiente, getGovEndpoints } from '@nfse/shared';
import { gzipBase64, gunzipBase64, extractTag } from '@nfse/xml';
import { govHttpRequest } from './gov-http.js';
import { formatarErroGov, primeiroErroGov, type GovErrorResponse } from './gov-error.js';
import type {
  ISefinGateway,
  ResultadoEmissao,
  ResultadoEvento,
  EventoGov,
} from './ports.js';

export class SefinAdapter implements ISefinGateway {
  constructor(
    private readonly ambiente: Ambiente,
    private readonly httpsAgent?: https.Agent,
  ) {}

  private get baseUrl(): string {
    return getGovEndpoints(this.ambiente).sefin;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await govHttpRequest(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        agent: this.httpsAgent,
        signal: controller.signal,
      });

      if (response.status < 200 || response.status >= 300) {
        const text = response.body.toString('utf-8');
        let errorBody: GovErrorResponse = {};
        if (text) {
          try {
            errorBody = JSON.parse(text) as GovErrorResponse;
          } catch {
            // corpo não-JSON (ex.: 403 sem payload estruturado)
          }
        }
        const govErro = primeiroErroGov(errorBody);
        const detail = formatarErroGov(errorBody, response.status, text);
        throw new GovApiError(
          detail,
          'GOV_SEFIN_ERROR',
          response.status,
          govErro?.codigo,
          errorBody,
        );
      }

      if (response.status === 204) return undefined as T;
      const text = response.body.toString('utf-8');
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof GovApiError) throw err;
      throw err;
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
    const response = await govHttpRequest(`${this.baseUrl}/dps/${id}`, {
      method: 'HEAD',
      agent: this.httpsAgent,
    });
    return response.status >= 200 && response.status < 300;
  }

  async registrarEvento(chave: string, pedidoXmlGZipB64: string): Promise<ResultadoEvento> {
    const data = await this.request<{
      tipoEvento?: string;
      nSeqEvento?: number;
      eventoXmlGZipB64?: string;
      status?: string;
    }>('POST', `/nfse/${chave}/eventos`, { pedidoRegistroEventoXmlGZipB64: pedidoXmlGZipB64 });

    if (!data.eventoXmlGZipB64) {
      throw new GovApiError(
        'SEFIN não retornou XML do evento',
        'GOV_SEFIN_ERROR',
        502,
      );
    }

    const xmlEvento = gunzipBase64(data.eventoXmlGZipB64);
    const sequencial =
      data.nSeqEvento ??
      Number.parseInt(extractTag(xmlEvento, 'nSeqEvento') ?? '1', 10);
    const tipoFromXml = xmlEvento.match(/<e(\d{6})>/);
    const tipo = (data.tipoEvento ?? (tipoFromXml ? `e${tipoFromXml[1]}` : 'e101101')) as ResultadoEvento['tipo'];

    // Resposta de sucesso (HTTP 2xx) traz eventoXmlGZipB64 — campo `status` pode vir ausente.
    const status: ResultadoEvento['status'] =
      data.status?.toUpperCase() === 'REGISTRADO' || data.status?.toUpperCase() === 'REJEITADO'
        ? (data.status.toUpperCase() as ResultadoEvento['status'])
        : 'REGISTRADO';

    return {
      tipo,
      sequencial,
      xmlEvento,
      status,
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
