'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ORDEM_NARRATIVA, BLOCO_CLIMAX } from '@/lib/config';
import { ordenarBlocosNarrativa, type Bloco, type Midia, type Contribuicao } from '@/lib/types';
import { tocarSting } from '@/lib/audioStings';
import MusicPlayer from './MusicPlayer';
import ShareStoryButton from './ShareStoryButton';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import VideoMessagePlayer from './VideoMessagePlayer';

/**
 * Renderização visual da página do presente — componente único usado pelo
 * preview ao vivo do formulário, pela tela /preview/[id] e pela página
 * pública /p/[slug] (T1.3): mudou aqui, mudou nos três lugares.
 *
 * Modo Storytime (Fase 6): a página não é mais um scroll único — é uma
 * sequência de momentos em tela cheia (um por vez), navegada por toque nas
 * laterais, setas ou swipe. Ordem narrativa (Fase 4, visão §5) mantida:
 * riso primeiro, fotos, aprofundamento, clímax destacado, coro (Fase 5) e
 * fechamento como assinatura. Sem avanço automático — o leitor controla o
 * ritmo (visão §7: nada de gamificação estilo Stories).
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
  /** ID do vídeo do YouTube (Fase 6) — null/undefined = sem música. */
  musicaYoutubeId?: string | null;
  /** URL da mensagem de voz do comprador (Fase 12) — null = sem áudio. */
  audioUrl?: string | null;
  /**
   * URL da mensagem em vídeo do comprador (Fase 14) — alternativa à voz,
   * um OU outro. Quando ambos vierem preenchidos (não deveria acontecer),
   * o vídeo prevalece.
   */
  videoUrl?: string | null;
  /**
   * Slug da página pública (Fase 7) — só presente em /p/[slug]. Controla o
   * botão de compartilhar nos Stories: sem slug (prévia ao vivo, rascunho
   * pré-pagamento), o botão simplesmente não aparece.
   */
  slugPublico?: string | null;
}

const GRAUS_CLASSICO = ['-1deg', '1deg', '-2deg', '2deg', '1deg'];
const GRAUS_DESCONTRAIDO = ['-2deg', '1deg', '-1deg', '2deg', '1deg'];

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
      <figure
        className="animate-photo-drop bg-white p-4 pb-5 shadow-md border border-[#E5E0D5] w-full max-w-xs sm:max-w-sm mx-auto"
        style={{ '--photo-rotate': GRAUS_CLASSICO[idx % GRAUS_CLASSICO.length] } as React.CSSProperties}
      >
        <div className="aspect-square w-full overflow-hidden bg-stone-100 relative">
          <Image
            src={midia.url}
            alt={midia.legenda || `Memória ${idx + 1}`}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="animate-ken-burns foto-cinematica object-cover"
            priority={idx === 0}
            unoptimized={midia.url.startsWith('data:')}
          />
          {midia.ano && (
            <span className="absolute top-2 left-2 bg-white/90 text-[#8C7A5C] text-[10px] font-bold tracking-wider px-2 py-1 rounded-md shadow-sm">
              {midia.ano}
            </span>
          )}
        </div>
        {midia.legenda && (
          <figcaption className="mt-4 text-center text-sm text-[#6B5D45] italic leading-snug">
            {midia.legenda}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className="animate-photo-drop relative w-48 sm:w-56 aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-slate-100 flex-shrink-0"
        style={{ '--photo-rotate': GRAUS_DESCONTRAIDO[idx % GRAUS_DESCONTRAIDO.length] } as React.CSSProperties}
      >
        <Image
          src={midia.url}
          alt={midia.legenda || `Memória ${idx + 1}`}
          fill
          sizes="(max-width: 640px) 200px, 224px"
          className="animate-ken-burns foto-cinematica object-cover"
          priority={idx === 0}
          unoptimized={midia.url.startsWith('data:')}
        />
        {midia.ano && (
          <span className="absolute top-2 left-2 bg-white/90 text-emerald-700 text-[10px] font-bold tracking-wider px-2 py-1 rounded-md shadow-sm">
            {midia.ano}
          </span>
        )}
      </div>
      {midia.legenda && (
        <figcaption className="text-xs font-medium text-teal-800/80 text-center max-w-[14rem] leading-snug">
          {midia.legenda}
        </figcaption>
      )}
    </figure>
  );
}

export default function PageRenderer({ conteudo }: { conteudo: ConteudoPagina }) {
  const classico = conteudo.tema !== 'descontraido';
  const ordenados = ordenarBlocosNarrativa(conteudo.blocos, ORDEM_NARRATIVA);
  const temMensagem = Boolean(conteudo.mensagem?.trim());
  const contribuicoesAprovadas = (conteudo.contribuicoes || []).filter((c) => c.aprovado);

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

  // Clímax: slide próprio, mais respiro, título entra primeiro e o texto
  // num segundo fôlego (atraso de 350ms).
  const SlideClimax = ({ bloco }: { bloco: Bloco }) => (
    <div className="relative text-center space-y-5 py-4">
      <div
        aria-hidden
        className="animate-climax-glow pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          background: classico
            ? 'radial-gradient(circle at 50% 45%, rgba(140,122,92,0.22), transparent 70%)'
            : 'radial-gradient(circle at 50% 45%, rgba(16,185,129,0.20), transparent 70%)',
        }}
      />
      <div
        className={`animate-slide-in text-xs tracking-[0.25em] uppercase ${
          classico ? 'text-[#8C7A5C]' : 'text-emerald-800 font-extrabold'
        }`}
      >
        {bloco.titulo}
      </div>
      <p
        className={`animate-slide-in text-lg sm:text-xl leading-loose whitespace-pre-line ${
          classico ? 'text-[#2C2A27]' : 'text-teal-950 font-medium'
        }`}
        style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}
      >
        {bloco.texto}
      </p>
    </div>
  );

  // Coro (Fase 5 — Surpresa Coletiva): um único slide com todas as vozes —
  // widening pós-clímax, sem disputar o Peak-End Rule com o fechamento.
  const SlideCoro = () => (
    <div className="space-y-4 py-2">
      <div
        className={`flex items-center justify-center gap-2 text-xs tracking-[0.2em] uppercase text-center ${
          classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-extrabold'
        }`}
      >
        <span role="img" aria-label="Coração branco">
          🤍
        </span>
        <span>Você foi lembrado por mais gente hoje</span>
      </div>
      <div className="space-y-3">
        {contribuicoesAprovadas.map((c, i) => (
          <div
            key={c.id}
            className={`animate-slide-in ${
              classico
                ? 'bg-white/60 border border-[#E5E0D5] rounded-2xl p-4'
                : 'bg-white border border-teal-100 rounded-2xl p-4 shadow-sm'
            }`}
            style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'backwards' }}
          >
            <p
              className={`text-sm leading-relaxed whitespace-pre-line italic ${
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
        ))}
      </div>
    </div>
  );

  // Fechamento: mensagem final como assinatura + rodapé. Sempre existe —
  // é o último slide, com ou sem mensagem escrita.
  // Fase 13, item 5: a mensagem "é escrita" palavra por palavra, numa
  // fonte manuscrita — reforça a metáfora de carta da Fase 12. Os espaços
  // ficam como texto simples (não dentro do span) — um espaço sozinho
  // dentro de um inline-block é recortado pelo navegador e some.
  let contadorPalavra = 0;
  const linhasMensagem = (conteudo.mensagem || '').split('\n');
  const SlideFechamento = () => (
    <div className="text-center space-y-8">
      {temMensagem && (
        <div
          className={
            classico
              ? 'text-left max-w-sm mx-auto text-[#3A3530] text-xl sm:text-2xl leading-relaxed pl-3 border-l-2 border-[#D1C9BA]/60'
              : 'bg-white border border-emerald-100 rounded-3xl p-5 sm:p-7 text-teal-950 text-xl sm:text-2xl leading-relaxed shadow-sm'
          }
          style={{ fontFamily: 'var(--font-caveat)' }}
        >
          {linhasMensagem.map((linha, idxLinha) => (
            <React.Fragment key={idxLinha}>
              {idxLinha > 0 && <br />}
              {linha.split(' ').map((palavra, idxPalavra, arr) => {
                const atraso = contadorPalavra * 40;
                contadorPalavra += 1;
                return (
                  <React.Fragment key={idxPalavra}>
                    <span
                      className="animate-palavra-escrita inline-block"
                      style={{ animationDelay: `${atraso}ms`, animationFillMode: 'backwards' }}
                    >
                      {palavra}
                    </span>
                    {idxPalavra < arr.length - 1 ? ' ' : ''}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
      <div>
        <span className="text-4xl leading-none" role="img" aria-label="Coração">
          ❤️
        </span>
        <div
          className={`text-xs tracking-wider uppercase mt-2 ${
            classico ? 'text-[#8C7A5C]' : 'text-teal-700/70 font-bold'
          }`}
        >
          Feliz Dia dos Pais
        </div>
      </div>
      {conteudo.slugPublico && (
        <ShareStoryButton
          nomeDestinatario={conteudo.nome_destinatario}
          frase={abertura[0]?.texto}
          fotoUrl={conteudo.midias[0]?.url}
          classico={classico}
        />
      )}
    </div>
  );

  // ---- Monta a lista de slides (Fase 6 — modo storytime) ----
  const slides: { key: string; node: React.ReactNode }[] = [];
  if (conteudo.videoUrl || conteudo.audioUrl) {
    slides.push({
      key: 'voz',
      node: (
        <div className="space-y-4">
          <div
            className={`text-xs tracking-[0.2em] uppercase text-center ${
              classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-extrabold'
            }`}
          >
            Antes de tudo
          </div>
          {conteudo.videoUrl ? (
            <VideoMessagePlayer videoUrl={conteudo.videoUrl} classico={classico} />
          ) : (
            <VoiceMessagePlayer audioUrl={conteudo.audioUrl!} classico={classico} />
          )}
        </div>
      ),
    });
  }
  abertura.forEach((bloco) => {
    slides.push({
      key: bloco.pergunta_id,
      node: classico ? <BlocoClassico bloco={bloco} /> : <BlocoDescontraido bloco={bloco} />,
    });
  });
  conteudo.midias.forEach((midia, idx) => {
    slides.push({
      key: `foto-${idx}`,
      node: (
        <div className="flex items-center justify-center">
          <FotoComLegenda midia={midia} idx={idx} classico={classico} />
        </div>
      ),
    });
  });
  meio.forEach((bloco) => {
    slides.push({
      key: bloco.pergunta_id,
      node: classico ? <BlocoClassico bloco={bloco} /> : <BlocoDescontraido bloco={bloco} />,
    });
  });
  climax.forEach((bloco) => {
    slides.push({ key: bloco.pergunta_id, node: <SlideClimax bloco={bloco} /> });
  });
  if (contribuicoesAprovadas.length > 0) {
    slides.push({ key: 'coro', node: <SlideCoro /> });
  }
  slides.push({ key: 'fechamento', node: <SlideFechamento /> });

  // ---- Navegação ----
  const [indice, setIndice] = useState(0);
  const total = slides.length;
  const indiceAtual = Math.min(indice, total - 1);

  useEffect(() => {
    setIndice((i) => Math.min(i, total - 1));
  }, [total]);

  // Fase 13, item 8: sting sonoro ao chegar no clímax/fechamento — disparado
  // de forma síncrona dentro do próprio gesto (toque/clique), como exige a
  // política de autoplay dos navegadores pra Web Audio API.
  const irPara = (alvo: number) => {
    const destino = Math.max(0, Math.min(alvo, total - 1));
    const chaveAtual = slides[indiceAtual]?.key;
    const chaveDestino = slides[destino]?.key;
    if (chaveDestino !== chaveAtual) {
      if (chaveDestino === BLOCO_CLIMAX) tocarSting('climax');
      else if (chaveDestino === 'fechamento') tocarSting('fechamento');
    }
    setIndice(destino);
  };
  const avancar = () => irPara(indiceAtual + 1);
  const voltar = () => irPara(indiceAtual - 1);

  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) voltar();
    else if (delta < -50) avancar();
    touchStartX.current = null;
  };
  const onClickViewport = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) voltar();
    else avancar();
  };

  const Dots = () => (
    <div className="flex justify-center gap-1.5 mb-5">
      {slides.map((s, i) => (
        <span
          key={s.key}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === indiceAtual
              ? classico
                ? 'w-5 bg-[#8C7A5C]'
                : 'w-5 bg-emerald-600'
              : classico
                ? 'w-1.5 bg-[#D1C9BA]'
                : 'w-1.5 bg-teal-100'
          }`}
        />
      ))}
    </div>
  );

  const Setas = () => (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          voltar();
        }}
        disabled={indiceAtual === 0}
        aria-label="Momento anterior"
        className={`absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-0 disabled:pointer-events-none ${
          classico
            ? 'bg-white/80 text-[#8C7A5C] border border-[#E5E0D5]'
            : 'bg-white/90 text-emerald-700 border border-teal-100 shadow-sm'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          avancar();
        }}
        disabled={indiceAtual === total - 1}
        aria-label="Próximo momento"
        className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-0 disabled:pointer-events-none ${
          classico
            ? 'bg-white/80 text-[#8C7A5C] border border-[#E5E0D5]'
            : 'bg-white/90 text-emerald-700 border border-teal-100 shadow-sm'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );

  const Viewport = () => (
    <div
      className="relative min-h-[340px] sm:min-h-[420px] flex items-center px-8 sm:px-10 select-none cursor-pointer"
      onClick={onClickViewport}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Setas />
      <div key={slides[indiceAtual].key} className="w-full max-h-[420px] overflow-y-auto animate-slide-in">
        {slides[indiceAtual].node}
      </div>
    </div>
  );

  if (classico) {
    return (
      <div className="relative overflow-hidden bg-[#FAF8F5] border border-[#E5E0D5] p-6 sm:p-10 rounded-3xl shadow-2xl font-serif text-[#2C2A27]">
        <div
          aria-hidden
          className="animate-ambient-glow pointer-events-none absolute inset-0 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(140,122,92,0.18), transparent 60%)' }}
        />
        <div className="relative z-10 border border-[#D1C9BA] p-5 sm:p-8 rounded-2xl">
          <div className="absolute top-2 left-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute top-2 right-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute bottom-2 left-2 text-[#D1C9BA] text-xs">◆</div>
          <div className="absolute bottom-2 right-2 text-[#D1C9BA] text-xs">◆</div>

          {conteudo.musicaYoutubeId ? (
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="w-11 flex-shrink-0" />
              <div className="text-center flex-1">
                <div className="text-[#8C7A5C] text-sm tracking-widest uppercase mb-2">
                  Com amor para
                </div>
                <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1817] leading-tight">
                  {conteudo.nome_destinatario}
                </h1>
                <div className="w-12 h-px bg-[#8C7A5C] mx-auto mt-4"></div>
              </div>
              <MusicPlayer youtubeId={conteudo.musicaYoutubeId} classico />
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="text-[#8C7A5C] text-sm tracking-widest uppercase mb-2">
                Com amor para
              </div>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1817] leading-tight">
                {conteudo.nome_destinatario}
              </h1>
              <div className="w-12 h-px bg-[#8C7A5C] mx-auto mt-4"></div>
            </div>
          )}

          <Dots />
          <Viewport />
        </div>
      </div>
    );
  }

  // ---- Tema Descontraído ----
  return (
    <div className="relative overflow-hidden bg-white/90 backdrop-blur-md border border-teal-50 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-emerald-100/50 font-sans text-[#1E302E]">
      <div
        aria-hidden
        className="animate-ambient-glow pointer-events-none absolute inset-0 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16), transparent 60%)' }}
      />
      <div className="relative z-10">
      {conteudo.musicaYoutubeId ? (
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="w-11 flex-shrink-0" />
          <div className="text-center flex-1">
            <div className="text-emerald-700/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">
              Para você
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-teal-950 tracking-tight leading-none">
              {conteudo.nome_destinatario}
            </h1>
          </div>
          <MusicPlayer youtubeId={conteudo.musicaYoutubeId} classico={false} />
        </div>
      ) : (
        <div className="text-center mb-6">
          <div className="text-emerald-700/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Para você
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-teal-950 tracking-tight leading-none">
            {conteudo.nome_destinatario}
          </h1>
        </div>
      )}

      <Dots />
      <Viewport />
      </div>
    </div>
  );
}
