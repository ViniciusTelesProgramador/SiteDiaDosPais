/**
 * Compressão de imagens no client (RF09/T2.2): redimensiona para no máximo
 * 1600px no maior lado e reencoda em WebP (fallback JPEG, qualidade 0.8)
 * antes do upload — garante o RNF01 (2s em 4G) e controla o egress do Supabase.
 *
 * createImageBitmap com imageOrientation:'from-image' respeita o EXIF
 * (fotos de iPhone); onde não suportado, cai no decode via <img>.
 */

const MAX_DIMENSAO = 1600;
const QUALIDADE = 0.8;

async function decodificar(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // HEIC ou formato não suportado pelo createImageBitmap — tenta via <img>
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          'Não foi possível ler esta imagem. Se for uma foto HEIC do iPhone, converta para JPEG (Ajustes > Câmera > Formatos > Mais compatível) ou envie outra foto.'
        )
      );
    };
    img.src = url;
  });
}

function dimensoes(largura: number, altura: number): { w: number; h: number } {
  const maior = Math.max(largura, altura);
  if (maior <= MAX_DIMENSAO) return { w: largura, h: altura };
  const fator = MAX_DIMENSAO / maior;
  return { w: Math.round(largura * fator), h: Math.round(altura * fator) };
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

/**
 * Comprime uma foto. Retorna um File novo (webp ou jpeg) pronto para upload.
 * Lança erro com mensagem amigável se a imagem não puder ser lida.
 */
export async function comprimirFoto(file: File): Promise<File> {
  const imagem = await decodificar(file);
  const largura = 'width' in imagem ? imagem.width : 0;
  const altura = 'height' in imagem ? imagem.height : 0;
  if (!largura || !altura) {
    throw new Error('Não foi possível ler as dimensões da imagem.');
  }

  const { w, h } = dimensoes(largura, altura);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não suportado neste navegador.');
  ctx.drawImage(imagem, 0, 0, w, h);
  if ('close' in imagem) imagem.close();

  // WebP primeiro; Safari antigo cai para JPEG
  let blob = await paraBlob(canvas, 'image/webp', QUALIDADE);
  let ext = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await paraBlob(canvas, 'image/jpeg', QUALIDADE);
    ext = 'jpg';
  }
  if (!blob) throw new Error('Falha ao comprimir a imagem.');

  const nomeBase = file.name.replace(/\.[^.]+$/, '') || 'foto';
  return new File([blob], `${nomeBase}.${ext}`, { type: blob.type });
}
