-- VOLANTINO SFOGLIABILE
-- Crea la tabella dei volantini: tutti possono leggerli, solo l'admin può caricarli/modificarli.
-- Le immagini delle pagine vanno nello spazio file già esistente "aurora-images" (cartella volantini/).
-- Non modifica né cancella nessun dato esistente. Si può eseguire più volte senza problemi.

CREATE TABLE IF NOT EXISTS public.flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Volantino offerte',
  valid_from date,
  valid_to date,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flyers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flyers TO authenticated;

ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Volantini lettura pubblica" ON public.flyers;
CREATE POLICY "Volantini lettura pubblica" ON public.flyers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Volantini gestione admin" ON public.flyers;
CREATE POLICY "Volantini gestione admin" ON public.flyers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
