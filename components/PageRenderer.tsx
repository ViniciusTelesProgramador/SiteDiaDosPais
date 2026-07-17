'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { ORDEM_NARRATIVA, BLOCO_CLIMAX } from '@/lib/config';
import { ordenarBlocosNarrativa, type Bloco, type Midia, type Contribuicao } from '@/lib/types';

/**
 * Renderização visual da página do presente — componente único usado pelo
 * preview ao vivo do formulário, pela tela /preview/[id] e pela página
 * pública /p/[slug] (T1.3): mudou aqui, mudou nos três lugares.
 *
 * Ordem narrativa (Fase 4, visão §5): riso primeiro ("A frase que é a sua
 * cara"), fotos como meio morno, aprofundamento, e "O que eu nunca te
 * disse" como clímax destacado; a mensagem final fecha como assinatura.
 *
 * `cerimonia` liga o fade por scroll (só na página pública — no preview de
 * edição o conteúdo aparece direto).
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
  /** Mensagens de outras pessoas, já filtradas para aprovadas (Fase 5). */
  contribuicoes?: Contribuicao[] | null;
}

/** Fade suave quando a seção entra na viewport (leitor controla o ritmo). */
function Reveal({
  ativo,
  atrasoMs = 0,
  children,
}: {
  ativo: boolean;
  atrasoMs?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(!ativo);

  useEffect(() => {
    if (!ativo) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ativo]);

  return (
    <div
      ref={ref}
      className={
        ativo
          ? `transition-all duration-700 ease-out ${
              visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`
          : undefined
      }
      style={ativo && atrasoMs ? { transitionDelay: `${atrasoMs}ms` } : undefined}
    >
      {children}
    </div>
  );
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

export default function PageRenderer({
  conteudo,
  cerimonia = false,
}: {
  conteudo: ConteudoPagina;
  cerimonia?: boolean;
}) {
  const classico = conteudo.tema !== 'descontraido';
  const ordenados = ordenarBlocosNarrativa(conteudo.blocos, ORDEM_NARRATIVA);
  const temMensagem = Boolean(conteudo.mensagem?.trim());
  const contribuicoesAprovadas = (conteudo.contribuicoes || []).filter((c) => c.aprovado);

  // Ordem narrativa: abertura (frase) -> fotos -> aprofundamento -> clímax
  const abertura = ordenados.filter((b) => b.pergunta_id === 'frase');
  const climax = ordenados.filter((b) => b.pergunta_id === BLOCO_CLIMAX);
  const meio = ordenados.filter(
    (b) => b.pergunta_id !== 'frase' && b.pergunta_id !== BLOCO_CLIMAX
  );

  const BlocoClassico = ({ bloco }: { bloco: Bloco }) => (
    <div className="space-y-3">
      <div className="text-[#8C7A5C] text-xs tracking-[0.2em] uppercase text-center">
        {bloco.titulo}
      </div>
      <p className="text-[#3A3530] text-base sm:text-lg leading-relaxed whitespace-pre-line text-center">
        {bloco.texto}
      </p>
    </div>
  );

  const BlocoDescontraido = ({ bloco }: { bloco: Bloco }) => (
    <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-5 sm:p-7 space-y-2">
      <div className="text-emerald-700 text-xs font-extrabold tracking-wider uppercase">
        {bloco.titulo}
      </div>
      <p className="text-teal-950 text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium">
        {bloco.texto}
      </p>
    </div>
  );

  // Clímax: mais respiro antes, título entra primeiro, texto num segundo
  // fôlego (atraso de 500ms), tipografia um ponto maior.
  const BlocoClimax = ({ bloco }: { bloco: Bloco }) =>
    classico ? (
      <div className="pt-10 space-y-5">
        <Reveal ativo={cerimonia}>
          <div className="text-[#8C7A5C] text-xs tracking-[0.25em] uppercase text-center">
            {bloco.titulo}
          </div>
        </Reveal>
        <Reveal ativo={cerimonia} atrasoMs={500}>
          <p className="text-[#2C2A27] text-lg sm:text-xl leading-loose whitespace-pre-line text-center">
            {bloco.texto}
          </p>
        </Reveal>
      </div>
    ) : (
      <div className="pt-10 space-y-5">
        <Reveal ativo={cerimonia}>
          <div className="text-emerald-800 text-xs font-extrabold tracking-[0.25em] uppercase text-center">
            {bloco.titulo}
          </div>
        </Reveal>
        <Reveal ativo={cerimonia} atrasoMs={500}>
          <p className="text-teal-950 text-lg sm:text-xl leading-loose whitespace-pre-line text-center font-medium">
            {bloco.texto}
          </p>
        </Reveal>
      </div>
    );

  // Coro (Fase 5 — Surpresa Coletiva): outras vozes, logo depois do clímax
  // pessoal, antes da assinatura de fechamento (widening pós-pico, sem
  // disputar o Peak-End Rule com o clímax nem com o fechamento).
  const Coro = () =>
    contribuicoesAprovadas.length === 0 ? null : (
      <div className="pt-8 space-y-5">
        <Reveal ativo={cerimonia}>
          <div
            className={`text-xs tracking-[0.2em] uppercase text-center ${
              classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-extrabold'
            }`}
          >
            Você foi lembrado por mais gente hoje
          </div>
        </Reveal>
        <div className="space-y-3">
          {contribuicoesAprovadas.map((c, i) => (
            <Reveal key={c.id} ativo={cerimonia} atrasoMs={i * 150}>
              <div
                className={
                  classico
                    ? 'bg-white/60 border border-[#E5E0D5] rounded-2xl p-4 sm:p-5'
                    : 'bg-white border border-teal-100 rounded-2xl p-4 sm:p-5 shadow-sm'
                }
              >
                <p
                  className={`text-sm sm:text-base leading-relaxed whitespace-pre-line italic ${
                    classico ? 'text-[#3A3530]' : 'text-teal-950 font-medium'
                  }`}
                >
                  {c.texto}
                </p>
                <p
                  className={`mt-2 text-xs ${
                    classico ? 'text-[#8C7A5C]' : 'text-teal-700/70 font-semibold'
                  }`}
                >
                  — {c.nome}
                  {c.relacao ? `, ${c.relacao}` : ''}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    );

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
            <Reveal ativo={cerimonia}>
              <div className="text-center">
                <div className="text-[#8C7A5C] text-sm tracking-widest uppercase mb-2">
                  Com amor para
                </div>
                <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1817] leading-tight">
                  {conteudo.nome_destinatario}
                </h1>
                <div className="w-12 h-px bg-[#8C7A5C] mx-auto mt-4"></div>
              </div>
            </Reveal>

            {/* Abertura: o riso primeiro */}
            {abertura.map((bloco) => (
              <Reveal key={bloco.pergunta_id} ativo={cerimonia}>
                <BlocoClassico bloco={bloco} />
              </Reveal>
            ))}

            {/* Fotos: o meio morno da memória */}
            {conteudo.midias.length > 0 && (
              <div className="space-y-8">
                {conteudo.midias.map((midia, idx) => (
                  <Reveal key={idx} ativo={cerimonia}>
                    <FotoComLegenda midia={midia} idx={idx} classico />
                  </Reveal>
                ))}
              </div>
            )}

            {/* Aprofundamento */}
            {meio.map((bloco) => (
              <Reveal key={bloco.pergunta_id} ativo={cerimonia}>
                <BlocoClassico bloco={bloco} />
              </Reveal>
            ))}

            {/* Clímax */}
            {climax.map((bloco) => (
              <BlocoClimax key={bloco.pergunta_id} bloco={bloco} />
            ))}

            {/* Coro (Fase 5) */}
            <Coro />

            {/* Fechamento: curto, como assinatura */}
            {temMensagem && (
              <Reveal ativo={cerimonia}>
                <div className="text-[#3A3530] text-base sm:text-lg leading-relaxed whitespace-pre-line pl-3 border-l-2 border-[#D1C9BA]/60 italic">
                  {conteudo.mensagem}
                </div>
              </Reveal>
            )}

            {/* Rodapé */}
            <Reveal ativo={cerimonia}>
              <div className="text-center pt-2">
                <Heart className="w-5 h-5 text-red-800/70 mx-auto fill-current" />
                <div className="text-xs text-[#8C7A5C] tracking-wider uppercase mt-2">
                  Feliz Dia dos Pais
                </div>
              </div>
            </Reveal>
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
        <Reveal ativo={cerimonia}>
          <div className="text-center">
            <div className="text-emerald-700/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">
              Para você
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-teal-950 tracking-tight leading-none">
              {conteudo.nome_destinatario}
            </h1>
          </div>
        </Reveal>

        {/* Abertura: o riso primeiro */}
        {abertura.map((bloco) => (
          <Reveal key={bloco.pergunta_id} ativo={cerimonia}>
            <BlocoDescontraido bloco={bloco} />
          </Reveal>
        ))}

        {/* Fotos */}
        {conteudo.midias.length > 0 && (
          <div className="flex flex-wrap gap-5 justify-center py-2">
            {conteudo.midias.map((midia, idx) => (
              <Reveal key={idx} ativo={cerimonia}>
                <FotoComLegenda midia={midia} idx={idx} classico={false} />
              </Reveal>
            ))}
          </div>
        )}

        {/* Aprofundamento */}
        {meio.map((bloco) => (
          <Reveal key={bloco.pergunta_id} ativo={cerimonia}>
            <BlocoDescontraido bloco={bloco} />
          </Reveal>
        ))}

        {/* Clímax */}
        {climax.map((bloco) => (
          <BlocoClimax key={bloco.pergunta_id} bloco={bloco} />
        ))}

        {/* Coro (Fase 5) */}
        <Coro />

        {/* Fechamento */}
        {temMensagem && (
          <Reveal ativo={cerimonia}>
            <div className="bg-white border border-emerald-100 rounded-3xl p-5 sm:p-7 text-teal-950 text-base sm:text-lg leading-relaxed whitespace-pre-line shadow-sm font-medium">
              {conteudo.mensagem}
            </div>
          </Reveal>
        )}

        {/* Rodapé */}
        <Reveal ativo={cerimonia}>
          <div className="text-center pt-2 border-t border-teal-50">
            <Heart className="w-5 h-5 text-rose-500 mx-auto fill-current mt-4" />
            <div className="text-xs font-bold text-teal-700/70 tracking-widest uppercase mt-2">
              Feliz Dia dos Pais
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
