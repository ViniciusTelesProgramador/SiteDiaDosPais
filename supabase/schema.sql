-- ============================================================================
-- Recado Surpresa — Schema do banco (fonte de verdade versionada)
-- Executar no SQL Editor do Supabase. Seguro executar mais de uma vez.
--
-- Modelo de segurança (RNF11):
--   * RLS habilitado nas duas tabelas SEM policies para anon/authenticated.
--   * Todo acesso do app passa pelas rotas de servidor com a SERVICE ROLE KEY
--     (que ignora RLS). A anon key não lê nem escreve NADA nas tabelas.
--   * O bucket de fotos é público para LEITURA (URLs não adivinháveis),
--     mas o upload só acontece via service role (nenhuma policy de INSERT).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tabela: paginas
-- ----------------------------------------------------------------------------
create table if not exists public.paginas (
  id uuid primary key default gen_random_uuid(),
  -- slug só existe após o pagamento (RF04); índice único parcial abaixo
  slug text,
  email_comprador text,
  nome_destinatario text not null,
  -- mensagem principal/fechamento (opcional se houver blocos)
  mensagem text,
  -- respostas das perguntas guiadas: [{"pergunta_id","titulo","texto"}]
  blocos jsonb,
  -- fotos: [{"url","legenda"}] (legenda opcional)
  midias jsonb not null default '[]'::jsonb,
  tema text not null default 'classico',
  -- mantido para v2; sem uso no fluxo do MVP (preço único)
  plano text not null default 'basico' check (plano in ('basico', 'completo')),
  pago boolean not null default false,
  pago_em timestamptz,
  -- se futuro, a página pública mostra contagem regressiva (RF06/T2.1)
  revelar_em timestamptz,
  -- pago_em + 12 meses (pagas) / usado pelo cron de limpeza (rascunhos)
  expira_em timestamptz,
  visualizacoes integer not null default 0,
  primeira_visualizacao_em timestamptz,
  -- reação do destinatário (RF16): emoji de 1 toque + texto livre opcional
  reacao_emoji text,
  reacao_texto text,
  reacao_em timestamptz,
  -- lembrete pré-revelação (T2.8)
  lembrete_enviado_em timestamptz,
  -- trilha do YouTube (Fase 6): só o ID de 11 caracteres, nunca a URL crua
  musica_youtube_id text,
  -- mensagem de voz do comprador (Fase 12): URL pública no bucket "audios"
  audio_url text,
  -- mensagem em vídeo do comprador (Fase 14): alternativa à voz, URL
  -- pública no bucket "videos" — usa um OU outro, nunca os dois
  video_url text,
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabela: pagamentos (PK = id do pagamento no Mercado Pago)
-- ----------------------------------------------------------------------------
create table if not exists public.pagamentos (
  id text primary key,
  pagina_id uuid not null references public.paginas (id) on delete cascade,
  valor numeric(10, 2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'falhou')),
  metodo text not null default 'pix' check (metodo in ('pix', 'cartao')),
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabela: contribuicoes (Fase 5 — Surpresa Coletiva)
-- Mensagens curtas de outras pessoas (irmãos, mãe, netos), convidadas pelo
-- comprador via link /contribuir/[id] depois do pagamento. Entram aprovadas
-- por padrão; o comprador pode ocultar qualquer uma antes da revelação.
-- ----------------------------------------------------------------------------
create table if not exists public.contribuicoes (
  id uuid primary key default gen_random_uuid(),
  pagina_id uuid not null references public.paginas (id) on delete cascade,
  nome text not null,
  relacao text,
  texto text not null,
  aprovado boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists contribuicoes_pagina_idx
  on public.contribuicoes (pagina_id);

alter table public.contribuicoes enable row level security;

-- ============================================================================
-- MIGRAÇÃO de bancos criados com o schema antigo (idempotente).
-- ============================================================================
alter table public.paginas add column if not exists email_comprador text;
alter table public.paginas add column if not exists blocos jsonb;
alter table public.paginas add column if not exists pago_em timestamptz;
alter table public.paginas add column if not exists revelar_em timestamptz;
alter table public.paginas add column if not exists expira_em timestamptz;
alter table public.paginas add column if not exists visualizacoes integer not null default 0;
alter table public.paginas add column if not exists primeira_visualizacao_em timestamptz;
alter table public.paginas add column if not exists reacao_emoji text;
alter table public.paginas add column if not exists reacao_texto text;
alter table public.paginas add column if not exists reacao_em timestamptz;
alter table public.paginas add column if not exists lembrete_enviado_em timestamptz;
alter table public.pagamentos add column if not exists criado_em timestamptz not null default now();
alter table public.paginas add column if not exists musica_youtube_id text;
alter table public.paginas add column if not exists audio_url text;
alter table public.paginas add column if not exists video_url text;

-- mensagem passa a ser opcional (blocos podem substituí-la)
alter table public.paginas alter column mensagem drop not null;
alter table public.paginas alter column slug drop not null;

-- tema legado 'divertido'/'minimalista' -> 'descontraido' (T0.3)
alter table public.paginas drop constraint if exists paginas_tema_check;
update public.paginas set tema = 'descontraido' where tema in ('divertido', 'minimalista');
alter table public.paginas
  add constraint paginas_tema_check check (tema in ('classico', 'descontraido'));

-- midias legado (text[]) -> jsonb [{"url","legenda"}]
do $$
declare
  tipo text;
begin
  select data_type into tipo
  from information_schema.columns
  where table_schema = 'public' and table_name = 'paginas' and column_name = 'midias';

  if tipo = 'ARRAY' then
    alter table public.paginas alter column midias drop default;
    alter table public.paginas
      alter column midias type jsonb
      using coalesce(
        (select jsonb_agg(jsonb_build_object('url', u)) from unnest(midias) as u),
        '[]'::jsonb
      );
    alter table public.paginas alter column midias set default '[]'::jsonb;
  elsif tipo = 'jsonb' then
    -- converte itens string remanescentes para o formato de objetos
    update public.paginas
    set midias = (
      select coalesce(jsonb_agg(
        case when jsonb_typeof(item) = 'string'
          then jsonb_build_object('url', item #>> '{}')
          else item
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(midias) as item
    )
    where jsonb_typeof(midias) = 'array'
      and exists (
        select 1 from jsonb_array_elements(midias) as i where jsonb_typeof(i) = 'string'
      );
  end if;
end $$;

-- expira_em para páginas pagas antigas
update public.paginas
set expira_em = coalesce(pago_em, criado_em) + interval '12 months'
where pago = true and expira_em is null;

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
drop index if exists idx_paginas_slug;
create unique index if not exists paginas_slug_unico
  on public.paginas (slug)
  where slug is not null;

create index if not exists paginas_email_comprador_idx
  on public.paginas (email_comprador)
  where pago = true;

create index if not exists pagamentos_pagina_idx on public.pagamentos (pagina_id);

-- ----------------------------------------------------------------------------
-- RLS: habilitado, sem policies => anon/authenticated não acessam nada.
-- Remove as policies permissivas do schema antigo (CRÍTICO — RNF11).
-- ----------------------------------------------------------------------------
alter table public.paginas enable row level security;
alter table public.pagamentos enable row level security;

drop policy if exists "Allow public insert on paginas" on public.paginas;
drop policy if exists "Allow public select on paginas" on public.paginas;
drop policy if exists "Allow public select on pagamentos" on public.pagamentos;

-- Storage: leitura pública mantida; upload público REMOVIDO (só service role)
drop policy if exists "Allow public upload access to fotos" on storage.objects;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Allow public read access to fotos'
  ) then
    create policy "Allow public read access to fotos" on storage.objects
      for select to public
      using (bucket_id = 'fotos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Allow public read access to audios'
  ) then
    create policy "Allow public read access to audios" on storage.objects
      for select to public
      using (bucket_id = 'audios');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Allow public read access to videos'
  ) then
    create policy "Allow public read access to videos" on storage.objects
      for select to public
      using (bucket_id = 'videos');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Contador de visualizações atômico (T2.3) — chamado apenas pelo servidor.
-- ----------------------------------------------------------------------------
create or replace function public.incrementar_visualizacao(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.paginas
  set visualizacoes = visualizacoes + 1,
      primeira_visualizacao_em = coalesce(primeira_visualizacao_em, now())
  where slug = p_slug and pago = true;
$$;

revoke execute on function public.incrementar_visualizacao(text) from anon, authenticated, public;

-- ----------------------------------------------------------------------------
-- Bucket de fotos (leitura pública, upload só via service role)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Bucket de áudios (Fase 12 — mensagem de voz do comprador). Mesmo modelo
-- de segurança do bucket de fotos: leitura pública, upload só service role.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audios', 'audios', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Bucket de vídeos (Fase 14 — mensagem em vídeo do comprador, alternativa
-- à voz). Mesmo modelo de segurança: leitura pública, upload só service role.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;
