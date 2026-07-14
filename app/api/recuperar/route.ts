import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { sendConfirmationEmail } from '@/lib/email';
import { isEmailValido } from '@/lib/utils';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Reenvio de link (RF12/T1.5): o comprador informa o e-mail e recebe de novo
 * o e-mail de confirmação de cada página paga. A resposta é sempre genérica —
 * não revela se o e-mail existe na base.
 */
export async function POST(req: NextRequest) {
  const respostaGenerica = NextResponse.json({
    ok: true,
    message:
      'Se houver compras associadas a este e-mail, você receberá os links em instantes.',
  });

  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isEmailValido(email)) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    // Rate limit por IP e por e-mail (3/hora cada)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'desconhecido';
    const umaHora = 60 * 60 * 1000;
    if (!rateLimit(`recuperar:ip:${ip}`, 5, umaHora) || !rateLimit(`recuperar:email:${email}`, 3, umaHora)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde um pouco e tente novamente.' },
        { status: 429 }
      );
    }

    if (!isSupabaseConfigured()) {
      return respostaGenerica;
    }

    const { data: paginas, error } = await supabaseAdmin
      .from('paginas')
      .select('slug, nome_destinatario, revelar_em')
      .ilike('email_comprador', email)
      .eq('pago', true)
      .not('slug', 'is', null)
      .limit(10);

    if (error) {
      console.error('[Recuperar] Erro ao buscar páginas:', error);
      return respostaGenerica;
    }

    // Envio assíncrono na resposta genérica: quem chama não distingue nada
    for (const pagina of paginas || []) {
      await sendConfirmationEmail(email, pagina.nome_destinatario, pagina.slug!, {
        revelarEm: pagina.revelar_em,
      });
    }

    return respostaGenerica;
  } catch (error) {
    console.error('[Recuperar] Erro interno:', error);
    return respostaGenerica;
  }
}
