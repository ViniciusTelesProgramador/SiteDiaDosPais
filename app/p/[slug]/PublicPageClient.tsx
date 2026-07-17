'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Heart, Share2, Check } from 'lucide-react';
import { getDraftBySlugFromIndexedDB } from '@/lib/localDatabase';
import {
  normalizarMidias,
  normalizarTema,
  aindaNaoRevelada,
  type Bloco,
  type Midia,
  type Contribuicao,
} from '@/lib/types';
import { EMOJIS_REACAO } from '@/lib/config';
import { track } from '@/lib/analytics';
import PageRenderer from '@/components/PageRenderer';
import CountdownReveal from '@/components/CountdownReveal';

/**
 * Página pública do destinatário: cerimônia de abertura (T2.1, visão §5,
 * camada intermediária), conteúdo, reação de volta (T2.7) e compartilhar.
 *
 * O gate da revelação agendada é feito NO SERVIDOR (page.tsx) — este
 * componente só recebe o conteúdo quando ele já pode ser mostrado.
 * A exceção é o modo de simulação local (dev, IndexedDB), onde o gate
 * roda no client mesmo.
 */

export interface DadosPublicos {
  slug: string;
  nome_destinatario: string;
  mensagem?: string | null;
  blocos?: Bloco[] | null;
  midias: Array<Midia | string>;
  tema: string;
  revelar_em?: string | null;
  isMock?: boolean;
  /** Mensagens aprovadas de outras pessoas (Fase 5 — Surpresa Coletiva). */
  contribuicoes?: Contribuicao[];
  /** ID do vídeo do YouTube (Fase 6) — null/undefined = sem música. */
  musica_youtube_id?: string | null;
}

interface PublicPageClientProps {
  slug: string;
  initialData: DadosPublicos | null;
  naoEncontrada?: boolean;
}

type FaseCerimonia = 'convite' | 'nome' | 'conteudo';

export default function PublicPageClient({
  slug,
  initialData,
  naoEncontrada,
}: PublicPageClientProps) {
  const [data, setData] = useState<DadosPublicos | null>(initialData);
  const [loading, setLoading] = useState(!initialData && !naoEncontrada);
  const [error, setError] = useState<string | null>(null);

  // Cerimônia de abertura (T2.1)
  const [fase, setFase] = useState<FaseCerimonia>('convite');
  const [conteudoVisivel, setConteudoVisivel] = useState(false);

  // Reação (T2.7/Fase 4): emoji de 1 toque + texto livre opcional depois
  const [reacaoEnviada, setReacaoEnviada] = useState<string | null>(null);
  const [reacaoLoading, setReacaoLoading] = useState(false);
  const [reacaoTexto, setReacaoTexto] = useState('');
  const [textoEnviado, setTextoEnviado] = useState(false);
  const [textoDispensado, setTextoDispensado] = useState(false);
  const [textoLoading, setTextoLoading] = useState(false);

  // Compartilhar (T2.4)
  const [compartilhado, setCompartilhado] = useState(false);

  // Fallback do modo de simulação local (dev)
  useEffect(() => {
    if (initialData || naoEncontrada) return;

    const fetchLocalData = async () => {
      try {
        const foundDraft = await getDraftBySlugFromIndexedDB(slug);
        if (foundDraft) {
          setData({
            slug,
            nome_destinatario: foundDraft.nome_destinatario,
            mensagem: foundDraft.mensagem,
            blocos: foundDraft.blocos,
            midias: foundDraft.midias,
            tema: foundDraft.tema,
            revelar_em: foundDraft.revelar_em,
            musica_youtube_id: foundDraft.musica_youtube_id,
            isMock: true,
          });
        } else {
          setError('Esta página ainda não foi ativada ou não existe.');
        }
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao carregar o recado.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocalData();
  }, [slug, initialData, naoEncontrada]);

  const abrirPresente = () => {
    // Cerimônia: toque -> nome sozinho por ~1.8s -> conteúdo com fade
    setFase('nome');
    setTimeout(() => {
      setFase('conteudo');
      // pequeno atraso para o fade-in do conteúdo
      setTimeout(() => setConteudoVisivel(true), 60);
    }, 1800);
  };

  const enviarReacao = async (emoji: string) => {
    if (reacaoLoading || reacaoEnviada) return;
    setReacaoLoading(true);
    try {
      if (data?.isMock) {
        setReacaoEnviada(emoji);
        return;
      }
      const response = await fetch('/api/reacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, emoji }),
      });
      if (response.ok) {
        setReacaoEnviada(emoji);
        track('reagiu');
      }
    } catch (err) {
      console.error('Erro ao enviar reação:', err);
    } finally {
      setReacaoLoading(false);
    }
  };

  const enviarTextoReacao = async () => {
    const texto = reacaoTexto.trim();
    if (!texto || textoLoading || !reacaoEnviada) return;
    setTextoLoading(true);
    try {
      if (data?.isMock) {
        setTextoEnviado(true);
        return;
      }
      const response = await fetch('/api/reacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, emoji: reacaoEnviada, texto }),
      });
      if (response.ok) {
        setTextoEnviado(true);
        track('reagiu_texto');
      }
    } catch (err) {
      console.error('Erro ao enviar texto da reação:', err);
    } finally {
      setTextoLoading(false);
    }
  };

  const compartilhar = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    track('compartilhou');
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Recebi uma surpresa ❤️',
          text: 'Olha o presente que prepararam pra mim:',
          url,
        });
        setCompartilhado(true);
        return;
      }
    } catch {
      // usuário cancelou o share nativo — segue para o fallback? não: só sai
      return;
    }
    // Fallback: WhatsApp
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Recebi uma surpresa ❤️ ${url}`)}`,
      '_blank',
      'noopener'
    );
    setCompartilhado(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Abrindo...</p>
        </div>
      </div>
    );
  }

  if (error || naoEncontrada || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Página não encontrada</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {error ||
              'O link acessado é inválido ou a página correspondente ainda não foi liberada por pagamento.'}
          </p>
          <div className="text-xs text-gray-400">
            Dica: se você acabou de pagar, aguarde alguns segundos e atualize a página.
          </div>
        </div>
      </div>
    );
  }

  // Modo de simulação local: gate da revelação no client (dev apenas)
  if (data.isMock && aindaNaoRevelada(data.revelar_em)) {
    return (
      <CountdownReveal
        nomeDestinatario={data.nome_destinatario}
        revelarEm={data.revelar_em!}
        tema={data.tema}
      />
    );
  }

  const classico = normalizarTema(data.tema) !== 'descontraido';
  const fundo = classico
    ? 'bg-[#F4F1EA] text-[#2C2A27] font-serif'
    : 'bg-gradient-to-tr from-[#E6F4F1] via-[#F3FAFB] to-[#FDF6E2] text-[#1E302E] font-sans';

  // ----------------------------------------------------
  // CERIMÔNIA — convite: "toque para abrir o presente"
  // ----------------------------------------------------
  if (fase === 'convite') {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${fundo}`}>
        <button
          onClick={abrirPresente}
          className="text-center space-y-8 py-16 max-w-sm mx-auto group cursor-pointer"
        >
          <div
            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl transition-transform duration-500 group-hover:scale-105 group-active:scale-95 shadow-lg ${
              classico ? 'bg-[#FAF8F5] border border-[#D1C9BA]' : 'bg-white border border-teal-100'
            }`}
          >
            🎁
          </div>
          <div className="space-y-3">
            <h1
              className={`text-2xl sm:text-3xl leading-snug ${
                classico ? 'font-normal' : 'font-extrabold text-teal-950'
              }`}
            >
              Isso aqui foi feito pra você. Só pra você.
            </h1>
            <p
              className={`text-sm tracking-wide ${
                classico ? 'text-[#8C7A5C] uppercase tracking-widest' : 'text-teal-700/70 font-bold uppercase'
              }`}
            >
              Toque para abrir
            </p>
          </div>
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // CERIMÔNIA — nome sozinho por ~1.8s (reconhecimento pessoal)
  // ----------------------------------------------------
  if (fase === 'nome') {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${fundo}`}>
        <div className="text-center animate-fadeIn">
          <div
            className={`text-sm tracking-widest uppercase mb-4 ${
              classico ? 'text-[#8C7A5C]' : 'text-emerald-700/70 font-bold'
            }`}
          >
            Para você,
          </div>
          <h1
            className={`text-4xl sm:text-5xl leading-tight ${
              classico ? 'font-normal text-[#1A1817]' : 'font-black text-teal-950'
            }`}
          >
            {data.nome_destinatario}
          </h1>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CONTEÚDO — com transição suave de entrada
  // ----------------------------------------------------
  return (
    <div className={`min-h-screen pb-24 ${fundo}`}>
      <div
        className={`max-w-xl mx-auto px-4 pt-10 transition-all duration-1000 ease-out ${
          conteudoVisivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <PageRenderer
          conteudo={{
            nome_destinatario: data.nome_destinatario,
            mensagem: data.mensagem,
            blocos: data.blocos,
            midias: normalizarMidias(data.midias),
            tema: normalizarTema(data.tema),
            contribuicoes: data.contribuicoes,
            musicaYoutubeId: data.musica_youtube_id,
          }}
        />

        {/* Reação de volta (T2.7) — discreta, canal privado para quem criou */}
        <div
          className={`mt-8 rounded-3xl border p-6 text-center ${
            classico ? 'bg-[#FAF8F5] border-[#E5E0D5]' : 'bg-white/80 border-teal-100'
          }`}
        >
          {!reacaoEnviada ? (
            /* Passo 1: emoji de 1 toque (fricção zero) */
            <div className="space-y-4">
              <p className={`text-sm ${classico ? 'text-[#6B5D45]' : 'text-teal-800/80 font-medium'}`}>
                Quem fez isso pra você está esperando pra saber se chegou. Um toque basta.
              </p>
              <div className="flex justify-center gap-3">
                {EMOJIS_REACAO.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => enviarReacao(emoji)}
                    disabled={reacaoLoading}
                    className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 ${
                      classico
                        ? 'bg-white border border-[#E5E0D5]'
                        : 'bg-teal-50 border border-teal-100'
                    }`}
                    aria-label={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : textoEnviado || textoDispensado ? (
            /* Passo 3: confirmação final */
            <div className="space-y-1">
              <div className="text-3xl">{reacaoEnviada}</div>
              <p className={`text-sm ${classico ? 'text-[#6B5D45] italic' : 'text-teal-800 font-medium'}`}>
                Chegou. Pode deixar que a gente conta.
              </p>
            </div>
          ) : (
            /* Passo 2: o toque já valeu — o texto é bônus opcional */
            <div className="space-y-4">
              <div className="text-4xl">{reacaoEnviada}</div>
              <p className={`text-sm ${classico ? 'text-[#6B5D45]' : 'text-teal-800/80 font-medium'}`}>
                Quer dizer com as suas palavras? Pode ser curtinho.
              </p>
              <textarea
                value={reacaoTexto}
                onChange={(e) => setReacaoTexto(e.target.value)}
                placeholder="Escreve do seu jeito."
                rows={2}
                maxLength={280}
                className={`w-full px-4 py-3 rounded-2xl text-base outline-none resize-none transition-all ${
                  classico
                    ? 'bg-white border border-[#E5E0D5] text-[#2C2A27] focus:border-[#8C7A5C] placeholder:text-[#B5A88F]'
                    : 'bg-white border border-teal-100 text-teal-950 focus:border-teal-400 placeholder:text-teal-700/40'
                }`}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={enviarTextoReacao}
                  disabled={textoLoading || !reacaoTexto.trim()}
                  className={`w-full py-3 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                    classico ? 'bg-[#2C2A27] text-[#FAF8F5]' : 'bg-teal-900 text-white'
                  }`}
                >
                  {textoLoading ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  onClick={() => setTextoDispensado(true)}
                  className={`text-xs transition-colors ${
                    classico
                      ? 'text-[#8C7A5C] hover:text-[#6B5D45]'
                      : 'text-teal-700/60 hover:text-teal-800 font-medium'
                  }`}
                >
                  Só o {reacaoEnviada} já diz tudo →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compartilhar (T2.4) */}
        <div className="mt-6 text-center">
          <button
            onClick={compartilhar}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
              classico
                ? 'bg-[#2C2A27] text-[#FAF8F5]'
                : 'bg-teal-900 text-white'
            }`}
          >
            {compartilhado ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{compartilhado ? 'Compartilhado!' : 'Compartilhar essa surpresa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
