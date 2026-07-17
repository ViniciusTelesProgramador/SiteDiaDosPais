/**
 * Gera o card de compartilhamento pros Stories (Fase 7) — Canvas 2D puro,
 * sem dependência nova. Uso exclusivo em client (precisa de document/Image).
 */

export interface DadosCardCompartilhamento {
  nomeDestinatario: string;
  frase?: string | null;
  fotoUrl?: string | null;
  classico: boolean;
}

const LARGURA = 1080;
const ALTURA = 1920;

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a foto.'));
    img.src = url;
  });
}

/** Desenha a imagem cortada (cover) num retângulo, como object-fit: cover. */
function desenharImagemCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  largura: number,
  altura: number
) {
  const escala = Math.max(largura / img.width, altura / img.height);
  const larguraDesenho = img.width * escala;
  const alturaDesenho = img.height * escala;
  const offsetX = x - (larguraDesenho - largura) / 2;
  const offsetY = y - (alturaDesenho - altura) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, largura, altura);
  ctx.clip();
  ctx.drawImage(img, offsetX, offsetY, larguraDesenho, alturaDesenho);
  ctx.restore();
}

/** Quebra texto em linhas que cabem em `larguraMax` e desenha centralizado. */
function desenharTextoQuebrado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  centroX: number,
  y: number,
  larguraMax: number,
  alturaLinha: number
): number {
  const palavras = texto.split(' ');
  let linha = '';
  let yAtual = y;

  for (const palavra of palavras) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > larguraMax && linha) {
      ctx.fillText(linha, centroX, yAtual);
      linha = palavra;
      yAtual += alturaLinha;
    } else {
      linha = tentativa;
    }
  }
  if (linha) {
    ctx.fillText(linha, centroX, yAtual);
    yAtual += alturaLinha;
  }
  return yAtual;
}

export async function gerarCardCompartilhamento(
  dados: DadosCardCompartilhamento
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não suportado neste navegador.');

  const corTitulo = dados.classico ? '#8C7A5C' : '#0f766e';
  const corTexto = dados.classico ? '#2C2A27' : '#134e4a';
  const corFrase = dados.classico ? '#3A3530' : '#134e4a';

  // Fundo
  if (dados.classico) {
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.strokeStyle = '#D1C9BA';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, LARGURA - 72, ALTURA - 72);
  } else {
    const gradiente = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
    gradiente.addColorStop(0, '#E6F4F1');
    gradiente.addColorStop(1, '#FDF6E2');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  let y = 280;

  // Foto (opcional, com rede de segurança própria — nunca quebra o card)
  if (dados.fotoUrl) {
    try {
      const img = await carregarImagem(dados.fotoUrl);
      const tamanho = 660;
      const x = (LARGURA - tamanho) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 20, y - 20, tamanho + 40, tamanho + 60);
      desenharImagemCover(ctx, img, x, y, tamanho, tamanho);
      y += tamanho + 100;
    } catch (err) {
      console.error('[ShareCard] Foto não pôde ser carregada, seguindo sem ela:', err);
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = corTitulo;
  ctx.font = '600 30px Georgia, "Times New Roman", serif';
  ctx.fillText('COM AMOR PARA', LARGURA / 2, y);
  y += 78;

  ctx.fillStyle = corTexto;
  ctx.font = '400 78px Georgia, "Times New Roman", serif';
  ctx.fillText(dados.nomeDestinatario, LARGURA / 2, y);
  y += 90;

  if (dados.frase?.trim()) {
    ctx.font = 'italic 36px Georgia, "Times New Roman", serif';
    ctx.fillStyle = corFrase;
    y = desenharTextoQuebrado(ctx, `"${dados.frase.trim()}"`, LARGURA / 2, y, LARGURA - 220, 50);
  }

  // Rodapé — marca do site (crescimento, não link privado)
  ctx.fillStyle = corTitulo;
  ctx.font = '600 32px Georgia, "Times New Roman", serif';
  ctx.fillText('❤ Recado Surpresa', LARGURA / 2, ALTURA - 150);
  ctx.font = '400 26px Georgia, "Times New Roman", serif';
  ctx.fillText(
    typeof window !== 'undefined' ? window.location.host : 'recadosurpresa.com',
    LARGURA / 2,
    ALTURA - 104
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))),
      'image/png',
      0.95
    );
  });
}
