-- Modelli d'ordine salvati dal cliente (feature "Riordino Rapido"): un cliente
-- può salvare il carrello attuale come modello con un nome, e riusarlo in futuro.
CREATE TABLE IF NOT EXISTS public.order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  items jsonb NOT NULL, -- [{ "productId": "...", "quantity": 2 }, ...]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_templates TO authenticated;

CREATE POLICY "Own templates" ON public.order_templates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_order_templates_updated
  BEFORE UPDATE ON public.order_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
