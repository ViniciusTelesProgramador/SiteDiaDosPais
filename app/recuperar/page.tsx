'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { SUPORTE_EMAIL } from '@/lib/config';

/**
 * Reenvio de link (RF12/T1.5): o comprador informa o e-mail e recebe de novo
 * os links das páginas pagas. Resposta sempre genérica.
 */
export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar a solicitação.');
      }
      setEnviado(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Verifique seu e-mail</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Se houver compras associadas a <strong>{email}</strong>, os links e QR codes
                chegam em instantes. Confira também a caixa de spam.
              </p>
              <p className="text-xs text-gray-400">
                Não chegou nada? Escreva para{' '}
                <a href={`mailto:${SUPORTE_EMAIL}`} className="text-indigo-600 underline">
                  {SUPORTE_EMAIL}
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
                Perdeu seu link?
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Informe o e-mail usado na compra e reenviamos o link da página e o QR code de
                todos os presentes pagos.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 focus:bg-white"
                  required
                />

                {error && (
                  <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Reenviar meus links</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
