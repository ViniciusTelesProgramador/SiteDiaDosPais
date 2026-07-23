import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { isEmailValido, extrairYoutubeId, extensaoParaMime } from '@/lib/utils';
import { MIN_BLOCOS, PERGUNTAS_GUIADAS, MAX_AUDIO_MB, MAX_VIDEO_MB } from '@/lib/config';
import type { Bloco, Midia } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_FOTOS = 5;
const MAX_TAMANHO_FOTO = 5 * 1024 * 1024; // 5MB (entrada; o client comprime antes)

interface PayloadEdicao {
  email_comprador: string;
  nome_destinatario: string;
  mensagem?: string;
  blocos?: Bloco[];
  tema: string;
  revelar_em?: string | null;
  legendas?: string[];
  anos?: string[];
  aceitou_termos?: boolean;
  musica_youtube_url?: string;
  midias_existentes?: Array<{ url: string; legenda?: string; ano?: string }>;
  manter_audio_url?: string | null;
  manter_video_url?: string | null;
}

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
      'id, slug, email_comprador, nome_destinatario, mensagem, blocos, midias, tema, plano, pago, revelar_em, reacao_emoji, reacao_texto, musica_youtube_id, audio_url, video_url, visualizacoes, criado_em'
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

/**
 * Edita um rascunho existente ("Editar conteúdo" na prévia) — atualiza a
 * mesma página em vez de criar uma nova. Só permitido enquanto pago=false;
 * depois do pagamento, editar deixa de fazer sentido (a página já foi
 * entregue). Espelha a validação/upload de POST /api/paginas, mas fotos já
 * enviadas chegam como midias_existentes (mantidas sem novo upload) e
 * áudio/vídeo são mantidos via manter_audio_url/manter_video_url quando o
 * comprador não regravou.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Banco de dados não configurado no servidor.' },
        { status: 503 }
      );
    }

    const { data: existente, error: buscaError } = await supabaseAdmin
      .from('paginas')
      .select('id, pago')
      .eq('id', params.id)
      .single();

    if (buscaError || !existente) {
      return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    }
    if (existente.pago) {
      return NextResponse.json(
        { error: 'Não é possível editar depois do pagamento.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const payloadRaw = formData.get('payload');
    if (typeof payloadRaw !== 'string') {
      return NextResponse.json({ error: 'Payload ausente.' }, { status: 400 });
    }

    let payload: PayloadEdicao;
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

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
          titulo: pergunta.titulo,
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

    const musicaYoutubeId = payload.musica_youtube_url
      ? extrairYoutubeId(payload.musica_youtube_url)
      : null;

    // ---- Fotos existentes (mantidas, sem novo upload) ----
    const midiasExistentes: Midia[] = Array.isArray(payload.midias_existentes)
      ? payload.midias_existentes
          .filter((m) => m && typeof m.url === 'string')
          .map((m) => {
            const midia: Midia = { url: m.url };
            if (typeof m.legenda === 'string' && m.legenda.trim()) {
              midia.legenda = m.legenda.trim().slice(0, 140);
            }
            if (typeof m.ano === 'string' && /^\d{4}$/.test(m.ano.trim())) {
              midia.ano = m.ano.trim();
            }
            return midia;
          })
      : [];

    // ---- Fotos novas (upload) ----
    const fotosNovas: File[] = [];
    for (let i = 0; i < MAX_FOTOS; i++) {
      const f = formData.get(`foto_${i}`);
      if (f instanceof File && f.size > 0) fotosNovas.push(f);
    }

    if (midiasExistentes.length + fotosNovas.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos uma foto.' }, { status: 400 });
    }
    if (midiasExistentes.length + fotosNovas.length > MAX_FOTOS) {
      return NextResponse.json({ error: `No máximo ${MAX_FOTOS} fotos.` }, { status: 400 });
    }
    for (const foto of fotosNovas) {
      if (!foto.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Apenas imagens são permitidas.' }, { status: 400 });
      }
      if (foto.size > MAX_TAMANHO_FOTO) {
        return NextResponse.json({ error: 'Cada foto deve ter no máximo 5MB.' }, { status: 400 });
      }
    }

    const legendas = Array.isArray(payload.legendas) ? payload.legendas : [];
    const anos = Array.isArray(payload.anos) ? payload.anos : [];

    const midiasNovas: Midia[] = [];
    for (let i = 0; i < fotosNovas.length; i++) {
      const foto = fotosNovas[i];
      const ext = foto.type === 'image/webp' ? 'webp' : foto.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `${params.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('fotos')
        .upload(filePath, await foto.arrayBuffer(), {
          contentType: foto.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Paginas][PATCH] Erro no upload:', uploadError);
        return NextResponse.json(
          { error: `Falha no upload da foto ${i + 1}. Tente novamente.` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePath);
      const legenda = typeof legendas[i] === 'string' ? legendas[i].trim().slice(0, 140) : '';
      const anoBruto = typeof anos[i] === 'string' ? anos[i].trim().slice(0, 4) : '';
      const ano = /^\d{4}$/.test(anoBruto) ? anoBruto : '';

      const midia: Midia = { url: publicUrlData.publicUrl };
      if (legenda) midia.legenda = legenda;
      if (ano) midia.ano = ano;
      midiasNovas.push(midia);
    }

    const midias = [...midiasExistentes, ...midiasNovas];

    // ---- Áudio/vídeo: mantém o anterior, substitui por um novo, ou remove ----
    const audio = formData.get('audio');
    const audioValido =
      audio instanceof File &&
      audio.size > 0 &&
      audio.type.startsWith('audio/') &&
      audio.size <= MAX_AUDIO_MB * 1024 * 1024;

    const video = formData.get('video');
    const videoValido =
      video instanceof File &&
      video.size > 0 &&
      video.type.startsWith('video/') &&
      video.size <= MAX_VIDEO_MB * 1024 * 1024;

    let audioUrl: string | null =
      typeof payload.manter_audio_url === 'string' ? payload.manter_audio_url : null;
    if (audioValido && audio instanceof File) {
      const filePath = `${params.id}/${crypto.randomUUID()}.${extensaoParaMime(audio.type)}`;
      const { error: audioError } = await supabaseAdmin.storage
        .from('audios')
        .upload(filePath, await audio.arrayBuffer(), {
          contentType: audio.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (audioError) {
        console.error('[Paginas][PATCH] Erro no upload do áudio (mantendo o anterior):', audioError);
      } else {
        const { data: publicUrlData } = supabaseAdmin.storage.from('audios').getPublicUrl(filePath);
        audioUrl = publicUrlData.publicUrl;
      }
    }

    let videoUrl: string | null =
      typeof payload.manter_video_url === 'string' ? payload.manter_video_url : null;
    if (videoValido && video instanceof File) {
      const filePath = `${params.id}/${crypto.randomUUID()}.${extensaoParaMime(video.type)}`;
      const { error: videoError } = await supabaseAdmin.storage
        .from('videos')
        .upload(filePath, await video.arrayBuffer(), {
          contentType: video.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (videoError) {
        console.error('[Paginas][PATCH] Erro no upload do vídeo (mantendo o anterior):', videoError);
      } else {
        const { data: publicUrlData } = supabaseAdmin.storage.from('videos').getPublicUrl(filePath);
        videoUrl = publicUrlData.publicUrl;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('paginas')
      .update({
        email_comprador: payload.email_comprador.trim(),
        nome_destinatario: payload.nome_destinatario.trim().slice(0, 80),
        mensagem,
        blocos: blocos.length > 0 ? blocos : null,
        midias,
        tema,
        revelar_em: revelarEm,
        musica_youtube_id: musicaYoutubeId,
        audio_url: audioUrl,
        video_url: videoUrl,
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('[Paginas][PATCH] Erro ao atualizar rascunho:', updateError);
      return NextResponse.json(
        { error: 'Erro ao salvar as alterações. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: params.id });
  } catch (error: unknown) {
    console.error('[Paginas][PATCH] Erro interno:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
