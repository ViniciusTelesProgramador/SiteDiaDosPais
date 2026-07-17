import React from 'react';
import Link from 'next/link';
import {
  Heart,
  QrCode,
  Check,
  Gift,
  ArrowRight,
  MessageCircleQuestion,
  CalendarHeart,
  Sparkles,
} from 'lucide-react';
import { PRECO_UNICO_FORMATADO, SUPORTE_EMAIL } from '@/lib/config';
import LandingAnalytics from '@/components/LandingAnalytics';
import ScrollReveal from '@/components/ScrollReveal';
import FaqItem from '@/components/FaqItem';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 text-gray-800 flex flex-col font-sans">
      <LandingAnalytics />

      {/* Navbar */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-150">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">
            Recado<span className="text-indigo-600">Surpresa</span>
          </span>
        </div>
        <Link
          href="/criar"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-95"
        >
          Criar presente
        </Link>
      </header>

      {/* Hero — entrada escalonada ao carregar (Fase 8) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 flex-1 flex flex-col items-center justify-center text-center">
        <div
          className="animate-slide-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold uppercase tracking-wider mb-6"
          style={{ animationFillMode: 'backwards' }}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Dia dos Pais — 09 de agosto</span>
        </div>

        <h1
          className="animate-slide-in text-4xl sm:text-6xl font-black text-gray-950 tracking-tight leading-none max-w-4xl"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          Não sabe o que dar pro seu pai? <span className="text-indigo-600">Claro que não sabe.</span>
        </h1>
        <p
          className="animate-slide-in mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          Presente não é sobre objeto. Responda algumas perguntas sobre vocês dois, adicione
          fotos — e a gente transforma isso numa página que ele desbloqueia escaneando um QR
          code. No Dia dos Pais, na hora certa.
        </p>

        <div
          className="animate-slide-in mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <Link
            href="/criar"
            className="py-4 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition-all shadow-lg shadow-indigo-150 flex items-center justify-center gap-2 group hover:scale-[1.03] active:scale-95"
          >
            <span>Montar o presente — {PRECO_UNICO_FORMATADO}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <p
          className="animate-slide-in mt-4 text-sm text-gray-500 font-medium"
          style={{ animationDelay: '380ms', animationFillMode: 'backwards' }}
        >
          Menos que uma meia. Infinitamente mais memorável.
        </p>

        <div
          className="animate-slide-in mt-6 flex items-center gap-6 text-xs text-gray-400 font-semibold"
          style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
            <span>Sem apps para instalar</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
            <span>Pix — liberação na hora</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
            <span>Prévia antes de pagar</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">
              Você não precisa &quot;escrever bonito&quot;
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Nada de encarar uma folha em branco. A gente pergunta as coisas certas — cada
              resposta vira um pedaço da página. É por isso que fica pessoal de verdade, não um
              template.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <ScrollReveal atrasoMs={0}>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4 h-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <MessageCircleQuestion className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">1. Responda</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  &quot;Qual frase ele vive repetindo?&quot; — perguntas curtas, uma por vez.
                  Você responde do seu jeito e adiciona até 5 fotos com legenda.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal atrasoMs={80}>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4 h-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">2. Veja pronto</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  A página toma forma na hora, no estilo que você escolher. Só depois de ver a
                  prévia completa você paga ({PRECO_UNICO_FORMATADO}, Pix).
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal atrasoMs={160}>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4 h-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">3. Entregue o mistério</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Baixe o QR code e o cartão em PDF prontos para imprimir. Ele recebe um cartão —
                  e não faz ideia do que tem dentro.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal atrasoMs={240}>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4 h-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <CalendarHeart className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">4. A surpresa acontece</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Se quiser, a página só se revela no dia 09/08 — antes disso, contagem
                  regressiva. E quando ele reagir, <strong>você fica sabendo</strong>.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* O que está incluso */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">
            Tudo isso por {PRECO_UNICO_FORMATADO}
          </h2>
          <p className="mt-3 text-gray-500">Pagamento único. Sem assinatura, sem pegadinha.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ScrollReveal atrasoMs={0}>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">QR code + cartão para imprimir</h4>
                <p className="text-sm text-gray-500 mt-1">
                  PNG em alta resolução e cartão em PDF prontos — imprima em casa ou em qualquer
                  papelaria.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal atrasoMs={80}>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <CalendarHeart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Revelação no dia certo</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Agende para 09/08: quem abrir antes vê só uma contagem regressiva. A surpresa
                  fica guardada até a hora.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal atrasoMs={160}>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">A reação volta pra você</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Quando ele abrir e reagir, você recebe um aviso por e-mail. Você vai saber que
                  funcionou.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-gray-100 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight text-center mb-12">
            Perguntas frequentes
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Como meu pai recebe o presente?',
                a: 'Você entrega um cartão impresso (ou envia o link). Ele escaneia o QR code com a câmera do celular e a página abre — sem instalar nada, sem criar conta.',
              },
              {
                q: 'Paguei e não recebi o e-mail. E agora?',
                a: `Confira a caixa de spam e, se não estiver lá, use a página de reenvio de link informando o e-mail da compra. Persistindo, escreva para ${SUPORTE_EMAIL}.`,
              },
              {
                q: 'Por quanto tempo a página fica no ar?',
                a: 'Por 12 meses a partir do pagamento — o Dia dos Pais inteiro e muito além.',
              },
              {
                q: 'Se eu entregar o cartão antes do dia 09/08, estraga a surpresa?',
                a: 'Não! Se você agendar a revelação, quem escanear antes vê apenas uma contagem regressiva com o nome dele. O conteúdo só aparece no dia.',
              },
              {
                q: 'Posso ver como fica antes de pagar?',
                a: 'Sim — você vê a prévia completa da página, exatamente como ele vai ver, antes de decidir pagar.',
              },
            ].map((item) => (
              <FaqItem key={item.q} pergunta={item.q} resposta={item.a} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/criar"
              className="inline-flex items-center gap-2 py-4 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition-all shadow-lg shadow-indigo-150 hover:scale-[1.03] active:scale-95"
            >
              <span>Criar o presente agora — {PRECO_UNICO_FORMATADO}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <span className="font-extrabold text-lg text-white">RecadoSurpresa</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold">
              <Link href="/recuperar" className="hover:text-white transition-colors">
                Perdeu seu link?
              </Link>
              <Link href="/termos" className="hover:text-white transition-colors">
                Termos de uso
              </Link>
              <Link href="/privacidade" className="hover:text-white transition-colors">
                Privacidade
              </Link>
              <a href={`mailto:${SUPORTE_EMAIL}`} className="hover:text-white transition-colors">
                Suporte: {SUPORTE_EMAIL}
              </a>
            </nav>
          </div>
          <p className="text-xs text-center sm:text-left">
            © 2026 Recado Surpresa. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
