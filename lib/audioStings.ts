'use client';

/**
 * Pontuação sonora nos momentos-chave do storytime (Fase 13, item 8) — um
 * acorde curto e discreto sintetizado via Web Audio API, sem nenhum
 * arquivo de áudio (zero risco de licença). Chamar sempre dentro do
 * próprio clique/toque que avança o slide (mesmo call stack do gesto do
 * usuário — necessário pra política de autoplay dos navegadores).
 */

let contextoCompartilhado: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!contextoCompartilhado) {
    contextoCompartilhado = new AudioContextClass();
  }
  if (contextoCompartilhado.state === 'suspended') {
    contextoCompartilhado.resume();
  }
  return contextoCompartilhado;
}

function tocarTom(
  contexto: AudioContext,
  frequencia: number,
  atrasoSeg: number,
  duracaoSeg: number,
  ganhoMax: number
) {
  const osc = contexto.createOscillator();
  const gain = contexto.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequencia;

  const inicio = contexto.currentTime + atrasoSeg;
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.linearRampToValueAtTime(ganhoMax, inicio + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracaoSeg);

  osc.connect(gain).connect(contexto.destination);
  osc.start(inicio);
  osc.stop(inicio + duracaoSeg + 0.1);
}

export function tocarSting(tipo: 'climax' | 'fechamento') {
  try {
    const contexto = obterContexto();
    if (!contexto) return;

    if (tipo === 'climax') {
      tocarTom(contexto, 392.0, 0, 1.8, 0.05); // Sol4
      tocarTom(contexto, 493.88, 0.06, 1.8, 0.04); // Si4
    } else {
      tocarTom(contexto, 392.0, 0, 2.2, 0.05); // Sol4
      tocarTom(contexto, 493.88, 0.05, 2.2, 0.04); // Si4
      tocarTom(contexto, 587.33, 0.1, 2.2, 0.035); // Ré5
    }
  } catch (err) {
    console.error('[audioStings] Erro ao tocar sting:', err);
  }
}
