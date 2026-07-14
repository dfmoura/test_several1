import https from 'node:https';
import { GovApiError, type Ambiente, getGovEndpoints } from '@nfse/shared';
import { gunzipBase64 } from '@nfse/xml';
import { govHttpRequest } from './gov-http.js';
import type { IAdnGateway, LoteDfe, EventoGov } from './ports.js';

interface DistribuicaoNsu {
  NSU?: number | null;
  ChaveAcesso?: string | null;
  TipoDocumento?: string;
  TipoEvento?: string | null;
  ArquivoXml?: string | null;
  DataHoraGeracao?: string | null;
}

interface LoteDistribuicaoNsuResponse {
  StatusProcessamento?: 'REJEICAO' | 'NENHUM_DOCUMENTO_LOCALIZADO' | 'DOCUMENTOS_LOCALIZADOS';
  LoteDFe?: DistribuicaoNsu[] | null;
  Erros?: Array<{ Codigo?: string; Descricao?: string }>;
}

export class AdnAdapter implements IAdnGateway {
  constructor(
    private readonly ambiente: Ambiente,
    private readonly httpsAgent?: https.Agent,
    private readonly cnpjConsulta?: string,
  ) {}

  private get baseUrl(): string {
    return getGovEndpoints(this.ambiente).adn;
  }

  private get danfseBaseUrl(): string {
    return getGovEndpoints(this.ambiente).danfse;
  }

  private async request<T>(method: string, path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await govHttpRequest(url, {
      method,
      agent: this.httpsAgent,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new GovApiError(
        `Erro ADN HTTP ${response.status}`,
        'GOV_ADN_ERROR',
        response.status,
      );
    }

    return JSON.parse(response.body.toString('utf-8')) as T;
  }

  private mapDistribuicao(doc: DistribuicaoNsu) {
    if (doc.NSU == null || !doc.ArquivoXml) return null;
    return {
      nsu: String(doc.NSU),
      tipoDfe: doc.TipoDocumento ?? 'NFSE',
      chave: doc.ChaveAcesso ?? '',
      xml: gunzipBase64(doc.ArquivoXml),
    };
  }

  private parseLote(data: LoteDistribuicaoNsuResponse, ultimoNsu: string): LoteDfe {
    if (data.StatusProcessamento === 'REJEICAO') {
      const erro = data.Erros?.[0];
      throw new GovApiError(
        erro?.Descricao ?? 'ADN rejeitou a consulta de DF-e',
        'GOV_ADN_REJEICAO',
        400,
        erro?.Codigo,
        data,
      );
    }

    const documentos = (data.LoteDFe ?? [])
      .map((doc) => this.mapDistribuicao(doc))
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    const maxNsu = documentos.length > 0
      ? String(Math.max(...documentos.map((d) => parseInt(d.nsu, 10))))
      : ultimoNsu;

    return {
      documentos,
      ultimoNsu,
      maxNsu,
    };
  }

  async sincronizarDfe(ultimoNsu: string): Promise<LoteDfe> {
    const nsuParam = ultimoNsu || '0';
    const query = new URLSearchParams({ lote: 'true' });
    const cnpj = this.cnpjConsulta?.replace(/\D/g, '');
    if (cnpj) query.set('cnpjConsulta', cnpj);

    const data = await this.request<LoteDistribuicaoNsuResponse>(
      'GET',
      `/contribuintes/DFe/${nsuParam}?${query}`,
    );

    return this.parseLote(data, nsuParam);
  }

  async baixarDanfse(chave: string): Promise<Buffer | null> {
    const response = await govHttpRequest(`${this.danfseBaseUrl}/danfse/${chave}`, {
      method: 'GET',
      agent: this.httpsAgent,
    });
    if (response.status === 404) return null;
    if (response.status < 200 || response.status >= 300) {
      throw new GovApiError('Erro ao baixar DANFSe', 'DANFSE_ERROR', response.status);
    }
    return response.body;
  }

  async listarEventosNfse(chave: string): Promise<EventoGov[]> {
    const data = await this.request<LoteDistribuicaoNsuResponse>(
      'GET',
      `/contribuintes/NFSe/${chave}/Eventos`,
    );

    return (data.LoteDFe ?? [])
      .filter((doc) => doc.TipoDocumento === 'EVENTO' && doc.ArquivoXml)
      .map((doc, index) => ({
        tipo: (doc.TipoEvento ?? 'CANCELAMENTO') as EventoGov['tipo'],
        sequencial: doc.NSU ?? index + 1,
        xml: gunzipBase64(doc.ArquivoXml!),
        dataRegistro: doc.DataHoraGeracao ?? new Date().toISOString(),
      }));
  }
}
