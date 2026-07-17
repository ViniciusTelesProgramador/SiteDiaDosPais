import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/** Alterna a aprovação de uma contribuição (moderação do comprador — Fase 5). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body?.aprovado !== 'boolean') {
    return NextResponse.json({ error: 'Campo "aprovado" é obrigatório.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('contribuicoes')
    .update({ aprovado: body.aprovado })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar contribuição.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
