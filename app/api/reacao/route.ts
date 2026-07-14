import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { sendReactionEmail } from '@/lib/email';
import { EMOJIS_REACAO } from '@/lib/config';
import { aindaNaoRevelada } from '@/lib/types';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Reação do destinatário (RF16/T2.7): 1 toque, sem cadastro.
 * A PRIMEIRA reação dispara e-mail ao comprador; as seguintes só atualizam
 * o emoji. A reação nunca é exposta publicamente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : '';

    if (!slug || !EMOJIS_REACAO.includes(emoji)) {
      return NextResponse.json({ error: 'Reação inválida.' }, { status: 400 });
    }

    if (!rateLimit(`reacao:${slug}`, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Calma! Muitas reações seguidas.' }, { status: 429 });
    }

    if (!isSupabaseConfigured()) {
      // Modo de simulação local (dev): o client trata como sucesso
      return NextResponse.json({ ok: true, isMock: true });
    }

    const { data: pagina, error } = await supabaseAdmin
      .from('paginas')
      .select('id, slug, pago, revelar_em, reacao_em, email_comprador, nome_destinatario')
      .eq('slug', slug)
      .eq('pago', true)
      .single();

    if (error || !pagina) {
      return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    }

    // Só páginas já reveladas aceitam reação (T2.7)
    if (aindaNaoRevelada(pagina.revelar_em)) {
      return NextResponse.json({ error: 'Esta página ainda não foi revelada.' }, { status: 400 });
    }

    // Atualiza o emoji sempre
    await supabaseAdmin.from('paginas').update({ reacao_emoji: emoji }).eq('id', pagina.id);

    // Primeira reação: transição atômica (reacao_em ainda nulo) => e-mail único
    const { data: primeira } = await supabaseAdmin
      .from('paginas')
      .update({ reacao_em: new Date().toISOString() })
      .eq('id', pagina.id)
      .is('reacao_em', null)
      .select('id')
      .maybeSingle();

    if (primeira && pagina.email_comprador) {
      await sendReactionEmail(
        pagina.email_comprador,
        pagina.nome_destinatario || 'Seu pai',
        emoji,
        slug
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Reacao] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
