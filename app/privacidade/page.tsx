import type { Metadata } from 'next';
import Link from 'next/link';
import {
  APP_NAME,
  RETENCAO_PAGA_MESES,
  RETENCAO_RASCUNHO_DIAS,
  SUPORTE_EMAIL,
} from '@/lib/config';

export const metadata: Metadata = {
  title: `Política de Privacidade — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

/**
 * Política de privacidade (T3.1/RNF04 — LGPD). Texto base para o MVP —
 * pendente de revisão do responsável pelo produto (decisão D7).
 */
export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-6 mb-2">
          Política de Privacidade
        </h1>
        <p className="text-xs text-gray-400 mb-8">Última atualização: julho de 2026.</p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Dados que coletamos</h2>
            <p>
              Para criar e entregar o presente, coletamos: seu e-mail, o nome do destinatário, os
              textos e fotos que você envia, dados do pagamento (processados pelo Mercado Pago —
              não armazenamos dados de cartão) e métricas de acesso à página (contagem de
              visualizações e reação do destinatário).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Para que usamos</h2>
            <p>
              Exclusivamente para: gerar e exibir a página, processar o pagamento, enviar os
              e-mails transacionais (confirmação, reenvio de link, lembrete de revelação e aviso
              de reação) e medir o funcionamento do serviço. Não vendemos nem compartilhamos seus
              dados para marketing de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Quem vê a página</h2>
            <p>
              A página é acessível por qualquer pessoa que possua o link/QR code — trate-os como
              confidenciais. Os links usam códigos aleatórios não adivinháveis e as páginas não
              são indexadas por buscadores (noindex). A prévia de compartilhamento (WhatsApp)
              usa uma arte genérica: suas fotos nunca aparecem nela.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Retenção e exclusão</h2>
            <p>
              Páginas pagas ficam armazenadas por {RETENCAO_PAGA_MESES} meses. Rascunhos não
              pagos e suas fotos são excluídos automaticamente após {RETENCAO_RASCUNHO_DIAS}{' '}
              dias. Você pode solicitar a exclusão antecipada de qualquer página e dos seus dados
              a qualquer momento (direito garantido pela LGPD) pelo e-mail abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Operadores</h2>
            <p>
              Usamos: Supabase (banco de dados e armazenamento de fotos), Vercel (hospedagem),
              Mercado Pago (pagamentos) e Resend (envio de e-mails). Cada um trata os dados
              conforme suas próprias políticas e os contratos de operação.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Contato (encarregado)</h2>
            <p>
              Para exercer seus direitos LGPD (acesso, correção, exclusão, portabilidade):{' '}
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
