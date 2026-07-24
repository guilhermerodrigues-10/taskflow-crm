import { createClient } from '@supabase/supabase-js';

// Helper to safely access env vars in different environments (Vite, CRA, Browser)
const getEnv = (key: string) => {
  try {
    // Check for Vite
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
    // Check for Node/Webpack/CRA
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    console.warn('Error reading environment variable', e);
  }
  return undefined;
};

// Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu .env (veja .env.example).
// Não há credenciais padrão de propósito: sem elas configuradas, o app não deve
// conseguir se conectar a nenhum banco por acidente.
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || '';

// Verifica se as chaves estão presentes (sempre estarão true devido aos padrões acima)
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'undefined';

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Key missing.');
}

// Inicializa o cliente diretamente com suas credenciais
export const supabase = createClient(supabaseUrl, supabaseAnonKey);