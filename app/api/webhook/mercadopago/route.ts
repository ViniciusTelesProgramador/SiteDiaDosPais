import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { generateShortSlug } from '@/lib/utils';
import { sendConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const isMercadoPagoConfigured = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  return token && token.trim() !== '' && !token.includes('your-mercadopago');
};

/**
 * Valida a assinatura `x-signature` do Mercado Pago (RNF10).
 * Manifesto oficial: `id:[data.id];request-id:[x-request-id];ts:[ts];`
 * — partes ausentes são omitidas; data.id alfanumérico vai em minúsculas.
 */
function validarAssinaturaMP(req: NextRequest, dataId: string | null): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || secret.trim() === '' || secret.includes('your-')) {
    // Fail closed em produção: sem secret configurado, nenhum webhook é aceito.
    if (IS_PRODUCTION) {
      console.error('[Webhook] MERCADO_PAGO_WEBHOOK_SECRET não configurado em produção.');
      return false;
    }
    console.warn('[Webhook] Sem MERCADO_PAGO_WEBHOOK_SECRET — validação pulada (apenas dev).');
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=').map((s) => s?.trim());
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  let manifest = '';
  if (dataId) {
    const normalizado = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
    manifest += `id:${normalizado};`;
  }
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Marca a página como paga, gera o slug (uma única vez) e envia o e-mail.
 * Retorna o slug quando ESTA chamada realizou a transição; null caso já
 * estivesse processada (idempotência — RNF10).
 */
async function processarPagamentoAprovado(paymentId: string): Promise<string | null> {
  // Transição atômica pendente -> pago: só uma chamada concorrente "vence".
  const { data: transicao, error: transError } = await supabaseAdmin
    .from('pagamentos')
    .update({ status: 'pago' })
    .eq('id', paymentId)
    .neq('status', 'pago')
    .select('pagina_id')
    .maybeSingle();

  if (transError) {
    console.error(`[Webhook] Erro ao atualizar pagamento ${paymentId}:`, transError);
    throw new Error('Erro ao atualizar pagamento.');
  }
  if (!transicao) {
    // Já processado antes (notificação duplicada) — nada a fazer.
    console.log(`[Webhook] Pagamento ${paymentId} já processado. Ignorando duplicata.`);
    return null;
  }

  const pageId = transicao.pagina_id;
  const agora = new Date();
  const expiraEm = new Date(agora);
  expiraEm.setMonth(expiraEm.getMonth() + 12);

  // Gera slug apenas se a página ainda não tem um (nunca gerar outro).
  const { data: pagina, error: pageError } = await supabaseAdmin
    .from('paginas')
    .select('slug, email_comprador, nome_destinatario, revelar_em, pago')
    .eq('id', pageId)
    .single();

  if (pageError || !pagina) {
    console.error(`[Webhook] Página ${pageId} não encontrada:`, pageError);
    throw new Error('Página associada ao pagamento não encontrada.');
  }

  const slug = pagina.slug || generateShortSlug(10);

  const { error: updateError } = await supabaseAdmin
    .from('paginas')
    .update({
      pago: true,
      slug,
      pago_em: agora.toISOString(),
      expira_em: expiraEm.toISOString(),
    })
    .eq('id', pageId);

  if (updateError) {
    console.error(`[Webhook] Erro ao atualizar página ${pageId}:`, updateError);
    throw new Error('Erro ao atualizar página.');
  }

  if (pagina.email_comprador) {
    await sendConfirmationEmail(
      pagina.email_comprador,
      pagina.nome_destinatario || 'seu pai',
      slug,
      { revelarEm: pagina.revelar_em }
    );
  } else {
    console.warn(`[Webhook] Página ${pageId} sem email_comprador — e-mail não enviado.`);
  }

  console.log(`[Webhook] Página ${pageId} liberada com slug ${slug}.`);
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // ------------------------------------------------------------------
    // Gatilho de simulação — SOMENTE em desenvolvimento (RNF10).
    // Em produção este caminho não existe: 404 sem tocar em nada.
    // ------------------------------------------------------------------
    const mockPaymentId = url.searchParams.get('mock_payment_id');
    if (mockPaymentId) {
      if (IS_PRODUCTION) {
        return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
      }

      const mockPageId = url.searchParams.get('page_id');
      const mockEmail = url.searchParams.get('email');
      if (!mockPageId || !mockPaymentId.startsWith('mock_pay_')) {
        return NextResponse.json({ error: 'Parâmetros de simulação inválidos.' }, { status: 400 });
      }

      console.log(`[Webhook Simulação] Liberando página ${mockPageId} (dev).`);

      if (isSupabaseConfigured()) {
        await supabaseAdmin.from('pagamentos').upsert({
          id: mockPaymentId,
          pagina_id: mockPageId,
          valor: 0,
          status: 'pendente',
          metodo: 'pix',
        });
        if (mockEmail) {
          await supabaseAdmin
            .from('paginas')
            .update({ email_comprador: mockEmail })
            .eq('id', mockPageId);
        }
        const slug = await processarPagamentoAprovado(mockPaymentId);
        return NextResponse.json({ success: true, slug });
      }

      // Sem Supabase: modo 100% local (IndexedDB no client)
      const slug = generateShortSlug(10);
      await sendConfirmationEmail(mockEmail || 'comprador@mock.com', 'Simulação', slug);
      return NextResponse.json({ success: true, slug, isMock: true });
    }

    // ------------------------------------------------------------------
    // Webhook real do Mercado Pago
    // ------------------------------------------------------------------
    let body: { data?: { id?: string }; id?: string | number; type?: string } = {};
    try {
      body = await req.json();
    } catch {
      // corpo pode estar vazio
    }

    const dataIdParam = url.searchParams.get('data.id') || url.searchParams.get('id');
    const paymentId = dataIdParam || body.data?.id || (body.id != null ? String(body.id) : null);
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body.type;

    // Assinatura primeiro: requisição não autenticada não toca no banco (RNF10)
    if (!validarAssinaturaMP(req, dataIdParam)) {
      console.warn('[Webhook] Assinatura inválida ou ausente. Rejeitando.');
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }

    console.log(`[Webhook] Notificação recebida: type=${type}, id=${paymentId}`);

    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }
    if (!paymentId) {
      return NextResponse.json({ error: 'ID de pagamento não informado.' }, { status: 400 });
    }
    if (!isMercadoPagoConfigured()) {
      return NextResponse.json({ error: 'Mercado Pago não configurado.' }, { status: 500 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 500 });
    }

    // Consulta o status real do pagamento na API do MP (nunca confia no body)
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
    });

    if (!mpResponse.ok) {
      console.error(`[Webhook] Erro ao consultar pagamento ${paymentId} no MP (${mpResponse.status}).`);
      // 500 faz o MP reenviar a notificação depois
      return NextResponse.json({ error: 'Erro ao consultar pagamento.' }, { status: 500 });
    }

    const mpPayment = await mpResponse.json();
    console.log(`[Webhook] Pagamento ${paymentId}: status=${mpPayment?.status}`);

    if (mpPayment?.status === 'approved') {
      // Conciliação: se o registro não existe (insert do checkout falhou),
      // recria a partir do external_reference antes de processar.
      const { data: existente } = await supabaseAdmin
        .from('pagamentos')
        .select('id')
        .eq('id', String(paymentId))
        .maybeSingle();

      if (!existente && mpPayment.external_reference) {
        await supabaseAdmin.from('pagamentos').insert({
          id: String(paymentId),
          pagina_id: mpPayment.external_reference,
          valor: mpPayment.transaction_amount ?? 0,
          status: 'pendente',
          metodo: 'pix',
        });
      }

      await processarPagamentoAprovado(String(paymentId));
    } else if (mpPayment?.status === 'rejected' || mpPayment?.status === 'cancelled') {
      await supabaseAdmin
        .from('pagamentos')
        .update({ status: 'falhou' })
        .eq('id', String(paymentId))
        .neq('status', 'pago');
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Webhook] Erro no processamento:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
