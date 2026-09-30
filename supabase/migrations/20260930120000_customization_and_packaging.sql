-- Personalizzazione packaging: prezzi gestiti dall'admin + richieste dei clienti.
-- Migrazione IDEMPOTENTE: si può eseguire più volte, e anche se le tabelle
-- esistono già (per esempio perché il progetto Supabase è lo stesso della
-- vecchia app). Non cancella mai dati.

-- ---------------------------------------------------------------------------
-- 1. Prezzi base per misura (uno per categoria + misura)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packaging_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL,
  size_key text NOT NULL,
  base_price_per_unit numeric(10,4) NOT NULL CHECK (base_price_per_unit > 0),
  moq integer NOT NULL DEFAULT 1 CHECK (moq >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- necessario per l'upsert (onConflict: category_id,size_key)
CREATE UNIQUE INDEX IF NOT EXISTS packaging_prices_category_size_key
  ON public.packaging_prices (category_id, size_key);

ALTER TABLE public.packaging_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read packaging prices" ON public.packaging_prices;
CREATE POLICY "Public read packaging prices" ON public.packaging_prices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage packaging prices" ON public.packaging_prices;
CREATE POLICY "Admin manage packaging prices" ON public.packaging_prices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Richieste di personalizzazione
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  print_colors integer NOT NULL DEFAULT 1,
  logo_url text NOT NULL,
  notes text,
  customer_name text NOT NULL,
  customer_company text,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  privacy_consent boolean NOT NULL DEFAULT false,
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customization_requests ENABLE ROW LEVEL SECURITY;

-- Chiunque (anche non registrato) può INVIARE una richiesta, ma solo con
-- consenso privacy dato e stato iniziale "new". Nessuno può rileggerla tranne l'admin.
DROP POLICY IF EXISTS "Public submit customization requests" ON public.customization_requests;
CREATE POLICY "Public submit customization requests" ON public.customization_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (privacy_consent = true AND status = 'new');

DROP POLICY IF EXISTS "Admin manage customization requests" ON public.customization_requests;
CREATE POLICY "Admin manage customization requests" ON public.customization_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. Storage per i loghi caricati dai clienti
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customization-logos',
  'customization-logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read customization logos" ON storage.objects;
CREATE POLICY "Public read customization logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'customization-logos');

DROP POLICY IF EXISTS "Public upload customization logos" ON storage.objects;
CREATE POLICY "Public upload customization logos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'customization-logos' AND (storage.foldername(name))[1] = 'loghi');

DROP POLICY IF EXISTS "Admin delete customization logos" ON storage.objects;
CREATE POLICY "Admin delete customization logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'customization-logos' AND public.has_role(auth.uid(), 'admin'));
