/**
 * Gera um slug aleatório, não sequencial e não adivinhável, usando CSPRNG
 * (RNF03). Alfabeto sem caracteres ambíguos (0/o, 1/l) para facilitar
 * digitação manual se necessário.
 */
export function generateShortSlug(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** Validação simples de e-mail — suficiente para o formulário e as rotas. */
export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Extrai o ID de 11 caracteres de um link do YouTube (watch?v=, youtu.be/,
 * embed/), ignorando parâmetros extras (&t=, &list=...). Retorna null se o
 * link não for reconhecido (Fase 6 — trilha do YouTube).
 */
export function extrairYoutubeId(url: string): string | null {
  const match = url
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
