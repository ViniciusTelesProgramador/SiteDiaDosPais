/** Tipos compartilhados entre client, rotas de servidor e componentes. */

export interface Midia {
  url: string;
  legenda?: string;
}

export interface Bloco {
  pergunta_id: string;
  titulo: string;
  texto: string;
}

/** Mensagem curta de outra pessoa (Fase 5 — Surpresa Coletiva). */
export interface Contribuicao {
  id: string;
  nome: string;
  relacao: string | null;
  texto: string;
  aprovado: boolean;
  criado_em: string;
}

export interface Pagina {
  id: string;
  slug: string | null;
  email_comprador: string | null;
  nome_destinatario: string;
  mensagem: string | null;
  blocos: Bloco[] | null;
  /** Pode ser o formato novo ([{url, legenda}]) ou legado (string[]). */
  midias: Array<Midia | string>;
  tema: string;
  plano: string;
  pago: boolean;
  pago_em: string | null;
  revelar_em: string | null;
  expira_em: string | null;
  visualizacoes: number;
  primeira_visualizacao_em: string | null;
  reacao_emoji: string | null;
  reacao_texto: string | null;
  reacao_em: string | null;
  lembrete_enviado_em: string | null;
  musica_youtube_id: string | null;
  criado_em: string;
}

/** Normaliza `midias` para o formato novo, aceitando o legado (array de URLs). */
export function normalizarMidias(
  midias: Array<Midia | string> | null | undefined
): Midia[] {
  if (!midias) return [];
  return midias.map((m) => (typeof m === 'string' ? { url: m } : m));
}

/** Normaliza o tema legado `divertido` para o nome canônico `descontraido`. */
export function normalizarTema(tema: string | null | undefined): 'classico' | 'descontraido' {
  return tema === 'divertido' || tema === 'descontraido' ? 'descontraido' : 'classico';
}

/** true se a página tem revelação agendada ainda no futuro. */
export function aindaNaoRevelada(revelarEm: string | null | undefined): boolean {
  if (!revelarEm) return false;
  return new Date(revelarEm).getTime() > Date.now();
}

/**
 * Ordena os blocos na ordem narrativa da página (Fase 4): riso → memória →
 * aprofundamento → clímax. Ids desconhecidos mantêm a posição relativa
 * entre si, antes do clímax.
 */
export function ordenarBlocosNarrativa(blocos: Bloco[] | null | undefined, ordem: string[]): Bloco[] {
  if (!blocos) return [];
  return [...blocos].sort((a, b) => {
    const ia = ordem.indexOf(a.pergunta_id);
    const ib = ordem.indexOf(b.pergunta_id);
    return (ia === -1 ? ordem.length - 1 : ia) - (ib === -1 ? ordem.length - 1 : ib);
  });
}
