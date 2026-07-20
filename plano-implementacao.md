# Plano de Implementação — Recado Surpresa

> **Documento de execução.** Complementa a [`especificacao-presente-surpresa.md`](./especificacao-presente-surpresa.md) (rev. 3, 13/07/2026), que define o produto, e a [`visao-produto.md`](./visao-produto.md), que é a camada de decisão emocional acima de tudo — em dúvida de design/copy/escopo, a visão decide. Este plano é autossuficiente para quem implementa: contexto do código existente, tarefas ordenadas com critérios de aceite, decisões pendentes do dono do produto e checklist de teste final.
>
> **Prazo:** lançamento em 09/08/2026 (Dia dos Pais). Hoje: 13/07/2026 — 27 dias.
> **Regra de corte:** se o prazo apertar, corta-se na ordem: lembrete pré-revelação (T2.8) → segundo tema (T2.6) → eventos de funil (T2.5) → contador de views (T2.3) → reação do destinatário (T2.7, o último 🟡 a cair — é o fechamento do ciclo emocional). Nada marcado 🔴 pode ser cortado.
> **Filtro para qualquer feature nova:** ela aprofunda um dos três gatilhos da `visao-produto.md` §2, ou só adiciona complexidade? Se a resposta for a segunda, não entra.

---

## Contexto para o implementador (leia antes de qualquer tarefa)

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS. Supabase (Postgres + Storage). Mercado Pago (Pix, via API REST direta com `fetch`, sem SDK). Resend (e-mail). Biblioteca `qrcode` para QR codes, `jspdf` para PDF. Deploy alvo: Vercel.

**Estado atual do repositório — o MVP já existe.** Nunca recrie páginas ou rotas do zero; edite os arquivos existentes:

| Arquivo | O que faz hoje |
|---|---|
| `app/page.tsx` | Landing page |
| `app/criar/page.tsx` | Formulário multi-etapa (client component): nome do pai, mensagem em campo livre, até 5 fotos (validação tipo/5MB), tema (`classico`\|`divertido`), plano (`basico`\|`completo`). **Não captura e-mail.** Salva rascunho no Supabase (`pago=false`) ou, sem credenciais, em IndexedDB (modo mock) |
| `app/preview/[id]/page.tsx` | Prévia completa da página + modal de checkout (é aqui que o e-mail é pedido hoje) + exibição do QR Pix + tela de sucesso com QR code/PDF. Lê de IndexedDB primeiro, depois Supabase |
| `app/p/[slug]/page.tsx` + `app/p/[slug]/PublicPageClient.tsx` | Página pública do destinatário |
| `app/api/checkout/route.ts` | Cria pagamento Pix no MP (`POST /v1/payments`). Preço vem do `plano` enviado pelo client (9,90/14,90 hardcoded). Grava `email_comprador` na página e insere em `pagamentos` (PK = id do MP). Sem credenciais MP, retorna Pix mock (`mock_pay_*`) |
| `app/api/webhook/mercadopago/route.ts` | Webhook do MP: consulta o pagamento na API, marca `pago=true`, gera slug (8 chars), envia e-mail via Resend com QR anexo. **Contém gatilho de simulação via query params (`mock_payment_id`, `page_id`, `email`) ativo em produção — backdoor.** Sem validação de assinatura. Idempotência por check-then-update (não atômica) |
| `lib/supabase.ts` | Client Supabase único com **anon key**, usado inclusive nas rotas de servidor |
| `lib/utils.ts` | `generateShortSlug(length=8)` com `Math.random()` |
| `lib/localDatabase.ts` | Modo mock: rascunhos em IndexedDB para rodar sem Supabase. Manter funcionando **apenas em desenvolvimento** |

**Convenções:** manter nomes de campos em português (`nome_destinatario`, `pago`, `criado_em`) — o banco e o código já usam assim. Textos de UI em pt-BR. Mensagens de erro amigáveis no client, detalhe técnico só em `console.error`. **Design e copy seguem a regra anti-cringe** (visão §7): sem confete/brilhos, sem frases prontas de efeito, animações sóbrias, silêncio em vez de trilha piegas — o destinatário tem 50–70 anos.

**Variáveis de ambiente existentes:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`, `NEXT_PUBLIC_APP_URL`. Novas a introduzir neste plano: `SUPABASE_SERVICE_ROLE_KEY` (T0.2), `MERCADO_PAGO_WEBHOOK_SECRET` (T0.1), `CRON_SECRET` (T3.2). Atualize o `.env.example` sempre que criar uma.

**Modelo de dados alvo** (schema completo na seção 8 da especificação): tabela `paginas` ganha `email_comprador`, `pago_em`, `revelar_em`, `expira_em`, `visualizacoes`, `primeira_visualizacao_em`, `reacao_emoji`, `reacao_em`, `lembrete_enviado_em` e `blocos` (jsonb — respostas das perguntas guiadas); `midias` passa de array de URLs para jsonb `[{url, legenda}]`; `slug` explicitamente nullable; enum de tema passa a `classico`|`descontraido` (renomear `divertido`). Tabela `pagamentos` ganha `criado_em`.

---

## Legenda

- 🔴 **Bloqueadora de lançamento** — não vai ao ar sem isso
- 🟡 **Desejável** — adiável se o prazo apertar (ordem de corte no topo do documento)
- **Depende de:** dependências reais entre tarefas; não iniciar antes das dependências

---

## Fase 0 — Segurança e Fundação (alvo: 14–18/07)

Tudo aqui é pré-requisito das fases seguintes. Nenhuma rota nova deve ser exposta antes de T0.1 e T0.2.

### T0.1 🔴 Blindar o webhook do Mercado Pago
- **Objetivo:** impedir desbloqueio de página sem pagamento real e efeitos duplicados por notificações repetidas.
- **Arquivos:** `app/api/webhook/mercadopago/route.ts`, `lib/utils.ts`, `.env.example`.
- **O que fazer:**
  1. Validar a assinatura `x-signature` do Mercado Pago (HMAC-SHA256 com `MERCADO_PAGO_WEBHOOK_SECRET`, conforme manifesto `id:[data.id];request-id:[x-request-id];ts:[ts];` da documentação oficial de webhooks do MP). Requisição sem assinatura válida → `401`, sem tocar no banco.
  2. Gatilho de simulação (`mock_payment_id`): permitir **somente** quando `process.env.NODE_ENV !== 'production'`. Em produção, responder `404` sem executar nada.
  3. Idempotência atômica: a transição `pendente → pago` deve ser um único `UPDATE ... WHERE id = :paymentId AND status != 'pago'` (usar o retorno para saber se houve transição). Slug e e-mail só são gerados/enviados quando a transição de fato ocorreu nesta chamada. Se a página já tem slug, nunca gerar outro.
  4. Preencher `pago_em = now()` e `expira_em = now() + 12 meses` na mesma atualização da página.
  5. Trocar `generateShortSlug` para 10+ caracteres usando `crypto.randomUUID()`/`crypto.getRandomValues` em vez de `Math.random()`.
- **Critérios de aceite:**
  - Enviar o mesmo payload de webhook 2× → apenas 1 slug gerado, apenas 1 e-mail enviado, mesmo estado final.
  - POST sem assinatura válida (ou com assinatura de outro secret) → `401` e nenhuma linha alterada no banco.
  - Com `NODE_ENV=production`, chamada com `mock_payment_id=mock_pay_x&page_id=y` → `404`, página continua `pago=false`.
  - Em desenvolvimento, o fluxo mock continua funcionando de ponta a ponta.
- **Riscos:** o formato da assinatura do MP tem pegadinhas (query `data.id` vs body, lowercase do id). Testar com o simulador de webhooks do painel do MP antes de dar por pronto.

### T0.2 🔴 Migração de schema + RLS + separação de chaves
- **Objetivo:** banco com o modelo alvo e inacessível para escrita/leitura indevida via anon key.
- **Arquivos:** criar `supabase/schema.sql` (fonte de verdade versionada); criar `lib/supabaseAdmin.ts` (client com `SUPABASE_SERVICE_ROLE_KEY`, importável só em código de servidor); editar `lib/supabase.ts` (anon, só client-side), `app/api/checkout/route.ts`, `app/api/webhook/mercadopago/route.ts` (trocar para o admin client); `.env.example`.
- **O que fazer:**
  1. SQL com **todos** os campos do "Modelo de dados alvo" (inclui `blocos` jsonb, `midias` como jsonb `[{url, legenda}]` com migração dos arrays existentes, `reacao_emoji`, `reacao_em`, `lembrete_enviado_em`), `slug` nullable com índice único parcial (`WHERE slug IS NOT NULL`), `pagamentos.criado_em`, migração `divertido` → `descontraido` nos registros existentes.
  2. Habilitar RLS nas duas tabelas. Policies: `paginas` — `SELECT` público apenas quando `pago = true` (busca por slug); `INSERT` público permitido apenas para rascunho (`pago=false`, sem slug) se o formulário continuar gravando direto do client — caso contrário, mover a criação do rascunho para uma API route com admin client (preferível; decidir na implementação e documentar). Nenhum `UPDATE`/`DELETE` via anon. `pagamentos` — nenhum acesso via anon.
  3. Storage: bucket de fotos com upload permitido apenas via rota de servidor ou policy restrita; leitura pública das imagens é aceitável no MVP (URLs não adivinháveis).
- **Critérios de aceite:**
  - Com a anon key: `UPDATE paginas SET pago=true` → recusado; `SELECT` de página com `pago=false` por `id` → vazio; `SELECT` por `slug` de página paga → funciona.
  - Checkout e webhook continuam funcionando ponta a ponta usando o admin client.
  - `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle client (verificar `next build` + grep no output).
- **Depende de:** nada (pode rodar em paralelo com T0.1).
- **Riscos:** RLS mal configurado quebra silenciosamente o preview (`/preview/[id]` lê rascunho por id — essa leitura terá que passar por rota de servidor ou policy específica). Testar o fluxo completo de criação após ativar.

### T0.3 🔴 Preço único definido no servidor
- **Objetivo:** um plano, um preço, impossível de manipular pelo client.
- **Arquivos:** `app/api/checkout/route.ts`, `app/criar/page.tsx`, `app/preview/[id]/page.tsx`, `app/page.tsx` (copy de preço).
- **O que fazer:** remover a seleção de plano do formulário e do preview; o checkout ignora qualquer `plano`/valor vindo do body e usa uma constante única no servidor (`PRECO_UNICO` — valor conforme decisão D5; usar R$ 14,90 até segunda ordem). Manter o campo `plano` no banco com default `basico`. Aproveitar para renomear o tema `divertido` → `descontraido` em todo o código (tipos, UI, valores gravados).
- **Critérios de aceite:**
  - Request ao checkout com `plano: 'completo'` ou qualquer campo de valor forjado → cobrança sai pelo preço único do servidor.
  - Nenhuma menção a dois planos na UI; preço exibido na landing e no preview vem de uma única constante/config.
  - Nenhuma ocorrência de `divertido` no código (`grep` limpo), sem quebrar páginas já gravadas (migradas no SQL de T0.2).
- **Depende de:** T0.2 (migração do enum no mesmo SQL).

---

## Fase 1 — Funil de Conversão (alvo: 18–25/07)

### T1.1 🔴 E-mail como primeiro campo do formulário
- **Objetivo:** capturar o e-mail do comprador no início do funil, antes de qualquer investimento de esforço dele.
- **Arquivos:** `app/criar/page.tsx`; rota/fluxo de criação de rascunho (conforme decidido em T0.2); `app/api/checkout/route.ts`; `app/preview/[id]/page.tsx`.
- **O que fazer:** campo de e-mail obrigatório e validado como **primeiro campo** da primeira etapa; gravar `email_comprador` já no rascunho. O modal de checkout no preview pré-preenche com o e-mail do rascunho (editável). O checkout passa a ler o e-mail do banco (fallback: body).
- **Critérios de aceite:** rascunho recém-criado no banco já tem `email_comprador`; e-mail inválido bloqueia o avanço com mensagem clara; modal de pagamento vem pré-preenchido.
- **Depende de:** T0.2.

### T1.2 🔴 Formulário guiado por perguntas (Efeito IKEA) + legendas por foto
> O item de maior impacto emocional e mais barato do plano (visão §2, gatilho 1). O comprador nunca encara um campo em branco: responde perguntas curtas, uma por vez, e cada resposta vira um bloco de conteúdo da página.
- **Objetivo:** substituir o campo de mensagem livre por perguntas evocativas cujas respostas viram blocos (`paginas.blocos`), e dar legenda opcional a cada foto.
- **Arquivos:** `app/criar/page.tsx`; o componente compartilhado de renderização (de T1.3) exibe os blocos; schema já pronto (T0.2).
- **Roteiro inicial das perguntas** (aprovar na decisão D9 — testar lendo em voz alta; devem soar como um amigo perguntando, nunca formulário de RH):
  1. *"Qual frase ele vive repetindo — aquela que você até revira os olhos, mas que é a cara dele?"* → bloco **"A frase que é a sua cara"**
  2. *"Conta uma vez em que ele demonstrou orgulho de você sem dizer uma palavra."* → bloco **"Você achou que eu não vi, mas…"**
  3. *"Se você pudesse guardar só uma lembrança de vocês dois, qual seria?"* → bloco **"A lembrança que eu guardo"**
  4. *"O que você quer que ele saiba, mas nunca conseguiu falar olhando pra ele?"* → bloco **"O que eu nunca te disse"**
  5. Fechamento opcional, curto e livre: *"Se quiser, feche do seu jeito — uma linha basta."* → grava em `mensagem`
- **O que fazer:** UI de uma pergunta por vez com botão "pular"; todas opcionais, mas exigir **mínimo 2 blocos preenchidos ou a mensagem de fechamento** para avançar; cada resposta renderiza como bloco com o título correspondente (o comprador não precisa "escrever bonito"). Cada foto ganha campo de legenda opcional com placeholder evocativo (ex.: *"onde foi? o que estava acontecendo?"*). Migração de exibição: páginas antigas com apenas `mensagem` continuam renderizando normalmente.
- **Critérios de aceite:**
  - Em nenhum momento do fluxo o primeiro contato de escrita é um textarea em branco.
  - Perguntas aparecem uma por vez, puláveis; tentar avançar com menos de 2 blocos e sem fechamento → mensagem clara pedindo pelo menos mais um.
  - Respostas aparecem como blocos titulados no preview e na página pública; legendas aparecem junto às fotos.
  - Página legada (só `mensagem`, `midias` como URLs migradas) renderiza sem erro.
- **Depende de:** T0.2, T0.3. Executar junto/logo antes de T1.3 (mesma área de código).
- **Riscos:** o tom das perguntas é o coração do produto — usar o roteiro acima como placeholder funcional e trocar sem custo quando D9 fechar (perguntas em um array de configuração, não hardcoded na UI).

### T1.3 🔴 Preview ao vivo do tema dentro do formulário
- **Objetivo:** eliminar a etapa separada de escolha de tema — o usuário vê a página tomando forma enquanto responde (reforça o Efeito IKEA: ele *vê* o que está construindo).
- **Arquivos:** `app/criar/page.tsx`; extrair a renderização visual da página de `app/p/[slug]/PublicPageClient.tsx` para um componente compartilhado (ex.: `components/PageRenderer.tsx`) usado por formulário, preview e página pública — já preparado para blocos + legendas (T1.2).
- **O que fazer:** painel de preview (mobile: colapsável/atalho "ver como ficou"; desktop: lado a lado) refletindo nome, blocos, fotos/legendas e tema em tempo real. A troca de tema é um toggle dentro do formulário.
- **Critérios de aceite:** alterar tema/resposta/foto reflete no preview sem reload; página pública e preview usam o mesmo componente de renderização (mudança de layout em um lugar só aparece nos três contextos); fluxo tem uma etapa a menos que o atual.
- **Depende de:** T0.3; idealmente junto com T1.2.
- **Riscos:** refatoração do `PublicPageClient` pode quebrar a página pública — conferir visualmente após extrair.

### T1.4 🔴 Tela de status de pagamento com polling
- **Objetivo:** o comprador nunca fica sem resposta após pagar o Pix, mesmo fechando a aba.
- **Arquivos:** `app/preview/[id]/page.tsx`; criar `app/api/pagina-status/[id]/route.ts` (retorna `{ pago, slug }` — usa admin client, responde apenas o mínimo).
- **O que fazer:** após exibir o QR Pix, poll a cada 4–5s (parar após ~15min com mensagem "assim que o pagamento for confirmado você recebe por e-mail"); ao confirmar, transiciona para a tela de sucesso existente (link + QR + downloads). Ao carregar `/preview/[id]` de uma página já paga, mostrar direto a tela de sucesso.
- **Critérios de aceite:** pagar (mock em dev) → tela vira "confirmado" sozinha em ≤10s sem interação; fechar a aba após pagar e reabrir `/preview/[id]` → tela de sucesso com link; o endpoint de status não vaza `email_comprador` nem conteúdo da página.
- **Depende de:** T0.1, T0.2, T1.1.

### T1.5 🔴 Página /recuperar (reenvio de link)
- **Objetivo:** eliminar o pior ticket de suporte — "paguei e perdi o link".
- **Arquivos:** criar `app/recuperar/page.tsx` e `app/api/recuperar/route.ts`; reaproveitar `sendConfirmationEmail` extraindo-a de `app/api/webhook/mercadopago/route.ts` para `lib/email.ts` (webhook passa a importar de lá); link "Perdeu seu link?" no rodapé de `app/page.tsx`.
- **O que fazer:** formulário de e-mail → o endpoint busca páginas `pago=true` daquele `email_comprador` e reenvia o e-mail de confirmação de cada uma. Resposta na tela sempre genérica ("se houver compras neste e-mail, você receberá os links em instantes"). Rate limit simples (ex.: 3 tentativas por e-mail/IP por hora — pode ser em memória + verificação de timestamp no banco, sem infra nova).
- **Critérios de aceite:** e-mail com compra paga → recebe os links; e-mail inexistente → mesma resposta na tela, nenhum e-mail; 10 chamadas seguidas → bloqueado com `429`; rascunhos não pagos nunca são reenviados.
- **Depende de:** T0.2, T1.1.

### T1.6 🔴 Preview protegido: banner + noindex
- **Objetivo:** impedir que a URL do preview substitua o produto pago e que rascunhos sejam indexados.
- **Arquivos:** `app/preview/[id]/page.tsx` (e o layout/metadata da rota); `app/p/[slug]/page.tsx` (conferir `noindex` também na página pública, exigido pela RNF04).
- **O que fazer:** banner fixo "Prévia — pagamento pendente" sobre o conteúdo enquanto `pago=false` (sumindo após confirmação); `<meta name="robots" content="noindex">` no preview e na página pública.
- **Critérios de aceite:** banner visível e não removível por scroll em página não paga; ausente após pagamento; meta robots presente no HTML das duas rotas.
- **Depende de:** nenhuma (pode ser paralela).

---

## Fase 2 — Polish e Loop Viral (alvo: 25/07–01/08)

### T2.1 🔴 Revelação agendada + cerimônia de abertura
> Prioridade alta por decisão de produto: faz parte do MVP mesmo que custe o segundo tema. A cerimônia é a "camada intermediária" da visão §5 — barata e eleva muito a percepção. Este é o **pico** do Peak-End Rule (visão §3).
- **Objetivo:** página pública opcionalmente só revela o conteúdo a partir de `revelar_em` (contagem regressiva antes), e a abertura é uma cerimônia: toque para abrir, nome do destinatário sozinho por 1–2s, transição suave.
- **Arquivos:** `app/criar/page.tsx` (campo "quando revelar?" — padrão 09/08/2026 00:00, opção "revelar imediatamente"); `app/p/[slug]/page.tsx` (**gate no servidor**); `app/p/[slug]/PublicPageClient.tsx` / `components/PageRenderer.tsx`; novo `components/CountdownReveal.tsx`; schema já pronto (T0.2).
- **O que fazer:**
  1. **Gate no servidor:** se `revelar_em > now()`, renderizar **apenas** a tela de countdown (nome do destinatário + "alguém preparou uma surpresa para você" + contagem) — mensagem, blocos, fotos e URLs de mídia **não podem estar no HTML nem em payload/props serializados**. Timezone de referência: America/Sao_Paulo. Countdown no client com o timestamp alvo; ao zerar, buscar/recarregar o conteúdo.
  2. **Cerimônia (vale para toda página, agendada ou não):** o conteúdo não aparece de cara — a página mostra um convite sóbrio "toque para abrir o presente"; ao tocar, o nome do destinatário aparece sozinho por 1–2s, depois o conteúdo entra com transição suave (fade/slide discreto — sem confete, sem brilhos). O toque é o único gesto que pode habilitar som sutil (navegadores móveis bloqueiam autoplay); **sem asset de som aprovado, silêncio** — nunca trilha genérica "emotiva".
- **Critérios de aceite:**
  - Página com `revelar_em` futuro: view-source/DevTools → nenhuma ocorrência dos blocos, da mensagem nem das URLs das fotos; countdown correto.
  - Ajustar `revelar_em` para o passado → conteúdo aparece (após o gesto de abertura); countdown zerando com a página aberta transiciona sozinho para o convite de abertura.
  - Cerimônia: sem toque, o conteúdo não aparece; ao tocar, nome primeiro (1–2s), depois conteúdo com transição suave; funciona no Safari iOS e Chrome Android.
  - Página com `revelar_em = null` pula o countdown mas mantém a cerimônia de abertura.
  - OG/e-mail continuam funcionando para páginas agendadas (o e-mail do comprador chega na hora do pagamento, independente da data de revelação — deixar isso claro no texto do e-mail).
- **Depende de:** T0.2 (campo no schema), T1.3 (componente compartilhado).
- **Riscos:** vazamento de conteúdo por gate no client — o gate **tem** que ser server-side. Cache/ISR da rota: usar renderização dinâmica ou revalidação curta para a virada acontecer. Exagero visual: revisar contra a visão §7 antes de dar por pronto.

### T2.2 🔴 Compressão de imagens no upload
- **Objetivo:** fotos ≤ ~300 KB garantem o RNF01 (2s em 4G) e controlam o egress do Supabase.
- **Arquivos:** `app/criar/page.tsx` (pipeline de upload); possivelmente `lib/imagem.ts` novo.
- **O que fazer:** redimensionar no client para máx. 1600px no maior lado e reencodar (WebP com fallback JPEG, qualidade ~0.8) via canvas ou biblioteca leve (ex.: `browser-image-compression`), antes do upload ao Storage. Manter a validação de 5MB como limite de entrada.
- **Critérios de aceite:** foto de 5MB/4000px sai do pipeline com ≤ ~300KB e ≤1600px; qualidade visual aceitável em tela de celular; HEIC do iPhone tratado (ou erro claro pedindo outro formato); página pública com 5 fotos < 2s de LCP em throttling 4G do DevTools.
- **Riscos:** HEIC/orientação EXIF no Safari iOS — testar em iPhone real.

### T2.3 🟡 Contador de visualizações + primeira abertura
- **Objetivo:** medir a métrica central do loop viral (o pai abriu?).
- **Arquivos:** `app/p/[slug]/page.tsx` (ou pequena API route chamada pelo client); SQL: função RPC `incrementar_visualizacao(slug)` com `UPDATE ... SET visualizacoes = visualizacoes + 1, primeira_visualizacao_em = COALESCE(primeira_visualizacao_em, now())`.
- **Critérios de aceite:** cada acesso incrementa; `primeira_visualizacao_em` gravado apenas no primeiro acesso; incremento não é possível via anon key fora da RPC.
- **Depende de:** T0.2.

### T2.4 🔴 Open Graph genérico + botão de compartilhar instrumentado
- **Objetivo:** preview bonito no WhatsApp sem vazar fotos pessoais (e sem estragar a surpresa); medir compartilhamentos.
- **Arquivos:** `app/p/[slug]/page.tsx` (função `generateMetadata`); arte estática em `public/og/` (uma por tema); `app/p/[slug]/PublicPageClient.tsx` (botão de compartilhar com evento).
- **O que fazer:** OG title "Alguém preparou uma surpresa para você ❤️", imagem genérica do tema (1200×630), nunca mídia do usuário. Botão de compartilhar usa Web Share API com fallback para link do WhatsApp; cada uso emite evento de analytics.
- **Critérios de aceite:** colar o link no WhatsApp → card com arte genérica (validar também com um debugger de OG); nenhuma URL de foto pessoal nas meta tags; clique no compartilhar aparece no analytics.
- **Depende de:** T2.5 para o evento (ou stub até lá).

### T2.5 🟡 Eventos de funil / analytics
- **Objetivo:** medir o funil da seção 11 da especificação (visita → formulário → preview → Pix gerado → pago).
- **Arquivos:** `app/layout.tsx` (script do provider); pontos de emissão em `app/page.tsx`, `app/criar/page.tsx`, `app/preview/[id]/page.tsx`; pageview de `app/p/[slug]/`.
- **O que fazer:** Vercel Analytics (mais simples no Pro) ou Plausible/Umami; eventos nomeados por etapa; preservar UTM da landing até o evento de conversão (query → sessionStorage).
- **Critérios de aceite:** percorrer o funil em produção gera os 5 eventos visíveis no dashboard com a origem correta.

### T2.6 🟡 Segundo tema "Descontraído" (segundo corte se faltar prazo)
- **Objetivo:** variedade visual (cores vivas, futebol/churrasco) — só após tudo acima estável. Lembrar da visão §7: um tema excelente > três medianos; se o Descontraído não ficar excelente, não lança.
- **Arquivos:** componente compartilhado de renderização (de T1.3), `app/criar/page.tsx` (toggle), arte OG do tema em `public/og/`.
- **Critérios de aceite:** tema aplicado de ponta a ponta (formulário → preview → página pública → OG) sem regressão no Clássico.
- **Depende de:** T1.3, T2.4.

### T2.7 🟡 Reação do destinatário — fecha o ciclo emocional (último 🟡 a cortar)
> Visão §2, gatilho 3, e o **final** do Peak-End Rule: o momento mais forte do produto é o filho saber que o pai viu e sentiu. É também o principal gerador de recompra ("vou fazer um pra minha mãe").
- **Objetivo:** o pai deixa uma reação de 1 toque (emoji) na página revelada; a primeira reação dispara e-mail ao comprador.
- **Arquivos:** `components/PageRenderer.tsx`/`app/p/[slug]/PublicPageClient.tsx` (UI da reação, visível só após a cerimônia de abertura); criar `app/api/reacao/route.ts` (admin client); template novo em `lib/email.ts`; schema já pronto (T0.2: `reacao_emoji`, `reacao_em`).
- **O que fazer:** faixa discreta ao final do conteúdo ("deixe um recado de volta — um toque basta") com 3–4 emojis sóbrios (❤️ 👏 🥹 😂). Endpoint valida: slug existe, página paga e já revelada (`revelar_em` nulo ou passado). Grava `reacao_emoji`; na **primeira** reação (quando `reacao_em` era nulo), grava `reacao_em` e envia e-mail ao `email_comprador`: assunto "Seu pai abriu o presente ❤️", corpo curto com o emoji escolhido e link da página. Reações seguintes só atualizam o emoji (sem novo e-mail). Rate limit leve por slug.
- **Critérios de aceite:**
  - Reagir numa página revelada → e-mail chega ao comprador **uma única vez**, mesmo reagindo 5×.
  - Reagir de novo troca o emoji gravado sem novo e-mail.
  - Página não paga ou ainda não revelada → endpoint recusa.
  - A reação não aparece publicamente na página (é um canal privado de volta ao comprador).
  - UI da reação segue o anti-cringe: discreta, sem animação chamativa.
- **Depende de:** T0.2, T1.5 (`lib/email.ts` extraído), T2.1 (conceito de "revelada").
- **Riscos:** nenhum técnico relevante — o risco é de design (parecer botão de rede social); manter mínimo.

### T2.8 🟡 Lembrete pré-revelação (primeiro corte — só se sobrar prazo)
- **Objetivo:** reacender a expectativa do comprador (visão §2, gatilho 2): "faltam 2 dias para o [nome] ver a surpresa".
- **Arquivos:** estender o cron de T3.2 (`app/api/cron/cleanup/route.ts` ou rota irmã `app/api/cron/lembretes/route.ts`); template em `lib/email.ts`; schema já pronto (T0.2: `lembrete_enviado_em`).
- **O que fazer:** no job diário, selecionar páginas `pago=true` com `revelar_em` entre agora e +48h e `lembrete_enviado_em IS NULL`; enviar o lembrete e gravar `lembrete_enviado_em`.
- **Critérios de aceite:** página agendada recebe exatamente 1 lembrete na janela de 48h antes; páginas sem `revelar_em`, não pagas ou já lembradas não recebem nada; rodar o job 2× no mesmo dia não duplica envios.
- **Depende de:** T3.2 (infra de cron), T1.5 (`lib/email.ts`).
- **Riscos:** volume de e-mail concentrado em 07–08/08 — contar esses envios no limite diário do Resend (checklist de limites).

---

## Fase 3 — Lançamento (alvo: 28/07–05/08; freeze de features em 05/08)

### T3.1 🔴 Termos de uso + política de privacidade
- **Objetivo:** cobertura LGPD e de conteúdo (RNF04/RNF09): retenção de 12 meses, exclusão de rascunhos em 7 dias, responsabilidade do comprador pelo consentimento das pessoas nas fotos, proibição de conteúdo impróprio, canal de contato/exclusão.
- **Arquivos:** criar `app/termos/page.tsx` e `app/privacidade/page.tsx`; links no rodapé (`app/page.tsx`, `app/criar/page.tsx`); checkbox "li e aceito os termos" antes de criar o rascunho.
- **Critérios de aceite:** páginas acessíveis; criação bloqueada sem o aceite; textos revisados pelo dono do produto (decisão D7); e-mail de suporte real publicado.
- **Riscos:** texto gerado por IA precisa de revisão humana — não travar o desenvolvimento esperando; publicar com marcação de rascunho interno até D7 fechar.

### T3.2 🟡 Limpeza automática de rascunhos
- **Objetivo:** apagar rascunhos não pagos (e suas fotos no Storage) após 7 dias — custo e LGPD.
- **Arquivos:** criar `app/api/cron/cleanup/route.ts` protegida por `CRON_SECRET`; `vercel.json` com o agendamento (Vercel Cron, diário); alternativa: `pg_cron` no Supabase (mas a limpeza do Storage fica mais simples na rota Next).
- **Critérios de aceite:** rascunho com `criado_em` > 7 dias e `pago=false` é removido junto com os arquivos do Storage; páginas pagas jamais são afetadas; chamada sem o secret → `401`.
- *Adiável para a primeira semana pós-lançamento se necessário — mas não além, pois o acúmulo de fotos come o free tier. Nota: T2.8 (lembrete) reusa esta infra de cron; se T2.8 entrar, esta tarefa deixa de ser adiável.*

### T3.3 🔴 Copy final da landing + FAQ + suporte
- **Objetivo:** landing vendedora que nomeia a dor exata (visão §3: "não sabe o que dar? claro que não sabe, presente não é sobre objeto"), com âncora de preço ("menos que uma meia, infinitamente mais memorável") **posicionada perto da explicação das perguntas guiadas** — é ali que a pessoa entende que não está comprando um template (visão §6). Como funciona em 3 passos, FAQ e e-mail de suporte visível.
- **Arquivos:** `app/page.tsx`.
- **Critérios de aceite:** preço real exibido (decisão D5); FAQ cobre no mínimo: como o pai recebe, quanto tempo a página fica no ar (12 meses), reenvio de link, revelação agendada e a reação de volta; nenhuma frase pronta de efeito no copy (teste da visão §7); mobile impecável (Lighthouse mobile ≥ 90 em performance).

### T3.4 🔴 Deploy de produção + configuração real
- **Objetivo:** ambiente de produção completo e verificado.
- **Arquivos:** `.env.example` final; configuração na Vercel (envs de produção); webhook cadastrado no painel do MP apontando para o domínio final; `MAIL_FROM` com o domínio verificado no Resend; `NEXT_PUBLIC_APP_URL` = domínio final.
- **Critérios de aceite:** compra real de R$ (valor cheio) no domínio final completa o fluxo: Pix aprovado → webhook assinado processado → slug → e-mail entregue na caixa de entrada (não spam) → QR escaneado por celular abre a página → cerimônia funciona → reação volta por e-mail. Executar o checklist E2E completo (abaixo).
- **Depende de:** todas as 🔴 anteriores + decisões D1–D4.

---

## Fase 4 — Profundidade Emocional (aprovada integralmente em 14/07/2026)

> Origem: análise "levar a experiência emocional ao limite" sobre a `visao-produto.md`. Princípio: a emoção vem do material bruto (o que o filho lembrou); o produto extrai material melhor e não atrapalha na entrega.

### T4.1 🔴 Roteiro novo das perguntas guiadas
- **Arquivos:** `lib/config.ts` (só configuração).
- **O que muda:** P2 → "Hoje eu entendo" (irritava na infância, entende adulto); P3 → "Você achou que eu não vi" (o esforço invisível dele, notado); P4 ganha "Escreve aqui. **Ele vai ler.**"; P1 intocada. A antiga "lembrança" migra para o placeholder das legendas ("Que dia foi esse? O que você lembra dele?"). Helper fixo nas perguntas: *"Não precisa ser bonito. Precisa ser verdade."*
- **Aceite:** perguntas novas aparecem uma por vez no formulário; blocos com títulos novos renderizam; páginas legadas (ids `orgulho`/`lembranca`) continuam renderizando.

### T4.2 🔴 Ordem narrativa + clímax + fade por scroll
- **Arquivos:** `components/PageRenderer.tsx`, `lib/config.ts` (ORDEM_NARRATIVA/BLOCO_CLIMAX), `lib/types.ts`.
- **O que muda:** ordem fixa na página: frase (riso) → fotos (memória) → aprofundamento → **"O que eu nunca te disse" como clímax** (mais respiro, tipografia maior, título primeiro e texto num segundo fôlego) → fechamento. Blocos surgem com fade suave conforme o scroll (só na página pública — `cerimonia`; preview de edição continua imediato).
- **Aceite:** ordem independe da ordem de resposta; clímax visualmente distinto; sem timers automáticos segurando texto; preview ao vivo sem animação de scroll.

### T4.3 🔴 Reação com texto opcional + segundo e-mail
- **Arquivos:** `app/p/[slug]/PublicPageClient.tsx`, `app/api/reacao/route.ts`, `lib/email.ts`, `supabase/schema.sql` (`reacao_texto`).
- **O que muda:** após o emoji (que continua sendo o passo garantido), campo opcional "Quer dizer com as suas palavras?" com saída "Só o ❤️ já diz tudo →". Primeiro texto → e-mail "{nome} escreveu de volta." com o texto sozinho em serif + convite à Recordação.
- **Aceite:** emoji sem texto funciona como antes (1 e-mail); texto enviado 2x → 1 único segundo e-mail (transição atômica); campo nunca bloqueia a confirmação.

### T4.4 🔴 Microcopy tela a tela
- **Arquivos:** `app/criar/page.tsx`, `app/preview/[id]/page.tsx`, `components/CountdownReveal.tsx`, `app/p/[slug]/PublicPageClient.tsx`.
- **O que muda:** subtítulo do formulário ("A gente pergunta. Você lembra. Ele se emociona."), loading ("Guardando cada palavra..."), sucesso ("Pronto. Agora a parte boa é sua."), countdown ("tem algo aqui esperando por você." / "Vale a pena voltar. Prometo."), convite ("Isso aqui foi feito pra você. Só pra você."), prompt de reação ("Quem fez isso pra você está esperando pra saber se chegou."), confirmação ("Chegou. Pode deixar que a gente conta.").
- **Aceite:** nenhum texto que *anuncie* emoção; na página do pai, nada com voz de plataforma.

### T4.5 🔴 A Carta / A Recordação (PDF)
- **Arquivos:** `app/preview/[id]/page.tsx` (jsPDF A4), `app/api/paginas/[id]/route.ts` (expõe reação ao dono do preview), `lib/email.ts` (convite no e-mail de texto).
- **O que muda:** botão na tela de sucesso gera PDF-carta com blocos na ordem narrativa + fechamento; quando `reacao_texto` existe, inclui "E a resposta dele" e vira "Recordação". Rodapé: *"A página expira. A carta, não."*
- **Aceite:** PDF multi-página com texto longo sem cortes; sem reação → "Carta"; com resposta → "Recordação" com o texto do pai; emoji não vai ao PDF (fontes PDF não têm o glifo — só o texto).

---

## Fase 5 — Surpresa Coletiva (aprovada em 16/07/2026)

> Origem: o Pedro achou o entregável da Fase 4 pouco diferenciado — mesmo com
> ordem narrativa, clímax e reação com texto, ainda é "uma página de uma
> pessoa só". Esta fase muda a categoria do produto: depois de pagar, o
> comprador convida 2–6 pessoas da família a deixarem uma mensagem curta, que
> entra junto na página do pai. Extensão aditiva — o fluxo de hoje continua
> idêntico para quem não usa o recurso.

### T5.1 🔴 Schema + config
- **Arquivos:** `supabase/schema.sql` (tabela `contribuicoes`, RLS habilitado
  sem policies), `lib/config.ts` (`MAX_CONTRIBUICOES=6`,
  `MAX_CONTRIBUICAO_TEXTO`, `MAX_NOME_CONTRIBUIDOR`,
  `MAX_RELACAO_CONTRIBUIDOR`), `lib/types.ts` (tipo `Contribuicao`).
- **Aceite:** SQL idempotente; RLS sem policies (anon não acessa nada).

### T5.2 🔴 API de contribuições
- **Arquivos:** `app/api/contribuicoes/route.ts` (POST envia — valida
  página paga e `revelar_em` futuro, rate limit, teto de
  `MAX_CONTRIBUICOES`, e-mail ao comprador; GET lista tudo para moderação),
  `app/api/contribuicoes/[id]/route.ts` (PATCH alterna `aprovado`),
  `lib/email.ts` (`sendContribuicaoEmail`).
- **Aceite:** 7ª contribuição bloqueada; página sem revelação agendada ou já
  revelada rejeita; 11 POSTs seguidos → `429`.

### T5.3 🔴 Página do convidado `/contribuir/[id]`
- **Arquivos:** `app/contribuir/[id]/page.tsx` (server component com os 3
  estados: inválido, indisponível, formulário), `app/contribuir/[id]/
  ContribuirClient.tsx` (formulário: nome, relação opcional, mensagem).
- **Aceite:** link funciona sem login; some/bloqueia quando o prazo encerra.

### T5.4 🔴 `PageRenderer`: seção "coro"
- **Arquivo:** `components/PageRenderer.tsx`. Nova seção depois do clímax,
  antes do fechamento — widening pós-pico sem disputar o Peak-End Rule com
  o clímax nem com a assinatura final. Mesmo padrão de fade por scroll
  (`Reveal`) do resto da página.
- **Aceite:** sem contribuições, zero mudança visual; com elas, aparecem na
  ordem de envio.

### T5.5 🔴 Página pública repassa as aprovadas
- **Arquivos:** `app/p/[slug]/page.tsx`, `app/p/[slug]/PublicPageClient.tsx`.
- **Aceite:** só contribuições `aprovado=true` aparecem; gate da revelação
  agendada (T2.1) continua intacto — contribuições só são buscadas depois
  dele.

### T5.6 🔴 Tela de sucesso: convite + moderação + Carta/Recordação
- **Arquivo:** `app/preview/[id]/page.tsx`. Card "Convide mais gente" com
  link copiável (só quando `revelar_em` é futuro); lista de moderação com
  toggle aprovar/ocultar; `downloadCartaPDF` passa a incluir a seção das
  contribuições aprovadas.
- **Aceite:** toggle reflete no `/p/[slug]`; PDF inclui só as aprovadas.

### T5.7 🟡 Nota no formulário de criação
- **Arquivo:** `app/criar/page.tsx` — uma linha na etapa "quando revelar"
  explicando que agendar libera o convite depois do pagamento.

---

## Fase 6 — Modo Storytime + Trilha do YouTube (aprovada em 16/07/2026)

> Origem: ao ver a prévia real (com dados de teste), o Pedro achou o
> entregável ainda fraco — mesmo com Fase 4 e Fase 5, a página era "só" um
> scroll comprido. Duas mudanças: a página vira uma sequência de momentos em
> tela cheia (storytime), navegada por toque/swipe/seta — sem avanço
> automático; e o comprador pode colar um link do YouTube com uma música que
> "é a cara dos dois", tocada por um botão visível (sem autoplay).

### T6.1–T6.2 🔴 Dados e utilitário
- **Arquivos:** `lib/utils.ts` (`extrairYoutubeId`), `supabase/schema.sql`
  (`paginas.musica_youtube_id`), `lib/types.ts`, `lib/localDatabase.ts`.
- Só o ID de 11 caracteres é armazenado, nunca a URL crua.

### T6.3 🔴 Formulário e APIs
- **Arquivos:** `app/criar/page.tsx` (campo opcional na etapa de fotos,
  validação leve não-bloqueante), `app/api/paginas/route.ts` (extrai e
  grava), `app/api/paginas/[id]/route.ts` (inclui no select).

### T6.4 🔴 Player
- **Arquivos:** `lib/youtubePlayer.ts` (loader singleton da IFrame API),
  `components/MusicPlayer.tsx` (player visível ~44px com overlay de
  tocar/pausar; `playVideo()` sempre dentro do próprio clique do usuário —
  sem depender de autoplay).

### T6.5 🔴 `PageRenderer`: reescrita para modo storytime
- **Arquivo:** `components/PageRenderer.tsx`. Troca o scroll contínuo com
  fade por `IntersectionObserver` (`Reveal`, removido) por uma lista de
  slides — um por vez, com dots de progresso, setas e swipe. Ordem: abertura
  → uma foto por slide → aprofundamento → clímax → coro (Fase 5, um slide
  só) → fechamento. Prop `cerimonia` removida (deixou de fazer sentido sem
  scroll).

### T6.6 🔴 Consumidores
- **Arquivos:** `app/p/[slug]/page.tsx` + `PublicPageClient.tsx`,
  `app/preview/[id]/page.tsx`, `app/criar/page.tsx` — todos repassam
  `musicaYoutubeId`; `cerimonia` removida das chamadas ao `PageRenderer`.

### T6.7 🟡 Carta/Recordação
- `downloadCartaPDF` ganha uma linha com o link da música, se houver.

**Verificação real:** fluxo ponta a ponta dirigido por Playwright
(formulário → prévia ao vivo) confirmou visualmente ordem narrativa correta,
setas/dots funcionando, e o player carregando a capa do vídeo do YouTube com
tocar/pausar funcional, sem erros de console.

---

## Fase 7 — Card para Stories + animações de valor (aprovada em 17/07/2026)

> Origem: ao ver a prévia real da Fase 6, o Pedro reportou um bug (fotos
> aparecendo como quadrado branco) e pediu mais duas coisas: animações que
> agreguem valor e um botão de compartilhar um card nos Stories no final da
> história, pra ajudar o site a circular.

### Bug corrigido
- `components/PageRenderer.tsx` — a `<figure>` do slide de foto (tema
  clássico) só tinha `max-w-xs` (sem `w-full`); virou filho de um `flex
  items-center justify-center` na Fase 6 e, sem largura própria num
  contêiner flex, o `w-full` do miolo da imagem não tinha contra o que
  resolver e colapsava. Corrigido adicionando `w-full` na `<figure>`.
  Confirmado com Playwright que a foto ocupa o quadrado inteiro.

### Compartilhar nos Stories
- **Arquivos novos:** `lib/shareCard.ts` (gera um PNG 1080×1920 via Canvas
  2D puro — sem dependência nova — com foto, nome, frase de abertura e
  marca do site), `components/ShareStoryButton.tsx` (botão com
  `navigator.share` de arquivo quando suportado, fallback de download
  quando não).
- Só aparece no slide de fechamento (naturalmente "o final da história") e
  só quando `ConteudoPagina.slugPublico` existe — presente apenas em
  `/p/[slug]` (`PublicPageClient.tsx`), ausente na prévia ao vivo e no
  rascunho pré-pagamento.
- Decisão do Pedro: o card pode conter nome/frase/foto (não só marca
  genérica) — quem compartilha é o próprio pai, já depois de ver tudo, logo
  o consentimento é dele (diferente do OG genérico de RF10, que protege
  quem *ainda não* abriu). O link do compartilhamento aponta pra home do
  site, não pro `/p/[slug]` privado — o objetivo é crescimento.

### Animações
- `app/globals.css`: `@keyframes photo-drop` (fotos "pousando" — queda +
  acerto de rotação), `climax-glow` (brilho radial suave atrás do clímax),
  `pulse-ring` (anel pulsante no botão de música enquanto toca); coro
  (Fase 5) ganhou entrada escalonada por card.

**Verificação real:** fluxo ponta a ponta completo via Playwright — criação
→ prévia (foto corrigida) → pagamento mock → página pública → cerimônia →
navegação até o fechamento → geração e download do card, sem nenhum erro de
console.

---

## Fase 8 — Landing Page premium: animações via ui-ux-pro-max (aprovada em 17/07/2026)

> Origem: o Pedro pediu para elevar o site inteiro (LP ao entregável) a um
> patamar "premium", usando a skill `ui-ux-pro-max` recém-instalada.
> Escopo grande demais para uma fase só — dividido em Fase 8 (LP, este
> plano), Fase 9 (formulário `/criar`) e Fase 10 (refino do entregável),
> ainda não iniciadas.

- **Fonte de dados:** Python não instalado (a própria skill instrui a
  nunca instalá-lo por conta própria) — recomendações extraídas
  diretamente dos CSVs em `.claude/skills/ui-ux-pro-max/data/` (styles,
  colors, ui-reasoning) em vez do script `search.py`.
- **Decisão do Pedro:** manter a cor de marca indigo-600 — ganho 100% em
  movimento/percepção de qualidade, sem trocar paleta.
- **Arquivos:** `app/globals.css` (`prefers-reduced-motion` global,
  cobrindo também as animações das Fases 6/7; técnica de accordion
  `grid-template-rows`), `components/ScrollReveal.tsx` (novo, fade+stagger
  ao entrar na viewport), `components/FaqItem.tsx` (novo, substitui
  `<details>` nativo), `app/page.tsx` (hero com entrada escalonada, cards
  com scroll-reveal, FAQ suave, feedback de toque nos CTAs).
- **Verificação real:** Playwright em mobile (390px, sem scroll
  horizontal) e desktop (1440px) confirmando fade/stagger correto ao
  entrar na viewport, FAQ abrindo/fechando, CTA navegando, e uma segunda
  passagem com `prefers-reduced-motion: reduce` emulado confirmando que o
  conteúdo aparece direto, sem animação. Zero erros de console.

---

## Fase 9 — Identidade visual premium da LP (aprovada em 20/07/2026)

> Origem: depois de ver a Fase 8 ao vivo, o Pedro achou que "não mudou
> nada" — porque um screenshot parado não mostra animação, e a Fase 8
> deliberadamente não tinha mexido em cor/layout (foi escolha dele na
> hora). Ele então aprovou ir além: mudar a paleta e adicionar um elemento
> visual de destaque no hero. Isso reordena o roadmap: a "Fase 9
> (formulário)" e "Fase 10 (entregável)" do plano anterior viram **Fase
> 10** e **Fase 11**, ainda não iniciadas.

- **Paleta:** indigo → rosa quente (`pink-600`/`#DB2777`, igual ao dado da
  skill `ui-ux-pro-max` pra categoria Wedding/Event Planning) + creme/
  dourado no fundo. Troca sistemática em `app/page.tsx` e
  `components/FaqItem.tsx`.
- **Hero em duas colunas:** texto (mesma entrada escalonada da Fase 8) +
  card decorativo à direita (`lg:` só, escondido no mobile) que replica em
  miniatura o tema clássico real do `PageRenderer` — mostra o produto de
  verdade em vez de imagem de banco. Flutuação contínua sutil
  (`@keyframes float`, `app/globals.css`), entrando na mesma regra
  `prefers-reduced-motion` da Fase 8.
- **Verificação real:** Playwright confirmou a cor do CTA (`rgb(219, 39,
  119)` = `#DB2777`), o card do hero presente, zero scroll horizontal no
  mobile (390px), FAQ/scroll-reveal da Fase 8 intactos, e a flutuação
  corretamente neutralizada com `prefers-reduced-motion: reduce`
  (duração cai pra `0.01ms`). Zero erros de console.

---

## Fase 11 (adiantada) — Entregável premium: mais animação + ícones 3D (aprovada em 20/07/2026)

> Origem: Pedro insatisfeito — Fases 8-9 só mexeram na LP; o entregável de
> verdade (a página do presente) continuava "ruim", sem animação e sem
> sensação premium. Prazo apertado, adiantou a Fase 11 do roadmap (estava
> planejada pra depois do formulário).

- **Ícones 3D:** Pedro escolheu emoji glossy cartoon (não o efeito sóbrio
  de sombra/vidro que eu recomendei). Caminho sem risco de licença: emoji
  Unicode de verdade (o SO já renderiza glossy/3D nativo) — trocado o
  ícone `Heart` (lucide) por ❤️ real no fechamento (`SlideFechamento`,
  bem maior), acrescentado 🤍 no título do coro (`SlideCoro`). Clímax
  continua só tipografia — texto mais vulnerável, emoji destoaria.
- **Halo pulsante atrás do 🎁** na cerimônia de abertura
  (`PublicPageClient`, fase `convite`).
- **Mais animação geral:** `@keyframes slide-in` (toda transição de slide
  do storytime) ganhou *scale* somado ao fade+translateY — sensação de
  "entrar em foco"; novo `@keyframes ambient-glow` — respiração sutil de
  fundo atrás do card inteiro (clássico e descontraído), pra página
  parecer viva mesmo parada num slide só.
- Tudo somado à regra `prefers-reduced-motion` já existente (Fase 8) —
  confirmado que zera as animações novas também.
- **Verificação real:** fluxo completo via Playwright (criação →
  pagamento mock → página pública → cerimônia → fechamento);
  screenshots confirmam visualmente o halo do presente e o coração
  grande no fechamento; teste direto da regra CSS confirma
  `prefers-reduced-motion` neutralizando o halo. Zero erros de console.

---

## Fase 12 — Reinvenção do entregável: carta lacrada + mensagem de voz (aprovada em 20/07/2026)

> Origem: Pedro foi direto — as Fases 8/9/11 foram "mudanças pequenas que
> não impactam em muita coisa". O pedido foi mudar **a forma** do
> entregável, porque o valor percebido está baixo demais pra alguém pagar.
> "Pense grande e faça maior ainda." Duas mudanças estruturais, as maiores
> alavancas ainda não puxadas no produto.

### Parte A — Cerimônia vira "abrir uma carta lacrada"
- Substituiu as fases `convite`/`nome` de `PublicPageClient.tsx` por:
  `envelope` → `quebrando` (selo de cera quebra) → `abrindo` (aba dobra
  pra trás via `rotateX` + `backface-visibility: hidden`, sem precisar
  simular o verso) → `carta` (card sobe de dentro do envelope já mostrando
  o nome) → `conteudo`.
- Tudo em CSS puro (`app/globals.css`: `seal-breathe`, `selo-quebra`,
  `aba-abrindo`, `carta-sobe`), sem lib nova, somado à regra
  `prefers-reduced-motion` já existente.
- Validado visualmente com Playwright (screenshot de cada etapa) — sem
  nenhum artefato visual na rotação 3D da aba.

### Parte B — Mensagem de voz do comprador
- A própria `visao-produto.md` (§4) já identificava isso como a maior
  alavanca emocional ainda não construída.
- **Dados:** `paginas.audio_url` + bucket `audios` no Storage (mesmo
  modelo de segurança do bucket `fotos`).
- **Gravação:** `components/GravadorAudio.tsx` (novo) — `MediaRecorder`,
  até `MAX_AUDIO_SEGUNDOS` (30s), prévia com regravar; opcional, erro de
  permissão nunca bloqueia o formulário.
- **Reprodução:** `components/VoiceMessagePlayer.tsx` (novo) — `<audio>`
  nativo, sem iframe, sem autoplay; vira o **primeiro slide** do
  storytime quando há áudio ("Antes de tudo").
- **Verificação real:** fluxo completo via Playwright com microfone falso
  do Chromium (`--use-fake-device-for-media-stream`) — gravação, upload
  (IndexedDB mock), cerimônia completa da carta, slide de voz tocando/
  pausando. Zero erros de console.

---

## Decisões que dependem do dono do produto (não são código)

Estas travam tarefas se atrasarem — todas têm lead time externo (DNS, verificação de conta, etc.):

| # | Decisão/ação | Prazo sugerido | Trava o quê |
|---|---|---|---|
| D1 | **Definir nome final + registrar domínio** | **15/07** | D2, D3, OG, URL do QR, e-mail — tudo com o domínio no meio. DNS propaga em horas, mas verificações dependem dele |
| D2 | **Verificar o domínio no Resend (SPF/DKIM)** | 18/07 | T3.4 e qualquer teste real de e-mail. Sem isso, e-mail de produção simplesmente não entrega |
| D3 | **Criar/verificar conta Mercado Pago de produção** (KYC pode levar dias) e **testar um saque real** | iniciar já; pronto até 20/07 | T3.4 e o teste E2E com dinheiro real. Conta nova pode ter retenção de saque — descobrir isso agora, não em agosto |
| D4 | **Assinar Vercel Pro** | 20/07 | Deploy comercial legal (Hobby proíbe) e Vercel Cron/Analytics usados em T3.2/T2.5 |
| D5 | **Bater o martelo do preço único** (sugestão: R$ 14,90) | 15/07 | T0.3, T3.3 (copy). O código usará R$ 14,90 como placeholder até lá |
| D6 | **Definir plano de suporte para 08–09/08** (quem responde o e-mail no fim de semana, tempo-alvo de resposta) | 01/08 | Nada de código, mas é o maior risco operacional do lançamento |
| D7 | **Revisar/aprovar os textos de termos e privacidade** | 01/08 | Publicação final de T3.1 |
| D8 | **Aprovar a arte dos cartões/OG e o copy da landing** | 03/08 | T3.3 final |
| D9 | **Aprovar o roteiro das perguntas guiadas** (ler em voz alta — devem soar como um amigo perguntando; roteiro inicial em T1.2) | 18/07 | Copy final de T1.2 (o desenvolvimento segue com o roteiro placeholder; as perguntas ficam em configuração, troca sem custo) |

---

## Checklist de teste ponta-a-ponta (executar completo antes do lançamento, em produção)

Fluxo feliz:
- [ ] Criar página no celular (iPhone Safari e Android Chrome): e-mail primeiro campo, perguntas uma a uma (pular funciona; mínimo de 2 blocos ou fechamento exigido), respostas viram blocos no preview, legendas por foto, fotos comprimidas, preview ao vivo, prévia com banner
- [ ] Pagar Pix real → tela de status confirma sozinha em ≤10s → link + QR na tela
- [ ] E-mail chega na caixa de entrada (testar Gmail e Outlook), QR anexo escaneável **impresso em papel**
- [ ] QR escaneado abre a página pública: cerimônia completa (toque para abrir → nome sozinho 1–2s → conteúdo com transição suave) no Safari iOS e Chrome Android; os temas renderizam certo

Piores cenários (motivo de existir deste checklist):
- [ ] **Pagamento cai com a aba fechada:** gerar o Pix, fechar o navegador, pagar → e-mail chega mesmo assim; reabrir `/preview/[id]` mostra a tela de sucesso com o link
- [ ] **Webhook duplicado:** reenviar a notificação pelo painel do MP → nenhum slug novo, nenhum segundo e-mail, estado inalterado
- [ ] **Webhook forjado:** POST direto na URL do webhook sem assinatura → `401`; com `mock_payment_id` → `404`; banco intacto nos dois casos
- [ ] **Rascunho abandonado:** criar rascunho, não pagar → segue inacessível publicamente (sem slug, RLS bloqueia leitura anônima); após 7 dias (ou rodando o cron manualmente), rascunho e fotos somem do banco e do Storage
- [ ] **Revelação agendada:** página com `revelar_em` futuro → countdown; view-source sem blocos/mensagem/fotos; mudar a data para o passado → convite de abertura aparece; countdown zerando com a página aberta transiciona sozinho
- [ ] **Reação:** reagir 5× → 1 único e-mail ao comprador, emoji atualizado; reagir em página não revelada → recusado; reação não aparece publicamente
- [ ] **Recuperação:** `/recuperar` com e-mail comprador → links chegam; e-mail aleatório → mesma resposta na tela e nenhum e-mail; spam de tentativas → `429`
- [ ] **Lembrete (se T2.8 entrou):** página agendada recebe 1 lembrete na janela de 48h; rodar o cron 2× não duplica

Segurança e privacidade:
- [ ] Com a anon key (console do browser): impossível ler rascunhos, alterar `pago`, ler `pagamentos`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausente de qualquer JS servido ao client
- [ ] Link colado no WhatsApp → card OG genérico, nunca foto pessoal
- [ ] `noindex` presente no preview e na página pública

Qualidade emocional (visão §7 — revisar com olhos de comprador, não de dev):
- [ ] Ler as perguntas guiadas em voz alta: soam como um amigo, não como formulário de RH?
- [ ] A página final de um teste real (com conteúdo de verdade) emociona ou parece template? Sem confete, sem frase pronta, sem trilha piegas?
- [ ] A cerimônia tem "respiro" (não instantânea) sem ser lenta a ponto de irritar?

Performance e limites:
- [ ] Página pública com 5 fotos: LCP < 2s em throttling 4G (DevTools) e Lighthouse mobile ≥ 90
- [ ] Conferir limites do dia: Resend (100/dia no free — somar confirmações + recuperações + reações + lembretes na projeção; upgrade se passar), egress Supabase no dashboard
- [ ] Funil completo gera os 5 eventos no analytics com UTM correta

---

## Resumo executivo do cronograma

| Semana | Foco |
|---|---|
| 14–18/07 | Fase 0 completa (segurança/fundação) + decisões D1–D5 e D9 encaminhadas |
| 18–25/07 | Fase 1 completa (funil + formulário guiado) |
| 25/07–01/08 | Fase 2 (cerimônia de revelação primeiro; reação do destinatário na sequência; lembrete e segundo tema por último) |
| 28/07–05/08 | Fase 3 em paralelo ao fim da Fase 2; **freeze de features 05/08** |
| 05–08/08 | Checklist E2E em produção (incluindo o bloco de qualidade emocional), correções, marketing/conteúdo |
| 09/08 | Lançamento — monitorar suporte, e-mail, egress, reações e analytics |
