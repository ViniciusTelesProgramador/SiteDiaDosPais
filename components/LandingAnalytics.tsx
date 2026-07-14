  'use client';

import { useEffect } from 'react';
import { capturarUTM, track } from '@/lib/analytics';

/** Dispara o evento de visita e captura a UTM da landing (RF14). */
export default function LandingAnalytics() {
  useEffect(() => {
    capturarUTM();
    track('visitou_landing');
  }, []);
  return null;
}
  