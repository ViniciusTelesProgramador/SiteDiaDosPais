import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { sendContribuicaoEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';
import { aindaNaoRevelada } from '@/lib/types';
import {
  MAX_CONTRIBUICOES,
  MAX_CONTRIBUICAO_TEXTO,
  MAX_NOME_CONTRIBUIDOR,
  MAX_RELACAO_CONTRIBUIDOR,
} from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Surpresa Coletiva (Fase 5): mensagens curtas de outras pessoas, enviadas
 * via /contribuir/[id] e revisadas pelo comprador na tela de sucesso.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Recurso indisponível em modo de simulação.' }, { status: 503 });
    }

    const body = await req.json();
    const paginaId = typeof body?.paginaId === 'string' ? body.paginaId.trim() : '';
    const nome = typeof body?.nome === 'string' ? body.nome.trim().slice(0, MAX_NOME_CONTRIBUIDOR) : '';
    const relacao =
      typeof body?.relacao === 'string' && body.relacao.trim()
        ? body.relacao.trim().slice(0, MAX_RELACAO_CONTRIBUIDOR)
        : null;
    const texto = typeof body?.texto === 'string' ? body.texto.trim().slice(0, MAX_CONTRIBUICAO_TEXTO) : '';

    if (!paginaId || !nome || !texto) {
      return NextResponse.json({ error: 'Preencha seu nome e a mensagem.' }, { status: 400 });
    }

    if (!rateLimit(`contribuir:${paginaId}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Calma! Muitas tentativas seguidas.' }, { status: 429 });
    }

    const { data: pagina, error: paginaError } = await supabaseAdmin
      .from('paginas')
      .select('id, pago, revelar_em, nome_destinatario, email_comprador')
      .eq('id', paginaId)
      .single();

    if (paginaError || !pagina || !pagina.pago) {
      return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    }

    if (!aindaNaoRevelada(pagina.revelar_em)) {
      return NextResponse.json(
        { error: 'Esse recurso não está disponível para esta página.' },
        { status: 400 }
      );
    }

    const { count } = await supabaseAdmin
      .from('contribuicoes')
      .select('id', { count: 'exact', head: true })
      .eq('pagina_id', paginaId);

    if ((count || 0) >= MAX_CONTRIBUICOES) {
      return NextResponse.json(
        { error: 'O número de participantes desta surpresa já está completo.' },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from('contribuicoes').insert({
      pagina_id: paginaId,
      nome,
      relacao,
      texto,
    });

    if (insertError) {
      console.error('[Contribuicoes] Erro ao inserir:', insertError);
      return NextResponse.json({ error: 'Erro ao salvar sua mensagem.' }, { status: 500 });
    }

    if (pagina.email_comprador) {
      await sendContribuicaoEmail(
        pagina.email_comprador,
        pagina.nome_destinatario || 'seu pai',
        nome,
        paginaId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Contribuicoes] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * Lista todas as contribuições (aprovadas e não) de uma página — usada só
 * pela tela de moderação do comprador em /preview/[id] (mesmo modelo de
 * segurança por UUID não-adivinhável já usado em /api/paginas/[id]).
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contribuicoes: [] });
  }

  const paginaId = req.nextUrl.searchParams.get('paginaId');
  if (!paginaId) {
    return NextResponse.json({ error: 'paginaId é obrigatório.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('contribuicoes')
    .select('id, nome, relacao, texto, aprovado, criado_em')
    .eq('pagina_id', paginaId)
    .order('criado_em', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar contribuições.' }, { status: 500 });
  }

  return NextResponse.json({ contribuicoes: data || [] });
}
