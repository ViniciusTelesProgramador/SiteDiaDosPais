'use client';

import React, { useRef, useState } from 'react';
import { Mic, Video, Square, RotateCcw, AlertCircle, Upload } from 'lucide-react';
import {
  MAX_AUDIO_SEGUNDOS,
  MAX_VIDEO_SEGUNDOS,
  MAX_AUDIO_MB,
  MAX_VIDEO_MB,
} from '@/lib/config';

export type MensagemGravada = { tipo: 'voz' | 'video'; blob: Blob } | null;

interface Props {
  onMensagemPronta: (mensagem: MensagemGravada) => void;
}

/**
 * Escolhe o primeiro mimeType realmente suportado pelo navegador — o Safari
 * não suporta o contêiner WebM no MediaRecorder e grava em outro formato
 * (tipicamente MP4/AAC); gravar sem checar isso e depois rotular o Blob
 * como "webm" na marra quebra a reprodução.
 */
function escolherMimeType(video: boolean): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  const candidatos = video
    ? ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Gravação da mensagem do comprador (Fase 12: voz; Fase 14: alternativa em
 * vídeo) — opcional, um modo por vez. Grava até o limite de segundos via
 * MediaRecorder, mostra prévia e permite regravar (ou trocar de modo).
 * Erro de permissão de câmera/microfone nunca bloqueia o formulário — e
 * sempre existe a opção de enviar um arquivo já gravado no app nativo do
 * celular, pra quando gravar ao vivo não for possível (navegador in-app do
 * Instagram/WhatsApp, versões antigas de iOS etc.).
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
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  const limiteSegundos = modo === 'video' ? MAX_VIDEO_SEGUNDOS : MAX_AUDIO_SEGUNDOS;
  const gravacaoAoVivoDisponivel =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

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

      const mimeType = escolherMimeType(modo === 'video');
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Usa o mimeType real do gravador (recorder.mimeType) — nunca um
        // valor fixo: no Safari isso é MP4/AAC, não WebM.
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
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

  /**
   * Alternativa a gravar ao vivo: aceita um áudio/vídeo já gravado no app
   * nativo do celular (câmera, memorando de voz). Resolve os casos em que
   * getUserMedia não funciona — navegador in-app (Instagram/WhatsApp),
   * versões antigas de iOS — sem depender de detectar cada variante.
   */
  const handleArquivoEscolhido = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
    if (!arquivo) return;
    setErro(null);

    const ehVideo = arquivo.type.startsWith('video/');
    const ehAudio = arquivo.type.startsWith('audio/');
    if (!ehVideo && !ehAudio) {
      setErro('Escolha um arquivo de áudio ou vídeo.');
      return;
    }
    const limiteMB = ehVideo ? MAX_VIDEO_MB : MAX_AUDIO_MB;
    if (arquivo.size > limiteMB * 1024 * 1024) {
      setErro(`Esse arquivo passa de ${limiteMB}MB — escolha um menor.`);
      return;
    }

    setModo(ehVideo ? 'video' : 'voz');
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);
    onMensagemPronta({ tipo: ehVideo ? 'video' : 'voz', blob: arquivo });
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

      {!gravacaoAoVivoDisponivel && !previewUrl && !gravando && (
        <p className="text-xs text-gray-500 mb-3">
          Gravar direto aqui não está disponível neste navegador — envie um arquivo já
          gravado no app de câmera ou memorando de voz do celular.
        </p>
      )}

      {erro && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {!previewUrl && !gravando && (
        <div className="space-y-2">
          {gravacaoAoVivoDisponivel && (
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
          <button
            type="button"
            onClick={() => arquivoInputRef.current?.click()}
            className={
              gravacaoAoVivoDisponivel
                ? 'w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5 transition-colors'
                : 'w-full py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all'
            }
          >
            <Upload className="w-4 h-4 text-rose-500" />
            <span>
              {gravacaoAoVivoDisponivel
                ? 'ou envie um arquivo já gravado'
                : `Enviar ${modo === 'video' ? 'vídeo' : 'áudio'} já gravado`}
            </span>
          </button>
          <input
            type="file"
            ref={arquivoInputRef}
            accept="audio/*,video/*"
            onChange={handleArquivoEscolhido}
            className="hidden"
          />
        </div>
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
