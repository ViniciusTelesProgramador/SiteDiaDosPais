'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { criarCenaRecap, type ItemRecap, type CenaRecap } from '@/lib/recapScene';
import { compartilharArquivo } from '@/lib/compartilharArquivo';
import { gerarCardCompartilhamento } from '@/lib/shareCard';

interface Props {
  itens: ItemRecap[];
  classico: boolean;
  nomeDestinatario: string;
  /** Só compartilha na página pública de verdade (mesmo gate do ShareStoryButton). */
  podeCompartilhar: boolean;
}

const HOLD_FINAL_MS = 1000;

function escolherMimeTypeVideo(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  const candidatos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Finale do storytime (Fase 16): junta fotos, frases e "nossa música" numa
 * colagem 3D que pousa numa composição final parada — e grava tudo isso
 * como um vídeo curto pra compartilhar/salvar. Sem WebGL ou sem suporte a
 * gravar vídeo, cai pra uma colagem simples em HTML/CSS + imagem estática
 * (mesmo card de compartilhamento da Fase 7) — nunca fica em branco.
 */
export default function RecapFinale3D({
  itens,
  classico,
  nomeDestinatario,
  podeCompartilhar,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cenaRef = useRef<CenaRecap | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [modoFallback, setModoFallback] = useState(false);
  const [arquivoPronto, setArquivoPronto] = useState<Blob | null>(null);
  const [preparando, setPreparando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || itens.length === 0) {
      setModoFallback(true);
      setPreparando(false);
      return;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const { width, height } = container.getBoundingClientRect();

    (async () => {
      let cena: CenaRecap;
      try {
        cena = await criarCenaRecap({
          canvas,
          itens,
          classico,
          largura: width || 320,
          altura: height || 320,
        });
      } catch (err) {
        console.error('[RecapFinale3D] WebGL indisponível, usando fallback:', err);
        if (!cancelado) {
          setModoFallback(true);
          setPreparando(false);
        }
        return;
      }
      if (cancelado) {
        cena.dispose();
        return;
      }
      cenaRef.current = cena;

      const capturaDisponivel =
        !reducedMotion &&
        typeof canvas.captureStream === 'function' &&
        typeof MediaRecorder !== 'undefined';

      if (reducedMotion) {
        cena.saltarParaFinal();
        await capturarFrameEstatico(canvas);
        setPreparando(false);
        return;
      }

      if (capturaDisponivel) {
        iniciarGravacaoVideo(canvas);
      }

      const inicio = performance.now();
      const duracaoComHold = cena.duracaoMontagem * 1000 + HOLD_FINAL_MS;

      const loop = (agora: number) => {
        if (cancelado) return;
        const decorridoSegundos = (agora - inicio) / 1000;
        cena.renderizarFrame(decorridoSegundos);

        if (agora - inicio < duracaoComHold) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
          } else if (!capturaDisponivel) {
            capturarFrameEstatico(canvas).then(() => setPreparando(false));
          }
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    })();

    async function capturarFrameEstatico(canvasEl: HTMLCanvasElement) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasEl.toBlob(resolve, 'image/png', 0.95)
        );
        if (blob && !cancelado) setArquivoPronto(blob);
      } catch (err) {
        console.error('[RecapFinale3D] Falha ao capturar frame estático:', err);
      }
    }

    function iniciarGravacaoVideo(canvasEl: HTMLCanvasElement) {
      try {
        const stream = canvasEl.captureStream(30);
        const mimeType = escolherMimeTypeVideo();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        const pedacos: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) pedacos.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(pedacos, { type: recorder.mimeType });
          if (!cancelado) {
            setArquivoPronto(blob);
            setPreparando(false);
          }
        };
        recorder.start();
        recorderRef.current = recorder;
      } catch (err) {
        console.error('[RecapFinale3D] Falha ao gravar vídeo, caindo pra imagem:', err);
        capturarFrameEstatico(canvasEl).then(() => setPreparando(false));
      }
    }

    return () => {
      cancelado = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      cenaRef.current?.dispose();
      cenaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const compartilhar = async () => {
    if (compartilhando) return;
    setCompartilhando(true);
    setErro(false);
    try {
      let blob = arquivoPronto;
      if (!blob) {
        // Fallback final: reaproveita o card 2D já validado (Fase 7).
        blob = await gerarCardCompartilhamento({
          nomeDestinatario,
          frase: null,
          fotoUrl: itens.find((i) => i.tipo === 'foto')?.url || null,
          classico,
        });
      }
      const ehVideo = blob.type.startsWith('video/');
      await compartilharArquivo(
        blob,
        ehVideo ? 'recado-surpresa.webm' : 'recado-surpresa.png',
        {
          titulo: 'Recado Surpresa',
          texto: 'Eu recebi uma surpresa assim ❤️ Faça a sua também:',
        }
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[RecapFinale3D] Erro ao compartilhar:', err);
        setErro(true);
      }
    } finally {
      setCompartilhando(false);
    }
  };

  if (modoFallback) {
    return (
      <div className="space-y-4 py-2">
        <div
          className={`text-xs tracking-[0.2em] uppercase text-center ${
            classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-extrabold'
          }`}
        >
          Tudo isso é você
        </div>
        <div className="grid grid-cols-3 gap-2">
          {itens
            .filter((i): i is Extract<ItemRecap, { tipo: 'foto' }> => i.tipo === 'foto')
            .map((item, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={item.url}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
        </div>
        {podeCompartilhar && (
          <BotaoCompartilhar
            classico={classico}
            compartilhando={compartilhando}
            erro={erro}
            onClick={compartilhar}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div
        className={`text-xs tracking-[0.2em] uppercase text-center ${
          classico ? 'text-[#8C7A5C]' : 'text-emerald-700 font-extrabold'
        }`}
      >
        Tudo isso é você
      </div>
      <div ref={containerRef} className="w-full aspect-square max-w-sm mx-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      {preparando && (
        <p
          className={`text-center text-xs ${classico ? 'text-[#8C7A5C]' : 'text-teal-700/70'}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />
          Montando sua recordação...
        </p>
      )}
      {podeCompartilhar && !preparando && (
        <BotaoCompartilhar
          classico={classico}
          compartilhando={compartilhando}
          erro={erro}
          onClick={compartilhar}
        />
      )}
    </div>
  );
}

function BotaoCompartilhar({
  classico,
  compartilhando,
  erro,
  onClick,
}: {
  classico: boolean;
  compartilhando: boolean;
  erro: boolean;
  onClick: () => void;
}) {
  return (
    <div className="text-center pt-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={compartilhando}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${
          classico ? 'bg-[#2C2A27] text-[#FAF8F5]' : 'bg-teal-900 text-white'
        }`}
      >
        {compartilhando ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span>{compartilhando ? 'Preparando...' : 'Compartilhar / Salvar'}</span>
      </button>
      {erro && (
        <p className="text-[10px] text-rose-500 mt-2">
          Não deu pra compartilhar agora. Tenta de novo?
        </p>
      )}
    </div>
  );
}
