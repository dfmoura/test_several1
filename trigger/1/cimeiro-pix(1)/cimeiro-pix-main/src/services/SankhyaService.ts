import { supabase } from '../lib/supabase';

export interface SankhyaPixData {
  nunota: string;
  emvpix: string;
  valor: number;
  data_geracao: string;
  dhbaixa?: string;
  status_pix: 'ativo' | 'pago' | 'vencido';
}

export interface SankhyaAuth {
  jsessionid: string;
  jsessionid2?: string;
}

export interface SankhyaConfig {
  baseUrl: string;
  token: string;
  appKey: string;
  username: string;
  password: string;
}

export class SankhyaService {
  private config: SankhyaConfig;
  private auth: SankhyaAuth | null = null;
  private authExpiry: Date | null = null;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_SANKHYA_BASE_URL,
      token: import.meta.env.VITE_SANKHYA_API_TOKEN,
      appKey: import.meta.env.VITE_SANKHYA_APP_KEY,
      username: import.meta.env.VITE_SANKHYA_USERNAME,
      password: import.meta.env.VITE_SANKHYA_PASSWORD,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Testando conexão Sankhya Gateway API...');
      
      // Verificar se estamos em ambiente de desenvolvimento
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '';
      const response = await fetch(`${baseUrl}/.netlify/functions/sankhya-login`);
      const result = await response.json();
      
      if (this.supabase) {
        await this.logOperation('sankhya_connection_test', 'success', 'Conexão Sankhya testada com sucesso', {
          session_id: result.data?.session_id || 'Inválido',
          cookie: result.data?.cookie || 'N/A'
        });
      }

      return {
        success: result.success,
        message: result.message,
        data: result.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.supabase && await this.logOperation('sankhya_connection_test', 'error', 'Falha na conexão Sankhya Gateway API', {
        error: errorMessage
      });

      return {
        success: false,
        message: `Erro Gateway API: ${errorMessage}`
      };
    }
  }

  async getPixData(limit: number = 50, nunota?: string): Promise<{ success: boolean; pixData: SankhyaPixData[]; total: number; message?: string }> {
    try {
      console.log('🔄 Buscando dados PIX Sankhya Gateway API...');
      
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '';
      const response = await fetch(`${baseUrl}/.netlify/functions/sankhya-pix-data`);
      const result = await response.json();

      this.supabase && await this.logOperation('sankhya_get_pix', 'success', `${result.pixData?.length || 0} registros PIX recuperados do Sankhya Gateway API`, {
        records_count: result.pixData?.length || 0,
        nunota_filter: nunota,
        total_found: result.total || 0
      });

      return {
        success: result.success,
        pixData: result.pixData || [],
        total: result.total || 0,
        message: result.message
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.supabase && await this.logOperation('sankhya_get_pix', 'error', 'Erro ao buscar dados PIX Sankhya Gateway API', {
        error: errorMessage,
        nunota_filter: nunota
      });

      return {
        success: false,
        pixData: [],
        total: 0,
        message: errorMessage
      };
    }
  }

  private async authenticate(): Promise<SankhyaAuth> {
    try {
      const response = await fetch(`${this.config.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`,
          'AppKey': this.config.appKey,
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Autenticação falhou: ${response.status}`);
      }

      const data = await response.json();
      
      const auth: SankhyaAuth = {
        jsessionid: data.jsessionid,
        jsessionid2: data.jsessionid2,
      };

      this.auth = auth;
      this.authExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      return auth;

    } catch (error) {
      throw new Error(`Falha na autenticação Sankhya: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async ensureAuthenticated(): Promise<SankhyaAuth> {
    if (!this.auth || !this.authExpiry || new Date() >= this.authExpiry) {
      return await this.authenticate();
    }
    return this.auth;
  }

  private async logOperation(type: string, status: 'success' | 'error', message: string, data?: any) {
    try {
      if (!supabase) {
        console.log('Log (Supabase não disponível):', { type, status, message, data });
        return;
      }
      
      await supabase.from('integration_logs').insert([{
        type,
        message,
        data,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }
}