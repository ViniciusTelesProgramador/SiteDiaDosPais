import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase com service role key — USO EXCLUSIVO EM CÓDIGO DE SERVIDOR
 * (rotas de API e server components). O import de 'server-only' garante erro
 * de build se este módulo vazar para um client component.
 *
 * RLS está habilitado nas tabelas sem policies para anon: toda leitura e
 * escrita do app passa por aqui (RNF11).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('your-project') &&
      serviceRoleKey &&
      !serviceRoleKey.includes('your-')
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  serviceRoleKey || 'placeholder-service-role-key',
  { auth: { persistSession: false } }
);
