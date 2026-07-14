import { ImageResponse } from 'next/og';

/**
 * Arte Open Graph genérica (RF10/T2.4): gerada em runtime, sem nenhum dado
 * da página — preview bonito no WhatsApp sem estragar a surpresa.
 */

export const runtime = 'edge';
export const alt = 'Alguém preparou uma surpresa para você';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F4F1EA 0%, #FAF8F5 55%, #FDF6E2 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '2px solid #D1C9BA',
            borderRadius: 24,
            padding: '64px 96px',
            background: '#FAF8F5',
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 24 }}>❤️</div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#8C7A5C',
              marginBottom: 20,
            }}
          >
            Recado Surpresa
          </div>
          <div
            style={{
              fontSize: 52,
              color: '#1A1817',
              textAlign: 'center',
              maxWidth: 800,
              lineHeight: 1.25,
            }}
          >
            Alguém preparou uma surpresa para você.
          </div>
          <div style={{ fontSize: 26, color: '#8C7A5C', marginTop: 28 }}>
            Toque para abrir o seu presente
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
