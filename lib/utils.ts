/**
 * Generates a short, random, non-sequential alphanumeric slug.
 * Ex: a7f3b9c2
 */
export function generateShortSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
