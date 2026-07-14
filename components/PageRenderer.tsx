'use client';

import React from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import type { Bloco, Midia } from '@/lib/types';

/**
 * Renderização visual da página do presente — componente único usado pelo
 * preview ao vivo do formulário, pela tela /preview/[id] e pela página
 * pública /p/[slug] (T1.3): mudou aqui, mudou nos três lugares.
 *
 * Anti-cringe (visão §7): sem confete, sem emojis flutuantes, sem frases
 * prontas — todo texto emocional vem dos blocos/mensagem do comprador.
 */

export interface ConteudoPagina {
  nome_destinatario: string;
  mensagem?: string | null;
  blocos?: Bloco[] | null;
  midias: Midia[];
  tema: string;
}

function FotoComLegenda({
  midia,
  idx,
  classico,
}: {
  midia: Midia;
  idx: number;
  classico: boolean;
}) {
  if (classico) {
    return (
      <figure className="bg-white p-4 pb-5 shadow-md border border-[#E5E0D5] rotate-[-1deg] even:rotate-[1.5deg] max-w-sm mx-auto transition-transform duration-300">
        <div className="aspect-square w-full overflow-hidden bg-stone-100 relative">
          <Image
            src={midia.url}
            alt={midia.legenda || `Memória ${idx + 1}`}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
            priority={idx === 0}
            unoptimized={midia.url.startsWith('data:')}
          />
        </div>
        {midia.legenda && (
          <figcaption className="mt-4 text-center text-sm text-[#6B5D45] italic leading-snug">
            {midia.legenda}
          </figcaption>
        )}
      </figure>
    );
  }

  const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-1'];
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className={`relative w-40 sm:w-48 aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-slate-100 ${rotations[idx % rotations.length]} transition-transform duration-300 flex-shrink-0`}
      >
        <Image
          src={midia.url}
          alt={midia.legenda || `Memória ${idx + 1}`}
          fill
          sizes="(max-width: 640px) 160px, 192px"
          className="object-cover"
          priority={idx === 0}
          unoptimized={midia.url.startsWith('data:')}
        />
      </div>
      {midia.legenda && (
        <figcaption className="text-xs font-medium text-teal-800/80 text-center max-w-[12rem] leading-snug">
          {midia.legenda}
        </figcaption>
      )}
    </figure>
  );
}

export default function PageRenderer({ conteudo }: { conteudo: ConteudoPagina }) {
  const classico = conteudo.tema !== 'descontraido';
  const blocos = conteudo.blocos || [];
  const temMensagem = Boolean(conteudo.mensagem?.trim());

  if (classico) {
    return (
      <div className="bg-[#FAF8F5] border border-[#E5E0D5] p-6 sm:p-10 rounded-3xl shadow-2xl font-serif text-[#2C2A27]">
        <div className="border border-[#D1C9BA] p-5 sm:p-8 rounded-2xl relative">
          <div className="absolute top-2 left-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute top-2 right-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute bottom-2 left-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute bottom-2 right-2 text-[#D1C9BA] text-xs">◆</div>

          <div className="space-y-10">
            {/* Cabeçalho */}
            <div className="text-center">
              <div className="text-[#8C7A5C] text-sm tracking-widest uppercase mb-2">
                Com amor para
              </div>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1817] leading-tight">
                {conteudo.nome_destinatario}
              </h1>
              <div className="w-12 h-px bg-[#8C7A5C] mx-auto mt-4"></div>
            </div>

            {/* Blocos das perguntas guiadas */}
            {blocos.map((bloco) => (
              <div key={bloco.pergunta_id} className="space-y-3">
                <div className="text-[#8C7A5C] text-xs tracking-[0.2em] uppercase text-center">
                  {bloco.titulo}
                </div>
                <p className="text-[#3A3530] text-base sm:text-lg leading-relaxed whitespace-pre-line text-center">
                  {bloco.texto}
                </p>
              </div>
            ))}

            {/* Fotos com legenda */}
            {conteudo.midias.length > 0 && (
              <div className="space-y-8">
                {conteudo.midias.map((midia, idx) => (
                  <FotoComLegenda key={idx} midia={midia} idx={idx} classico />
                ))}
              </div>
            )}

            {/* Mensagem de fechamento */}
            {temMensagem && (
              <div className="text-[#3A3530] text-base sm:text-lg leading-relaxed whitespace-pre-line pl-3 border-l-2 border-[#D1C9BA]/60 italic">
                {conteudo.mensagem}
              </div>
            )}

            {/* Rodapé */}
            <div className="text-center pt-2">
              <Heart className="w-5 h-5 text-red-800/70 mx-auto fill-current" />
              <div className="text-xs text-[#8C7A5C] tracking-wider uppercase mt-2">
                Feliz Dia dos Pais
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Tema Descontraído ----
  return (
    <div className="bg-white/90 backdrop-blur-md border border-teal-50 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-emerald-100/50 font-sans text-[#1E302E]">
      <div className="space-y-10">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="text-emerald-700/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Para você
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-teal-950 tracking-tight leading-none">
            {conteudo.nome_destinatario}
          </h1>
        </div>

        {/* Blocos das perguntas guiadas */}
        {blocos.map((bloco) => (
          <div
            key={bloco.pergunta_id}
            className="bg-teal-50/50 border border-teal-100 rounded-3xl p-5 sm:p-7 space-y-2"
          >
            <div className="text-emerald-700 text-xs font-extrabold tracking-wider uppercase">
              {bloco.titulo}
            </div>
            <p className="text-teal-950 text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium">
              {bloco.texto}
            </p>
          </div>
        ))}

        {/* Fotos com legenda */}
        {conteudo.midias.length > 0 && (
          <div className="flex flex-wrap gap-5 justify-center py-2">
            {conteudo.midias.map((midia, idx) => (
              <FotoComLegenda key={idx} midia={midia} idx={idx} classico={false} />
            ))}
          </div>
        )}

        {/* Mensagem de fechamento */}
        {temMensagem && (
          <div className="bg-white border border-emerald-100 rounded-3xl p-5 sm:p-7 text-teal-950 text-base sm:text-lg leading-relaxed whitespace-pre-line shadow-sm font-medium">
            {conteudo.mensagem}
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center pt-2 border-t border-teal-50">
          <Heart className="w-5 h-5 text-rose-500 mx-auto fill-current mt-4" />
          <div className="text-xs font-bold text-teal-700/70 tracking-widest uppercase mt-2">
            Feliz Dia dos Pais
          </div>
        </div>
      </div>
    </div>
  );
}
