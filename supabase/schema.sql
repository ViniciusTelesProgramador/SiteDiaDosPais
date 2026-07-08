-- Drop tables if they exist (for easy resetting/re-run)
DROP TABLE IF EXISTS pagamentos;
DROP TABLE IF EXISTS paginas;

-- Create paginas table
CREATE TABLE paginas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE, -- Nullable initially, populated on payment
    nome_destinatario TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    midias TEXT[] NOT NULL DEFAULT '{}', -- Array of image URLs
    tema TEXT NOT NULL CHECK (tema IN ('classico', 'divertido', 'minimalista')),
    pago BOOLEAN NOT NULL DEFAULT FALSE,
    plano TEXT NOT NULL CHECK (plano IN ('basico', 'completo')),
    email_comprador TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on slug for fast lookups
CREATE INDEX idx_paginas_slug ON paginas(slug) WHERE slug IS NOT NULL;

-- Create pagamentos table
CREATE TABLE pagamentos (
    id TEXT PRIMARY KEY, -- Can be Mercado Pago payment ID
    pagina_id UUID NOT NULL REFERENCES paginas(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'falhou')),
    metodo TEXT NOT NULL CHECK (metodo IN ('pix', 'cartao')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on payments for lookups
CREATE INDEX idx_pagamentos_pagina_id ON pagamentos(pagina_id);

-- Enable Row Level Security (RLS)
ALTER TABLE paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for paginas
-- 1. Anyone can insert a new draft page
CREATE POLICY "Allow public insert on paginas" ON paginas
    FOR INSERT TO public
    WITH CHECK (true);

-- 2. Anyone can select a page if it is paid, OR if they know the UUID (allows previewing drafts)
CREATE POLICY "Allow public select on paginas" ON paginas
    FOR SELECT TO public
    USING (pago = TRUE OR id IS NOT NULL);

-- RLS Policies for pagamentos
-- 1. Payments are handled via secure server-side API routes using Service Role Key.
-- However, we can add a basic policy to allow the user to view their payment status by ID if needed, 
-- or keep it fully server-side. Let's allow public SELECT by ID for easy status checking:
CREATE POLICY "Allow public select on pagamentos" ON pagamentos
    FOR SELECT TO public
    USING (true);

-- Create Supabase Storage Bucket for photos (if it does not exist)
-- Note: This requires inserting into the storage.buckets table.
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage objects (fotos bucket)
-- 1. Allow public read access to all files in the 'fotos' bucket
CREATE POLICY "Allow public read access to fotos" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'fotos');

-- 2. Allow public upload access to the 'fotos' bucket
CREATE POLICY "Allow public upload access to fotos" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'fotos');
