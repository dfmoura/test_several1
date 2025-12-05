import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuração Supabase:', {
  url: supabaseUrl ? 'Definida' : 'Não definida',
  key: supabaseKey ? 'Definida' : 'Não definida'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis Supabase não encontradas');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Presente' : 'Ausente');
  
  // Não quebrar a aplicação, apenas avisar
  console.warn('⚠️ Supabase não configurado, algumas funcionalidades podem não funcionar');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;
  
export default supabase;