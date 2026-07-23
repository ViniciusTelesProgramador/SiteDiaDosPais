/**
 * Compartilhar/baixar um arquivo (imagem ou vídeo) gerado no client — Fase 7
 * (card de Stories) e Fase 16 (finale 3D). Sempre tenta o share nativo do
 * celular (arquivo anexado); sem suporte, baixa o arquivo direto. Nunca
 * lança em caso de cancelamento do usuário (AbortError).
 */
export async function compartilharArquivo(
  blob: Blob,
  nomeArquivo: string,
  opts: { titulo: string; texto: string }
): Promise<void> {
  const arquivo = new File([blob], nomeArquivo, { type: blob.type });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({
      files: [arquivo],
      title: opts.titulo,
      text: opts.texto,
      url: origin,
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
