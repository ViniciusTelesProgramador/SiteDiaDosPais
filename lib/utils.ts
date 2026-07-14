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
