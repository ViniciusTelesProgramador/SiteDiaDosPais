import * as THREE from 'three';

/**
 * Cena Three.js do "Recado em Movimento" (Fase 16) — o finale do storytime:
 * junta fotos, frases e a capa da música numa colagem 3D que "pousa" numa
 * composição final estática. Lógica pura (sem React) para ficar fácil de
 * testar/reaproveitar entre o loop de animação e a captura do frame final.
 *
 * Anti-cringe (visão §7): sem partículas, sem confete — só as fotos e o
 * texto do próprio comprador, pousando com um leve respiro. Câmera quase
 * parada, nunca vertigem.
 */

export type ItemRecap =
  | { tipo: 'foto'; url: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'musica'; capaUrl: string };

export interface CenaRecap {
  /** Duração da montagem (segundos) — depois disso, tudo já está parado. */
  duracaoMontagem: number;
  /** Avança a animação pro instante `tempoSegundos` e renderiza um frame. */
  renderizarFrame: (tempoSegundos: number) => void;
  /** Pula direto pro estado final, parado (prefers-reduced-motion). */
  saltarParaFinal: () => void;
  redimensionar: (largura: number, altura: number) => void;
  dispose: () => void;
}

const DURACAO_MONTAGEM = 4.2;
const ATRASO_POR_ITEM = 0.22;

interface ItemAnimado {
  objeto: THREE.Object3D;
  material: THREE.Material;
  posInicial: THREE.Vector3;
  posFinal: THREE.Vector3;
  rotInicial: THREE.Euler;
  rotFinal: THREE.Euler;
  atraso: number;
}

/** Hash determinístico simples — layout "orgânico" sem Math.random(). */
function pseudoAleatorio(seed: number): number {
  return Math.sin(seed * 12.9898) * 43758.5453 % 1;
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
    img.src = url;
  });
}

/** Recorta a textura como "cover" (quadrado), sem distorcer a foto. */
function aplicarCoverQuadrado(texture: THREE.Texture, img: HTMLImageElement) {
  const aspecto = img.width / img.height;
  if (aspecto > 1) {
    texture.repeat.set(1 / aspecto, 1);
    texture.offset.set((1 - 1 / aspecto) / 2, 0);
  } else {
    texture.repeat.set(1, aspecto);
    texture.offset.set(0, (1 - aspecto) / 2);
  }
}

function desenharTextoCanvas(
  texto: string,
  classico: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = classico ? '#FAF8F5' : '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = classico ? '#D1C9BA' : '#99F0DF';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  ctx.fillStyle = classico ? '#2C2A27' : '#0f766e';
  ctx.textAlign = 'center';
  ctx.font = classico
    ? 'italic 42px Georgia, "Times New Roman", serif'
    : '600 38px Arial, sans-serif';

  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let linhaAtual = '';
  for (const palavra of palavras) {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > canvas.width - 80 && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = tentativa;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);

  const alturaLinha = 54;
  const yInicial = canvas.height / 2 - ((linhas.length - 1) * alturaLinha) / 2;
  linhas.slice(0, 5).forEach((linha, i) => {
    ctx.fillText(`"${linha}"`, canvas.width / 2, yInicial + i * alturaLinha);
  });

  return canvas;
}

function desenharMusicaCanvas(img: HTMLImageElement, classico: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = classico ? '#FAF8F5' : '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tamanhoCapa = 340;
  const x = (canvas.width - tamanhoCapa) / 2;
  const y = 40;
  const escala = Math.max(tamanhoCapa / img.width, tamanhoCapa / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, tamanhoCapa, tamanhoCapa);
  ctx.clip();
  ctx.drawImage(img, x - (w - tamanhoCapa) / 2, y - (h - tamanhoCapa) / 2, w, h);
  ctx.restore();

  ctx.fillStyle = classico ? '#8C7A5C' : '#0f766e';
  ctx.textAlign = 'center';
  ctx.font = '600 34px Georgia, "Times New Roman", serif';
  ctx.fillText('🎵 Nossa música', canvas.width / 2, y + tamanhoCapa + 60);

  return canvas;
}

/** Posição/rotação final de cada item — colagem levemente orgânica. */
function layoutFinal(indice: number, total: number) {
  const colunas = Math.ceil(Math.sqrt(total));
  const linhas = Math.ceil(total / colunas);
  const col = indice % colunas;
  const linha = Math.floor(indice / colunas);
  const espacamento = 2.5;

  const jitterX = pseudoAleatorio(indice * 3.1) * 0.5;
  const jitterY = pseudoAleatorio(indice * 7.7) * 0.5;
  const rotZ = (pseudoAleatorio(indice * 5.3) - 0.5) * 0.3;

  return {
    posicao: new THREE.Vector3(
      (col - (colunas - 1) / 2) * espacamento + jitterX,
      -(linha - (linhas - 1) / 2) * espacamento + jitterY,
      pseudoAleatorio(indice * 9.1) * 0.6
    ),
    rotacao: new THREE.Euler(0, 0, rotZ),
  };
}

export async function criarCenaRecap(params: {
  canvas: HTMLCanvasElement;
  itens: ItemRecap[];
  classico: boolean;
  largura: number;
  altura: number;
}): Promise<CenaRecap> {
  const { canvas, itens, classico, largura, altura } = params;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(largura, altura, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, largura / altura, 0.1, 100);
  const camPosInicial = new THREE.Vector3(-1.2, 0.8, 10.5);
  const camPosFinal = new THREE.Vector3(0, 0, 8.2);
  camera.position.copy(camPosInicial);
  camera.lookAt(0, 0, 0);

  const itensAnimados: ItemAnimado[] = [];
  const texturas: THREE.Texture[] = [];
  const geometrias: THREE.BufferGeometry[] = [];

  await Promise.all(
    itens.map(async (item, indice) => {
      let textura: THREE.Texture;
      let larguraPlano = 1.9;
      let alturaPlano = 1.9;

      try {
        if (item.tipo === 'foto') {
          const img = await carregarImagem(item.url);
          textura = new THREE.Texture(img);
          aplicarCoverQuadrado(textura, img);
          textura.needsUpdate = true;
        } else if (item.tipo === 'musica') {
          const img = await carregarImagem(item.capaUrl);
          const canvasDesenhado = desenharMusicaCanvas(img, classico);
          textura = new THREE.CanvasTexture(canvasDesenhado);
        } else {
          const canvasDesenhado = desenharTextoCanvas(item.texto, classico);
          textura = new THREE.CanvasTexture(canvasDesenhado);
          larguraPlano = 2.6;
          alturaPlano = 1.46;
        }
      } catch (err) {
        console.error('[RecapScene] Falha ao carregar item, pulando:', err);
        return;
      }

      texturas.push(textura);

      // Moldura (papel) levemente maior atrás da foto/carta.
      const molduraGeo = new THREE.PlaneGeometry(larguraPlano + 0.16, alturaPlano + 0.16);
      const molduraMat = new THREE.MeshBasicMaterial({
        color: classico ? 0xfaf8f5 : 0xffffff,
        transparent: true,
      });
      const moldura = new THREE.Mesh(molduraGeo, molduraMat);
      moldura.position.z = -0.02;

      const geo = new THREE.PlaneGeometry(larguraPlano, alturaPlano);
      const mat = new THREE.MeshBasicMaterial({ map: textura, transparent: true, opacity: 0 });
      const plano = new THREE.Mesh(geo, mat);

      const grupo = new THREE.Group();
      grupo.add(moldura);
      grupo.add(plano);
      geometrias.push(molduraGeo, geo);

      const { posicao, rotacao } = layoutFinal(indice, itens.length);
      const direcao = posicao.clone().normalize();
      const posInicial = posicao
        .clone()
        .add(direcao.multiplyScalar(6))
        .add(new THREE.Vector3(0, 0, 4));

      grupo.position.copy(posInicial);
      grupo.rotation.set(0, 0, rotacao.z * 3);
      scene.add(grupo);

      itensAnimados.push({
        objeto: grupo,
        material: mat,
        posInicial,
        posFinal: posicao,
        rotInicial: new THREE.Euler(0, 0, rotacao.z * 3),
        rotFinal: rotacao,
        atraso: indice * ATRASO_POR_ITEM,
      });
    })
  );

  const duracaoIndividual = 1.6;
  const duracaoTotal = DURACAO_MONTAGEM;

  function aplicarProgresso(item: ItemAnimado, progresso: number) {
    const suavizado = THREE.MathUtils.smootherstep(progresso, 0, 1);
    item.objeto.position.lerpVectors(item.posInicial, item.posFinal, suavizado);
    item.objeto.rotation.z = THREE.MathUtils.lerp(
      item.rotInicial.z,
      item.rotFinal.z,
      suavizado
    );
    (item.material as THREE.MeshBasicMaterial).opacity = suavizado;
  }

  function renderizarFrame(tempoSegundos: number) {
    for (const item of itensAnimados) {
      const progresso = THREE.MathUtils.clamp(
        (tempoSegundos - item.atraso) / duracaoIndividual,
        0,
        1
      );
      aplicarProgresso(item, progresso);
    }

    const progressoCamera = THREE.MathUtils.clamp(tempoSegundos / duracaoTotal, 0, 1);
    camera.position.lerpVectors(
      camPosInicial,
      camPosFinal,
      THREE.MathUtils.smootherstep(progressoCamera, 0, 1)
    );
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function saltarParaFinal() {
    for (const item of itensAnimados) aplicarProgresso(item, 1);
    camera.position.copy(camPosFinal);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function redimensionar(novaLargura: number, novaAltura: number) {
    camera.aspect = novaLargura / novaAltura;
    camera.updateProjectionMatrix();
    renderer.setSize(novaLargura, novaAltura, false);
  }

  function dispose() {
    for (const g of geometrias) g.dispose();
    for (const t of texturas) t.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    renderer.dispose();
  }

  return { duracaoMontagem: duracaoTotal, renderizarFrame, saltarParaFinal, redimensionar, dispose };
}
