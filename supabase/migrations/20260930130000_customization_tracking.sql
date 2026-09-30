-- Personalizzazione packaging — consultazione pubblica tramite token e dati per le email.
-- IDEMPOTENTE: si può rilanciare. Va eseguita DOPO 20260930120000_customization_and_packaging.sql.
--
-- Perché serve: la tabella customization_requests è protetta da RLS e il pubblico
-- può solo INSERIRE. Il cliente deve però poter vedere lo stato della sua richiesta
-- con il link ricevuto: lo fa una funzione che restituisce UNA riga, e solo se si
-- conosce il token (un UUID non indovinabile), senza mai esporre l'intera tabella.

-- Il confronto è fatto in testo (::text) così funziona sia se access_token è uuid sia se è text.

DROP FUNCTION IF EXISTS public.get_customization_by_token(uuid);
CREATE FUNCTION public.get_customization_by_token(p_access_token uuid)
RETURNS TABLE (
  id uuid,
  product_type text,
  quantity integer,
  print_colors integer,
  logo_url text,
  notes text,
  status text,
  admin_notes text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.product_type, r.quantity, r.print_colors, r.logo_url,
         r.notes, r.status, r.admin_notes, r.created_at
  FROM public.customization_requests r
  WHERE r.access_token::text = p_access_token::text
  LIMIT 1;
$$;

-- Dati di contatto per le email automatiche (conferma al cliente + avviso al negozio).
-- Disponibili SOLO per 30 minuti dopo la creazione della richiesta e solo con il token:
-- la funzione serverless /api/send-order li legge da qui invece di fidarsi del browser,
-- così non può essere usata per scrivere a indirizzi email arbitrari.
DROP FUNCTION IF EXISTS public.get_customization_for_notification(uuid);
CREATE FUNCTION public.get_customization_for_notification(p_access_token uuid)
RETURNS TABLE (
  id uuid,
  product_type text,
  quantity integer,
  print_colors integer,
  logo_url text,
  notes text,
  customer_name text,
  customer_company text,
  customer_email text,
  customer_phone text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.product_type, r.quantity, r.print_colors, r.logo_url, r.notes,
         r.customer_name, r.customer_company, r.customer_email, r.customer_phone, r.created_at
  FROM public.customization_requests r
  WHERE r.access_token::text = p_access_token::text
    AND r.created_at > now() - interval '30 minutes'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_customization_by_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_customization_for_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customization_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customization_for_notification(uuid) TO anon, authenticated;
