import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { sendReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Lembrete pré-revelação (T2.8, visão §2 gatilho 2): páginas pagas com
 * revelar_em nas próximas 48h recebem exatamente 1 lembrete
 * (controle via lembrete_enviado_em — rodar 2x no dia não duplica).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 });
  }

  const agora = new Date();
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

  const { data: paginas, error } = await supabaseAdmin
    .from('paginas')
    .select('id, slug, email_comprador, nome_destinatario, revelar_em')
    .eq('pago', true)
    .is('lembrete_enviado_em', null)
    .gt('revelar_em', agora.toISOString())
    .lte('revelar_em', em48h.toISOString())
    .not('email_comprador', 'is', null)
    .not('slug', 'is', null)
    .limit(90); // margem no limite diário do Resend free (100/dia)

  if (error) {
    console.error('[Cron lembretes] Erro ao listar páginas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  for (const pagina of paginas || []) {
    // Marca ANTES de enviar (transição atômica): evita duplicata se o job
    // rodar em paralelo; um envio perdido é recuperável, um duplicado não.
    const { data: marcado } = await supabaseAdmin
      .from('paginas')
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq('id', pagina.id)
      .is('lembrete_enviado_em', null)
      .select('id')
      .maybeSingle();

    if (!marcado) continue;

    const ok = await sendReminderEmail(
      pagina.email_comprador!,
      pagina.nome_destinatario,
      pagina.slug!,
      pagina.revelar_em!
    );
    if (ok) enviados++;
  }

  console.log(`[Cron lembretes] ${enviados} lembretes enviados.`);
  return NextResponse.json({ ok: true, enviados });
}
