-- Colonna flessibile per i campi dell'app AI Studio che non hanno una colonna
-- dedicata (formato, fragranza, certificazioni, unità di vendita, soglia scorta,
-- percentuale sconto manuale). Evita di perdere questi dati al salvataggio.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;
