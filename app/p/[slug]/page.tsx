import { Metadata } from 'next';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { aindaNaoRevelada } from '@/lib/types';
import { APP_NAME } from '@/lib/config';
import PublicPageClient, { type DadosPublicos } from './PublicPageClient';
import CountdownReveal from '@/components/CountdownReveal';

interface Props {
  params: { slug: string };
}

// A virada da revelação depende do relógio: nunca cachear esta rota (T2.1)
export const dynamic = 'force-dynamic';

/**
 * Open Graph GENÉRICO (RF10/T2.4): nunca expõe nome, mensagem ou fotos —
 * não estraga a surpresa nem vaza conteúdo pessoal em preview de link.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Alguém preparou uma surpresa para você ❤️`,
    description: `Toque para abrir o seu presente — ${APP_NAME}.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: 'Alguém preparou uma surpresa para você ❤️',
      description: `Toque para abrir o seu presente — ${APP_NAME}.`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = params;

  if (!isSupabaseConfigured()) {
    // Modo de simulação local: o client busca no IndexedDB
    return <PublicPageClient slug={slug} initialData={null} />;
  }

  const { data } = await supabaseAdmin
    .from('paginas')
    .select(
      'slug, nome_destinatario, mensagem, blocos, midias, tema, revelar_em, visualizacoes'
    )
    .eq('slug', slug)
    .eq('pago', true)
    .single();

  if (!data) {
    return <PublicPageClient slug={slug} initialData={null} naoEncontrada />;
  }

  // ------------------------------------------------------------------
  // GATE NO SERVIDOR (T2.1): antes de revelar_em, o conteúdo NÃO sai do
  // servidor — nem no HTML, nem em props serializadas. Só nome + data.
  // ------------------------------------------------------------------
  if (aindaNaoRevelada(data.revelar_em)) {
    return (
      <CountdownReveal
        nomeDestinatario={data.nome_destinatario}
        revelarEm={data.revelar_em!}
        tema={data.tema}
      />
    );
  }

  // Contador de visualizações atômico (T2.3) — fire-and-forget
  supabaseAdmin
    .rpc('incrementar_visualizacao', { p_slug: slug })
    .then(({ error }: { error: unknown }) => {
      if (error) console.error('[Views] Erro ao incrementar visualização:', error);
    });

  const dadosPublicos: DadosPublicos = {
    slug,
    nome_destinatario: data.nome_destinatario,
    mensagem: data.mensagem,
    blocos: data.blocos,
    midias: data.midias,
    tema: data.tema,
  };

  return <PublicPageClient slug={slug} initialData={dadosPublicos} />;
}
