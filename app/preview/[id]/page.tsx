'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
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
  Home
} from 'lucide-react';

interface PageDraft {
  id: string;
  nome_destinatario: string;
  mensagem: string;
  midias: string[];
  tema: string;
  pago: boolean;
  plano: string;
  slug?: string;
  isMock?: boolean;
}

export default function PreviewPagina() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout & Payment states
  const [email, setEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Payment Details from API
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

  // Success Screen specific states
  const [qrUrl, setQrUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDraft = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Try reading from localStorage first (for simulation mode)
        const localData = localStorage.getItem(`draft_${id}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          setDraft(parsed);
          if (parsed.pago) {
            setPaid(true);
            setGeneratedSlug(parsed.slug || null);
          }
          setLoading(false);
          return;
        }

        // 2. Fetch from Supabase
        const { data, error: dbError } = await supabase
          .from('paginas')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) {
          throw dbError;
        }

        setDraft(data);
        if (data.pago) {
          setPaid(true);
          setGeneratedSlug(data.slug || null);
        }
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : 'Não foi possível carregar a prévia do presente. Verifique o ID ou se a conexão com o banco de dados está correta.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
  }, [id]);

  // Polling for payment status (only if real database & checkout is initiated)
  useEffect(() => {
    if (!paymentDetails || paid || paymentDetails.isMock) return;

    const interval = setInterval(async () => {
      try {
        // Query Supabase database to see if pago is updated to true
        const { data } = await supabase
          .from('paginas')
          .select('pago, slug')
          .eq('id', id)
          .single();

        if (data && data.pago) {
          setPaid(true);
          setGeneratedSlug(data.slug || null);
          
          // Also update local storage draft if cached
          const localData = localStorage.getItem(`draft_${id}`);
          if (localData) {
            const parsed = JSON.parse(localData);
            parsed.pago = true;
            parsed.slug = data.slug;
            localStorage.setItem(`draft_${id}`, JSON.stringify(parsed));
          }

          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentDetails, paid, id]);

  // Generate QR Code data URL when paid
  useEffect(() => {
    if (paid && generatedSlug) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const publicUrl = `${origin}/p/${generatedSlug}`;
      
      QRCode.toDataURL(publicUrl, { width: 450, margin: 1 })
        .then(url => {
          setQrUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });

      // Also ensure it is registered in localStorage under slug_ for simulated direct navigation
      const localData = localStorage.getItem(`draft_${id}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        parsed.pago = true;
        parsed.slug = generatedSlug;
        localStorage.setItem(`slug_${generatedSlug}`, JSON.stringify(parsed));
      }
    }
  }, [paid, generatedSlug, id]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !draft) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: draft.id,
          email: email.trim(),
          plano: draft.plano,
        }),
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
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar checkout.';
      setError(msg);
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

  // Download QR Code PNG
  const downloadQRCodePNG = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qrcode-homenagem-${generatedSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download printable card PDF
  const downloadCardPDF = () => {
    if (!qrUrl || !draft) return;
    
    // A5/A6 style Card Document (100mm x 150mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150]
    });

    // 1. Draw elegant outer double borders
    doc.setDrawColor(180, 150, 100); // Gold-brown tone
    doc.setLineWidth(0.8);
    doc.rect(5, 5, 90, 140);
    
    doc.setDrawColor(210, 195, 170);
    doc.setLineWidth(0.3);
    doc.rect(6.5, 6.5, 87, 137);

    // 2. Draw card contents
    doc.setTextColor(26, 24, 23);
    doc.setFont('Times', 'normal');
    doc.setFontSize(8);
    doc.text('DIA DOS PAIS 2026', 50, 18, { align: 'center' });

    doc.setFont('Times', 'italic');
    doc.setFontSize(16);
    doc.text(`Para um Pai Especial,`, 50, 30, { align: 'center' });
    doc.setFont('Times', 'bold');
    doc.setFontSize(18);
    doc.text(`${draft.nome_destinatario}!`, 50, 38, { align: 'center' });

    // Divider
    doc.setDrawColor(210, 195, 170);
    doc.line(40, 44, 60, 44);

    // 3. Inject QR Code
    doc.addImage(qrUrl, 'PNG', 20, 50, 60, 60);

    // 4. Instructions
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Escaneie o QR Code acima para acessar', 50, 120, { align: 'center' });
    doc.text('sua homenagem e memórias digitais.', 50, 125, { align: 'center' });

    doc.setFont('Times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(190, 40, 40); // Red
    doc.text('Com todo o meu amor. S2', 50, 136, { align: 'center' });

    doc.save(`cartao-presente-dia-dos-pais-${generatedSlug}.pdf`);
  };

  // Simulate payment confirmation for Mock Mode
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
      
      // Update local states
      setPaid(true);
      setGeneratedSlug(data.slug);

      // Update localStorage draft
      const localData = localStorage.getItem(`draft_${draft.id}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        parsed.pago = true;
        parsed.slug = data.slug;
        localStorage.setItem(`draft_${draft.id}`, JSON.stringify(parsed));
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro na simulação do pagamento.';
      alert(msg);
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
  // SUCCESS SCREEN STATE (PAID & ACTIVATED)
  // ----------------------------------------------------
  if (paid && generatedSlug) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetUrl = `${origin}/p/${generatedSlug}`;

    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          
          {/* Header Card Success */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center relative overflow-hidden">
            {/* Green border accent */}
            <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500"></div>

            {/* Checkmark Animation Icon */}
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-up-animation">
              <Check className="w-10 h-10 stroke-[3px]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Homenagem Ativada!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              O pagamento foi confirmado e a página especial para o seu pai já está no ar. Agora você pode compartilhar o link ou imprimir o cartão físico com o QR Code.
            </p>

            {/* Target URL Share Box */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-8 space-y-2">
              <span className="block text-xxs font-bold uppercase tracking-wider text-gray-400">Link da página pública</span>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold font-mono text-indigo-600">{targetUrl}</span>
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

            {/* Generated QR Code Card */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 inline-block mx-auto mb-8 text-center shadow-sm">
              <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-3">
                {qrUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrUrl}
                    alt="Homenagem QR Code"
                    className="w-44 h-44 mx-auto"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                  </div>
                )}
              </div>
              <span className="block text-xxs font-bold text-gray-400 uppercase tracking-wide">Pai {draft.nome_destinatario}</span>
            </div>

            {/* Download Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Download PNG */}
                <button
                  onClick={downloadQRCodePNG}
                  disabled={!qrUrl}
                  className="py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold text-xs sm:text-sm text-gray-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                  <span>Baixar QR Code (PNG)</span>
                </button>

                {/* Download PDF Card */}
                <button
                  onClick={downloadCardPDF}
                  disabled={!qrUrl}
                  className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Baixar Cartão (PDF)</span>
                </button>
              </div>

              {/* View Public Homenagem */}
              <a
                href={`/p/${generatedSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100 hover:shadow-lg"
              >
                <span>Ver Homenagem Publicada</span>
                <ExternalLink className="w-4.5 h-4.5" />
              </a>

              {/* Back to Home / Create New */}
              <button
                onClick={() => router.push('/criar')}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors pt-2 block mx-auto flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Criar outra homenagem</span>
              </button>
            </div>

          </div>

        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // DRAFT PREVIEW STATE (UNPAID)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 relative">
      <div className="bg-amber-500 text-white py-3 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-40 shadow-sm">
        <Lock className="w-4 h-4" />
        <span>Esta é uma prévia. Realize o pagamento para ativar a página pública e gerar o QR Code.</span>
      </div>

      {/* Navigation Header */}
      <header className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/criar')}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Editar Conteúdo</span>
        </button>

        <button
          onClick={() => setShowCheckoutModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          <span>Confirmar e Pagar (R$ {draft.plano === 'completo' ? '14,90' : '9,90'})</span>
        </button>
      </header>

      {/* FATHER'S DAY PREVIEW CANVAS */}
      <main className="max-w-2xl mx-auto px-4 mt-6">
        <div className={`p-8 sm:p-12 rounded-3xl shadow-xl bg-white border border-gray-150 relative overflow-hidden ${
          draft.tema === 'classico' 
            ? 'font-serif bg-stone-50/50 border-stone-200' 
            : 'font-sans bg-emerald-50/20 border-emerald-100'
        }`}>
          {/* Theme visual accents */}
          {draft.tema === 'classico' ? (
            <div className="absolute top-0 inset-x-0 h-2 bg-stone-800"></div>
          ) : (
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"></div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <Heart className={`w-12 h-12 mx-auto mb-4 animate-pulse ${
              draft.tema === 'classico' ? 'text-stone-800' : 'text-rose-500 fill-current'
            }`} />
            <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              draft.tema === 'classico' ? 'text-stone-900' : 'text-teal-950 font-extrabold'
            }`}>
              Para você, {draft.nome_destinatario}
            </h1>
            <p className="text-sm text-gray-500 mt-2 italic">
              Um recado muito especial preparado com amor.
            </p>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {draft.midias.map((mediaUrl, idx) => (
              <div 
                key={idx} 
                className={`relative rounded-2xl overflow-hidden shadow-sm aspect-square border-4 border-white bg-gray-150 transition-transform hover:scale-102 hover:rotate-1 duration-300 ${
                  idx === 0 && draft.midias.length % 2 !== 0 ? 'col-span-2 aspect-video' : ''
                }`}
              >
                <Image
                  src={mediaUrl}
                  alt={`Memória ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>

          {/* Message Box */}
          <div className={`p-6 sm:p-8 rounded-2xl border text-base sm:text-lg leading-relaxed whitespace-pre-line ${
            draft.tema === 'classico'
              ? 'bg-amber-50/20 border-stone-200 text-stone-800'
              : 'bg-white border-emerald-100 text-teal-900 shadow-sm shadow-emerald-50/50'
          }`}>
            {draft.mensagem}
          </div>
        </div>
      </main>

      {/* CHECKOUT & EMAIL MODAL */}
      {showCheckoutModal && !paymentDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 relative overflow-hidden border border-gray-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>E-mail para entrega</span>
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Informe seu e-mail para receber o link definitivo da página e o QR Code em anexo assim que o Pix for compensado.
            </p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label htmlFor="checkoutEmail" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Seu melhor E-mail
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
                      <span>Gerar Pix</span>
                      <CreditCard className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIX INSTRUCTIONS MODAL */}
      {paymentDetails && !paid && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 border border-gray-100 text-center">
            {paymentDetails.isMock && (
              <div className="mb-4 py-1 px-3 rounded-full bg-amber-100 text-amber-800 text-xxs font-bold inline-flex items-center gap-1.5 mx-auto">
                <Sparkles className="w-3.5 h-3.5 fill-current text-amber-600" />
                <span>Simulação de Pagamento Pix</span>
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-1">Pagamento via Pix</h3>
            <p className="text-xs text-gray-500 mb-6">
              Escaneie o QR Code abaixo ou copie a chave Pix para concluir sua compra de **R$ {paymentDetails.amount.toFixed(2).replace('.', ',')}**.
            </p>

            {/* QR Code Graphic Container */}
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

            {/* Pix Copy and Paste Button */}
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

            {/* Waiting State Spinner */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Aguardando aprovação do pagamento...</span>
            </div>

            {/* Simulated Action Overrides */}
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
