-- Impostazioni app (chiave/valore), gestite solo dall'admin.
-- Usata per l'indirizzo email a cui inviare la notifica dei nuovi ordini.
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO service_role;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage settings" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ordini da ospite (senza account): consentito solo con user_id nullo.
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

GRANT INSERT ON public.orders TO anon;
GRANT SELECT ON public.orders TO anon;
CREATE POLICY "Guest orders insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

GRANT INSERT ON public.order_items TO anon;
CREATE POLICY "Guest order items insert" ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
  );
