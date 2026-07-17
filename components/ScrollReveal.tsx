'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Fade + translateY ao entrar na viewport (Fase 8) — mesmo padrão do antigo
 * `Reveal` que existia no PageRenderer antes do modo storytime (Fase 6),
 * generalizado para qualquer seção da LP/formulário. Respeita
 * prefers-reduced-motion: quem pede menos movimento vê o conteúdo direto,
 * sem observer nem transição (ui-ux-pro-max, prioridade 1 — Acessibilidade).
 */
export default function ScrollReveal({
  atrasoMs = 0,
  children,
  className = '',
}: {
  atrasoMs?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [reduzMovimento, setReduzMovimento] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setReduzMovimento(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduzMovimento) {
      setVisivel(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduzMovimento]);

  return (
    <div
      ref={ref}
      className={`${
        reduzMovimento
          ? ''
          : `transition-all duration-700 ease-out ${
              visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`
      } ${className}`}
      style={!reduzMovimento && atrasoMs ? { transitionDelay: `${atrasoMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
