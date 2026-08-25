-- Sottocategorie: appartengono a una categoria, i prodotti possono essere
-- assegnati a una sottocategoria opzionale.
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subcategories TO anon, authenticated;
GRANT ALL ON public.subcategories TO service_role;

CREATE POLICY "Public read active subcategories" ON public.subcategories
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage subcategories" ON public.subcategories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Bucket di storage per le immagini caricate dal pannello admin (prodotti e categorie).
INSERT INTO storage.buckets (id, name, public)
VALUES ('aurora-images', 'aurora-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read aurora-images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'aurora-images');

CREATE POLICY "Admin upload aurora-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aurora-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update aurora-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'aurora-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete aurora-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'aurora-images' AND public.has_role(auth.uid(), 'admin'));
