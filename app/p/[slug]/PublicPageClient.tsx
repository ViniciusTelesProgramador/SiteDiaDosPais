'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Heart, Music, Sparkles } from 'lucide-react';
import { getDraftBySlugFromIndexedDB } from '@/lib/localDatabase';

interface PageData {
  id: string;
  nome_destinatario: string;
  mensagem: string;
  midias: string[];
  tema: string;
  pago: boolean;
  plano: string;
  slug?: string;
  isMock?: boolean;
}

interface PublicPageClientProps {
  slug: string;
  initialData: PageData | null;
}

export default function PublicPageClient({ slug, initialData }: PublicPageClientProps) {
  const [data, setData] = useState<PageData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have initialData from server, do nothing
    if (initialData) return;

    // Check IndexedDB fallback for simulation mode
    const fetchLocalData = async () => {
      try {
        const foundDraft = await getDraftBySlugFromIndexedDB(slug);
        if (foundDraft) {
          setData(foundDraft);
        } else {
          setError('Esta homenagem ainda não foi ativada ou não existe.');
        }
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao carregar o recado.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocalData();
  }, [slug, initialData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Abrindo homenagem...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Homenagem não encontrada</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {error || 'O link acessado é inválido ou a homenagem correspondente ainda não foi liberada por pagamento.'}
          </p>
          <div className="text-xs text-gray-400">
            Dica: Se você acabou de pagar, aguarde alguns segundos e atualize a página.
          </div>
        </div>
      </div>
    );
  }

  const isClassico = data.tema === 'classico';

  return (
    <div className={`min-h-screen pb-24 ${
      isClassico 
        ? 'bg-[#F4F1EA] text-[#2C2A27] font-serif transition-colors duration-500' 
        : 'bg-gradient-to-tr from-[#E6F4F1] via-[#F3FAFB] to-[#FDF6E2] text-[#1E302E] font-sans transition-colors duration-500'
    }`}>
      {/* Floating Sparkles & Hearts (Decorative Animation) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[10%] left-[5%] animate-float text-red-300 opacity-60">❤️</div>
        <div className="absolute top-[25%] right-[10%] animate-float-delay text-yellow-300 opacity-70">✨</div>
        <div className="absolute bottom-[30%] left-[8%] animate-float-delay-2 text-rose-300 opacity-60">❤️</div>
        <div className="absolute bottom-[15%] right-[7%] animate-float text-sky-300 opacity-70">✨</div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-12 relative z-10">
        
        {/* Main Homenagem Card */}
        <div className={`shadow-2xl rounded-3xl overflow-hidden border ${
          isClassico 
            ? 'bg-[#FAF8F5] border-[#E5E0D5] p-8 sm:p-10' 
            : 'bg-white/80 backdrop-blur-md border-teal-50 p-8 sm:p-10 shadow-emerald-100/50'
        }`}>
          
          {/* Card Border Accent */}
          {isClassico ? (
            <div className="border border-[#D1C9BA] p-6 sm:p-8 rounded-2xl relative">
              <div className="absolute top-2 left-2 text-[#D1C9BA] text-xs">◆</div>
              <div className="absolute top-2 right-2 text-[#D1C9BA] text-xs">◆</div>
              <div className="absolute bottom-2 left-2 text-[#D1C9BA] text-xs">◆</div>
              <div className="absolute bottom-2 right-2 text-[#D1C9BA] text-xs">◆</div>
              
              {/* Content Wrapper */}
              <div className="space-y-8">
                
                {/* Header */}
                <div className="text-center">
                  <div className="text-[#8C7A5C] text-sm tracking-widest uppercase mb-2">Com amor para</div>
                  <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1817] leading-tight">
                    {data.nome_destinatario}
                  </h1>
                  <div className="w-12 h-px bg-[#8C7A5C] mx-auto mt-4"></div>
                </div>

                {/* Classic Polaroid Photo Gallery */}
                <div className="space-y-6">
                  {data.midias.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white p-4 pb-8 shadow-md border border-[#E5E0D5] rotate-[-1deg] even:rotate-[1.5deg] max-w-sm mx-auto transition-transform hover:scale-102 duration-300"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-stone-100 relative">
                        <Image 
                          src={url} 
                          alt={`Memória ${idx + 1}`} 
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover grayscale-[15%] contrast-[105%]"
                          priority={idx === 0}
                        />
                      </div>
                      <div className="mt-4 text-center text-xs text-[#8C7A5C] tracking-wide font-sans uppercase">
                        Recordação Especial #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Letter Message */}
                <div className="text-[#3A3530] text-base sm:text-lg leading-relaxed whitespace-pre-line text-justify pl-2 border-l-2 border-[#D1C9BA]/50">
                  {data.mensagem}
                </div>

                {/* Classic Footer */}
                <div className="text-center pt-4">
                  <Heart className="w-6 h-6 text-red-700/80 mx-auto fill-current animate-pulse" />
                  <div className="text-xs text-[#8C7A5C] tracking-wider uppercase mt-2">Feliz Dia dos Pais</div>
                </div>

              </div>
            </div>
          ) : (
            // DIVERTIDO / DESCONTRAÍDO THEME
            <div className="space-y-8">
              
              {/* Top Bubble Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider animate-bounce">
                  <Sparkles className="w-3.5 h-3.5 fill-current text-yellow-500" />
                  <span>Você é o melhor!</span>
                </div>
              </div>

              {/* Title Header */}
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-black text-teal-950 tracking-tight leading-none mb-2">
                  Pai {data.nome_destinatario}
                </h1>
                <p className="text-sm font-semibold text-teal-600/80">
                  Uma homenagem cheia de carinho e risadas!
                </p>
              </div>

              {/* Collaged Rounded Photos with rotation */}
              <div className="flex flex-wrap gap-4 justify-center py-4">
                {data.midias.map((url, idx) => {
                  const rotations = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3', 'rotate-1'];
                  const rotClass = rotations[idx % rotations.length];
                  
                  return (
                    <div 
                      key={idx} 
                      className={`relative w-40 sm:w-48 aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-slate-100 ${rotClass} transition-transform hover:scale-105 hover:rotate-0 duration-300 flex-shrink-0`}
                    >
                      <Image 
                        src={url} 
                        alt={`Memória ${idx + 1}`} 
                        fill
                        sizes="(max-width: 640px) 160px, 192px"
                        className="object-cover"
                        priority={idx === 0}
                      />
                      <div className="absolute bottom-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message bubble card */}
              <div className="relative">
                <div className="absolute -top-3 -left-3 text-3xl">💬</div>
                <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-6 sm:p-8 text-teal-950 text-base sm:text-lg leading-relaxed whitespace-pre-line shadow-sm relative z-10 font-medium">
                  {data.mensagem}
                </div>
                <div className="absolute -bottom-2 -right-2 text-3xl">🎉</div>
              </div>

              {/* Fun/Playful Footer */}
              <div className="text-center pt-4 border-t border-teal-50 flex flex-col items-center gap-2">
                <div className="flex gap-1 text-yellow-500">
                  <span>⭐️</span><span>⭐️</span><span>⭐️</span><span>⭐️</span><span>⭐️</span>
                </div>
                <div className="text-xs font-bold text-teal-700/70 tracking-widest uppercase">
                  Melhor Pai do Mundo Certificado
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Small Audio/Playlist Hint for future expansion (v2+) */}
        {data.plano === 'completo' && (
          <div className="mt-6 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white/60 border border-gray-150 shadow-sm text-xs font-semibold text-gray-500">
            <Music className="w-4 h-4 text-indigo-500 animate-spin-slow" />
            <span>Playlist de Dia dos Pais em breve no Plano Premium!</span>
          </div>
        )}

      </div>
    </div>
  );
}
