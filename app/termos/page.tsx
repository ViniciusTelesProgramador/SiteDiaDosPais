import type { Metadata } from 'next';
import Link from 'next/link';
import {
  APP_NAME,
  PRECO_UNICO_FORMATADO,
  RETENCAO_PAGA_MESES,
  RETENCAO_RASCUNHO_DIAS,
  SUPORTE_EMAIL,
} from '@/lib/config';

export const metadata: Metadata = {
  title: `Termos de Uso — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

/**
 * Termos de uso (T3.1/RNF04/RNF09). Texto base gerado para o MVP —
 * pendente de revisão do responsável pelo produto (decisão D7).
 */
export default function TermosPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto prose-sm">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-6 mb-2">Termos de Uso</h1>
        <p className="text-xs text-gray-400 mb-8">Última atualização: julho de 2026.</p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. O serviço</h2>
            <p>
              O {APP_NAME} permite criar uma página digital personalizada com fotos e mensagens,
              acessível por link e QR code, mediante pagamento único de {PRECO_UNICO_FORMATADO}.
              Ao usar o serviço, você concorda com estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Conteúdo enviado e direito de imagem</h2>
            <p>
              Você é o único responsável pelo conteúdo (fotos, textos) enviado, e declara que:
              (a) possui os direitos ou autorização sobre as imagens; (b) obteve o consentimento
              das pessoas retratadas, inclusive do destinatário da página; e (c) o conteúdo não
              viola direitos de terceiros nem a legislação vigente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Conteúdo proibido</h2>
            <p>
              É proibido enviar conteúdo ilegal, difamatório, discriminatório, violento, de nudez
              ou que envolva menores de forma inadequada. Páginas com conteúdo proibido podem ser
              removidas sem reembolso, e casos graves serão reportados às autoridades.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Pagamento e entrega</h2>
            <p>
              O pagamento é único, via Pix (Mercado Pago). Após a confirmação, a página é ativada
              e o link + QR code são exibidos na tela e enviados ao e-mail informado. Se não
              receber, use a página <Link href="/recuperar" className="text-indigo-600 underline">/recuperar</Link>{' '}
              ou escreva para {SUPORTE_EMAIL}.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Disponibilidade e retenção</h2>
            <p>
              Páginas pagas permanecem no ar por {RETENCAO_PAGA_MESES} meses a partir do
              pagamento. Rascunhos não pagos (e suas fotos) são excluídos automaticamente após{' '}
              {RETENCAO_RASCUNHO_DIAS} dias.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Reembolso</h2>
            <p>
              Por se tratar de produto digital personalizado entregue imediatamente, o reembolso
              segue o Código de Defesa do Consumidor: você pode solicitar em até 7 dias pelo
              e-mail {SUPORTE_EMAIL}, caso a página apresente defeito ou não tenha sido entregue.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Contato</h2>
            <p>
              Dúvidas, denúncias de conteúdo ou solicitações:{' '}
              <a href={`mailto:${SUPORTE_EMAIL}`} className="text-indigo-600 underline">
                {SUPORTE_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
