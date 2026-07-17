/**
 * Loader singleton da IFrame Player API do YouTube (Fase 6 — trilha do
 * YouTube). Uso exclusivo em componentes de client — carrega o script uma
 * única vez, mesmo se o MusicPlayer montar/desmontar várias vezes durante a
 * navegação client-side.
 */

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementOuId: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

let apiPromise: Promise<NonNullable<Window['YT']>> | null = null;

export function carregarYoutubeApi(): Promise<NonNullable<Window['YT']>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API só carrega no navegador.'));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve(window.YT!);
    };

    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}
