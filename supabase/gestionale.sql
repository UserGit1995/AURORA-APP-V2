-- =============================================================================
-- GESTIONALE AURORA: clienti, movimenti di magazzino, DDT, fatture
--
-- Cosa fa questo script:
--   * crea 1 tabella NUOVA: gest_archivio
--     (una riga per ogni cliente, movimento, DDT, fattura e per i dati azienda)
--   * la rende leggibile e modificabile SOLO dagli amministratori
-- Cosa NON fa: non tocca prodotti, categorie, ordini, immagini, chat o altri dati.
-- Nessun UPDATE/DELETE su tabelle esistenti.
-- Si può eseguire più volte senza problemi.
--
-- Come si usa: Supabase -> SQL Editor -> New query -> incolla tutto -> Run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gest_archivio (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL CHECK (tipo IN ('cliente', 'movimento', 'ddt', 'fattura', 'config')),
  anno        int,
  numero      int,
  dati        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Numerazione: niente due DDT (o due fatture) con lo stesso numero nello stesso anno
CREATE UNIQUE INDEX IF NOT EXISTS gest_archivio_numero_unico
  ON public.gest_archivio (tipo, anno, numero)
  WHERE numero IS NOT NULL;

CREATE INDEX IF NOT EXISTS gest_archivio_tipo_idx ON public.gest_archivio (tipo, created_at DESC);

ALTER TABLE public.gest_archivio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gest_archivio solo admin" ON public.gest_archivio;
CREATE POLICY "gest_archivio solo admin" ON public.gest_archivio
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
