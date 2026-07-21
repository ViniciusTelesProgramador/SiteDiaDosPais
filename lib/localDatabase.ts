import type { Bloco, Midia } from '@/lib/types';

/**
 * Modo de simulação local (APENAS desenvolvimento, sem credenciais Supabase):
 * rascunhos ficam em IndexedDB com as fotos em base64. Em produção este
 * caminho nunca é usado — o gatilho de simulação do webhook responde 404.
 */

export interface PageDraft {
  id: string;
  email_comprador?: string;
  nome_destinatario: string;
  mensagem?: string | null;
  blocos?: Bloco[] | null;
  /** Formato novo ([{url, legenda}]) ou legado (string[] em base64/URL). */
  midias: Array<Midia | string>;
  tema: string;
  pago: boolean;
  plano: string;
  slug?: string;
  revelar_em?: string | null;
  reacao_emoji?: string | null;
  reacao_texto?: string | null;
  musica_youtube_id?: string | null;
  audio_url?: string | null;
  visualizacoes?: number;
  isMock?: boolean;
  criado_em?: string;
}

const DB_NAME = 'RecadoSurpresaDB';
const STORE_NAME = 'drafts';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const target = event.target as IDBOpenDBRequest;
      resolve(target.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveDraftToIndexedDB(_id: string, data: PageDraft): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDraftFromIndexedDB(id: string): Promise<PageDraft | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching from IndexedDB:', err);
    return null;
  }
}

export async function getDraftBySlugFromIndexedDB(slug: string): Promise<PageDraft | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const list = (request.result || []) as PageDraft[];
        const found = list.find((item) => item.slug === slug && item.pago);
        resolve(found || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching by slug from IndexedDB:', err);
    return null;
  }
}
