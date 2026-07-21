'use client';

import React, { useRef, useState } from 'react';
import { Mic, Video, Square, RotateCcw, AlertCircle } from 'lucide-react';
import { MAX_AUDIO_SEGUNDOS, MAX_VIDEO_SEGUNDOS } from '@/lib/config';

export type MensagemGravada = { tipo: 'voz' | 'video'; blob: Blob } | null;

interface Props {
  onMensagemPronta: (mensagem: MensagemGravada) => void;
}

/**
 * Gravação da mensagem do comprador (Fase 12: voz; Fase 14: alternativa em
 * vídeo) — opcional, um modo por vez. Grava até o limite de segundos via
 * MediaRecorder, mostra prévia e permite regravar (ou trocar de modo).
 * Erro de permissão de câmera/microfone nunca bloqueia o formulário.
 */
export default function GravadorMensagem({ onMensagemPronta }: Props) {
  const [modo, setModo] = useState<'voz' | 'video'>('voz');
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limiteSegundos = modo === 'video' ? MAX_VIDEO_SEGUNDOS : MAX_AUDIO_SEGUNDOS;

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGravando(false);
  };

  const iniciarGravacao = async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: modo === 'video',
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: modo === 'video' ? 'video/webm' : 'audio/webm',
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onMensagemPronta({ tipo: modo, blob });
      };

      recorder.start();
      setGravando(true);
      setSegundos(0);

      intervalRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= limiteSegundos) {
            pararGravacao();
            return limiteSegundos;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar câmera/microfone:', err);
      setErro(
        modo === 'video'
          ? 'Não conseguimos acessar a câmera/microfone. Verifique a permissão do navegador — mas isso é opcional, você pode seguir sem gravar.'
          : 'Não conseguimos acessar o microfone. Verifique a permissão do navegador — mas isso é opcional, você pode seguir sem gravar.'
      );
    }
  };

  const regravar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSegundos(0);
    onMensagemPronta(null);
  };

  const trocarModo = (novoModo: 'voz' | 'video') => {
    if (gravando || previewUrl) return; // precisa regravar antes de trocar
    setModo(novoModo);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Uma mensagem pra ele ver/ouvir (opcional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Sua própria voz ou rosto, até {limiteSegundos} segundos. Vale mais que qualquer texto
        perfeito.
      </p>

      {!previewUrl && !gravando && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => trocarModo('voz')}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              modo === 'voz'
                ? 'border-rose-300 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voz</span>
          </button>
          <button
            type="button"
            onClick={() => trocarModo('video')}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              modo === 'video'
                ? 'border-rose-300 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Vídeo</span>
          </button>
        </div>
      )}

      {erro && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {!previewUrl && !gravando && (
        <button
          type="button"
          onClick={iniciarGravacao}
          className="w-full py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {modo === 'video' ? (
            <Video className="w-4 h-4 text-rose-500" />
          ) : (
            <Mic className="w-4 h-4 text-rose-500" />
          )}
          <span>Gravar {modo === 'video' ? 'vídeo' : 'voz'}</span>
        </button>
      )}

      {gravando && (
        <button
          type="button"
          onClick={pararGravacao}
          className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Square className="w-4 h-4 fill-current" />
          <span>
            Parar ({segundos}s / {limiteSegundos}s)
          </span>
        </button>
      )}

      {previewUrl && !gravando && (
        <div className="flex items-center gap-3">
          {modo === 'video' ? (
            <video controls src={previewUrl} className="flex-1 max-h-40 rounded-xl bg-black" />
          ) : (
            <audio controls src={previewUrl} className="flex-1 h-10" />
          )}
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

      {modo === 'video' && !previewUrl && (
        <p className="text-[10px] text-gray-400 mt-1.5">
          Vídeo pesa mais que áudio — em rede móvel lenta, o envio pode demorar um pouco mais.
        </p>
      )}
    </div>
  );
}
