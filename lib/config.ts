/**
 * Configuração central do produto.
 * Valores de negócio ficam aqui para serem alterados em um lugar só
 * (preço, perguntas guiadas, data padrão de revelação).
 */

export const APP_NAME = 'Recado Surpresa';

/**
 * Preço único do MVP (decisão D5 — placeholder R$ 14,90 até o valor final).
 * O valor cobrado é SEMPRE este, definido no servidor; nada vindo do client altera o preço.
 */
export const PRECO_UNICO = 14.9;

export const PRECO_UNICO_FORMATADO = `R$ ${PRECO_UNICO.toFixed(2).replace('.', ',')}`;

/** Data padrão de revelação: Dia dos Pais 2026, meia-noite no horário de Brasília. */
export const DATA_REVELACAO_PADRAO = '2026-08-09T00:00:00-03:00';

/** E-mail de suporte exibido na landing, FAQ e termos. */
export const SUPORTE_EMAIL =
  process.env.NEXT_PUBLIC_SUPORTE_EMAIL || 'pphenriquelim4@gmail.com';

/** Retenção (RNF04): páginas pagas ficam 12 meses no ar; rascunhos são apagados após 7 dias. */
export const RETENCAO_PAGA_MESES = 12;
export const RETENCAO_RASCUNHO_DIAS = 7;

export type TemaId = 'classico' | 'descontraido';

export const TEMAS: { id: TemaId; nome: string; descricao: string }[] = [
  {
    id: 'classico',
    nome: 'Clássico',
    descricao: 'Tipografia elegante, cores sóbrias — para pais tradicionais.',
  },
  {
    id: 'descontraido',
    nome: 'Descontraído',
    descricao: 'Cores quentes e leves, jeitão de álbum de família.',
  },
];

export interface PerguntaGuiada {
  id: string;
  /** A pergunta como um amigo faria (visão §7 — nunca formulário de RH). */
  pergunta: string;
  /** Título do bloco correspondente na página final. */
  titulo: string;
  placeholder: string;
}

/**
 * Roteiro das perguntas guiadas (visão §2, gatilho 1 — Efeito IKEA).
 * Roteiro inicial pendente de aprovação (decisão D9) — trocar aqui não exige
 * mudança em nenhum outro arquivo.
 */
export const PERGUNTAS_GUIADAS: PerguntaGuiada[] = [
  {
    id: 'frase',
    pergunta:
      'Qual frase ele vive repetindo — aquela que você até revira os olhos, mas que é a cara dele?',
    titulo: 'A frase que é a sua cara',
    placeholder: 'Escreve do jeito que ele fala...',
  },
  {
    id: 'orgulho',
    pergunta:
      'Conta uma vez em que ele demonstrou orgulho de você sem dizer uma palavra.',
    titulo: 'Você achou que eu não vi, mas…',
    placeholder: 'Pode ser um olhar, um gesto, um silêncio...',
  },
  {
    id: 'lembranca',
    pergunta:
      'Se você pudesse guardar só uma lembrança de vocês dois, qual seria?',
    titulo: 'A lembrança que eu guardo',
    placeholder: 'Onde vocês estavam? O que aconteceu?',
  },
  {
    id: 'nunca_disse',
    pergunta:
      'O que você quer que ele saiba, mas nunca conseguiu falar olhando pra ele?',
    titulo: 'O que eu nunca te disse',
    placeholder: 'Aqui ninguém está olhando. Pode falar.',
  },
];

/** Mínimo de blocos respondidos (ou mensagem final) para poder avançar. */
export const MIN_BLOCOS = 2;

/** Emojis disponíveis para a reação do destinatário (RF16) — sóbrios, poucos. */
export const EMOJIS_REACAO = ['❤️', '👏', '🥹', '😂'];
