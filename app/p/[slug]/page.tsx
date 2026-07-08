import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import PublicPageClient from './PublicPageClient';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;

  try {
    const { data } = await supabase
      .from('paginas')
      .select('nome_destinatario, midias')
      .eq('slug', slug)
      .single();

    if (data) {
      return {
        title: `Homenagem para ${data.nome_destinatario}`,
        description: `Veja a homenagem especial de Dia dos Pais preparada para ${data.nome_destinatario}.`,
        robots: {
          index: false,
          follow: false,
        },
        openGraph: {
          title: `Homenagem para ${data.nome_destinatario}`,
          description: `Uma surpresa especial de Dia dos Pais!`,
          images: data.midias && data.midias.length > 0 ? [{ url: data.midias[0] }] : [],
        },
      };
    }
  } catch {
    // Fail silently
  }

  return {
    title: 'Recado Surpresa',
    description: 'Homenagem especial de Dia dos Pais.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = params;

  let initialData = null;
  try {
    const { data } = await supabase
      .from('paginas')
      .select('*')
      .eq('slug', slug)
      .single();

    initialData = data;
  } catch {
    // Fail silently
  }

  return <PublicPageClient slug={slug} initialData={initialData} />;
}
