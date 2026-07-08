import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to check if credentials exist
const isMercadoPagoConfigured = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  return token && token.trim() !== '' && !token.includes('your-mercadopago');
};

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && !url.includes('placeholder') && key && !key.includes('placeholder');
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, email, plano } = body;

    if (!pageId || !email || !plano) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos. É necessário informar pageId, email e plano.' },
        { status: 400 }
      );
    }

    // Determine amount
    const amount = plano === 'completo' ? 14.90 : 9.90;
    const description = `Recado Surpresa Dia dos Pais - Plano ${plano === 'completo' ? 'Completo' : 'Básico'}`;

    const mpConfigured = isMercadoPagoConfigured();
    const sbConfigured = isSupabaseConfigured();

    if (!mpConfigured) {
      console.log('Mercado Pago Access Token is not defined. Returning Mock Pix.');
      
      const mockPaymentId = `mock_pay_${crypto.randomUUID().substring(0, 8)}`;
      
      // Return simulated payment details
      return NextResponse.json({
        success: true,
        paymentId: mockPaymentId,
        amount,
        qrCode: '00020101021226870014br.gov.bcb.pix0125simulado-chave-pix-mock-recado-surpresa-20265204000053039865802BR5922Recado Surpresa MP Mock6009Sao Paulo62070503***6304E781',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Mock 1px png base64
        isMock: true,
        status: 'pending'
      });
    }

    // Mercado Pago API payment request
    const idempotencyKey = crypto.randomUUID();
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        // notification_url points to our webhook endpoint
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://placeholder.com'}/api/webhook/mercadopago`,
        payer: {
          email: email,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API error:', errorData);
      return NextResponse.json(
        { error: `Mercado Pago Error: ${errorData.message || 'Erro ao processar pagamento.'}` },
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

    // Record the payment inside Supabase if configured
    if (sbConfigured) {
      // Update page with the buyer's email
      await supabase
        .from('paginas')
        .update({ email_comprador: email })
        .eq('id', pageId);

      const { error: dbError } = await supabase
        .from('pagamentos')
        .insert({
          id: paymentId,
          pagina_id: pageId,
          valor: amount,
          status: 'pendente',
          metodo: 'pix'
        });

      if (dbError) {
        console.error('Error inserting payment record in database:', dbError);
        // We continue anyway, because the payment was successfully generated at Mercado Pago
      }
    }

    return NextResponse.json({
      success: true,
      paymentId,
      amount,
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64,
      isMock: false,
      status: paymentData.status
    });

  } catch (error: unknown) {
    console.error('Error in checkout handler:', error);
    const msg = error instanceof Error ? error.message : 'Ocorreu um erro interno no servidor.';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
