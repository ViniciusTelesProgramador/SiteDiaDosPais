'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDraftFromIndexedDB, saveDraftToIndexedDB, type PageDraft } from '@/lib/localDatabase';
import { normalizarMidias, normalizarTema, ordenarBlocosNarrativa, type Contribuicao } from '@/lib/types';
import { PRECO_UNICO_FORMATADO, ORDEM_NARRATIVA, MAX_CONTRIBUICOES } from '@/lib/config';
import { track } from '@/lib/analytics';
import PageRenderer from '@/components/PageRenderer';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Loader2,
  ArrowLeft,
  Heart,
  CreditCard,
  Mail,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Smartphone,
  ExternalLink,
  Lock,
  Download,
  FileText,
  Home,
  UserPlus,
  Eye,
} from 'lucide-react';

const POLL_INTERVALO_MS = 4500;
const POLL_LIMITE_MS = 15 * 60 * 1000; // 15 minutos

export default function PreviewPagina() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout & pagamento
  const [email, setEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    isMock: boolean;
    amount: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [pollExpirado, setPollExpirado] = useState(false);

  // Tela de sucesso
  const [qrUrl, setQrUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Surpresa Coletiva (Fase 5): convite + moderação
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);

  const pollInicioRef = useRef<number>(0);

  // ---- Carregamento do rascunho ----
  useEffect(() => {
    if (!id) return;

    const fetchDraft = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. IndexedDB primeiro (modo de simulação local)
        const localDraft = await getDraftFromIndexedDB(id);
        if (localDraft) {
          setDraft(localDraft);
          setEmail(localDraft.email_comprador || '');
          if (localDraft.pago) {
            setPaid(true);
            setGeneratedSlug(localDraft.slug || null);
          }
          setLoading(false);
          return;
        }

        // 2. Rota de servidor (a anon key não lê a tabela — T0.2)
        const response = await fetch(`/api/paginas/${id}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              'Não foi possível carregar a prévia. Verifique o link ou tente novamente.'
          );
        }
        const data = (await response.json()) as PageDraft;

        setDraft(data);
        setEmail(data.email_comprador || '');
        if (data.pago) {
          setPaid(true);
          setGeneratedSlug(data.slug || null);
        }
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar a prévia.');
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
    track('chegou_preview');
  }, [id]);

  // ---- Polling do status de pagamento (T1.4) ----
  const verificarStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/pagina-status/${id}`);
      if (!response.ok) return false;
      const data = await response.json();
      if (data.pago) {
        setPaid(true);
        setGeneratedSlug(data.slug || null);
        track('pagou');
        // espelha no IndexedDB se houver rascunho local
        const localDraft = await getDraftFromIndexedDB(id);
        if (localDraft) {
          localDraft.pago = true;
          localDraft.slug = data.slug;
          await saveDraftToIndexedDB(id, localDraft);
        }
        return true;
      }
    } catch (err) {
      console.error('Erro ao verificar status do pagamento:', err);
    }
    return false;
  }, [id]);

  useEffect(() => {
    if (!paymentDetails || paid || paymentDetails.isMock) return;

    pollInicioRef.current = Date.now();
    setPollExpirado(false);

    const interval = setInterval(async () => {
      if (Date.now() - pollInicioRef.current > POLL_LIMITE_MS) {
        setPollExpirado(true);
        clearInterval(interval);
        return;
      }
      const confirmado = await verificarStatus();
      if (confirmado) clearInterval(interval);
    }, POLL_INTERVALO_MS);

    return () => clearInterval(interval);
  }, [paymentDetails, paid, verificarStatus]);

  // ---- QR code da tela de sucesso ----
  useEffect(() => {
    if (paid && generatedSlug) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const publicUrl = `${origin}/p/${generatedSlug}`;

      QRCode.toDataURL(publicUrl, { width: 450, margin: 1 })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Erro ao gerar QR code:', err));

      getDraftFromIndexedDB(id).then((localDraft) => {
        if (localDraft) {
          localDraft.pago = true;
          localDraft.slug = generatedSlug;
          saveDraftToIndexedDB(id, localDraft);
        }
      });
    }
  }, [paid, generatedSlug, id]);

  // ---- Surpresa Coletiva (Fase 5): busca contribuições quando há tempo até a revelação ----
  useEffect(() => {
    if (!paid || !draft) return;
    if (!draft.revelar_em || new Date(draft.revelar_em).getTime() <= Date.now()) return;

    fetch(`/api/contribuicoes?paginaId=${draft.id}`)
      .then((r) => r.json())
      .then((data) => setContribuicoes(data.contribuicoes || []))
      .catch((err) => console.error('Erro ao buscar contribuições:', err));
  }, [paid, draft]);

  const toggleAprovado = async (contribuicaoId: string, aprovado: boolean) => {
    setContribuicoes((prev) =>
      prev.map((c) => (c.id === contribuicaoId ? { ...c, aprovado } : c))
    );
    try {
      await fetch(`/api/contribuicoes/${contribuicaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovado }),
      });
    } catch (err) {
      console.error('Erro ao atualizar contribuição:', err);
    }
  };

  const handleCopyInvite = () => {
    if (!draft) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/contribuir/${draft.id}`);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // ---- Checkout ----
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !draft) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: draft.id, email: email.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao iniciar o pagamento.');
      }

      const paymentData = await response.json();
      setPaymentDetails({
        paymentId: paymentData.paymentId,
        qrCode: paymentData.qrCode,
        qrCodeBase64: paymentData.qrCodeBase64,
        isMock: paymentData.isMock,
        amount: paymentData.amount,
      });
      track('iniciou_pagamento');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao processar checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!paymentDetails) return;
    navigator.clipboard.writeText(paymentDetails.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!generatedSlug) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/p/${generatedSlug}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const downloadQRCodePNG = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qrcode-homenagem-${generatedSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCardPDF = () => {
    if (!qrUrl || !draft) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });

    doc.setDrawColor(180, 150, 100);
    doc.setLineWidth(0.8);
    doc.rect(5, 5, 90, 140);

    doc.setDrawColor(210, 195, 170);
    doc.setLineWidth(0.3);
    doc.rect(6.5, 6.5, 87, 137);

    doc.setTextColor(26, 24, 23);
    doc.setFont('Times', 'normal');
    doc.setFontSize(8);
    doc.text('DIA DOS PAIS 2026', 50, 18, { align: 'center' });

    doc.setFont('Times', 'italic');
    doc.setFontSize(16);
    doc.text('Para um Pai Especial,', 50, 30, { align: 'center' });
    doc.setFont('Times', 'bold');
    doc.setFontSize(18);
    doc.text(`${draft.nome_destinatario}!`, 50, 38, { align: 'center' });

    doc.setDrawColor(210, 195, 170);
    doc.line(40, 44, 60, 44);

    doc.addImage(qrUrl, 'PNG', 20, 50, 60, 60);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Escaneie o QR Code acima para acessar', 50, 120, { align: 'center' });
    doc.text('sua homenagem e memórias digitais.', 50, 125, { align: 'center' });

    doc.setFont('Times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(190, 40, 40);
    doc.text('Com todo o meu amor.', 50, 136, { align: 'center' });

    doc.save(`cartao-presente-dia-dos-pais-${generatedSlug}.pdf`);
  };

  /**
   * A Carta / A Recordação (Fase 4): PDF A4 com os blocos e a mensagem
   * diagramados como carta — "a página expira; a carta, não". Quando o pai
   * já escreveu de volta, a resposta dele entra na mesma folha e o
   * documento vira a Recordação: o único objeto com os dois lados.
   */
  const temResposta = Boolean(draft?.reacao_texto?.trim());

  const downloadCartaPDF = () => {
    if (!draft) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margemX = 28;
    const larguraTexto = 210 - margemX * 2;
    const limiteY = 265;
    let y = 0;

    const novaPagina = () => {
      doc.addPage();
      doc.setDrawColor(210, 195, 170);
      doc.setLineWidth(0.4);
      doc.rect(12, 12, 186, 273);
      y = 30;
    };

    const garantirEspaco = (altura: number) => {
      if (y + altura > limiteY) novaPagina();
    };

    const escreverParagrafo = (texto: string, tamanho: number, estilo: string) => {
      doc.setFont('Times', estilo);
      doc.setFontSize(tamanho);
      const linhas: string[] = doc.splitTextToSize(texto, larguraTexto);
      const alturaLinha = tamanho * 0.55;
      for (const linha of linhas) {
        garantirEspaco(alturaLinha);
        doc.text(linha, 105, y, { align: 'center' });
        y += alturaLinha;
      }
    };

    const escreverTitulo = (titulo: string) => {
      garantirEspaco(18);
      y += 8;
      doc.setFont('Times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(140, 122, 92);
      doc.text(titulo.toUpperCase(), 105, y, { align: 'center', charSpace: 1 });
      doc.setTextColor(44, 42, 39);
      y += 7;
    };

    // Moldura da primeira página
    doc.setDrawColor(210, 195, 170);
    doc.setLineWidth(0.4);
    doc.rect(12, 12, 186, 273);
    y = 34;

    // Cabeçalho
    doc.setTextColor(140, 122, 92);
    doc.setFont('Times', 'normal');
    doc.setFontSize(9);
    doc.text('DIA DOS PAIS — 2026', 105, y, { align: 'center', charSpace: 1.5 });
    y += 12;
    doc.setTextColor(26, 24, 23);
    doc.setFont('Times', 'italic');
    doc.setFontSize(24);
    doc.text(`Para ${draft.nome_destinatario},`, 105, y, { align: 'center' });
    y += 6;
    doc.setDrawColor(140, 122, 92);
    doc.setLineWidth(0.3);
    doc.line(95, y, 115, y);
    y += 10;
    doc.setTextColor(44, 42, 39);

    // Blocos na ordem narrativa (a mesma da página)
    const blocos = ordenarBlocosNarrativa(draft.blocos, ORDEM_NARRATIVA);
    for (const bloco of blocos) {
      escreverTitulo(bloco.titulo);
      escreverParagrafo(bloco.texto, 12, 'normal');
    }

    // Fechamento
    if (draft.mensagem?.trim()) {
      garantirEspaco(20);
      y += 10;
      escreverParagrafo(draft.mensagem.trim(), 12, 'italic');
    }

    // Coro (Fase 5): mensagens aprovadas de outras pessoas
    const contribuicoesAprovadas = contribuicoes.filter((c) => c.aprovado);
    if (contribuicoesAprovadas.length > 0) {
      garantirEspaco(24);
      y += 10;
      escreverTitulo('Você foi lembrado por mais gente hoje');
      for (const c of contribuicoesAprovadas) {
        escreverParagrafo(`"${c.texto}"`, 11, 'italic');
        escreverParagrafo(`— ${c.nome}${c.relacao ? `, ${c.relacao}` : ''}`, 9, 'normal');
      }
    }

    // A resposta dele (Recordação — só quando o pai escreveu de volta)
    if (temResposta) {
      garantirEspaco(34);
      y += 12;
      doc.setDrawColor(210, 195, 170);
      doc.line(85, y, 125, y);
      y += 10;
      escreverTitulo('E a resposta dele');
      escreverParagrafo(`“${draft.reacao_texto!.trim()}”`, 13, 'italic');
    }

    // Música (Fase 6), se houver
    if (draft.musica_youtube_id) {
      garantirEspaco(12);
      y += 6;
      doc.setTextColor(140, 122, 92);
      doc.setFontSize(9);
      doc.setFont('Times', 'italic');
      doc.text(`A música de vocês: youtu.be/${draft.musica_youtube_id}`, 105, y, {
        align: 'center',
      });
      y += 8;
    }

    // Rodapé da última página
    garantirEspaco(20);
    y += 12;
    doc.setTextColor(140, 122, 92);
    doc.setFontSize(8);
    doc.setFont('Times', 'normal');
    doc.text('A página expira. A carta, não.', 105, y, { align: 'center' });

    doc.save(
      temResposta
        ? `recordacao-${draft.nome_destinatario.toLowerCase().replace(/\s+/g, '-')}.pdf`
        : `carta-${draft.nome_destinatario.toLowerCase().replace(/\s+/g, '-')}.pdf`
    );
  };

  // ---- Simulação (apenas dev, sem credenciais) ----
  const triggerSimulationUnlock = async () => {
    if (!paymentDetails || !draft) return;

    setSimulationLoading(true);
    try {
      const response = await fetch(
        `/api/webhook/mercadopago?mock_payment_id=${paymentDetails.paymentId}&page_id=${draft.id}&email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao simular confirmação.');
      }

      const data = await response.json();
      setPaid(true);
      setGeneratedSlug(data.slug);

      const localDraft = await getDraftFromIndexedDB(draft.id);
      if (localDraft) {
        localDraft.pago = true;
        localDraft.slug = data.slug;
        await saveDraftToIndexedDB(draft.id, localDraft);
      }
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erro na simulação do pagamento.');
    } finally {
      setSimulationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando prévia...</p>
        </div>
      </div>
    );
  }

  if (error && !showCheckoutModal && !paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Ocorreu um erro</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/criar')}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
          >
            Voltar para a Criação
          </button>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  // ----------------------------------------------------
  // TELA DE SUCESSO (PAGO)
  // ----------------------------------------------------
  if (paid && generatedSlug) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetUrl = `${origin}/p/${generatedSlug}`;

    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500"></div>

            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 stroke-[3px]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Pronto. Agora a parte boa é sua.
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Imprime o cartão, entrega sem explicar nada e observa. Enviamos tudo também para{' '}
              <strong>{email || draft.email_comprador || 'seu e-mail'}</strong> — guarde esse
              e-mail, ele é seu acesso à página.
            </p>
            {draft.revelar_em && new Date(draft.revelar_em).getTime() > Date.now() && (
              <p className="text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 mb-6">
                Você agendou a revelação: quem abrir antes de 09/08 verá uma contagem regressiva.
                Pode entregar o cartão sem estragar a surpresa.
              </p>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-8 space-y-2">
              <span className="block text-xxs font-bold uppercase tracking-wider text-gray-400">
                Link da página pública
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold font-mono text-indigo-600">
                  {targetUrl}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors shadow-sm"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 inline-block mx-auto mb-8 text-center shadow-sm">
              <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-3">
                {qrUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qrUrl} alt="QR Code do presente" className="w-44 h-44 mx-auto" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                  </div>
                )}
              </div>
              <span className="block text-xxs font-bold text-gray-400 uppercase tracking-wide">
                Para {draft.nome_destinatario}
              </span>
            </div>

            {/* Contador de visualizações (Fase 13, item 10) */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium mb-8">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {draft.visualizacoes
                  ? `Ele já abriu ${draft.visualizacoes}x`
                  : 'Ele ainda não abriu'}
              </span>
            </div>

            {/* Surpresa Coletiva (Fase 5): só disponível com revelação agendada no futuro */}
            {draft.revelar_em && new Date(draft.revelar_em).getTime() > Date.now() && (
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 text-left mb-8 space-y-4">
                <div>
                  <span className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                    <UserPlus className="w-4 h-4" />
                    <span>Convide mais gente</span>
                  </span>
                  <p className="text-xs text-indigo-700/80 mt-1.5 leading-relaxed">
                    Compartilhe este link com quem também quiser deixar uma mensagem — ela
                    entra junto na surpresa, antes da revelação.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-indigo-100 px-3 py-2.5">
                  <span className="truncate text-xs font-mono text-indigo-600">
                    {origin}/contribuir/{draft.id}
                  </span>
                  <button
                    onClick={handleCopyInvite}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors"
                  >
                    {inviteCopied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{inviteCopied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                {contribuicoes.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="block text-xxs font-bold uppercase tracking-wider text-indigo-400">
                      Mensagens recebidas ({contribuicoes.length}/{MAX_CONTRIBUICOES})
                    </span>
                    {contribuicoes.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start justify-between gap-3 bg-white rounded-xl border border-indigo-100 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 leading-snug">{c.texto}</p>
                          <span className="text-[10px] text-gray-400">
                            — {c.nome}
                            {c.relacao ? `, ${c.relacao}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleAprovado(c.id, !c.aprovado)}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            c.aprovado
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {c.aprovado ? 'Visível' : 'Oculta'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={downloadQRCodePNG}
                  disabled={!qrUrl}
                  className="py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold text-xs sm:text-sm text-gray-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                  <span>Baixar QR Code (PNG)</span>
                </button>

                <button
                  onClick={downloadCardPDF}
                  disabled={!qrUrl}
                  className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Baixar Cartão (PDF)</span>
                </button>
              </div>

              {/* A Carta / A Recordação (Fase 4) */}
              <button
                onClick={downloadCartaPDF}
                className="w-full py-3.5 px-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 font-bold text-xs sm:text-sm text-amber-900 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <FileText className="w-4 h-4 text-amber-700" />
                <span>{temResposta ? 'Baixar a Recordação (PDF)' : 'Baixar a Carta (PDF)'}</span>
              </button>
              <p className="text-[10px] text-gray-400 -mt-1">
                {temResposta
                  ? 'O que você escreveu e o que ele respondeu, na mesma folha.'
                  : 'Suas palavras diagramadas como carta, para imprimir e guardar. A página expira; a carta, não.'}
              </p>

              <a
                href={`/p/${generatedSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100 hover:shadow-lg"
              >
                <span>Ver a página publicada</span>
                <ExternalLink className="w-4.5 h-4.5" />
              </a>

              <button
                onClick={() => router.push('/criar')}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors pt-2 mx-auto flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Criar outro presente</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // PRÉVIA DO RASCUNHO (NÃO PAGO)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 relative">
      {/* Banner persistente (T1.6) */}
      <div className="bg-amber-500 text-white py-3 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-40 shadow-sm">
        <Lock className="w-4 h-4" />
        <span>Prévia — pagamento pendente. Pague para ativar a página e gerar o QR Code.</span>
      </div>

      <header className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
        <button
          onClick={() => router.push(`/criar?editar=${draft.id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Editar conteúdo</span>
        </button>

        <button
          onClick={() => setShowCheckoutModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          <span>Confirmar e pagar ({PRECO_UNICO_FORMATADO})</span>
        </button>
      </header>

      {/* Prévia usa o MESMO componente da página pública (T1.3) */}
      <main className="max-w-2xl mx-auto px-4 mt-4">
        <PageRenderer
          conteudo={{
            nome_destinatario: draft.nome_destinatario,
            mensagem: draft.mensagem,
            blocos: draft.blocos,
            midias: normalizarMidias(draft.midias),
            tema: normalizarTema(draft.tema),
            musicaYoutubeId: draft.musica_youtube_id,
            audioUrl: draft.audio_url,
            videoUrl: draft.video_url,
          }}
        />
      </main>

      {/* MODAL DE CHECKOUT */}
      {showCheckoutModal && !paymentDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 relative overflow-hidden border border-gray-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>E-mail para entrega</span>
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              O link definitivo e o QR Code chegam neste e-mail assim que o Pix for confirmado.
            </p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="checkoutEmail"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"
                >
                  Seu melhor e-mail
                </label>
                <input
                  type="email"
                  id="checkoutEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              {error && (
                <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <span>Gerar Pix ({PRECO_UNICO_FORMATADO})</span>
                      <CreditCard className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DO PIX (com polling de status — T1.4) */}
      {paymentDetails && !paid && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 border border-gray-100 text-center">
            {paymentDetails.isMock && (
              <div className="mb-4 py-1 px-3 rounded-full bg-amber-100 text-amber-800 text-xxs font-bold inline-flex items-center gap-1.5 mx-auto">
                <Sparkles className="w-3.5 h-3.5 fill-current text-amber-600" />
                <span>Simulação de Pagamento Pix</span>
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-1">Pagamento via Pix</h3>
            <p className="text-xs text-gray-500 mb-6">
              Escaneie o QR Code abaixo ou copie a chave Pix para concluir sua compra de{' '}
              <strong>R$ {paymentDetails.amount.toFixed(2).replace('.', ',')}</strong>.
            </p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 inline-block mb-6 relative group">
              {paymentDetails.isMock ? (
                <div className="w-48 h-48 bg-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 mx-auto">
                  <QrCode className="w-12 h-12" />
                  <span className="text-xxs font-bold">QR CODE SIMULADO</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`data:image/png;base64,${paymentDetails.qrCodeBase64}`}
                  alt="Mercado Pago Pix QR Code"
                  className="w-48 h-48 mx-auto"
                />
              )}
            </div>

            <div className="mb-6">
              <button
                onClick={handleCopyPix}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium text-sm flex items-center justify-between text-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2 max-w-[80%] text-left">
                  <Smartphone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-xs font-mono">{paymentDetails.qrCode}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-600 font-bold">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {pollExpirado ? (
              <div className="text-xs text-gray-500 mb-6 p-3 rounded-xl bg-gray-50 border border-gray-100 leading-relaxed">
                Ainda não identificamos o pagamento — mas fique tranquilo: assim que ele for
                confirmado, <strong>você recebe tudo por e-mail</strong> ({email}). Você também
                pode fechar esta tela e voltar a este link depois.
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>
                  Aguardando confirmação... esta tela atualiza sozinha. Se fechar, o link chega
                  por e-mail.
                </span>
              </div>
            )}

            {paymentDetails.isMock && (
              <button
                onClick={triggerSimulationUnlock}
                disabled={simulationLoading}
                className="w-full py-3.5 mb-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {simulationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Liberando...</span>
                  </>
                ) : (
                  <>
                    <span>Simular Confirmação Pix</span>
                    <Sparkles className="w-4 h-4 fill-current" />
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setPaymentDetails(null)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Escolher outro e-mail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
