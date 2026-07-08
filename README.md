# Recado Surpresa 🎁 (Especial Dia dos Pais 2026)

O **Recado Surpresa** é uma plataforma mobile-first onde usuários podem criar páginas personalizadas e exclusivas de homenagem para presentear seus pais no Dia dos Pais. O sistema gera automaticamente um **QR Code para impressão** que pode ser colado em um cartão físico. Ao escanear o QR Code, o pai desbloqueia a surpresa digital emocional contendo fotos de recordações e uma mensagem de afeto.

Este projeto foi construído seguindo a especificação completa de produto contida no arquivo `especificacao-presente-surpresa.md`.

---

## 🛠️ Tecnologias Utilizadas

- **Core:** [Next.js 14](https://nextjs.org/) (App Router) + TypeScript + React
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React Icons](https://lucide-react.dev/)
- **Banco de Dados & Storage:** [Supabase](https://supabase.com/) (PostgreSQL + RLS + Storage para fotos)
- **Integração de Pagamentos:** [Mercado Pago](https://www.mercadopago.com.br/) (Checkout Pix Nativo)
- **E-mails Transacionais:** [Resend API](https://resend.com/)
- **Geração de QR Code:** Isomórfico (no cliente via `qrcode` e no servidor via `qrcode` buffer)
- **Geração de PDFs:** Lado do cliente com [jsPDF](https://github.com/parallax/jsPDF)

---

## 📁 Estrutura do Projeto

Abaixo estão descritos os principais diretórios e arquivos do app:

```bash
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts             # Geração de Pix (Mercado Pago ou Mock)
│   │   └── webhook/
│   │       └── mercadopago/
│   │           └── route.ts         # Confirmação de pagamento e disparo de e-mails
│   ├── criar/
│   │   └── page.tsx                 # Formulário de criação de recado em etapas
│   ├── p/
│   │   └── [slug]/
│   │       ├── page.tsx             # Wrapper de servidor (noindex + Open Graph)
│   │       └── PublicPageClient.tsx # Exibição da homenagem (Clássico ou Divertido)
│   ├── preview/
│   │   └── [id]/
│   │       └── page.tsx             # Visualizador do rascunho e painel pós-pagamento
│   ├── globals.css                  # Estilos globais e utilidades Tailwind
│   ├── layout.tsx                   # Layout base HTML
│   └── page.tsx                     # Landing page comercial da campanha
├── components/
│   └── Button.tsx                   # Componente de botão reutilizável
├── lib/
│   ├── supabase.ts                  # Inicialização e configuração do cliente Supabase
│   └── utils.ts                     # Helper para geração de slugs curtos aleatórios
├── supabase/
│   └── schema.sql                   # Estrutura do banco de dados e políticas de RLS
├── .env.example                     # Modelo com variáveis de ambiente requeridas
├── next.config.mjs                  # Configurações de domínios de imagens (Next/Image)
└── package.json                     # Dependências do projeto
```

---

## ⚙️ Variáveis de Ambiente (`.env.local`)

Crie um arquivo `.env.local` na raiz do projeto e configure as seguintes variáveis:

```env
# Credenciais Públicas do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-supabase

# Configuração da URL da Aplicação (usada em links e webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mercado Pago (Chave Privada de Acesso)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... ou TEST-...

# Resend API (Envio de E-mails)
RESEND_API_KEY=re_sua-chave-resend
MAIL_FROM=no-reply@seudominio.com
```

---

## ⚡ Modos de Simulação (Desenvolvimento Sem Chaves de API)

Para facilitar o desenvolvimento, testes de interface e validações locais sem a necessidade imediata de criar contas no Supabase, Mercado Pago ou Resend, o app possui **modos de simulação automáticos**:

1. **Modo Supabase Simulado:** Se as variáveis do Supabase não forem detectadas, o app armazena as fotos em formato **Base64** e salva o rascunho diretamente no `localStorage` do navegador.
2. **Modo Pix Simulado:** Se o `MERCADO_PAGO_ACCESS_TOKEN` estiver ausente, a rota de checkout retorna instantaneamente um código "Pix Copia e Cola" fictício e um QR Code genérico.
3. **Botão de Confirmação Mock:** Na tela de pagamento do modo de simulação, um botão **"Simular Confirmação Pix"** é exibido. Clicar nele envia uma requisição para a rota do webhook simulando a confirmação do pagamento, liberando a página pública e gerando a slug correspondente.
4. **Modo E-mail Simulado:** Se a `RESEND_API_KEY` estiver vazia, o webhook não falha; em vez disso, imprime um log completo e estruturado do e-mail (remetente, destinatário, link e anexo gerado) no console do servidor para validação visual.

---

## 🚀 Como Executar Localmente

1. **Clonar e instalar dependências:**
   ```bash
   npm install
   ```

2. **Rodar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

3. **Instalação do Banco de Dados (Opcional):**
   - Acesse o console do seu projeto no **Supabase**.
   - Abra o **SQL Editor** e crie uma nova query.
   - Copie o conteúdo de [supabase/schema.sql](file:///c:/Users/pphen/Desktop/SiteDiaDosPais/supabase/schema.sql) e execute-o para configurar as tabelas, índices RLS e o bucket de storage `fotos`.

---

## 📦 Deploy na Vercel

O projeto está totalmente otimizado para deploy serverless na Vercel:

1. Faça o commit e envie seu código para o **GitHub**.
2. Acesse a [Vercel](https://vercel.com/) e crie um novo projeto importando o repositório.
3. Insira as variáveis de ambiente descritas acima nas configurações de variáveis do projeto.
4. O Next.js irá compilar e otimizar todas as páginas e rotas de forma automática.
