import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check Netlify config.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações das APIs
export const SANKHYA_CONFIG = {
  baseUrl: process.env.SANKHYA_BASE_URL,
  token: process.env.SANKHYA_API_TOKEN,
  appKey: process.env.SANKHYA_APP_KEY,
  username: process.env.SANKHYA_USERNAME,
  password: process.env.SANKHYA_PASSWORD,
};

export const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL,
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

export interface IntegrationLog {
  type: string;
  message: string;
  data?: any;
  summary?: any;
  details?: any;
  error?: string;
  execution_time_ms?: number;
  sankhya_records?: number;
}

export async function logIntegration(log: IntegrationLog) {
  try {
    const { error } = await supabase
      .from('integration_logs')
      .insert([{
        ...log,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);
    
    if (error) {
      console.error('Erro ao salvar log:', error);
    }
  } catch (err) {
    console.error('Erro ao conectar com Supabase:', err);
  }
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

export async function authenticateSankhya() {
  const response = await fetch(`${SANKHYA_CONFIG.baseUrl}/mge/service.sbr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AppKey': SANKHYA_CONFIG.appKey,
    },
    body: JSON.stringify({
      serviceName: 'MobileLoginSP.login',
      requestBody: {
        NOMUSU: SANKHYA_CONFIG.username,
        INTERNO: SANKHYA_CONFIG.password,
        KEEPCONNECTED: 'S',
        AUTHKEY: SANKHYA_CONFIG.token
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sankhya auth failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    jsessionid: data.responseBody?.jsessionid,
    jsessionid2: data.responseBody?.jsessionid2,
    cookie: data.responseBody?.cookie,
  };
}