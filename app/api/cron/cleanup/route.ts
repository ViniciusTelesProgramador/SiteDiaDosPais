import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { normalizarMidias } from '@/lib/types';
import { RETENCAO_RASCUNHO_DIAS } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Limpeza diária de rascunhos (RNF04/T3.2): apaga rascunhos não pagos com
 * mais de 7 dias, incluindo as fotos no Storage. Páginas pagas jamais são
 * tocadas (filtro `pago = false` explícito).
 *
 * Protegida por CRON_SECRET (o Vercel Cron envia `Authorization: Bearer <secret>`).
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

  const limite = new Date();
  limite.setDate(limite.getDate() - RETENCAO_RASCUNHO_DIAS);

  const { data: rascunhos, error } = await supabaseAdmin
    .from('paginas')
    .select('id, midias')
    .eq('pago', false)
    .lt('criado_em', limite.toISOString())
    .limit(200);

  if (error) {
    console.error('[Cron cleanup] Erro ao listar rascunhos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let paginasRemovidas = 0;
  let arquivosRemovidos = 0;

  for (const rascunho of rascunhos || []) {
    // Remove os arquivos do Storage (caminho = tudo após /object/public/fotos/)
    const caminhos = normalizarMidias(rascunho.midias)
      .map((m) => {
        const marcador = '/object/public/fotos/';
        const idx = m.url.indexOf(marcador);
        return idx >= 0 ? decodeURIComponent(m.url.slice(idx + marcador.length)) : null;
      })
      .filter((c): c is string => Boolean(c));

    if (caminhos.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from('fotos').remove(caminhos);
      if (storageError) {
        console.error(`[Cron cleanup] Erro ao remover fotos de ${rascunho.id}:`, storageError);
        // segue mesmo assim — a linha do banco é o registro LGPD principal
      } else {
        arquivosRemovidos += caminhos.length;
      }
    }

    // pagamentos associados caem via ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin
      .from('paginas')
      .delete()
      .eq('id', rascunho.id)
      .eq('pago', false); // salvaguarda extra: jamais apagar página paga

    if (deleteError) {
      console.error(`[Cron cleanup] Erro ao apagar rascunho ${rascunho.id}:`, deleteError);
    } else {
      paginasRemovidas++;
    }
  }

  console.log(
    `[Cron cleanup] ${paginasRemovidas} rascunhos e ${arquivosRemovidos} arquivos removidos.`
  );
  return NextResponse.json({ ok: true, paginasRemovidas, arquivosRemovidos });
}
