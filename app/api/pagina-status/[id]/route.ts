import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Status mínimo para o polling da tela de pagamento (T1.4).
 * Responde apenas { pago, slug } — não vaza e-mail nem conteúdo.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('paginas')
    .select('pago, slug')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({
    pago: data.pago,
    slug: data.pago ? data.slug : null,
  });
}
