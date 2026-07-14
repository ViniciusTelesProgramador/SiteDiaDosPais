import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { PRECO_UNICO, APP_NAME } from '@/lib/config';
import { isEmailValido } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const isMercadoPagoConfigured = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  return token && token.trim() !== '' && !token.includes('your-mercadopago');
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, email } = body;

    if (!pageId) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos. É necessário informar pageId.' },
        { status: 400 }
      );
    }

    // Preço definido EXCLUSIVAMENTE no servidor (RF03/T0.3):
    // nada vindo do body altera o valor cobrado.
    const amount = PRECO_UNICO;
    const description = `${APP_NAME} — Dia dos Pais`;

    const mpConfigured = isMercadoPagoConfigured();
    const sbConfigured = isSupabaseConfigured();

    // Resolve o e-mail do comprador: o do rascunho (T1.1), com override do modal
    let emailComprador: string | null =
      typeof email === 'string' && isEmailValido(email) ? email.trim() : null;

    if (sbConfigured) {
      const { data: pagina, error: pageError } = await supabaseAdmin
        .from('paginas')
        .select('id, email_comprador, pago')
        .eq('id', pageId)
        .single();

      if (pageError || !pagina) {
        return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
      }
      if (pagina.pago) {
        return NextResponse.json({ error: 'Esta página já foi paga.' }, { status: 400 });
      }

      if (emailComprador && emailComprador !== pagina.email_comprador) {
        await supabaseAdmin
          .from('paginas')
          .update({ email_comprador: emailComprador })
          .eq('id', pageId);
      } else if (!emailComprador) {
        emailComprador = pagina.email_comprador;
      }
    }

    if (!emailComprador) {
      return NextResponse.json(
        { error: 'Informe um e-mail válido para receber o link do presente.' },
        { status: 400 }
      );
    }

    if (!mpConfigured) {
      console.log('[Checkout] Mercado Pago não configurado. Retornando Pix simulado (dev).');
      const mockPaymentId = `mock_pay_${crypto.randomUUID().substring(0, 8)}`;
      return NextResponse.json({
        success: true,
        paymentId: mockPaymentId,
        amount,
        qrCode:
          '00020101021226870014br.gov.bcb.pix0125simulado-chave-pix-mock-recado-surpresa-20265204000053039865802BR5922Recado Surpresa MP Mock6009Sao Paulo62070503***6304E781',
        qrCodeBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        isMock: true,
        status: 'pending',
      });
    }

    // Cria o pagamento Pix no Mercado Pago
    const idempotencyKey = crypto.randomUUID();
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://placeholder.com'}/api/webhook/mercadopago`,
        external_reference: pageId,
        payer: { email: emailComprador },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Checkout] Erro na API do Mercado Pago:', errorData);
      return NextResponse.json(
        { error: `Mercado Pago: ${errorData.message || 'erro ao processar pagamento.'}` },
        { status: 500 }
      );
    }

    const paymentData = await response.json();
    const paymentId = String(paymentData.id);
    const transactionData = paymentData.point_of_interaction?.transaction_data;

    if (!transactionData) {
      return NextResponse.json(
        { error: 'Não foi possível extrair os dados do Pix da resposta do Mercado Pago.' },
        { status: 500 }
      );
    }

    if (sbConfigured) {
      const { error: dbError } = await supabaseAdmin.from('pagamentos').insert({
        id: paymentId,
        pagina_id: pageId,
        valor: amount,
        status: 'pendente',
        metodo: 'pix',
      });
      if (dbError) {
        // O pagamento existe no MP; o webhook ainda consegue conciliar pelo id.
        console.error('[Checkout] Erro ao registrar pagamento no banco:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId,
      amount,
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64,
      isMock: false,
      status: paymentData.status,
    });
  } catch (error: unknown) {
    console.error('[Checkout] Erro interno:', error);
    const msg = error instanceof Error ? error.message : 'Ocorreu um erro interno no servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
