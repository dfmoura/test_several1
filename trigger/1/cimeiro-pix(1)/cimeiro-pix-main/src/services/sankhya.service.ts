import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { retry, withTimeout } from '../utils/retry';

export interface SankhyaAuth {
  jsessionid: string;
  jsessionid2?: string;
}

export interface SankhyaPixData {
  NUNOTA: string;
  EMVPIX: string;
  NOSSONUMERO: string;
  VLRDESDOB: number;
}

export interface SankhyaQueryResponse {
  responseBody: {
    entities: SankhyaPixData[];
    total: number;
  };
}

export class SankhyaService {
  private client: AxiosInstance;
  private auth: SankhyaAuth | null = null;
  private authExpiry: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.sankhya.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Sankhya Request', {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        logger.error('Sankhya Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor para logs
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Sankhya Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('Sankhya Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  private async authenticate(): Promise<SankhyaAuth> {
    try {
      logger.info('Authenticating with Sankhya');

      const response = await withTimeout(
        this.client.post('/login', {
          username: config.sankhya.username,
          password: config.sankhya.password,
        }, {
          headers: {
            'Authorization': `Bearer ${config.sankhya.token}`,
            'AppKey': config.sankhya.apiKey,
          },
        }),
        15000
      );

      const auth: SankhyaAuth = {
        jsessionid: response.data.jsessionid,
        jsessionid2: response.data.jsessionid2,
      };

      this.auth = auth;
      this.authExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      logger.info('Sankhya authentication successful');
      return auth;

    } catch (error) {
      logger.error('Sankhya authentication failed', { error: (error as Error).message });
      throw new Error(`Sankhya authentication failed: ${(error as Error).message}`);
    }
  }

  private async ensureAuthenticated(): Promise<SankhyaAuth> {
    if (!this.auth || !this.authExpiry || new Date() >= this.authExpiry) {
      return await retry(() => this.authenticate(), {
        maxAttempts: 3,
        delay: 2000,
      });
    }
    return this.auth;
  }

  public async consultarPixPorNunota(nunota: string): Promise<SankhyaPixData | null> {
    try {
      logger.info('Consulting PIX data for NUNOTA', { nunota });

      const auth = await this.ensureAuthenticated();

      const requestBody = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Financeiro',
            criteria: {
              expression: {
                '$': `this.NUNOTA = ${nunota}`
              }
            },
            fields: ['EMVPIX', 'NOSSONUMERO', 'NUNOTA', 'VLRDESDOB']
          }
        }
      };

      const response = await withTimeout(
        this.client.post('/gateway/v1/mge/service.sbr/CRUDServiceProvider.loadRecords', requestBody, {
          headers: {
            'Authorization': `Bearer ${config.sankhya.token}`,
            'AppKey': config.sankhya.apiKey,
            'Cookie': `JSESSIONID=${auth.jsessionid}${auth.jsessionid2 ? `; JSESSIONID2=${auth.jsessionid2}` : ''}`,
          },
        }),
        20000
      );

      const data: SankhyaQueryResponse = response.data;
      
      if (data.responseBody?.entities?.length > 0) {
        const pixData = data.responseBody.entities[0];
        
        if (pixData.EMVPIX) {
          logger.info('PIX data found for NUNOTA', { 
            nunota, 
            hasEmvpix: !!pixData.EMVPIX,
            valor: pixData.VLRDESDOB 
          });
          return pixData;
        }
      }

      logger.warn('No PIX data found for NUNOTA', { nunota });
      return null;

    } catch (error) {
      logger.error('Error consulting PIX data', { 
        nunota, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to consult PIX data for NUNOTA ${nunota}: ${(error as Error).message}`);
    }
  }

  public async consultarMultiplosPixPorData(dataInicio: Date, dataFim?: Date): Promise<SankhyaPixData[]> {
    try {
      const auth = await this.ensureAuthenticated();
      
      const dataFimFormatted = dataFim || new Date();
      const dataInicioFormatted = dataInicio.toISOString().split('T')[0];
      const dataFimFormattedStr = dataFimFormatted.toISOString().split('T')[0];

      logger.info('Consulting multiple PIX data by date range', { 
        dataInicio: dataInicioFormatted, 
        dataFim: dataFimFormattedStr 
      });

      const requestBody = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Financeiro',
            criteria: {
              expression: {
                '$and': [
                  { 'EMVPIX': { '$isNotNull': true } },
                  { 'EMVPIX': { '$ne': '' } },
                  { 'DTNEG': { '$gte': dataInicioFormatted } },
                  { 'DTNEG': { '$lte': dataFimFormattedStr } }
                ]
              }
            },
            fields: ['EMVPIX', 'NOSSONUMERO', 'NUNOTA', 'VLRDESDOB', 'DTNEG'],
            orderBy: [{ field: 'DTNEG', order: 'DESC' }],
            limit: 100
          }
        }
      };

      const response = await withTimeout(
        this.client.post('/gateway/v1/mge/service.sbr/CRUDServiceProvider.loadRecords', requestBody, {
          headers: {
            'Authorization': `Bearer ${config.sankhya.token}`,
            'AppKey': config.sankhya.apiKey,
            'Cookie': `JSESSIONID=${auth.jsessionid}${auth.jsessionid2 ? `; JSESSIONID2=${auth.jsessionid2}` : ''}`,
          },
        }),
        30000
      );

      const data: SankhyaQueryResponse = response.data;
      const pixDataList = data.responseBody?.entities || [];

      logger.info('Multiple PIX data consultation completed', { 
        found: pixDataList.length,
        dateRange: `${dataInicioFormatted} to ${dataFimFormattedStr}`
      });

      return pixDataList;

    } catch (error) {
      logger.error('Error consulting multiple PIX data', { error: (error as Error).message });
      throw new Error(`Failed to consult multiple PIX data: ${(error as Error).message}`);
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      logger.error('Sankhya connection test failed', { error: (error as Error).message });
      return false;
    }
  }
}