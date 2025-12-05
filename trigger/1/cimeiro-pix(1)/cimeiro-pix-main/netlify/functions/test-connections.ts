import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_DATABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SANKHYA_CONFIG = {
  baseUrl: process.env.SANKHYA_BASE_URL,
  token: process.env.SANKHYA_API_TOKEN,
  appKey: process.env.SANKHYA_APP_KEY,
  username: process.env.SANKHYA_USERNAME,
  password: process.env.SANKHYA_PASSWORD,
};

const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL,
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

async function testSankhya(): Promise<boolean> {
  try {
    const response = await fetch(`${SANKHYA_CONFIG.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SANKHYA_CONFIG.token}`,
        'AppKey': SANKHYA_CONFIG.appKey,
      },
      body: JSON.stringify({
        username: SANKHYA_CONFIG.username,
        password: SANKHYA_CONFIG.password,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function testMercos(): Promise<boolean> {
  try {
    // Primeiro validar o token
    const tokenResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/token_auth_status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    if (!tokenResponse.ok) {
      return false;
    }

    // Se token válido, testar busca de pedidos
    const ordersResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/orders?limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    return ordersResponse.ok;
  } catch {
    return false;
  }
}

async function testSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sync_logs').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const [sankhyaStatus, mercosStatus, supabaseStatus] = await Promise.all([
      testSankhya(),
      testMercos(),
      testSupabase(),
    ]);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        sankhya: sankhyaStatus,
        mercos: mercosStatus,
        supabase: supabaseStatus,
      }),
    };
  } catch (error) {
    console.error('Connection tests failed:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Connection tests failed',
        sankhya: false,
        mercos: false,
        supabase: false,
      }),
    };
  }
};