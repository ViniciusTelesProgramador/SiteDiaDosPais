'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface Props {
  audioUrl: string;
  classico: boolean;
}

/**
 * Mensagem de voz do comprador (Fase 12) — botão tocar/pausar sobre
 * `<audio>` nativo (bem mais simples que o `MusicPlayer` do YouTube: sem
 * iframe, sem API externa). Sem autoplay — toca só no toque do próprio
 * pai, mesmo princípio já validado na Fase 6 para a música.
 */
export default function VoiceMessagePlayer({ audioUrl, classico }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);

  const alternar = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocando) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl p-5 ${
        classico ? 'bg-white/60 border border-[#E5E0D5]' : 'bg-white border border-teal-100 shadow-sm'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
      />
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? 'Pausar a mensagem de voz' : 'Tocar a mensagem de voz'}
        className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          tocando ? 'animate-pulse-ring' : ''
        } ${classico ? 'bg-[#8C7A5C] text-white' : 'bg-emerald-600 text-white'}`}
      >
        {tocando ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>
      <div className="text-left">
        <div
          className={`flex items-center gap-1.5 text-xs tracking-wider uppercase ${
            classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-bold'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Mensagem de voz</span>
        </div>
        <p className={`text-sm mt-1 ${classico ? 'text-[#3A3530]' : 'text-teal-950 font-medium'}`}>
          Gravada especialmente pra você.
        </p>
      </div>
    </div>
  );
}
