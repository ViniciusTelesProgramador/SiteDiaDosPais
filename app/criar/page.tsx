'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveDraftToIndexedDB, getDraftFromIndexedDB } from '@/lib/localDatabase';
import { comprimirFoto } from '@/lib/imagem';
import { isEmailValido, extrairYoutubeId } from '@/lib/utils';
import { track } from '@/lib/analytics';
import {
  PERGUNTAS_GUIADAS,
  MIN_BLOCOS,
  TEMAS,
  DATA_REVELACAO_PADRAO,
  PRECO_UNICO_FORMATADO,
  type TemaId,
} from '@/lib/config';
import type { Bloco, Midia } from '@/lib/types';
import PageRenderer from '@/components/PageRenderer';
import GravadorMensagem, { type MensagemGravada } from '@/components/GravadorMensagem';
import {
  Heart,
  Upload,
  Trash2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  X,
  Check,
  CalendarHeart,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface FotoForm {
  /** Arquivo novo (a enviar) — exclusivo com existingUrl. */
  file?: File;
  /** Foto já enviada anteriormente (modo de edição) — mantida sem novo upload. */
  existingUrl?: string;
  previewUrl: string;
  legenda: string;
  /** Ano/idade da lembrança (Fase 13, item 7 — linha do tempo), opcional. */
  ano: string;
}

type Etapa = 'dados' | 'perguntas' | 'fechamento' | 'fotos';

function CriarPresenteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editandoId = searchParams.get('editar');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Estado do formulário ----
  const [email, setEmail] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [fotos, setFotos] = useState<FotoForm[]>([]);
  const [tema, setTema] = useState<TemaId>('classico');
  const [revelarModo, setRevelarModo] = useState<'diadospais' | 'agora'>('diadospais');
  const [musicaUrl, setMusicaUrl] = useState('');
  const [mensagemGravada, setMensagemGravada] = useState<MensagemGravada>(null);
  /** Áudio/vídeo já salvo no rascunho (modo de edição) — substituído se regravar. */
  const [mensagemExistente, setMensagemExistente] = useState<{ tipo: 'voz' | 'video'; url: string } | null>(
    null
  );
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // ---- Estado de UI ----
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [loading, setLoading] = useState(false);
  const [comprimindo, setComprimindo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [carregandoRascunho, setCarregandoRascunho] = useState(Boolean(editandoId));
  const [erroRascunho, setErroRascunho] = useState<string | null>(null);

  useEffect(() => {
    track('iniciou_formulario');
  }, []);

  // ---- Modo de edição: carrega o rascunho existente e pré-preenche tudo ----
  useEffect(() => {
    if (!editandoId) return;

    const carregar = async () => {
      try {
        const localDraft = await getDraftFromIndexedDB(editandoId);
        const draft = localDraft
          ? localDraft
          : await (async () => {
              const response = await fetch(`/api/paginas/${editandoId}`);
              if (!response.ok) throw new Error('Não foi possível carregar o rascunho.');
              return response.json();
            })();

        if (draft.pago) {
          setErroRascunho('Essa página já foi paga e não pode mais ser editada.');
          return;
        }

        setEmail(draft.email_comprador || '');
        setNomePai(draft.nome_destinatario || '');
        setRespostas(
          (draft.blocos || []).reduce(
            (acc: Record<string, string>, b: Bloco) => ({ ...acc, [b.pergunta_id]: b.texto }),
            {}
          )
        );
        setMensagem(draft.mensagem || '');
        setTema(draft.tema === 'descontraido' ? 'descontraido' : 'classico');
        setRevelarModo(draft.revelar_em ? 'diadospais' : 'agora');
        setMusicaUrl(draft.musica_youtube_id ? `https://youtu.be/${draft.musica_youtube_id}` : '');
        setFotos(
          (draft.midias || []).map((m: Midia) => ({
            existingUrl: m.url,
            previewUrl: m.url,
            legenda: m.legenda || '',
            ano: m.ano || '',
          }))
        );
        if (draft.video_url) {
          setMensagemExistente({ tipo: 'video', url: draft.video_url });
        } else if (draft.audio_url) {
          setMensagemExistente({ tipo: 'voz', url: draft.audio_url });
        }
      } catch (err) {
        console.error(err);
        setErroRascunho('Não foi possível carregar o rascunho. Confira o link ou crie um novo.');
      } finally {
        setCarregandoRascunho(false);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editandoId]);

  const blocosPreenchidos: Bloco[] = PERGUNTAS_GUIADAS.filter((p) =>
    respostas[p.id]?.trim()
  ).map((p) => ({
    pergunta_id: p.id,
    titulo: p.titulo,
    texto: respostas[p.id].trim(),
  }));

  const conteudoOk = blocosPreenchidos.length >= MIN_BLOCOS || mensagem.trim().length > 0;

  const midiasPreview: Midia[] = fotos.map((f) => ({
    url: f.previewUrl,
    legenda: f.legenda.trim() || undefined,
    ano: f.ano.trim() || undefined,
  }));

  const musicaYoutubeId = musicaUrl.trim() ? extrairYoutubeId(musicaUrl) : null;
  const audioPreviewUrl = useMemo(
    () => (mensagemGravada?.tipo === 'voz' ? URL.createObjectURL(mensagemGravada.blob) : null),
    [mensagemGravada]
  );
  const videoPreviewUrl = useMemo(
    () => (mensagemGravada?.tipo === 'video' ? URL.createObjectURL(mensagemGravada.blob) : null),
    [mensagemGravada]
  );

  // ---- Fotos (com compressão — RF09/T2.2) ----
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const arquivos = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (fotos.length + arquivos.length > 5) {
      setError('Você pode enviar no máximo 5 fotos.');
      return;
    }

    setComprimindo(true);
    try {
      for (const arquivo of arquivos) {
        if (!arquivo.type.startsWith('image/')) {
          setError(`O arquivo ${arquivo.name} não é uma imagem válida.`);
          continue;
        }
        if (arquivo.size > 25 * 1024 * 1024) {
          setError(`A imagem ${arquivo.name} é grande demais (máx. 25MB).`);
          continue;
        }
        try {
          const comprimida = await comprimirFoto(arquivo);
          setFotos((prev) =>
            prev.length >= 5
              ? prev
              : [
                  ...prev,
                  {
                    file: comprimida,
                    previewUrl: URL.createObjectURL(comprimida),
                    legenda: '',
                    ano: '',
                  },
                ]
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
        }
      }
    } finally {
      setComprimindo(false);
    }
  };

  const removerFoto = (index: number) => {
    setFotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const atualizarLegenda = (index: number, legenda: string) => {
    setFotos((prev) => prev.map((f, i) => (i === index ? { ...f, legenda } : f)));
  };

  const atualizarAno = (index: number, ano: string) => {
    setFotos((prev) => prev.map((f, i) => (i === index ? { ...f, ano } : f)));
  };

  const fileToBase64 = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });

  // ---- Navegação entre etapas ----
  const avancarDados = () => {
    if (!isEmailValido(email)) {
      setError('Informe um e-mail válido — é por ele que você recebe o presente pronto.');
      return;
    }
    if (!nomePai.trim()) {
      setError('Informe o nome do seu pai.');
      return;
    }
    setError(null);
    setEtapa('perguntas');
  };

  const proximaPergunta = () => {
    setError(null);
    if (perguntaIdx < PERGUNTAS_GUIADAS.length - 1) {
      setPerguntaIdx(perguntaIdx + 1);
    } else {
      setEtapa('fechamento');
    }
  };

  const avancarFechamento = () => {
    if (!conteudoOk) {
      setError(
        `Responda pelo menos ${MIN_BLOCOS} perguntas (volte com "Anterior") ou escreva uma linha de fechamento.`
      );
      return;
    }
    setError(null);
    setEtapa('fotos');
  };

  // ---- Envio ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fotos.length === 0) {
      setError('Adicione pelo menos uma foto.');
      return;
    }
    if (!aceitouTermos) {
      setError('É necessário aceitar os termos de uso para continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    const revelarEm = revelarModo === 'diadospais' ? DATA_REVELACAO_PADRAO : null;

    const fotosExistentes = fotos.filter((f) => f.existingUrl);
    const fotosNovas = fotos.filter((f) => f.file);

    try {
      if (!isSupabaseConfigured()) {
        // Modo de simulação local (apenas desenvolvimento)
        console.log('Supabase não configurado. Rodando em modo de simulação...');
        const base64Fotos = await Promise.all(
          fotosNovas.map((f) => fileToBase64(f.file as File))
        );
        const midiasExistentesMock = fotosExistentes.map((f) => ({
          url: f.existingUrl as string,
          legenda: f.legenda.trim() || undefined,
          ano: f.ano.trim() || undefined,
        }));
        const midiasNovasMock = base64Fotos.map((url, i) => ({
          url,
          legenda: fotosNovas[i].legenda.trim() || undefined,
          ano: fotosNovas[i].ano.trim() || undefined,
        }));
        const base64Audio =
          mensagemGravada?.tipo === 'voz' ? await fileToBase64(mensagemGravada.blob) : null;
        const base64Video =
          mensagemGravada?.tipo === 'video' ? await fileToBase64(mensagemGravada.blob) : null;
        const audioUrlFinal =
          base64Audio || (mensagemExistente?.tipo === 'voz' ? mensagemExistente.url : null);
        const videoUrlFinal =
          base64Video || (mensagemExistente?.tipo === 'video' ? mensagemExistente.url : null);

        const mockId = editandoId || crypto.randomUUID();
        await saveDraftToIndexedDB(mockId, {
          id: mockId,
          email_comprador: email.trim(),
          nome_destinatario: nomePai.trim(),
          mensagem: mensagem.trim() || null,
          blocos: blocosPreenchidos.length > 0 ? blocosPreenchidos : null,
          midias: [...midiasExistentesMock, ...midiasNovasMock],
          tema,
          pago: false,
          plano: 'basico',
          revelar_em: revelarEm,
          musica_youtube_id: musicaYoutubeId,
          audio_url: audioUrlFinal,
          video_url: videoUrlFinal,
          criado_em: new Date().toISOString(),
          isMock: true,
        });
        router.push(`/preview/${mockId}`);
        return;
      }

      // Criação/edição via rota de servidor (service role — T0.2)
      const payloadBase = {
        email_comprador: email.trim(),
        nome_destinatario: nomePai.trim(),
        mensagem: mensagem.trim() || undefined,
        blocos: blocosPreenchidos,
        tema,
        revelar_em: revelarEm,
        aceitou_termos: aceitouTermos,
        musica_youtube_url: musicaUrl.trim() || undefined,
      };

      const formData = new FormData();
      if (editandoId) {
        formData.append(
          'payload',
          JSON.stringify({
            ...payloadBase,
            midias_existentes: fotosExistentes.map((f) => ({
              url: f.existingUrl,
              legenda: f.legenda.trim() || undefined,
              ano: f.ano.trim() || undefined,
            })),
            legendas: fotosNovas.map((f) => f.legenda.trim()),
            anos: fotosNovas.map((f) => f.ano.trim()),
            manter_audio_url: mensagemExistente?.tipo === 'voz' ? mensagemExistente.url : null,
            manter_video_url: mensagemExistente?.tipo === 'video' ? mensagemExistente.url : null,
          })
        );
      } else {
        formData.append(
          'payload',
          JSON.stringify({
            ...payloadBase,
            legendas: fotosNovas.map((f) => f.legenda.trim()),
            anos: fotosNovas.map((f) => f.ano.trim()),
          })
        );
      }
      fotosNovas.forEach((f, i) => formData.append(`foto_${i}`, f.file as File));
      if (mensagemGravada?.tipo === 'voz') {
        formData.append('audio', mensagemGravada.blob, 'mensagem-de-voz');
      } else if (mensagemGravada?.tipo === 'video') {
        formData.append('video', mensagemGravada.blob, 'mensagem-de-video');
      }

      const response = await fetch(
        editandoId ? `/api/paginas/${editandoId}` : '/api/paginas',
        { method: editandoId ? 'PATCH' : 'POST', body: formData }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar o presente.');
      }

      router.push(`/preview/${editandoId || data.id}`);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o presente. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pergunta = PERGUNTAS_GUIADAS[perguntaIdx];
  const etapaNum = etapa === 'dados' ? 1 : etapa === 'perguntas' || etapa === 'fechamento' ? 2 : 3;

  if (carregandoRascunho) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando seu rascunho...</p>
        </div>
      </div>
    );
  }

  if (erroRascunho) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Não deu pra editar</h2>
          <p className="text-gray-600 text-sm mb-6">{erroRascunho}</p>
          <Link
            href="/criar"
            className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
          >
            Criar um novo presente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold mb-3">
            <Heart className="w-4 h-4 fill-current" />
            <span>Dia dos Pais 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {editandoId ? 'Editar seu Recado Surpresa' : 'Crie um Recado Surpresa'}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {editandoId
              ? 'Tudo que você já preencheu está aqui — revise e mude o que quiser.'
              : 'A gente pergunta. Você lembra. Ele se emociona.'}
          </p>
        </div>

        {/* Indicador de etapas */}
        <div className="flex justify-between items-center mb-8 px-2">
          {[
            { n: 1, label: 'Você' },
            { n: 2, label: 'As perguntas' },
            { n: 3, label: 'Fotos e visual' },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && (
                <div className="h-0.5 flex-1 bg-gray-200 mx-2">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: etapaNum >= s.n ? '100%' : '0%' }}
                  ></div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    etapaNum >= s.n ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s.n}
                </div>
                <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
                  {s.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Caixa do formulário */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {!isSupabaseConfigured() && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block mb-0.5">Modo de Simulação Ativo</span>
                Credenciais do Supabase não configuradas. A página será salva no navegador para
                você testar o fluxo completo.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ===== ETAPA 1: e-mail (primeiro campo — T1.1) + nome ===== */}
            {etapa === 'dados' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                    Seu e-mail *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    É por aqui que você recebe o link e o QR code do presente. Nada de spam.
                  </p>
                </div>

                <div>
                  <label htmlFor="nomePai" className="block text-sm font-semibold text-gray-700 mb-1">
                    Nome do seu pai *
                  </label>
                  <input
                    type="text"
                    id="nomePai"
                    value={nomePai}
                    onChange={(e) => setNomePai(e.target.value)}
                    placeholder="Ex: Carlos, Pai, Coroa..."
                    maxLength={80}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={avancarDados}
                  className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  <span>Começar</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* ===== ETAPA 2: perguntas guiadas, uma por vez (T1.2) ===== */}
            {etapa === 'perguntas' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                    Pergunta {perguntaIdx + 1} de {PERGUNTAS_GUIADAS.length}
                  </span>
                  <div className="flex gap-1.5">
                    {PERGUNTAS_GUIADAS.map((p, i) => (
                      <div
                        key={p.id}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          respostas[p.id]?.trim()
                            ? 'bg-emerald-500'
                            : i === perguntaIdx
                              ? 'bg-indigo-600'
                              : 'bg-gray-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                  {pergunta.pergunta}
                </h2>

                <div className="relative">
                  <textarea
                    value={respostas[pergunta.id] || ''}
                    onChange={(e) =>
                      setRespostas((prev) => ({ ...prev, [pergunta.id]: e.target.value }))
                    }
                    placeholder={pergunta.placeholder}
                    rows={4}
                    maxLength={1500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 italic">
                    Não precisa ser bonito. Precisa ser verdade.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vira o bloco <strong>&quot;{pergunta.titulo}&quot;</strong> na página — só a
                    sua resposta aparece, nunca a pergunta.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      if (perguntaIdx > 0) setPerguntaIdx(perguntaIdx - 1);
                      else setEtapa('dados');
                    }}
                    className="py-3.5 px-5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={proximaPergunta}
                    className="flex-1 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold transition-all text-sm"
                  >
                    Pular esta
                  </button>
                  <button
                    type="button"
                    onClick={proximaPergunta}
                    disabled={!respostas[pergunta.id]?.trim()}
                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Próxima</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===== ETAPA 2b: fechamento livre (opcional) ===== */}
            {etapa === 'fechamento' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                    Se quiser, feche do seu jeito — uma linha basta.
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    {blocosPreenchidos.length > 0
                      ? `Você respondeu ${blocosPreenchidos.length} ${blocosPreenchidos.length === 1 ? 'pergunta' : 'perguntas'}. Este fechamento é opcional.`
                      : 'Você pulou todas as perguntas — então escreva aqui a sua mensagem.'}
                  </p>
                </div>

                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Te amo, coroa."
                  rows={3}
                  maxLength={1500}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white resize-none"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEtapa('perguntas');
                    }}
                    className="py-3.5 px-5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={avancarFechamento}
                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <span>Continuar para as fotos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===== ETAPA 3: fotos + legendas + tema + revelação + termos ===== */}
            {etapa === 'fotos' && (
              <div className="space-y-8">
                {/* Upload de fotos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Fotos de vocês * (máx. 5)
                  </label>
                  <div
                    onClick={() => !comprimindo && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer bg-gray-50/30 hover:bg-indigo-50/20 transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFotoUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        {comprimindo ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {comprimindo ? 'Otimizando fotos...' : 'Toque para enviar suas fotos'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        A gente comprime automaticamente — pode mandar direto da galeria.
                      </p>
                    </div>
                  </div>

                  {/* Miniaturas com legenda por foto (T1.2) */}
                  {fotos.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {fotos.map((foto, index) => (
                        <div
                          key={foto.previewUrl}
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                        >
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-150 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={foto.previewUrl}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={foto.ano}
                                onChange={(e) => atualizarAno(index, e.target.value.slice(0, 4))}
                                placeholder="Ano"
                                maxLength={4}
                                inputMode="numeric"
                                className="w-16 px-2 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white placeholder:text-gray-400 flex-shrink-0"
                              />
                              <input
                                type="text"
                                value={foto.legenda}
                                onChange={(e) => atualizarLegenda(index, e.target.value)}
                                placeholder="Que dia foi esse? O que você lembra dele? (opcional)"
                                maxLength={140}
                                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white placeholder:text-gray-400"
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              O ano é opcional — dá um efeito de linha do tempo na página.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerFoto(index)}
                            className="p-2 text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0"
                            title="Remover foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tema com preview ao vivo (T1.3) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Estilo visual</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {TEMAS.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setTema(t.id)}
                        className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                          tema === t.id
                            ? 'border-indigo-600 bg-indigo-50/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-900">{t.nome}</span>
                          {tema === t.id && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-normal">{t.descricao}</p>
                        <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                          {t.id === 'classico' ? (
                            <>
                              <div className="h-full w-1/3 bg-stone-800"></div>
                              <div className="h-full w-1/3 bg-stone-300"></div>
                              <div className="h-full w-1/3 bg-amber-100"></div>
                            </>
                          ) : (
                            <>
                              <div className="h-full w-1/3 bg-emerald-500"></div>
                              <div className="h-full w-1/3 bg-teal-400"></div>
                              <div className="h-full w-1/3 bg-amber-300"></div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revelação agendada (T2.1) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Quando revelar?</h3>
                  <div className="space-y-3">
                    <div
                      onClick={() => setRevelarModo('diadospais')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-center gap-3 ${
                        revelarModo === 'diadospais'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <CalendarHeart
                        className={`w-5 h-5 flex-shrink-0 ${revelarModo === 'diadospais' ? 'text-indigo-600' : 'text-gray-400'}`}
                      />
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 text-sm block">
                          No Dia dos Pais (09/08)
                        </span>
                        <span className="text-xs text-gray-500">
                          Antes disso, quem abrir vê uma contagem regressiva — a surpresa é de
                          verdade. Pode entregar o QR code sem medo. E dá tempo de convidar mais
                          gente da família a participar, depois do pagamento.
                        </span>
                      </div>
                      {revelarModo === 'diadospais' && (
                        <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </div>

                    <div
                      onClick={() => setRevelarModo('agora')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-center gap-3 ${
                        revelarModo === 'agora'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Zap
                        className={`w-5 h-5 flex-shrink-0 ${revelarModo === 'agora' ? 'text-indigo-600' : 'text-gray-400'}`}
                      />
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 text-sm block">
                          Revelar imediatamente
                        </span>
                        <span className="text-xs text-gray-500">
                          A página abre completa assim que ele escanear.
                        </span>
                      </div>
                      {revelarModo === 'agora' && (
                        <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Música do YouTube (Fase 6, opcional) */}
                <div>
                  <label htmlFor="musica" className="block text-sm font-semibold text-gray-700 mb-1">
                    Uma música que é a cara de vocês (opcional)
                  </label>
                  <input
                    type="url"
                    id="musica"
                    value={musicaUrl}
                    onChange={(e) => setMusicaUrl(e.target.value)}
                    placeholder="Cole aqui o link de um vídeo do YouTube"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                  />
                  {musicaUrl.trim() && !musicaYoutubeId && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      Não reconheci esse link do YouTube — confira se copiou certinho.
                    </p>
                  )}
                  {musicaYoutubeId && (
                    <p className="text-xs text-emerald-600 mt-1.5">
                      Música reconhecida — vai aparecer com um botão de tocar na página.
                    </p>
                  )}
                </div>

                {/* Mensagem de voz (Fase 12, opcional) */}
                {mensagemExistente && !mensagemGravada ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Uma mensagem pra ele ver/ouvir (opcional)
                    </label>
                    <div className="flex items-center gap-3">
                      {mensagemExistente.tipo === 'video' ? (
                        <video
                          controls
                          src={mensagemExistente.url}
                          className="flex-1 max-h-40 rounded-xl bg-black"
                        />
                      ) : (
                        <audio controls src={mensagemExistente.url} className="flex-1 h-10" />
                      )}
                      <button
                        type="button"
                        onClick={() => setMensagemExistente(null)}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 flex-shrink-0"
                        aria-label="Regravar"
                        title="Regravar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <GravadorMensagem onMensagemPronta={setMensagemGravada} />
                )}

                {/* Termos (T3.1) */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    Li e aceito os{' '}
                    <Link href="/termos" target="_blank" className="text-indigo-600 underline">
                      termos de uso
                    </Link>{' '}
                    e a{' '}
                    <Link href="/privacidade" target="_blank" className="text-indigo-600 underline">
                      política de privacidade
                    </Link>
                    . Confirmo que tenho autorização das pessoas que aparecem nas fotos.
                  </span>
                </label>

                {/* Ações */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEtapa('fechamento');
                    }}
                    className="py-4 px-5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || comprimindo}
                    className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Guardando cada palavra...</span>
                      </>
                    ) : editandoId ? (
                      <>
                        <span>Salvar alterações</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <span>Ver a prévia completa</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-gray-400">
                  Você só paga ({PRECO_UNICO_FORMATADO}) depois de ver a prévia pronta.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Botão flutuante "ver como ficou" (preview ao vivo — T1.3) */}
        {etapa !== 'dados' && (nomePai.trim() || blocosPreenchidos.length > 0) && (
          <button
            type="button"
            onClick={() => setMostrarPreview(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold shadow-xl transition-all hover:scale-105"
          >
            <Eye className="w-4 h-4" />
            <span>Ver como ficou</span>
          </button>
        )}

        {/* Overlay do preview ao vivo */}
        {mostrarPreview && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gray-950/90 text-white">
              <span className="text-sm font-bold">Prévia ao vivo — assim ele vai ver</span>
              <button
                type="button"
                onClick={() => setMostrarPreview(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
            <div className="max-w-xl mx-auto px-4 py-8">
              <PageRenderer
                conteudo={{
                  nome_destinatario: nomePai.trim() || 'Seu pai',
                  mensagem: mensagem.trim() || null,
                  blocos: blocosPreenchidos,
                  midias: midiasPreview,
                  tema,
                  musicaYoutubeId,
                  audioUrl: audioPreviewUrl,
                  videoUrl: videoPreviewUrl,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CriarPresente() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CriarPresenteForm />
    </Suspense>
  );
}
