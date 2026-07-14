# Especificação de Produto — "Recado Surpresa" (Página Personalizada + QR Code para o Dia dos Pais)

> Documento de referência do produto. A camada de decisão emocional está em [`visao-produto.md`](./visao-produto.md) — toda feature nova deve ser testada contra ela. A execução técnica detalhada (tarefas, critérios de aceite, dependências) está em [`plano-implementacao.md`](./plano-implementacao.md). Os três documentos devem ser lidos juntos por quem for implementar.
>
> **Revisão 3 — 13/07/2026.** A rev. 2 incorporou a auditoria crítica (e-mail do comprador, segurança do webhook, RLS, preço único, status pós-Pix, recuperação de link, revelação agendada, LGPD, métricas). A rev. 3 incorpora a visão de produto: **formulário guiado por perguntas** (Efeito IKEA), **cerimônia de revelação** e **reação do destinatário** fechando o ciclo emocional. **Importante:** já existe um MVP parcialmente implementado neste repositório — este documento descreve o estado-alvo, e o plano de implementação descreve o caminho a partir do código existente.

---

## 1. Visão Geral do Projeto

**Nome de trabalho:** Recado Surpresa (ajuste livremente)

**O problema:** filhos(as) adultos com pouco orçamento não sabem o que dar de presente pro pai e recorrem a opções genéricas (meia, carteira, camiseta) que não expressam afeto.

**A solução:** um site onde a pessoa monta o presente respondendo perguntas curtas e evocativas (nunca um campo de texto em branco — cada resposta vira um bloco de conteúdo) e adicionando fotos com legendas, e o sistema gera automaticamente uma **página personalizada e única**, acessível via link e via **QR code para impressão**. O pai escaneia o QR num cartão físico (barato) e "desbloqueia" uma experiência digital emocional. Opcionalmente, a página só se revela no dia escolhido (ex.: 09/08), exibindo antes uma contagem regressiva — a surpresa é literal.

**Âncora de valor (guia para copy e preço):** custa menos que uma meia (R$ 30–50 do presente genérico) e é infinitamente mais memorável. Essa comparação é o argumento central de venda e deve aparecer na landing page.

**Por que funciona:**
- Resolve a dor real ("não sei o que dar") com baixo custo de produção pro comprador
- Gera conteúdo espontâneo de reação (viral loop no TikTok/Reels) — a revelação agendada concentra as aberturas no dia 09/08, ampliando o loop
- Reaproveitável para outras datas (Dia das Mães, Namorados, aniversários) → produto recorrente, não descartável

**Janela de lançamento:** Dia dos Pais, **09/08/2026** (**27 dias** a partir de 13/07/2026). O desenvolvimento do MVP já está adiantado; o gargalo é fechamento de gaps de segurança/funil e integração real (Mercado Pago produção, domínio, e-mail).

---

## 2. Objetivos de Negócio

| Objetivo | Meta MVP |
|---|---|
| Validar conceito antes da data | **50 páginas pagas até 09/08** |
| Monetização | **Pagamento único, preço único no MVP** (valor final a definir — sugestão R$ 14,90). A estrutura de planos fica no banco para v2, mas não há escolha de plano no fluxo de compra |
| Aprendizado | Medir se o "loop viral" (pai reagindo, filho postando) realmente puxa tráfego orgânico — instrumentado via `primeira_visualizacao_em` e cliques no botão de compartilhar |

---

## 3. Personas

**Comprador** — 18 a 40 anos, orçamento apertado, quer parecer emocionalmente presente sem gastar muito, ativo em redes sociais (TikTok/Instagram), compra por impulso via celular.

**Destinatário (pai)** — qualquer idade, recebe um cartão físico ou digital com QR code, abre no celular, não precisa instalar nada nem criar conta.

---

## 4. Escopo

### Dentro do MVP (v1 — até 09/08)
- **Formulário guiado** (e-mail do comprador como **primeiro campo**): perguntas curtas e evocativas, uma por vez — cada resposta vira um bloco de conteúdo da página; nunca um textarea em branco como primeiro contato (Efeito IKEA — visão §2, gatilho 1)
- Upload de fotos com **legenda curta opcional por foto** (compressão automática no client)
- 1 tema visual garantido ("Clássico"); segundo tema ("Descontraído") apenas se o prazo permitir
- **Revelação agendada** (opcional): página exibe contagem regressiva até a data escolhida (padrão 09/08) e só revela o conteúdo a partir dela — *prioridade alta, faz parte do MVP mesmo que custe o segundo tema*
- **Cerimônia de revelação** (visão §5, camada intermediária): toque para "abrir o presente", nome do destinatário aparece sozinho por 1–2s, transição suave — nunca troca instantânea de tela
- **Reação do destinatário** (visão §2, gatilho 3): emoji de 1 toque na página revelada + texto livre opcional depois do toque — a primeira reação e o primeiro texto disparam e-mails ao comprador, fechando o ciclo emocional em dois picos
- **A Carta / Recordação (PDF)**: as palavras do comprador (e a resposta do pai, quando existir) diagramadas como carta A4 para imprimir e guardar — permanência além da tela
- Preview ao vivo do tema dentro do próprio formulário (sem etapa separada de escolha)
- Pagamento único via Pix (Mercado Pago), com tela de status que confirma sozinha (polling)
- Geração de slug único + QR code após confirmação do pagamento
- Página pública de visualização, mobile-first, com contador de visualizações
- Envio do link/QR por e-mail após pagamento (domínio de envio verificado)
- Página **/recuperar**: reenvio do link por e-mail para comprador que perdeu o acesso
- Termos de uso + política de privacidade
- Limpeza automática de rascunhos não pagos

### Fora do MVP (v2+)
- Cartão de crédito (Pix primeiro: sem chargeback, taxa menor)
- Múltiplos planos/preços
- Áudio do comprador (10–30s) e reação do pai em áudio — v2 natural da reação por emoji (visão §4)
- Assistente de escrita com IA — apenas como apoio sobre as respostas guiadas, nunca geração do zero (visão §4/§7)
- Trilha sonora contínua/playlist — no MVP, no máximo som sutil no gesto de abertura; sem asset excelente, silêncio (visão §7)
- Lembrete pré-revelação ao comprador ("faltam 2 dias") — planejado como bônus se sobrar prazo (plano T2.8)
- Upload de vídeo
- Múltiplos temas/customização avançada
- Conta de usuário / histórico de páginas
- Edição pós-compra
- Domínio personalizado por página
- Envio físico de cartão pelos Correios
- Outras datas comemorativas (Mães, Namorados)

---

## 5. Requisitos Funcionais (RF)

| ID | Requisito |
|---|---|
| RF01 | O sistema deve permitir que o usuário monte a página com: **e-mail do comprador (primeiro campo, obrigatório, validado)**, nome do pai, **perguntas guiadas** (uma por vez, puláveis; cada resposta vira um bloco de conteúdo; mínimo 2 blocos ou mensagem final para avançar), upload de 1 a 5 fotos com **legenda curta opcional por foto**, data de revelação opcional (padrão 09/08/2026, pode ser "revelar imediatamente"). Nunca exibir um campo de texto livre em branco como primeiro contato de escrita |
| RF02 | O sistema deve exibir preview ao vivo do tema dentro do formulário e uma prévia completa da página antes do pagamento. A prévia (`/preview/[id]`) deve ter `noindex` e banner persistente "Prévia — pagamento pendente" |
| RF03 | O sistema deve processar pagamento via Pix (Mercado Pago) antes de disponibilizar o link final. O valor é definido **exclusivamente no servidor** — nenhum dado vindo do client altera o preço |
| RF04 | Após o pagamento confirmado, o sistema deve gerar uma URL pública única (slug aleatório não adivinhável, mínimo 10 caracteres). O slug só existe após o pagamento |
| RF05 | O sistema deve gerar automaticamente um QR code apontando para essa URL, disponível para download em PNG/PDF em alta resolução |
| RF06 | A página pública deve exibir os blocos de conteúdo, as fotos com legendas e o tema visual, de forma responsiva. Se houver data de revelação futura, deve exibir contagem regressiva **sem entregar o conteúdo nem no HTML/payload** (gate no servidor) |
| RF07 | O sistema deve enviar e-mail de confirmação com o link e o QR code em anexo, a partir de domínio verificado (SPF/DKIM) |
| RF08 | O lançamento requer 1 tema visual completo ("Clássico"); o segundo tema ("Descontraído") é desejável, não obrigatório |
| RF09 | O sistema deve validar tipo e tamanho de arquivo no upload e **comprimir/redimensionar as imagens no client** (máx. ~1600px, formato WebP/JPEG) antes do envio |
| RF10 | A página pública deve ter Open Graph amigável para WhatsApp/Instagram usando **imagem genérica do tema** ("Alguém preparou uma surpresa para você ❤️") — nunca as fotos pessoais, para não estragar a surpresa nem vazar conteúdo |
| RF11 | Após iniciar o pagamento, o sistema deve exibir tela de status com polling automático; ao confirmar, mostra link + QR + downloads. Se o comprador fechar a aba e voltar a `/preview/[id]` após pagar, deve ver o estado pago com o link |
| RF12 | Página `/recuperar`: o comprador informa o e-mail e recebe novamente os links das páginas pagas associadas. Resposta na tela é genérica (não revela se o e-mail existe) e o endpoint tem rate limit |
| RF13 | A página pública deve registrar visualizações: incrementar contador e gravar `primeira_visualizacao_em` uma única vez (métrica do loop viral) |
| RF14 | O funil deve emitir eventos de analytics por etapa: visita na landing → iniciou formulário → chegou ao preview → iniciou pagamento → pagou (com UTM de origem) |
| RF15 | **Cerimônia de revelação**: a abertura do conteúdo exige um toque ("abrir o presente"); o nome do destinatário aparece sozinho por 1–2s antes do conteúdo; transição suave, nunca instantânea. O toque é o único gesto que pode habilitar som sutil (navegadores móveis bloqueiam autoplay); sem asset de som aprovado, silêncio |
| RF16 | **Reação do destinatário**: a página revelada oferece reação por emoji (1 toque, sem cadastro, não pública). A **primeira** reação dispara e-mail ao comprador; reações seguintes atualizam o emoji sem novo e-mail. Após o toque, um campo de texto livre **opcional** ("Quer dizer com as suas palavras?") é revelado — nunca bloqueante; o **primeiro** texto dispara um segundo e-mail ("{nome} escreveu de volta"), com o texto do pai em destaque |
| RF17 | **A Carta / A Recordação (permanência)**: na tela de sucesso, o comprador pode baixar um PDF A4 com os blocos e a mensagem diagramados como carta (na ordem narrativa da página). Quando o destinatário já escreveu de volta, a resposta entra na mesma folha e o documento vira a "Recordação" — os dois lados da conversa em um único objeto imprimível |

---

## 6. Requisitos Não Funcionais (RNF)

| ID | Requisito |
|---|---|
| RNF01 | **Performance**: a página pública deve carregar em até 2s em conexão 4G (a compressão de imagens do RF09 é pré-condição) |
| RNF02 | **Mobile-first**: toda a experiência (formulário e página pública) otimizada para celular |
| RNF03 | **Segurança de URLs**: slugs aleatórios não sequenciais, não adivinháveis, gerados apenas após pagamento |
| RNF04 | **Privacidade/LGPD**: páginas pagas e previews com `noindex`; **retenção definida**: páginas pagas ficam no ar por 12 meses (comunicado na venda); rascunhos não pagos e suas fotos são apagados após 7 dias; canal de exclusão de dados (e-mail de contato nos termos); termos de uso atribuem ao comprador a responsabilidade pelo consentimento das pessoas retratadas nas fotos |
| RNF05 | **Escalabilidade**: suportar picos nos dias 07–09/08 (arquitetura serverless auto-escalável) |
| RNF06 | **Disponibilidade**: uptime mínimo de 99% no período de 01/08 a 10/08 |
| RNF07 | **Custo**: camadas gratuitas/pay-as-you-go onde possível. Custos fixos aceitos: **Vercel Pro** (o plano Hobby proíbe uso comercial — bloqueador de lançamento), domínio próprio. Monitorar egress do Supabase free (5 GB) e limite diário do Resend (100/dia no free) |
| RNF08 | **Compatibilidade**: Safari iOS e Chrome Android, sem instalação de app |
| RNF09 | **Moderação básica**: termos de uso proibindo conteúdo impróprio + revisão manual leve nos primeiros dias |
| RNF10 | **Segurança do webhook**: validar a assinatura `x-signature` do Mercado Pago; processamento **idempotente** (notificações duplicadas não geram slug novo nem segundo e-mail); o modo de simulação/mock deve estar completamente desabilitado em produção |
| RNF11 | **Autorização no banco**: RLS habilitado em todas as tabelas; escrita apenas via service role key (rotas de servidor); leitura pública apenas de páginas com `pago = true`, buscadas por `slug`; a anon key não pode ler rascunhos nem alterar nada |

---

## 7. Arquitetura Técnica

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS — *já implementado neste repositório*
- **Hospedagem:** Vercel **Pro** (Hobby proíbe uso comercial)
- **Backend:** API Routes do Next.js (serverless)
- **Banco de dados:** Supabase (Postgres) com **RLS habilitado**; rotas de servidor usam **service role key** (nunca exposta ao client); client usa anon key só para leituras permitidas por policy
- **Armazenamento de mídia:** Supabase Storage (fotos comprimidas no client antes do upload — controla egress e performance)
- **Geração de QR code:** biblioteca `qrcode` (já em uso)
- **Pagamento:** Mercado Pago **Pix** (sem chargeback, taxa ~1%; cartão fica para v2). Webhook com validação de assinatura e idempotência
- **E-mail transacional:** Resend com **domínio próprio verificado** (SPF/DKIM) — o remetente de teste `onboarding@resend.dev` não entrega para terceiros
- **Analytics:** Vercel Analytics ou Plausible/Umami (sem banner de cookies)
- **Nota sobre o modo mock:** o código atual tem um modo de simulação (IndexedDB + pagamento fake) para desenvolvimento sem credenciais. Ele deve continuar existindo **apenas** em desenvolvimento e estar inacessível em produção (ver RNF10)

---

## 8. Modelo de Dados (entidades principais)

**Página** (`paginas`)
- `id` (UUID, PK)
- `slug` (string, único, **nullable** — só é preenchido após confirmação do pagamento)
- `email_comprador` (string, obrigatório — único canal de recuperação/entrega)
- `nome_destinatario` (string)
- `mensagem` (text — mensagem principal/fechamento, opcional se houver blocos)
- `blocos` (jsonb, nullable — respostas das perguntas guiadas como blocos de conteúdo: `[{pergunta_id, titulo, texto}]`)
- `midias` (jsonb — `[{url, legenda}]`, legenda opcional por foto; substitui o array simples de URLs)
- `tema` (enum: `classico` | `descontraido`) — nomes canônicos; o código legado usa `divertido` e deve ser renomeado
- `plano` (enum: `basico` | `completo`, default `basico` — mantido para v2; sem uso no fluxo do MVP)
- `pago` (boolean, default false)
- `pago_em` (timestamp, nullable)
- `revelar_em` (timestamp, nullable — se futuro, página pública mostra contagem regressiva; null = revela imediatamente)
- `expira_em` (timestamp — `pago_em` + 12 meses para pagas; `criado_em` + 7 dias para rascunhos)
- `visualizacoes` (integer, default 0)
- `primeira_visualizacao_em` (timestamp, nullable — mede se/quando o pai abriu)
- `reacao_emoji` (text, nullable), `reacao_texto` (text, nullable — resposta livre opcional do destinatário) e `reacao_em` (timestamp, nullable — primeira reação)
- `lembrete_enviado_em` (timestamp, nullable — controle do lembrete pré-revelação, se implementado)
- `criado_em` (timestamp)

**Pagamento** (`pagamentos`)
- `id` (text, PK — id do pagamento no Mercado Pago, como já implementado)
- `pagina_id` (UUID, FK → paginas)
- `valor` (numeric)
- `status` (enum: `pendente` | `pago` | `falhou`)
- `metodo` (enum: `pix` | `cartao`)
- `criado_em` (timestamp)

Duas tabelas bastam para este volume; `midias` como array de URLs é aceitável no MVP.

---

## 9. Fluxo do Usuário

1. Comprador acessa a landing page (copy com âncora de valor: "menos que uma meia") → clica em "Criar presente"
2. Monta o presente no formulário guiado: **e-mail primeiro**, nome do pai, perguntas evocativas uma por vez (cada resposta vira um bloco da página — a pessoa sente que está "descobrindo" o que dizer, não inventando), fotos com legenda (comprimidas automaticamente), data de revelação (padrão 09/08, opção "revelar agora") — com **preview ao vivo do tema no próprio formulário**
3. Visualiza a prévia completa da página (com banner "prévia — pagamento pendente")
4. Clica em pagar → recebe QR Pix → **tela de status confirma sozinha** (polling); se fechar a aba, o e-mail chega de qualquer forma e `/preview/[id]` mostra o estado pago ao voltar
5. Sistema (via webhook validado) gera slug + marca como pago + envia e-mail com link e QR
6. Comprador vê link + QR na tela e recebe por e-mail; pode baixar PNG/PDF
7. Comprador imprime o QR (ou envia digitalmente) para o pai
8. Pai escaneia → se houver revelação agendada, vê contagem regressiva até 09/08 → no dia, toca em "abrir o presente": o nome dele aparece sozinho por um instante, depois o conteúdo se revela com transição suave (cerimônia — visão §5)
9. Pai deixa uma reação de 1 toque (emoji) → comprador recebe e-mail "seu pai abriu e reagiu ❤️" — o pico emocional de quem comprou; o ciclo fecha (visão §2, gatilho 3)
10. Página pública tem botão de compartilhar destacado (instrumentado) → alimenta o loop viral
11. Comprador que perdeu o e-mail usa `/recuperar` para receber o link de novo

---

## 10. Requisitos de UI/Design

- Tom emocional, caloroso — evitar estética corporativa/genérica
- **Anti-cringe (visão §7, vale para tudo):** sem confete, brilhos ou emojis flutuantes — o destinatário tem 50–70 anos; nenhuma frase pronta de efeito ("um pai é um herói…") — todo texto emocional da página vem das respostas do comprador; silêncio é melhor que trilha piegas; um tema excelente > três medianos; especificidade > estética
- Tema "Clássico" (elegante, cores neutras) garantido no lançamento; "Descontraído" (cores vivas, futebol/churrasco) apenas se sobrar prazo — **a revelação agendada tem prioridade sobre o segundo tema**
- Tela de contagem regressiva caprichada (é a primeira coisa que o pai vê se houver revelação agendada): nome do destinatário, "alguém preparou uma surpresa para você", countdown até a data
- Botão de compartilhamento destacado na página pública (WhatsApp, Instagram Stories)
- QR code em alta resolução, pronto para impressão em cartão
- Open Graph com arte genérica do tema — nunca foto pessoal
- FAQ curto + e-mail de suporte visível na landing (reduz tickets no fim de semana do lançamento)

---

## 11. Métricas de Sucesso (MVP)

Meta principal: **50 páginas pagas até 09/08**.

Funil instrumentado (eventos por etapa, com UTM de origem):
1. Visitas na landing
2. Iniciou o formulário
3. Chegou ao preview
4. Iniciou pagamento (Pix gerado)
5. Pagou

Métricas do loop viral:
- Taxa de abertura pelo destinatário (`primeira_visualizacao_em` preenchido / páginas pagas)
- **Taxa de reação** (`reacao_em` preenchido / páginas abertas) — mede o fechamento do ciclo emocional, o principal gerador de recompra ("vou fazer um pra minha mãe")
- Cliques no botão de compartilhar da página pública
- Concentração de aberturas no dia 09/08 (efeito da revelação agendada)

Ferramenta: Vercel Analytics ou Plausible/Umami. CAC só se houver tráfego pago (não previsto no MVP).

---

## 12. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Prazo apertado (27 dias) | MVP já parcialmente implementado; foco em fechamento de gaps (ver plano); cortar segundo tema antes de qualquer outra coisa; última semana (01–08/08) reservada para testes e marketing, não features |
| Pico de tráfego 07–09/08 | Serverless auto-escalável (Vercel Pro + Supabase); imagens comprimidas controlam egress |
| Fraude no webhook (desbloqueio sem pagar) | Validação de assinatura do MP + mock desabilitado em produção + RLS (RNF10/RNF11) |
| Chargeback/estorno | MVP só aceita Pix (sem chargeback, taxa menor) |
| Conta Mercado Pago nova com limites/retenção de saque | Criar e verificar a conta de produção imediatamente; testar um saque real antes do lançamento |
| E-mail não entregue (spam/limite) | Domínio verificado SPF/DKIM; monitorar limite diário do Resend; página /recuperar como plano B; FAQ "não recebi meu e-mail" |
| Sobrecarga de suporte em 08–09/08 (fim de semana) | FAQ na landing, e-mail de suporte visível, /recuperar elimina o ticket mais comum; definir quem responde no fim de semana |
| Egress do Supabase free (5 GB) estourar com fotos | Compressão no client (~300 KB/foto); monitorar dashboard na semana do pico |
| Produto parecer genérico/piegas ("cringe" destrói a credibilidade emocional) | Perguntas guiadas com voz de amigo (testadas em voz alta — decisão D9), nenhuma frase pronta, animações sóbrias, revelação com respiro; ver `visao-produto.md` §7 |
| Conteúdo impróprio enviado por usuários | Termos de uso + revisão manual leve nos primeiros dias |
| Direito de imagem das fotos (LGPD) | Termos atribuem responsabilidade de consentimento ao comprador; canal de exclusão; retenção definida (RNF04) |
| Baixa conversão por desconfiança | Prévia completa antes do pagamento; Pix (familiar no Brasil); âncora de preço na landing |

---

## 13. Plano de Execução (fechamento de gaps)

> A especificação original previa 7 prompts para construir o produto do zero. **Esse código já existe neste repositório** (formulário, preview, checkout Pix, webhook, página pública, e-mail). Esta seção foi substituída pela lista de gaps a fechar sobre o código existente, na ordem de execução. O detalhamento completo de cada tarefa — objetivo, arquivos a editar, critérios de aceite testáveis, riscos e dependências — está em [`plano-implementacao.md`](./plano-implementacao.md), que é o documento que os implementadores devem seguir.

Ordem resumida (a numeração completa está no plano):

1. **Fase 0 — Segurança e Fundação** *(bloqueadora, primeiro de tudo)*: assinatura + idempotência no webhook e remoção do mock em produção; migração do schema (novos campos da seção 8) + RLS; separação anon key / service role key; preço único definido no servidor.
2. **Fase 1 — Funil de Conversão** *(bloqueadora)*: e-mail como primeiro campo; **formulário guiado por perguntas** (roteiro incluído no plano, decisão D9); preview ao vivo do tema no formulário; tela de status de pagamento com polling; página `/recuperar`; banner + `noindex` no preview.
3. **Fase 2 — Polish e Loop Viral**: revelação agendada com **cerimônia de abertura** *(bloqueadora por decisão de produto)*; compressão de imagens; **reação do destinatário fechando o ciclo**; contador de visualizações; OG genérica + botão de compartilhar instrumentado; eventos de funil; lembrete pré-revelação e segundo tema *(cortáveis)*.
4. **Fase 3 — Lançamento** *(bloqueadora)*: termos de uso e privacidade; limpeza de rascunhos; copy final da landing com âncora de preço e FAQ; deploy de produção (domínio, Resend verificado, MP produção) e teste ponta-a-ponta.

Cada tarefa do plano cita os arquivos reais do repositório (ex.: `app/api/webhook/mercadopago/route.ts`, `app/criar/page.tsx`, `lib/supabase.ts`) para que a IA implemente **editando o código existente**, nunca recriando do zero.
