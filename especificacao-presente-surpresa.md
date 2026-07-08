# Especificação de Produto — "Recado Surpresa" (Página Personalizada + QR Code para o Dia dos Pais)

> Documento de referência para levar ao Antigravity + Claude. Contém visão de produto, requisitos funcionais e não funcionais, arquitetura sugerida e prompts prontos para gerar o entregável em etapas.

---

## 1. Visão Geral do Projeto

**Nome de trabalho:** Recado Surpresa (ajuste livremente)

**O problema:** filhos(as) adultos com pouco orçamento não sabem o que dar de presente pro pai e recorrem a opções genéricas (meia, carteira, camiseta) que não expressam afeto.

**A solução:** um site onde a pessoa preenche um formulário simples (fotos, mensagem, opcionalmente áudio/playlist) e o sistema gera automaticamente uma **página personalizada e única**, acessível via link e via **QR code para impressão**. O pai escaneia o QR num cartão físico (barato) e "desbloqueia" uma experiência digital emocional.

**Por que funciona:**
- Resolve a dor real ("não sei o que dar") com baixo custo de produção pro comprador
- Gera conteúdo espontâneo de reação (viral loop no TikTok/Reels)
- Reaproveitável para outras datas (Dia das Mães, Namorados, aniversários) → produto recorrente, não descartável

**Janela de lançamento:** Dia dos Pais, 09/08/2026 (33 dias a partir de hoje, 07/07/2026)

---

## 2. Objetivos de Negócio

| Objetivo | Meta MVP |
|---|---|
| Validar conceito antes da data | Vender e entregar pelo menos algumas dezenas de páginas até 09/08 |
| Monetização | Pagamento único por página gerada, com planos por nível de recurso |
| Aprendizado | Medir se o "loop viral" (pai reagindo, filho postando) realmente puxa tráfego orgânico |

---

## 3. Personas

**Comprador** — 18 a 40 anos, orçamento apertado, quer parecer emocionalmente presente sem gastar muito, ativo em redes sociais (TikTok/Instagram), compra por impulso via celular.

**Destinatário (pai)** — qualquer idade, recebe um cartão físico ou digital com QR code, abre no celular, não precisa instalar nada nem criar conta.

---

## 4. Escopo

### Dentro do MVP (v1 — até 09/08)
- 1 formulário de criação de página
- 1–2 temas visuais
- Upload de fotos + mensagem de texto
- Geração de slug único + QR code
- Pagamento único (Pix/cartão)
- Página pública de visualização, mobile-first
- Envio do link/QR por e-mail após pagamento

### Fora do MVP (v2+)
- Upload de áudio/vídeo
- Integração com playlist (Spotify embed)
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
| RF01 | O sistema deve permitir que o usuário preencha um formulário com: nome do pai, mensagem de texto, upload de 1 a N fotos |
| RF02 | O sistema deve gerar uma prévia (preview) da página antes da finalização do pagamento |
| RF03 | O sistema deve processar pagamento (Pix e/ou cartão) antes de disponibilizar o link final |
| RF04 | Após o pagamento confirmado, o sistema deve gerar uma URL pública única (slug não sequencial/não adivinhável) |
| RF05 | O sistema deve gerar automaticamente um QR code apontando para essa URL, disponível para download em PNG/PDF |
| RF06 | A página pública deve exibir as fotos, a mensagem e o tema visual escolhido, de forma responsiva |
| RF07 | O sistema deve enviar um e-mail de confirmação com o link e o QR code em anexo/baixável |
| RF08 | O usuário deve poder escolher entre pelo menos 2 temas visuais no momento da criação |
| RF09 | O sistema deve validar tipos e tamanho de arquivo de imagem no upload (evitar abuso) |
| RF10 | A página pública deve ter uma prévia de compartilhamento (Open Graph) amigável para WhatsApp/Instagram |

---

## 6. Requisitos Não Funcionais (RNF)

| ID | Requisito |
|---|---|
| RNF01 | **Performance**: a página pública deve carregar em até 2s em conexão 4G |
| RNF02 | **Mobile-first**: toda a experiência (formulário e página pública) deve ser otimizada para celular, já que o pai abre via QR no smartphone |
| RNF03 | **Segurança**: URLs devem usar identificadores não sequenciais (UUID), impossíveis de adivinhar |
| RNF04 | **Privacidade/LGPD**: imagens e dados pessoais não devem ser indexados por buscadores (`noindex`); política de retenção e exclusão de dados definida |
| RNF05 | **Escalabilidade**: a infraestrutura deve suportar picos de acesso nos dias que antecedem 09/08 sem degradar performance (preferir arquitetura serverless auto-escalável) |
| RNF06 | **Disponibilidade**: uptime mínimo de 99% no período de 01/08 a 10/08 (janela crítica de vendas e visualizações) |
| RNF07 | **Custo de infraestrutura**: manter custo baixo em serviços de camada gratuita/pay-as-you-go, compatível com operação de baixo ticket |
| RNF08 | **Compatibilidade**: funcionar nos navegadores móveis mais comuns (Safari iOS, Chrome Android) sem necessidade de instalação de app |
| RNF09 | **Moderação básica**: termos de uso que proíbam conteúdo impróprio enviado pelos usuários |

---

## 7. Arquitetura Técnica Sugerida

- **Frontend:** Next.js + Tailwind CSS, hospedado na Vercel
- **Backend:** API Routes do próprio Next.js (serverless)
- **Banco de dados:** Supabase (Postgres) — inclui auth e storage no mesmo serviço
- **Armazenamento de mídia:** Supabase Storage (fotos)
- **Geração de QR code:** biblioteca `qrcode` (Node) ou `qrcode.react` no client
- **Pagamento:** Mercado Pago ou Abacate Pay (Pix nativo no Brasil) — Stripe como alternativa se for aceitar cartão internacional
- **E-mail transacional:** Resend ou SendGrid

---

## 8. Modelo de Dados (entidades principais)

**Página**
- `id` (UUID)
- `slug` (string, único, não sequencial)
- `nome_destinatario` (string)
- `mensagem` (text)
- `midias` (array de URLs de imagem)
- `tema` (enum: classico | divertido | minimalista)
- `pago` (boolean)
- `plano` (enum: basico | completo)
- `criado_em` (timestamp)

**Pagamento**
- `id`
- `pagina_id` (FK)
- `valor`
- `status` (pendente | pago | falhou)
- `metodo` (pix | cartao)

---

## 9. Fluxo do Usuário

1. Comprador acessa a landing page → clica em "Criar presente"
2. Preenche o formulário (nome do pai, fotos, mensagem)
3. Escolhe o tema visual e o plano (básico/completo)
4. Visualiza o preview da página
5. Realiza o pagamento
6. Sistema gera slug + QR code
7. Comprador recebe o link e o QR code na tela e por e-mail
8. Comprador imprime o QR (ou envia digitalmente) para o pai
9. Pai escaneia → abre a página pública → vive a experiência

---

## 10. Requisitos de UI/Design

- Tom emocional, caloroso — evitar estética corporativa/genérica
- 2 temas no lançamento: "Clássico" (elegante, cores neutras) e "Descontraído" (cores vivas, ícone de futebol/churrasco)
- Botão de compartilhamento destacado na página pública (WhatsApp, Instagram Stories)
- QR code deve vir em alta resolução, pronto para impressão em cartão

---

## 11. Métricas de Sucesso (MVP)

- Número de páginas geradas até 09/08
- Taxa de conversão formulário → pagamento
- Número de compartilhamentos/menções orgânicas geradas pelos destinatários
- Custo de aquisição (CAC) vs. ticket médio

---

## 12. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Prazo apertado (33 dias) | Lançar com 1 tema apenas se necessário; cortar áudio/playlist do MVP |
| Pico de tráfego no dia 09/08 | Usar arquitetura serverless auto-escalável (Vercel + Supabase) |
| Conteúdo impróprio enviado por usuários | Termos de uso + revisão manual leve nos primeiros dias |
| Baixa conversão por desconfiança no pagamento | Exibir prévia da página **antes** de pedir pagamento |

---

## 13. Prompts Prontos para o Antigravity + Claude

Use estes prompts em sequência, um por etapa, colando o contexto do projeto (seções 1 a 10 acima) antes de cada um se a ferramenta permitir anexar este documento.

### Prompt 1 — Setup do projeto
```
Crie um projeto Next.js 14 (App Router) com TypeScript e Tailwind CSS.
Configure a estrutura de pastas para um app chamado "Recado Surpresa":
- /app (rotas)
- /components
- /lib
Instale e configure o cliente do Supabase (auth não é necessária, só banco e storage).
Crie um arquivo .env.example com as variáveis necessárias (SUPABASE_URL, SUPABASE_ANON_KEY, etc).
```

### Prompt 2 — Modelo de dados
```
Usando o Supabase, crie o schema SQL para duas tabelas: "paginas" e "pagamentos",
seguindo este modelo de dados:
[cole aqui a seção 8 deste documento]
Gere o SQL de criação das tabelas com os tipos corretos, incluindo índice único no campo slug.
```

### Prompt 3 — Formulário de criação
```
Crie a página /criar com um formulário que capture:
- nome do pai (texto)
- mensagem (textarea)
- upload de até 5 fotos (com validação de tipo e tamanho máximo de 5MB cada)
- seleção de tema (classico | divertido)
- seleção de plano (basico | completo)
Ao submeter, salve os dados como rascunho (pago = false) no Supabase e as imagens no
Supabase Storage, depois redirecione para /preview/[id].
```

### Prompt 4 — Preview e pagamento
```
Crie a página /preview/[id] que renderiza a página final tal como o destinatário vai ver,
com um botão "Confirmar e pagar". Integre com Mercado Pago (Pix) para processar o pagamento.
Ao confirmar o pagamento via webhook, atualize o campo pago = true e gere um slug único
(UUID curto) para o registro.
```

### Prompt 5 — Página pública + QR code
```
Crie a rota dinâmica /p/[slug] que exibe a página pública personalizada
(mobile-first, tema aplicado, fotos, mensagem).
Adicione meta tags Open Graph para preview bonito no WhatsApp/Instagram.
Gere o QR code apontando para essa URL usando a biblioteca "qrcode", disponibilizando
download em PNG e PDF na tela de confirmação pós-pagamento.
```

### Prompt 6 — E-mail transacional
```
Integre o Resend para enviar um e-mail ao comprador após confirmação de pagamento,
contendo o link da página pública e o QR code em anexo (PNG).
```

### Prompt 7 — Deploy
```
Prepare o projeto para deploy na Vercel, incluindo configuração de variáveis de ambiente
e revisão de performance (imagens otimizadas com next/image, lazy loading).
```

---

**Próximo passo sugerido:** rodar os prompts 1 a 3 primeiro para ter o fluxo de criação funcionando, testar manualmente, e só então avançar para pagamento e QR code.
