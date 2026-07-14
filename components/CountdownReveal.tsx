'use client';

import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';

/**
 * Tela de contagem regressiva (T2.1, visão §5): o que o destinatário vê antes
 * de `revelar_em`. Recebe APENAS nome, data e tema — o conteúdo da página
 * nunca chega ao client antes da hora (gate no servidor).
 * Ao zerar, recarrega a página para o servidor liberar o conteúdo.
 */

interface CountdownRevealProps {
  nomeDestinatario: string;
  revelarEm: string; // ISO
  tema: string;
}

function calcularRestante(alvo: number) {
  const diff = Math.max(0, alvo - Date.now());
  return {
    dias: Math.floor(diff / (24 * 60 * 60 * 1000)),
    horas: Math.floor(diff / (60 * 60 * 1000)) % 24,
    minutos: Math.floor(diff / (60 * 1000)) % 60,
    segundos: Math.floor(diff / 1000) % 60,
    acabou: diff <= 0,
  };
}

export default function CountdownReveal({
  nomeDestinatario,
  revelarEm,
  tema,
}: CountdownRevealProps) {
  const alvo = new Date(revelarEm).getTime();
  const [restante, setRestante] = useState(() => calcularRestante(alvo));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = calcularRestante(alvo);
      setRestante(r);
      if (r.acabou) {
        clearInterval(interval);
        // Revelação: o servidor decide — recarrega para buscar o conteúdo
        setTimeout(() => window.location.reload(), 800);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [alvo]);

  const classico = tema !== 'descontraido';
  const dataFormatada = new Date(revelarEm).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  const unidades = [
    { valor: restante.dias, rotulo: restante.dias === 1 ? 'dia' : 'dias' },
    { valor: restante.horas, rotulo: restante.horas === 1 ? 'hora' : 'horas' },
    { valor: restante.minutos, rotulo: 'min' },
    { valor: restante.segundos, rotulo: 'seg' },
  ];

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        classico
          ? 'bg-[#F4F1EA] text-[#2C2A27] font-serif'
          : 'bg-gradient-to-tr from-[#E6F4F1] via-[#F3FAFB] to-[#FDF6E2] text-[#1E302E] font-sans'
      }`}
    >
      <div className="max-w-md w-full text-center space-y-8 py-16">
        <div
          className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
            classico ? 'bg-[#EAE5DA] text-[#8C7A5C]' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          <Gift className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <div
            className={`text-sm tracking-widest uppercase ${
              classico ? 'text-[#8C7A5C]' : 'text-emerald-700/70 font-bold'
            }`}
          >
            {nomeDestinatario},
          </div>
          <h1 className={`text-2xl sm:text-3xl leading-snug ${classico ? 'font-normal' : 'font-extrabold text-teal-950'}`}>
            alguém preparou uma surpresa para você.
          </h1>
          <p className={`text-sm ${classico ? 'text-[#6B5D45]' : 'text-teal-800/70'}`}>
            Ela se revela em {dataFormatada}.
          </p>
        </div>

        {restante.acabou ? (
          <p className={`text-lg ${classico ? 'italic' : 'font-bold'}`}>Chegou a hora…</p>
        ) : (
          <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto" aria-live="off">
            {unidades.map((u) => (
              <div
                key={u.rotulo}
                className={`rounded-2xl py-4 ${
                  classico
                    ? 'bg-[#FAF8F5] border border-[#E5E0D5]'
                    : 'bg-white/80 border border-teal-100 shadow-sm'
                }`}
              >
                <div className={`text-2xl sm:text-3xl tabular-nums ${classico ? '' : 'font-extrabold text-teal-950'}`}>
                  {String(u.valor).padStart(2, '0')}
                </div>
                <div
                  className={`text-[10px] uppercase tracking-wider mt-1 ${
                    classico ? 'text-[#8C7A5C]' : 'text-teal-700/60 font-bold'
                  }`}
                >
                  {u.rotulo}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className={`text-xs ${classico ? 'text-[#8C7A5C]' : 'text-teal-700/50 font-medium'}`}>
          Guarde este link e volte no dia.
        </p>
      </div>
    </div>
  );
}
