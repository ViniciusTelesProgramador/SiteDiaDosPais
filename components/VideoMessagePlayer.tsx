'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface Props {
  videoUrl: string;
  classico: boolean;
}

/**
 * Mensagem em vídeo do comprador (Fase 14 — alternativa à mensagem de
 * voz). Vídeo nativo com overlay de tocar/pausar, sem autoplay — mesmo
 * princípio já validado no `VoiceMessagePlayer`/`MusicPlayer`.
 */
export default function VideoMessagePlayer({ videoUrl, classico }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);

  const alternar = () => {
    const video = videoRef.current;
    if (!video) return;
    if (tocando) {
      video.pause();
    } else {
      video.play();
    }
  };

  return (
    <div
      // Impede que o toque no player avance/volte o slide do storytime
      // (o Viewport do PageRenderer navega com base na posição do clique).
      onClick={(e) => e.stopPropagation()}
      className={`relative rounded-2xl overflow-hidden ${
        classico ? 'border border-[#E5E0D5]' : 'border border-teal-100 shadow-sm'
      }`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        className="w-full max-h-64 bg-black"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
        onClick={alternar}
      />
      {!tocando && (
        <button
          type="button"
          onClick={alternar}
          aria-label="Tocar a mensagem em vídeo"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-gray-900 fill-current ml-0.5" />
          </span>
        </button>
      )}
      {tocando && (
        <button
          type="button"
          onClick={alternar}
          aria-label="Pausar a mensagem em vídeo"
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
        >
          <Pause className="w-4 h-4 text-white fill-current" />
        </button>
      )}
    </div>
  );
}
