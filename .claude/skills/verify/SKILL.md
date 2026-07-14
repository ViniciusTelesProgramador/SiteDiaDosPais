---
name: verify
description: Como buildar, rodar e verificar o Recado Surpresa (Next.js 14 + Supabase + Mercado Pago) sem credenciais reais.
---

# Verificação — Recado Surpresa

## Build e execução

```powershell
npm run build                 # build de produção (lint + types inclusos)
npm run start -- -p 3100      # servidor de PRODUÇÃO (NODE_ENV=production)
npm run dev -- -p 3101        # servidor de DESENVOLVIMENTO (modo simulação)
```

Sem `.env.local`, o app roda em **modo de simulação**: checkout retorna Pix
mock, e-mails são logados no console do servidor, rascunhos vivem em
IndexedDB (browser). As rotas que exigem banco respondem 503.

## Superfícies que valem verificar (curl/Invoke-WebRequest)

Produção (`npm run start`) — gates de segurança:
- `POST /api/webhook/mercadopago?mock_payment_id=mock_pay_x&page_id=<uuid>` → **404** (backdoor desativado)
- `POST /api/webhook/mercadopago?type=payment&data.id=123` sem assinatura → **401** (fail closed)
- `POST /api/checkout` com `plano`/`valor` forjados → `amount` sempre vem de `lib/config.ts` (PRECO_UNICO)
- `GET /api/cron/cleanup` sem `Authorization: Bearer $CRON_SECRET` → **401**
- `POST /api/recuperar` 4x com o mesmo e-mail → **429** na 4ª (rate limit 3/h por e-mail, 5/h por IP; contadores em memória — reiniciar o servidor zera)
- `GET /p/<slug>` e `/preview/<id>` → HTML contém `noindex`; OG é genérica ("Alguém preparou uma surpresa")
- `GET /p/<slug>/opengraph-image` → PNG 1200x630

Desenvolvimento (`npm run dev`) — o mock deve FUNCIONAR:
- `POST /api/webhook/mercadopago?mock_payment_id=mock_pay_x&page_id=<uuid>&email=a@b.com` → 200 `{slug, isMock:true}` + e-mail simulado no log do servidor

## Fluxo browser (precisa de navegador — IndexedDB)

/criar → formulário guiado (e-mail primeiro → 4 perguntas → fechamento →
fotos+legendas+tema+revelação+termos) → /preview/[id] → "Simular Confirmação
Pix" → tela de sucesso → /p/[slug] → cerimônia (toque para abrir → nome →
conteúdo) → reação por emoji. Em modo mock tudo fica no IndexedDB do browser.

## Pegadinhas

- O gate da revelação agendada é server-side em `/p/[slug]/page.tsx` — para
  testar vazamento, view-source com `revelar_em` futuro não pode conter
  blocos/mensagem/URLs de fotos.
- A validação de assinatura do MP é pulada em dev sem
  `MERCADO_PAGO_WEBHOOK_SECRET` (com aviso); em produção sem secret, TODO
  webhook é rejeitado.
- Logs do servidor em PowerShell mostram UTF-8 mangled (Ã§) — é só o console.
- Ao testar `/api/reacao` via PowerShell: `-Body` string corrompe o emoji
  (ISO-8859-1) e gera 400. Envie bytes:
  `[Text.Encoding]::UTF8.GetBytes($json)` com `charset=utf-8`.
