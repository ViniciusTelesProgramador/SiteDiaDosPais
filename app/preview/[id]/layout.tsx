import type { Metadata } from 'next';

// Prévia de rascunho: nunca indexar (RNF04/T1.6)
export const metadata: Metadata = {
  title: 'Prévia do presente — Recado Surpresa',
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
