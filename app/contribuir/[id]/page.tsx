import { Metadata } from 'next';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { aindaNaoRevelada } from '@/lib/types';
import { Heart } from 'lucide-react';
import ContribuirClient from './ContribuirClient';

interface Props {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Participe de uma surpresa',
  robots: { index: false, follow: false },
};

function Indisponivel({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{titulo}</h2>
        <p className="text-gray-600 text-sm leading-relaxed">{texto}</p>
      </div>
    </div>
  );
}

/**
 * Convite para participar da Surpresa Coletiva (Fase 5): link privado que o
 * comprador compartilha com família depois de pagar. Nunca mostra conteúdo
 * da página em si — só pede uma mensagem curta.
 */
export default async function ContribuirPage({ params }: Props) {
  if (!isSupabaseConfigured()) {
    return (
      <Indisponivel
        titulo="Recurso indisponível"
        texto="Este link só funciona quando o site está com o banco de dados configurado."
      />
    );
  }

  const { data } = await supabaseAdmin
    .from('paginas')
    .select('id, nome_destinatario, pago, revelar_em')
    .eq('id', params.id)
    .single();

  if (!data || !data.pago) {
    return (
      <Indisponivel
        titulo="Link inválido"
        texto="Não encontramos essa surpresa. Confira o link que você recebeu."
      />
    );
  }

  if (!aindaNaoRevelada(data.revelar_em)) {
    return (
      <Indisponivel
        titulo="Prazo encerrado"
        texto="Essa surpresa já não está aceitando novas mensagens — ou a revelação não foi agendada."
      />
    );
  }

  return <ContribuirClient paginaId={data.id} nomeDestinatario={data.nome_destinatario} />;
}
