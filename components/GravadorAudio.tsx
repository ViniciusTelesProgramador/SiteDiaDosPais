'use client';

import React, { useRef, useState } from 'react';
import { Mic, Square, RotateCcw, AlertCircle } from 'lucide-react';
import { MAX_AUDIO_SEGUNDOS } from '@/lib/config';

interface Props {
  onAudioPronto: (blob: Blob | null) => void;
}

/**
 * Gravação da mensagem de voz do comprador (Fase 12) — opcional. Grava até
 * MAX_AUDIO_SEGUNDOS via MediaRecorder, mostra prévia e permite regravar.
 * Erro de permissão de microfone nunca bloqueia o formulário (o recurso é
 * sempre opcional — dá pra seguir sem gravar).
 */
export default function GravadorAudio({ onAudioPronto }: Props) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGravando(false);
  };

  const iniciarGravacao = async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioPronto(blob);
      };

      recorder.start();
      setGravando(true);
      setSegundos(0);

      intervalRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= MAX_AUDIO_SEGUNDOS) {
            pararGravacao();
            return MAX_AUDIO_SEGUNDOS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      setErro('Não conseguimos acessar o microfone. Verifique a permissão do navegador — mas isso é opcional, você pode seguir sem gravar.');
    }
  };

  const regravar = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSegundos(0);
    onAudioPronto(null);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Uma mensagem de voz pra ele ouvir (opcional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Sua própria voz, até {MAX_AUDIO_SEGUNDOS} segundos. Vale mais que qualquer texto perfeito.
      </p>

      {erro && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {!audioUrl && !gravando && (
        <button
          type="button"
          onClick={iniciarGravacao}
          className="w-full py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Mic className="w-4 h-4 text-rose-500" />
          <span>Gravar mensagem de voz</span>
        </button>
      )}

      {gravando && (
        <button
          type="button"
          onClick={pararGravacao}
          className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Square className="w-4 h-4 fill-current" />
          <span>Parar ({segundos}s / {MAX_AUDIO_SEGUNDOS}s)</span>
        </button>
      )}

      {audioUrl && !gravando && (
        <div className="flex items-center gap-3">
          <audio controls src={audioUrl} className="flex-1 h-10" />
          <button
            type="button"
            onClick={regravar}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 flex-shrink-0"
            aria-label="Regravar"
            title="Regravar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
