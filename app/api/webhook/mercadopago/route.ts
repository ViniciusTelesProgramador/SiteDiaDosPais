import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateShortSlug } from '@/lib/utils';
import { Resend } from 'resend';
import QRCode from 'qrcode';

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

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '' && !process.env.RESEND_API_KEY.includes('re_your')
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Isomorphic helper to send confirmation emails
async function sendConfirmationEmail(
  emailComprador: string,
  nomeDestinatario: string,
  generatedSlug: string
) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const publicUrl = `${origin}/p/${generatedSlug}`;

  let qrBuffer: Buffer;
  try {
    qrBuffer = await QRCode.toBuffer(publicUrl, { width: 300, margin: 1 });
  } catch (err) {
    console.error('Failed to generate QR Code buffer for email:', err);
    return;
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.MAIL_FROM || 'Recado Surpresa <onboarding@resend.dev>',
        to: emailComprador,
        subject: `Seu Recado Surpresa para ${nomeDestinatario} está pronto!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #fcfcfc;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">❤️</span>
              <h2 style="color: #4f46e5; margin-top: 10px;">Homenagem Ativada com Sucesso!</h2>
            </div>
            <p>Olá!</p>
            <p>O pagamento do seu Recado Surpresa foi confirmado. A página personalizada para o(a) <strong>${nomeDestinatario}</strong> já está no ar!</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${publicUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Visualizar Homenagem</a>
            </p>
            <p style="font-size: 14px; color: #555;">Link direto: <a href="${publicUrl}" style="color: #4f46e5;">${publicUrl}</a></p>
            <p style="font-size: 14px; color: #555; line-height: 1.5;">Também anexamos a este e-mail a imagem do seu <strong>QR Code</strong> exclusivo. Você pode salvá-la no seu celular ou imprimi-la em um cartão físico para presentear seu pai!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 11px; color: #888; text-align: center;">Este é um e-mail transacional enviado automaticamente por Recado Surpresa.</p>
          </div>
        `,
        attachments: [
          {
            filename: 'qrcode-recado-surpresa.png',
            content: qrBuffer,
          },
        ],
      });
      console.log(`[Resend] Confirmation email successfully sent to ${emailComprador}.`);
    } catch (emailErr) {
      console.error('[Resend] Failed to send email via Resend API:', emailErr);
    }
  } else {
    console.log('\n==================================================');
    console.log('SIMULATED EMAIL NOTIFICATION (RESEND KEY MISSING)');
    console.log(`TO: ${emailComprador}`);
    console.log(`SUBJECT: Seu Recado Surpresa para ${nomeDestinatario} está pronto!`);
    console.log(`PUBLIC URL: ${publicUrl}`);
    console.log('ATTACHMENT: qrcode-recado-surpresa.png (generated buffer)');
    console.log('==================================================\n');
  }
}

export async function POST(req: NextRequest) {
  try {
    const sbConfigured = isSupabaseConfigured();

    // Parse query parameters
    const url = new URL(req.url);
    const mockPaymentId = url.searchParams.get('mock_payment_id');
    const mockPageId = url.searchParams.get('page_id');
    const mockEmail = url.searchParams.get('email');

    // 1. Direct simulation trigger (for testing without webhook deliveries)
    if (mockPaymentId && mockPageId && mockPaymentId.startsWith('mock_pay_')) {
      console.log(`[Webhook Simulation] Unlocking page: ${mockPageId} with mock payment: ${mockPaymentId}`);

      const generatedSlug = generateShortSlug(8);

      if (sbConfigured) {
        // Create/Update the mock payment record
        await supabase
          .from('pagamentos')
          .upsert({
            id: mockPaymentId,
            pagina_id: mockPageId,
            valor: 9.90,
            status: 'pago',
            metodo: 'pix'
          });

        // Set page status to paid and generate a slug
        const { data, error } = await supabase
          .from('paginas')
          .update({
            pago: true,
            slug: generatedSlug
          })
          .eq('id', mockPageId)
          .select()
          .single();

        if (error || !data) {
          console.error('[Webhook Simulation] Error updating page in database:', error);
          return NextResponse.json({ error: error?.message || 'Erro ao carregar dados' }, { status: 500 });
        }

        // Trigger transactional email
        const targetEmail = mockEmail || data.email_comprador || 'comprador@mock.com';
        await sendConfirmationEmail(targetEmail, data.nome_destinatario, generatedSlug);

        console.log(`[Webhook Simulation] Page unlocked successfully. Slug: ${generatedSlug}`);
        return NextResponse.json({ success: true, slug: generatedSlug, page: data });
      }

      // If Supabase is not configured, we return mock success for client preview local state
      const targetEmail = mockEmail || 'comprador@mock.com';
      await sendConfirmationEmail(targetEmail, 'Carlos (Simulado)', generatedSlug);

      return NextResponse.json({
        success: true,
        slug: generatedSlug,
        isMock: true
      });
    }

    // 2. Real Mercado Pago Webhook Handling
    let body: { data?: { id?: string }, id?: string, type?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    // Extract payment ID from request query or body
    const paymentId = url.searchParams.get('id') || url.searchParams.get('data.id') || body.data?.id || body.id;
    const type = url.searchParams.get('type') || body.type;

    console.log(`[Webhook] Received notification: type=${type}, id=${paymentId}`);

    // If type is not payment, we just acknowledge receipt
    if (type !== 'payment' && !url.searchParams.has('id')) {
      return NextResponse.json({ received: true });
    }

    if (!paymentId) {
      return NextResponse.json({ error: 'ID de pagamento não informado.' }, { status: 400 });
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json({ error: 'Mercado Pago não configurado no servidor.' }, { status: 500 });
    }

    // Query Mercado Pago for payment status
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      console.error(`[Webhook] Error querying Mercado Pago for payment ${paymentId}`);
      return NextResponse.json({ error: 'Erro ao consultar pagamento no Mercado Pago.' }, { status: 500 });
    }

    const mpPayment = await mpResponse.json();
    if (!mpPayment) {
      return NextResponse.json({ error: 'Dados do pagamento vazios.' }, { status: 500 });
    }

    const paymentStatus = mpPayment.status;
    console.log(`[Webhook] Payment ${paymentId} status: ${paymentStatus}`);

    if (paymentStatus === 'approved' && sbConfigured) {
      // Find the associated page and grab email/name
      const { data: paymentRecord, error: payError } = await supabase
        .from('pagamentos')
        .select(`
          pagina_id, 
          status,
          paginas (
            email_comprador,
            nome_destinatario
          )
        `)
        .eq('id', paymentId)
        .single();

      if (payError || !paymentRecord) {
        console.error(`[Webhook] Payment record not found in database for ID ${paymentId}:`, payError);
        return NextResponse.json({ error: 'Registro de pagamento não encontrado.' }, { status: 404 });
      }

      // Only update if not already processed/paid
      const typedRecord = paymentRecord as unknown as {
        pagina_id: string;
        status: string;
        paginas: {
          email_comprador: string | null;
          nome_destinatario: string;
        } | null;
      };
      if (typedRecord.status !== 'pago') {
        const pageId = typedRecord.pagina_id;
        const generatedSlug = generateShortSlug(8);

        // Update payment record to paid
        await supabase
          .from('pagamentos')
          .update({ status: 'pago' })
          .eq('id', paymentId);

        // Update page record to paid and generate a slug
        const { data: pageData, error: pageError } = await supabase
          .from('paginas')
          .update({
            pago: true,
            slug: generatedSlug
          })
          .eq('id', pageId)
          .select()
          .single();

        if (pageError || !pageData) {
          console.error(`[Webhook] Error updating page status:`, pageError);
          return NextResponse.json({ error: 'Erro ao atualizar página.' }, { status: 500 });
        }

        const emailComprador = pageData.email_comprador;
        const nomeDestinatario = pageData.nome_destinatario || 'seu pai';

        if (emailComprador) {
          await sendConfirmationEmail(emailComprador, nomeDestinatario, generatedSlug);
        }

        console.log(`[Webhook] Page ${pageId} unlocked successfully with slug: ${generatedSlug}`);
      }
    }

    // Return 200 OK to Mercado Pago to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('[Webhook] Error handling webhook:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
