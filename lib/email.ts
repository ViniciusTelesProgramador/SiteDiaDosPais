import 'server-only';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { APP_NAME } from '@/lib/config';

/**
 * E-mails transacionais (RF07/RF12/RF16/T2.8).
 * Sem RESEND_API_KEY configurada, os envios são simulados no console
 * (modo de desenvolvimento).
 */

const resend =
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY.trim() !== '' &&
  !process.env.RESEND_API_KEY.includes('re_your')
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM = process.env.MAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function layoutEmail(conteudo: string): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e0d5; border-radius: 12px; background-color: #faf8f5; color: #2c2a27;">
      ${conteudo}
      <hr style="border: 0; border-top: 1px solid #e5e0d5; margin: 30px 0;" />
      <p style="font-size: 11px; color: #8c7a5c; text-align: center;">E-mail transacional enviado automaticamente por ${APP_NAME}.</p>
    </div>
  `;
}

async function enviar(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<boolean> {
  if (!resend) {
    console.log('\n==================================================');
    console.log('E-MAIL SIMULADO (RESEND_API_KEY ausente)');
    console.log(`PARA: ${opts.to}`);
    console.log(`ASSUNTO: ${opts.subject}`);
    if (opts.attachments?.length) {
      console.log(`ANEXOS: ${opts.attachments.map((a) => a.filename).join(', ')}`);
    }
    console.log('==================================================\n');
    return true;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    return true;
  } catch (err) {
    console.error('[Resend] Falha ao enviar e-mail:', err);
    return false;
  }
}

/**
 * E-mail de confirmação pós-pagamento (RF07): link da página + QR code anexo.
 * Também usado pela página /recuperar (RF12).
 */
export async function sendConfirmationEmail(
  emailComprador: string,
  nomeDestinatario: string,
  slug: string,
  opts?: { revelarEm?: string | null }
): Promise<boolean> {
  const publicUrl = `${appUrl()}/p/${slug}`;

  let qrBuffer: Buffer;
  try {
    qrBuffer = await QRCode.toBuffer(publicUrl, { width: 600, margin: 1 });
  } catch (err) {
    console.error('Falha ao gerar QR Code para o e-mail:', err);
    return false;
  }

  const revelarEm = opts?.revelarEm ? new Date(opts.revelarEm) : null;
  const temAgendamento = revelarEm && revelarEm.getTime() > Date.now();
  const dataFormatada = temAgendamento
    ? revelarEm!.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
    : null;

  const html = layoutEmail(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px;">❤️</span>
      <h2 style="color: #2c2a27; margin-top: 10px; font-weight: normal;">O presente está pronto.</h2>
    </div>
    <p>O pagamento foi confirmado e a página para <strong>${nomeDestinatario}</strong> já está no ar.</p>
    ${
      temAgendamento
        ? `<p style="background: #fdf6e2; border: 1px solid #e5d9b8; border-radius: 8px; padding: 12px; font-size: 14px;">Você escolheu revelar a surpresa em <strong>${dataFormatada}</strong>. Quem abrir antes verá uma contagem regressiva — o conteúdo só aparece no dia. Pode entregar o QR code sem medo.</p>`
        : ''
    }
    <p style="margin: 28px 0; text-align: center;">
      <a href="${publicUrl}" style="background-color: #2c2a27; color: #faf8f5; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">Ver a página</a>
    </p>
    <p style="font-size: 14px; color: #555;">Link direto: <a href="${publicUrl}" style="color: #2c2a27;">${publicUrl}</a></p>
    <p style="font-size: 14px; color: #555; line-height: 1.5;">O <strong>QR code</strong> exclusivo está anexo a este e-mail — salve no celular ou imprima num cartão. <strong>Guarde este e-mail:</strong> ele é o seu acesso à página. Se perder, use ${appUrl()}/recuperar.</p>
    <p style="font-size: 13px; color: #8c7a5c;">A página fica no ar por 12 meses.</p>
  `);

  return enviar({
    to: emailComprador,
    subject: `Seu ${APP_NAME} para ${nomeDestinatario} está pronto!`,
    html,
    attachments: [{ filename: 'qrcode-recado-surpresa.png', content: qrBuffer }],
  });
}

/** E-mail disparado pela primeira reação do destinatário (RF16, gatilho 3). */
export async function sendReactionEmail(
  emailComprador: string,
  nomeDestinatario: string,
  emoji: string,
  slug: string
): Promise<boolean> {
  const publicUrl = `${appUrl()}/p/${slug}`;
  const html = layoutEmail(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">${emoji}</span>
      <h2 style="color: #2c2a27; margin-top: 10px; font-weight: normal;">${nomeDestinatario} abriu o presente.</h2>
    </div>
    <p style="text-align: center; font-size: 16px;">E deixou uma reação de volta pra você: <strong style="font-size: 22px;">${emoji}</strong></p>
    <p style="text-align: center; font-size: 14px; color: #555;">Funcionou. Alguém se sentiu lembrado hoje por sua causa.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${publicUrl}" style="background-color: #2c2a27; color: #faf8f5; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Rever a página</a>
    </p>
  `);

  return enviar({
    to: emailComprador,
    subject: `${nomeDestinatario} abriu o presente e reagiu ${emoji}`,
    html,
  });
}

/**
 * Segundo e-mail da reação (Fase 4): o destinatário escreveu de volta.
 * O texto dele vai sozinho, em serif, sem moldura de marketing — e o
 * comprador é convidado a baixar a Recordação (PDF com os dois lados).
 */
export async function sendReactionTextEmail(
  emailComprador: string,
  nomeDestinatario: string,
  texto: string,
  paginaId: string
): Promise<boolean> {
  const previewUrl = `${appUrl()}/preview/${paginaId}`;
  const textoEscapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = layoutEmail(`
    <div style="text-align: center; margin-bottom: 8px;">
      <h2 style="color: #2c2a27; font-weight: normal;">${nomeDestinatario} escreveu de volta.</h2>
    </div>
    <blockquote style="margin: 28px 0; padding: 20px 24px; border-left: 3px solid #d1c9ba; font-size: 18px; line-height: 1.6; color: #2c2a27; font-style: italic; white-space: pre-line;">${textoEscapado}</blockquote>
    <p style="text-align: center; font-size: 14px; color: #8c7a5c;">Guarda esse.</p>
    <p style="font-size: 14px; color: #555; line-height: 1.5; margin-top: 28px;">Essa conversa entre vocês dois agora existe em uma folha: abra a sua página de compra e baixe a <strong>Recordação em PDF</strong> — o que você escreveu e o que ele respondeu, juntos. Imprima, guarde.</p>
    <p style="margin: 24px 0; text-align: center;">
      <a href="${previewUrl}" style="background-color: #2c2a27; color: #faf8f5; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Baixar a Recordação</a>
    </p>
  `);

  return enviar({
    to: emailComprador,
    subject: `${nomeDestinatario} escreveu de volta.`,
    html,
  });
}

/**
 * Notifica o comprador que alguém quis participar da Surpresa Coletiva
 * (Fase 5) — convida a rever/aprovar em `/preview/[id]` antes da revelação.
 */
export async function sendContribuicaoEmail(
  emailComprador: string,
  nomeDestinatario: string,
  nomeContribuidor: string,
  paginaId: string
): Promise<boolean> {
  const previewUrl = `${appUrl()}/preview/${paginaId}`;
  const html = layoutEmail(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px;">✍️</span>
      <h2 style="color: #2c2a27; margin-top: 10px; font-weight: normal;">${nomeContribuidor} quis participar.</h2>
    </div>
    <p style="text-align: center; font-size: 15px;">Deixou uma mensagem para entrar na surpresa de <strong>${nomeDestinatario}</strong>.</p>
    <p style="font-size: 14px; color: #555; text-align: center;">Dá uma olhada antes da revelação — você decide o que entra.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${previewUrl}" style="background-color: #2c2a27; color: #faf8f5; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Rever mensagens</a>
    </p>
  `);

  return enviar({
    to: emailComprador,
    subject: `${nomeContribuidor} quis participar da surpresa para ${nomeDestinatario}`,
    html,
  });
}

/** Lembrete pré-revelação (T2.8): enviado até 48h antes de revelar_em. */
export async function sendReminderEmail(
  emailComprador: string,
  nomeDestinatario: string,
  slug: string,
  revelarEm: string
): Promise<boolean> {
  const data = new Date(revelarEm);
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const publicUrl = `${appUrl()}/p/${slug}`;
  const html = layoutEmail(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px;">🎁</span>
      <h2 style="color: #2c2a27; margin-top: 10px; font-weight: normal;">Falta pouco.</h2>
    </div>
    <p>A surpresa que você preparou para <strong>${nomeDestinatario}</strong> se revela em <strong>${dataFormatada}</strong>.</p>
    <p style="font-size: 14px; color: #555;">Já garantiu que o QR code chegou nas mãos dele? Se ainda não imprimiu ou enviou, este é o momento.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${publicUrl}" style="background-color: #2c2a27; color: #faf8f5; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Ver a página</a>
    </p>
  `);

  return enviar({
    to: emailComprador,
    subject: `Faltam poucos dias para ${nomeDestinatario} ver a surpresa`,
    html,
  });
}
