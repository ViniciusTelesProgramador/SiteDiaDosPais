import React from 'react';
import Link from 'next/link';
import { 
  Heart, 
  QrCode, 
  Check, 
  Smartphone, 
  Gift, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 text-gray-800 flex flex-col font-sans">
      
      {/* Navbar / Header */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-150">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">
            Recado<span className="text-indigo-600">Surpresa</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/criar"
            className="px-4 py-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Acessar Criador
          </Link>
          <Link 
            href="/criar"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md shadow-indigo-100 hover:scale-[1.02]"
          >
            Criar Presente
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 flex-1 flex flex-col items-center justify-center text-center">
        {/* Campaign Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Especial de Dia dos Pais</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 tracking-tight leading-none max-w-4xl">
          Transforme memórias em um presente <span className="text-indigo-600">emocionante</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
          Crie uma página exclusiva com fotos, música e uma mensagem de carinho. O seu pai desbloqueia escaneando um QR Code no cartão físico!
        </p>

        {/* CTA Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/criar"
            className="py-4 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition-all shadow-lg shadow-indigo-150 flex items-center justify-center gap-2 group hover:scale-[1.03]"
          >
            <span>Montar Presente R$ 9,90</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-6 text-xs text-gray-400 font-semibold">
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
            <span>Sem apps para instalar</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
            <span>Liberação instantânea</span>
          </div>
        </div>

        {/* Video Reaction Loop teaser */}
        <div className="mt-12 py-1.5 px-3 rounded-full bg-indigo-50 border border-indigo-100 inline-flex items-center gap-2 text-xxs font-bold text-indigo-700">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>PAIS REAGINDO AO QR CODE ESTÃO VIRALIZANDO NAS REDES SOCIAIS!</span>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">Como funciona?</h2>
            <p className="mt-3 text-gray-500">Quatro passos simples para criar uma experiência mágica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">1</div>
              <h3 className="font-bold text-gray-900 text-lg">Escreva e Envie</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Preencha o nome do seu pai, escreva sua mensagem e faça o upload de até 5 fotos marcantes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">2</div>
              <h3 className="font-bold text-gray-900 text-lg">Escolha o Tema</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Selecione o estilo visual que mais combina com seu pai: Clássico e elegante ou Divertido e moderno.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">3</div>
              <h3 className="font-bold text-gray-900 text-lg">Pague e Baixe</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Após o Pix aprovado, faça o download do QR Code em alta resolução e do cartão PDF para impressão.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">4</div>
              <h3 className="font-bold text-gray-900 text-lg">Surpreenda!</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Entregue o cartão impresso. Ao escanear o QR Code com o celular, ele abre a página exclusiva dele!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">O que está incluso?</h2>
          <p className="mt-3 text-gray-500">Tudo pensado para criar uma surpresa inesquecível de baixo custo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">QR Code de Alta Qualidade</h4>
              <p className="text-sm text-gray-500 mt-1">
                Fácil de ler por qualquer smartphone recente e perfeito para imprimir em qualquer papelaria ou em casa.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Layout Mobile-First</h4>
              <p className="text-sm text-gray-500 mt-1">
                A página final é 100% otimizada para telas de celulares, garantindo carregamento rápido e navegação fluida.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Cartão Pronto (PDF)</h4>
              <p className="text-sm text-gray-500 mt-1">
                Você recebe um PDF do cartão montado com o QR Code. É só imprimir, dobrar e presentear.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="font-extrabold text-lg text-white">RecadoSurpresa</span>
          </div>
          <p className="text-xs">
            © 2026 Recado Surpresa. Todos os direitos reservados. Projeto v1 (MVP) para o Dia dos Pais.
          </p>
        </div>
      </footer>

    </div>
  );
}
