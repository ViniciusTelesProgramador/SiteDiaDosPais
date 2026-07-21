'use client';

import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { gerarCardCompartilhamento } from '@/lib/shareCard';

interface Props {
  nomeDestinatario: string;
  frase?: string | null;
  fotoUrl?: string | null;
  classico: boolean;
}

/**
 * Botão "Compartilhar nos Stories" (Fase 7) — gera um card vertical (Canvas,
 * `lib/shareCard.ts`) e abre o share nativo do celular; sem suporte, baixa
 * o PNG (mesmo espírito da música: nunca depender de uma capacidade do
 * navegador sem trilha B). Aponta pra home do site, não pro link privado —
 * o objetivo é crescimento, não reabrir a página de quem compartilha.
 */
export default function ShareStoryButton({ nomeDestinatario, frase, fotoUrl, classico }: Props) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  const compartilhar = async () => {
    setGerando(true);
    setErro(false);
    try {
      const blob = await gerarCardCompartilhamento({
        nomeDestinatario,
        frase,
        fotoUrl,
        classico,
      });
      const arquivo = new File([blob], 'recado-surpresa.png', { type: 'image/png' });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: 'Recado Surpresa',
          text: 'Eu recebi uma surpresa assim ❤️ Faça a sua também:',
          url: origin,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recado-surpresa.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[ShareStoryButton] Erro ao compartilhar:', err);
        setErro(true);
      }
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="text-center pt-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          compartilhar();
        }}
        disabled={gerando}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${
          classico ? 'bg-[#2C2A27] text-[#FAF8F5]' : 'bg-teal-900 text-white'
        }`}
      >
        {gerando ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        <span>{gerando ? 'Gerando imagem...' : 'Compartilhar nos Stories'}</span>
      </button>
      {erro && (
        <p className="text-[10px] text-rose-500 mt-2">
          Não deu pra gerar a imagem agora. Tenta de novo?
        </p>
      )}
    </div>
  );
}
