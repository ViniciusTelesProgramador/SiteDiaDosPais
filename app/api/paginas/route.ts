import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { isEmailValido, extrairYoutubeId } from '@/lib/utils';
import { MIN_BLOCOS, PERGUNTAS_GUIADAS, MAX_AUDIO_MB } from '@/lib/config';
import type { Bloco, Midia } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_FOTOS = 5;
const MAX_TAMANHO_FOTO = 5 * 1024 * 1024; // 5MB (entrada; o client comprime antes)

interface PayloadCriacao {
  email_comprador: string;
  nome_destinatario: string;
  mensagem?: string;
  blocos?: Bloco[];
  tema: string;
  revelar_em?: string | null;
  legendas?: string[];
  aceitou_termos?: boolean;
  musica_youtube_url?: string;
}

/**
 * Cria o rascunho da página + upload das fotos (T0.2/T1.1/T1.2).
 * Toda escrita passa por aqui com service role — a anon key não insere nada.
 * Recebe multipart/form-data: campo "payload" (JSON) + arquivos "foto_0".."foto_4".
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Banco de dados não configurado no servidor.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const payloadRaw = formData.get('payload');
    if (typeof payloadRaw !== 'string') {
      return NextResponse.json({ error: 'Payload ausente.' }, { status: 400 });
    }

    let payload: PayloadCriacao;
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    // ---- Validações (RF01) ----
    if (!payload.email_comprador || !isEmailValido(payload.email_comprador)) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }
    if (!payload.nome_destinatario?.trim()) {
      return NextResponse.json({ error: 'Informe o nome do seu pai.' }, { status: 400 });
    }
    if (!payload.aceitou_termos) {
      return NextResponse.json(
        { error: 'É necessário aceitar os termos de uso para continuar.' },
        { status: 400 }
      );
    }

    const perguntasValidas = new Set(PERGUNTAS_GUIADAS.map((p) => p.id));
    const blocos: Bloco[] = (payload.blocos || [])
      .filter(
        (b) =>
          b &&
          typeof b.texto === 'string' &&
          b.texto.trim().length > 0 &&
          perguntasValidas.has(b.pergunta_id)
      )
      .map((b) => {
        const pergunta = PERGUNTAS_GUIADAS.find((p) => p.id === b.pergunta_id)!;
        return {
          pergunta_id: b.pergunta_id,
          titulo: pergunta.titulo, // título canônico do servidor, não do client
          texto: b.texto.trim().slice(0, 1500),
        };
      });

    const mensagem = payload.mensagem?.trim().slice(0, 1500) || null;

    if (blocos.length < MIN_BLOCOS && !mensagem) {
      return NextResponse.json(
        { error: `Responda pelo menos ${MIN_BLOCOS} perguntas ou escreva a mensagem de fechamento.` },
        { status: 400 }
      );
    }

    const tema = payload.tema === 'descontraido' ? 'descontraido' : 'classico';

    let revelarEm: string | null = null;
    if (payload.revelar_em) {
      const data = new Date(payload.revelar_em);
      if (isNaN(data.getTime())) {
        return NextResponse.json({ error: 'Data de revelação inválida.' }, { status: 400 });
      }
      revelarEm = data.toISOString();
    }

    // ---- Fotos (RF09) ----
    const fotos: File[] = [];
    for (let i = 0; i < MAX_FOTOS; i++) {
      const f = formData.get(`foto_${i}`);
      if (f instanceof File && f.size > 0) fotos.push(f);
    }
    if (fotos.length === 0) {
      return NextResponse.json({ error: 'Envie pelo menos uma foto.' }, { status: 400 });
    }
    for (const foto of fotos) {
      if (!foto.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Apenas imagens são permitidas.' }, { status: 400 });
      }
      if (foto.size > MAX_TAMANHO_FOTO) {
        return NextResponse.json({ error: 'Cada foto deve ter no máximo 5MB.' }, { status: 400 });
      }
    }

    const musicaYoutubeId = payload.musica_youtube_url
      ? extrairYoutubeId(payload.musica_youtube_url)
      : null;

    // ---- Mensagem de voz (Fase 12, opcional — falha aqui nunca bloqueia a criação) ----
    const audio = formData.get('audio');
    const audioValido =
      audio instanceof File &&
      audio.size > 0 &&
      audio.type.startsWith('audio/') &&
      audio.size <= MAX_AUDIO_MB * 1024 * 1024;

    const legendas = Array.isArray(payload.legendas) ? payload.legendas : [];
    const pageId = crypto.randomUUID();

    // Rascunhos expiram em 7 dias (RNF04) — o cron usa este campo
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    // ---- Upload para o Storage (service role; upload anônimo é bloqueado) ----
    const midias: Midia[] = [];
    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i];
      const ext = foto.type === 'image/webp' ? 'webp' : foto.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `${pageId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('fotos')
        .upload(filePath, await foto.arrayBuffer(), {
          contentType: foto.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Paginas] Erro no upload:', uploadError);
        return NextResponse.json(
          { error: `Falha no upload da foto ${i + 1}. Tente novamente.` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePath);
      const legenda = typeof legendas[i] === 'string' ? legendas[i].trim().slice(0, 140) : '';
      midias.push(legenda ? { url: publicUrlData.publicUrl, legenda } : { url: publicUrlData.publicUrl });
    }

    // ---- Upload do áudio (opcional; falha aqui não bloqueia a criação) ----
    let audioUrl: string | null = null;
    if (audioValido && audio instanceof File) {
      const filePath = `${pageId}/${crypto.randomUUID()}.webm`;
      const { error: audioError } = await supabaseAdmin.storage
        .from('audios')
        .upload(filePath, await audio.arrayBuffer(), {
          contentType: audio.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (audioError) {
        console.error('[Paginas] Erro no upload do áudio (seguindo sem ele):', audioError);
      } else {
        const { data: publicUrlData } = supabaseAdmin.storage.from('audios').getPublicUrl(filePath);
        audioUrl = publicUrlData.publicUrl;
      }
    }

    // ---- Insere o rascunho ----
    const { error: dbError } = await supabaseAdmin.from('paginas').insert({
      id: pageId,
      email_comprador: payload.email_comprador.trim(),
      nome_destinatario: payload.nome_destinatario.trim().slice(0, 80),
      mensagem,
      blocos: blocos.length > 0 ? blocos : null,
      midias,
      tema,
      pago: false,
      plano: 'basico',
      revelar_em: revelarEm,
      expira_em: expiraEm.toISOString(),
      musica_youtube_id: musicaYoutubeId,
      audio_url: audioUrl,
    });

    if (dbError) {
      console.error('[Paginas] Erro ao inserir rascunho:', dbError);
      return NextResponse.json(
        { error: 'Erro ao salvar o presente. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: pageId });
  } catch (error: unknown) {
    console.error('[Paginas] Erro interno:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
