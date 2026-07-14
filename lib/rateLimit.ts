import 'server-only';

/**
 * Rate limit simples em memória (por instância serverless — melhor esforço,
 * suficiente para o MVP conforme T1.5/T2.7). Sem infra externa.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Retorna true se a chamada é permitida; false se estourou o limite.
 * @param key   identificador (ex.: `recuperar:${ip}` ou `reacao:${slug}`)
 * @param limit máximo de chamadas dentro da janela
 * @param windowMs janela em milissegundos
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > limit) return false;
  return true;
}

/** Limpa entradas expiradas de tempos em tempos para não crescer sem limite. */
setInterval(() => {
  const now = Date.now();
  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (now > bucket.resetAt) buckets.delete(key);
  });
}, 10 * 60 * 1000).unref?.();
