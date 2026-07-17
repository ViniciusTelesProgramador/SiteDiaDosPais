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
 * Roteiro aprovado em 14/07/2026 (Fase 4). Trocar aqui não exige mudança em
 * nenhum outro arquivo. O teste de cada pergunta: é impossível respondê-la
 * com uma frase de cartão de presente?
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
    id: 'hoje_entendo',
    pergunta:
      'O que ele fazia que te irritava quando você era criança — e que hoje, adulto, você entende?',
    titulo: 'Hoje eu entendo',
    placeholder: 'Pode ser pequeno: um hábito, uma regra, um jeito de fazer as coisas...',
  },
  {
    id: 'nao_vi',
    pergunta:
      'Lembra de uma vez em que ele estava exausto e mesmo assim fez algo por você? Ele achou que ninguém notou.',
    titulo: 'Você achou que eu não vi',
    placeholder: 'Conta esse dia do jeito que você lembra...',
  },
  {
    id: 'nunca_disse',
    pergunta:
      'O que você nunca conseguiu falar olhando pra ele? Escreve aqui. Ele vai ler.',
    titulo: 'O que eu nunca te disse',
    placeholder: 'Aqui ninguém está olhando. Pode falar.',
  },
];

/**
 * Ordem narrativa dos blocos na página (Fase 4): riso primeiro (baixa a
 * guarda), aprofundamento no meio, confissão como clímax no fim. Ids
 * legados ('orgulho', 'lembranca') mantidos para páginas antigas.
 */
export const ORDEM_NARRATIVA = [
  'frase',
  'orgulho',
  'lembranca',
  'hoje_entendo',
  'nao_vi',
  'nunca_disse',
];

/** Bloco tratado como clímax visual da página (mais respiro, tipografia maior). */
export const BLOCO_CLIMAX = 'nunca_disse';

/** Tamanho máximo do texto de reação do destinatário (RF16). */
export const MAX_REACAO_TEXTO = 280;

/** Mínimo de blocos respondidos (ou mensagem final) para poder avançar. */
export const MIN_BLOCOS = 2;

/** Emojis disponíveis para a reação do destinatário (RF16) — sóbrios, poucos. */
export const EMOJIS_REACAO = ['❤️', '👏', '🥹', '😂'];

/**
 * Surpresa Coletiva (Fase 5): número máximo de pessoas convidadas a
 * contribuir com uma mensagem curta na página (Lei de Hick — poucas vozes
 * bem colocadas, não um mural aberto).
 */
export const MAX_CONTRIBUICOES = 6;
export const MAX_CONTRIBUICAO_TEXTO = 400;
export const MAX_NOME_CONTRIBUIDOR = 60;
export const MAX_RELACAO_CONTRIBUIDOR = 40;
