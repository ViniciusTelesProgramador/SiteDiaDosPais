'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * Item de FAQ com abertura/fechamento suave (Fase 8) — substitui o
 * <details> nativo (que abria/fechava sem transição). Técnica
 * grid-template-rows 0fr→1fr (`.accordion-linha` em globals.css): anima a
 * altura "auto" sem medir em JS e sem causar layout shift.
 */
export default function FaqItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full font-bold text-gray-900 text-sm cursor-pointer flex items-center justify-between gap-4 text-left"
      >
        <span>{pergunta}</span>
        <Plus
          className={`w-4 h-4 flex-shrink-0 text-pink-400 transition-transform duration-300 ${
            aberto ? 'rotate-45' : ''
          }`}
        />
      </button>
      <div className={`accordion-linha ${aberto ? 'aberto' : ''}`}>
        <div className="accordion-conteudo">
          <p className="text-sm text-gray-500 leading-relaxed pt-3">{resposta}</p>
        </div>
      </div>
    </div>
  );
}
