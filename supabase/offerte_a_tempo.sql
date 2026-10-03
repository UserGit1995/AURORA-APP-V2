-- OFFERTE A TEMPO
-- Permette a tutti i clienti di leggere SOLO l'interruttore generale delle offerte a tempo.
-- Tutte le altre impostazioni restano visibili solo all'admin.
-- Non modifica né cancella nessun dato. Si può eseguire più volte senza problemi.

GRANT SELECT ON public.settings TO anon, authenticated;

DROP POLICY IF EXISTS "Lettura pubblica interruttore offerte a tempo" ON public.settings;
CREATE POLICY "Lettura pubblica interruttore offerte a tempo" ON public.settings
  FOR SELECT TO anon, authenticated
  USING (key = 'flashOffersEnabled');
