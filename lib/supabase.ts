import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase com anon key — pode ser importado por client components.
 *
 * Com RLS habilitado (supabase/schema.sql), a anon key NÃO tem acesso a
 * nenhuma tabela: todas as leituras/escritas do app passam pelas rotas de
 * servidor com `lib/supabaseAdmin.ts`. Este client existe apenas para o
 * check de configuração no browser e para eventuais leituras públicas
 * liberadas por policy no futuro.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as credenciais públicas do Supabase estão configuradas (senão o app roda em modo de simulação local). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('your-project') &&
      supabaseAnonKey &&
      !supabaseAnonKey.includes('placeholder') &&
      !supabaseAnonKey.includes('your-')
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
