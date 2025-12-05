import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { retry, withTimeout } from '../utils/retry';

export interface MercosPedido {
  id: string;
  numero_pedido: string;
  cliente: {
    nome: string;
    id: string;
  };
  valor_total: number;
  status: string;
  observacoes: string;
  data_criacao: string;
  data_alteracao: string;
  nunota?: string; // Campo customizado para armazenar NUNOTA
}

export interface MercosTokenStatus {
  valid: boolean;
  expires_at?: string;
  company_name?: string;
}

export class MercosService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.mercos.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': config.mercos.appToken,
        'CompanyToken': config.mercos.companyToken,
      },
    });

    // Request interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Mercos Request', {
          method: config.method,
          url: config.url,
          headers: { ...config.headers, ApplicationToken: '[HIDDEN]', CompanyToken: '[HIDDEN]' },
        });
        return config;
      },
      (error) => {
        logger.error('Mercos Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor para logs
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Mercos Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('Mercos Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  public async verificarToken(): Promise<MercosTokenStatus> {
    try {
      logger.info('Verifying Mercos token');

      const response = await withTimeout(
        this.client.get('/v1/token_auth_status'),
        10000
      );

      const status: MercosTokenStatus = {
        valid: response.status === 200,
        expires_at: response.data.expires_at,
        company_name: response.data.company_name,
      };

      logger.info('Mercos token verification completed', { valid: status.valid });
      return status;

    } catch (error) {
      logger.error('Mercos token verification failed', { error: (error as Error).message });
      return { valid: false };
    }
  }

  public async buscarPedidosAtualizados(dataInicio: Date, limite: number = 50): Promise<MercosPedido[]> {
    try {
      const dataInicioISO = dataInicio.toISOString();
      logger.info('Fetching updated orders from Mercos', { 
        dataInicio: dataInicioISO, 
        limite 
      });

      const response = await withTimeout(
        this.client.get('/v2/pedidos', {
          params: {
            alterado_apos: dataInicioISO,
            limit: limite,
            offset: 0,
          },
        }),
        20000
      );

      const pedidos: MercosPedido[] = response.data.pedidos || [];

      // Extrair NUNOTA das observações se existir
      pedidos.forEach(pedido => {
        const nunotaMatch = pedido.observacoes?.match(/NUNOTA[:\s]*(\d+)/i);
        if (nunotaMatch) {
          pedido.nunota = nunotaMatch[1];
        }
      });

      logger.info('Mercos orders fetched successfully', { 
        count: pedidos.length,
        withNunota: pedidos.filter(p => p.nunota).length
      });

      return pedidos;

    } catch (error) {
      logger.error('Error fetching Mercos orders', { error: (error as Error).message });
      throw new Error(`Failed to fetch Mercos orders: ${(error as Error).message}`);
    }
  }

  public async buscarPedidoPorId(pedidoId: string): Promise<MercosPedido | null> {
    try {
      logger.info('Fetching order by ID', { pedidoId });

      const response = await withTimeout(
        this.client.get(`/v2/pedidos/${pedidoId}`),
        15000
      );

      const pedido: MercosPedido = response.data;

      // Extrair NUNOTA das observações se existir
      const nunotaMatch = pedido.observacoes?.match(/NUNOTA[:\s]*(\d+)/i);
      if (nunotaMatch) {
        pedido.nunota = nunotaMatch[1];
      }

      logger.info('Mercos order fetched successfully', { pedidoId, hasNunota: !!pedido.nunota });
      return pedido;

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Order not found', { pedidoId });
        return null;
      }

      logger.error('Error fetching Mercos order', { pedidoId, error: (error as Error).message });
      throw new Error(`Failed to fetch Mercos order ${pedidoId}: ${(error as Error).message}`);
    }
  }

  public async atualizarObservacoesPedido(pedidoId: string, qrCodePix: string, nunota?: string): Promise<boolean> {
    try {
      logger.info('Updating order observations with PIX data', { pedidoId, nunota });

      // Buscar pedido atual para preservar observações existentes
      const pedidoAtual = await this.buscarPedidoPorId(pedidoId);
      if (!pedidoAtual) {
        throw new Error(`Order ${pedidoId} not found`);
      }

      // Construir novas observações
      const timestamp = new Date().toLocaleString('pt-BR');
      const nunotaInfo = nunota ? `NUNOTA: ${nunota}\n` : '';
      const pixInfo = `=== DADOS PIX (Atualizado em ${timestamp}) ===\n${nunotaInfo}${qrCodePix}\n${'='.repeat(50)}`;

      // Remover dados PIX antigos se existirem
      let observacoesLimpas = pedidoAtual.observacoes || '';
      observacoesLimpas = observacoesLimpas.replace(/=== DADOS PIX.*?={50,}/gs, '').trim();

      // Adicionar novos dados PIX
      const novasObservacoes = observacoesLimpas 
        ? `${observacoesLimpas}\n\n${pixInfo}`
        : pixInfo;

      const response = await withTimeout(
        this.client.put(`/v2/pedidos/${pedidoId}`, {
          observacoes: novasObservacoes,
        }),
        15000
      );

      const sucesso = response.status === 200;
      
      if (sucesso) {
        logger.info('Order observations updated successfully', { 
          pedidoId, 
          nunota,
          observacoesLength: novasObservacoes.length
        });
      } else {
        logger.error('Failed to update order observations', { 
          pedidoId, 
          status: response.status 
        });
      }

      return sucesso;

    } catch (error) {
      logger.error('Error updating order observations', { 
        pedidoId, 
        nunota,
        error: (error as Error).message 
      });
      throw new Error(`Failed to update order ${pedidoId}: ${(error as Error).message}`);
    }
  }

  public async buscarPedidosPorNunota(nunota: string): Promise<MercosPedido[]> {
    try {
      logger.info('Searching orders by NUNOTA', { nunota });

      // Buscar por observações que contenham o NUNOTA
      const response = await withTimeout(
        this.client.get('/v2/pedidos', {
          params: {
            search: nunota,
            limit: 10,
          },
        }),
        15000
      );

      const todosPedidos: MercosPedido[] = response.data.pedidos || [];
      
      // Filtrar pedidos que realmente contêm o NUNOTA
      const pedidosFiltrados = todosPedidos.filter(pedido => {
        const nunotaMatch = pedido.observacoes?.match(/NUNOTA[:\s]*(\d+)/i);
        return nunotaMatch && nunotaMatch[1] === nunota;
      });

      logger.info('Orders found by NUNOTA', { 
        nunota, 
        totalFound: todosPedidos.length,
        filtered: pedidosFiltrados.length
      });

      return pedidosFiltrados;

    } catch (error) {
      logger.error('Error searching orders by NUNOTA', { nunota, error: (error as Error).message });
      throw new Error(`Failed to search orders by NUNOTA ${nunota}: ${(error as Error).message}`);
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const status = await this.verificarToken();
      return status.valid;
    } catch (error) {
      logger.error('Mercos connection test failed', { error: (error as Error).message });
      return false;
    }
  }
}