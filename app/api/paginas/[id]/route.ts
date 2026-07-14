import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Leitura do rascunho/página para a tela de preview (T0.2).
 * O acesso é protegido pela imprevisibilidade do UUID (mesmo modelo do link
 * de preview atual); a anon key não lê a tabela diretamente (RLS).
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
    .select(
      'id, slug, email_comprador, nome_destinatario, mensagem, blocos, midias, tema, plano, pago, revelar_em, reacao_emoji, reacao_texto, criado_em'
    )
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
  }

  // O slug só é exposto após o pagamento (RF04)
  if (!data.pago) data.slug = null;

  return NextResponse.json(data);
}
