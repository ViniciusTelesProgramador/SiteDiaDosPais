'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { carregarYoutubeApi, type YTPlayerInstance } from '@/lib/youtubePlayer';

interface Props {
  youtubeId: string;
  classico: boolean;
}

/**
 * Botão de tocar/pausar a música do casal (Fase 6). Sem autoplay — toda
 * chamada a playVideo() acontece dentro do próprio clique do usuário
 * (gesto direto), o que evita a maior parte dos bloqueios de autoplay do
 * Safari. O player fica visível (não escondido/opacidade zero) — é um
 * embed pequeno, não uma extração de áudio.
 */
export default function MusicPlayer({ youtubeId, classico }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [pronto, setPronto] = useState(false);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    carregarYoutubeApi().then((YT) => {
      if (cancelado || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          enablejsapi: 1,
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          loop: 1,
          playlist: youtubeId,
        },
        events: {
          onReady: () => {
            if (!cancelado) setPronto(true);
          },
        },
      });
    });

    return () => {
      cancelado = true;
      playerRef.current?.destroy();
    };
  }, [youtubeId]);

  const alternar = () => {
    if (!playerRef.current) return;
    if (tocando) {
      playerRef.current.pauseVideo();
      setTocando(false);
    } else {
      playerRef.current.playVideo();
      setTocando(true);
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={!pronto}
      aria-label={tocando ? 'Pausar a música' : 'Tocar a música'}
      title="A música de vocês"
      className={`relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden transition-opacity disabled:opacity-40 ${
        classico ? 'border border-[#D1C9BA]' : 'border border-teal-100 shadow-sm'
      }`}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
        {tocando ? (
          <Pause className="w-4 h-4 text-white fill-current" />
        ) : (
          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
        )}
      </div>
    </button>
  );
}
