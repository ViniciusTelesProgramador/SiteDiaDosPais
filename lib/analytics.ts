'use client';

import { track as vercelTrack } from '@vercel/analytics';

/**
 * Eventos de funil (RF14/T2.5), enviados ao Vercel Analytics.
 * Nomes canônicos do funil:
 *   visitou_landing -> iniciou_formulario -> chegou_preview ->
 *   iniciou_pagamento -> pagou
 * Loop viral: compartilhou, reagiu.
 *
 * UTM: capturada na landing e preservada em sessionStorage até a conversão.
 */

const UTM_KEY = 'rs_utm';

export function capturarUTM(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
  } catch {
    // sessionStorage indisponível (modo privado antigo) — segue sem UTM
  }
}

function utmSalva(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function track(evento: string, props?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  const payload = { ...utmSalva(), ...props };
  try {
    vercelTrack(evento, payload);
  } catch {
    // analytics nunca pode quebrar o app
  }
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[analytics] ${evento}`, payload);
  }
}
