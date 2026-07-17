'use client';

import React, { useState } from 'react';
import { Heart, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import {
  MAX_CONTRIBUICAO_TEXTO,
  MAX_NOME_CONTRIBUIDOR,
  MAX_RELACAO_CONTRIBUIDOR,
} from '@/lib/config';

interface Props {
  paginaId: string;
  nomeDestinatario: string;
}

export default function ContribuirClient({ paginaId, nomeDestinatario }: Props) {
  const [nome, setNome] = useState('');
  const [relacao, setRelacao] = useState('');
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !texto.trim()) {
      setError('Preencha seu nome e a mensagem.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contribuicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paginaId,
          nome: nome.trim(),
          relacao: relacao.trim() || undefined,
          texto: texto.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar sua mensagem.');
      }
      setEnviado(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar sua mensagem.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Chegou.</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sua mensagem foi guardada. Ela entra na surpresa de {nomeDestinatario}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold mb-3">
            <Heart className="w-4 h-4 fill-current" />
            <span>Surpresa para {nomeDestinatario}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Deixe uma mensagem
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Alguém está preparando uma surpresa e quis que você fizesse parte. Uma mensagem
            curta já basta.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-1">
                Seu nome *
              </label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Ana"
                maxLength={MAX_NOME_CONTRIBUIDOR}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="relacao" className="block text-sm font-semibold text-gray-700 mb-1">
                Quem você é para ele (opcional)
              </label>
              <input
                type="text"
                id="relacao"
                value={relacao}
                onChange={(e) => setRelacao(e.target.value)}
                placeholder="Ex: filha, neto, esposa..."
                maxLength={MAX_RELACAO_CONTRIBUIDOR}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="texto" className="block text-sm font-semibold text-gray-700 mb-1">
                Sua mensagem *
              </label>
              <textarea
                id="texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreve do seu jeito. Não precisa ser bonito."
                rows={4}
                maxLength={MAX_CONTRIBUICAO_TEXTO}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span>Enviar mensagem</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
