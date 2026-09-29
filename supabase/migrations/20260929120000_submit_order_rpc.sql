-- ORDINI PER TUTTI (anche i clienti NON registrati)
--
-- Prima, un cliente senza account riusciva a salvare la testata dell'ordine ma
-- NON le righe degli articoli (il database lo impediva per motivi di sicurezza).
-- Questa funzione salva ordine + articoli in un colpo solo, in modo controllato:
--   * funziona con o senza login (anon e authenticated);
--   * se il cliente è loggato, l'ordine viene collegato al suo account;
--   * controlla e limita tutti i valori ricevuti;
--   * è "sicura da ripetere": se lo stesso numero ordine arriva due volte, la
--     seconda volta non crea doppioni.
-- Si può eseguire più volte senza problemi (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.submit_order(p_order jsonb, p_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id      uuid := gen_random_uuid();
  v_user    uuid := auth.uid();
  v_number  text;
  v_item    jsonb;
  v_qty     int;
  v_price   numeric;
  v_pid     uuid;
  v_raw_pid text;
BEGIN
  IF p_order IS NULL OR jsonb_typeof(p_order) <> 'object' THEN
    RAISE EXCEPTION 'ordine non valido';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ordine senza articoli';
  END IF;
  IF jsonb_array_length(p_items) > 300 THEN
    RAISE EXCEPTION 'troppi articoli';
  END IF;

  v_number := left(coalesce(nullif(trim(p_order->>'order_number'), ''),
                   'ORD-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4))), 40);

  -- Già salvato (ripetizione dello stesso invio): niente doppioni
  IF EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_number) THEN
    RETURN true;
  END IF;

  INSERT INTO public.orders (
    id, order_number, user_id, customer_name, customer_email, customer_phone,
    customer_address, customer_province, notes, status, total
  ) VALUES (
    v_id,
    v_number,
    v_user,
    left(coalesce(nullif(trim(p_order->>'customer_name'), ''), 'Cliente'), 200),
    left(coalesce(nullif(trim(p_order->>'customer_email'), ''), '-'), 200),
    left(coalesce(nullif(trim(p_order->>'customer_phone'), ''), '-'), 60),
    left(coalesce(nullif(trim(p_order->>'customer_address'), ''), '-'), 400),
    left(coalesce(nullif(trim(p_order->>'customer_province'), ''), '-'), 60),
    left(p_order->>'notes', 30000),
    'nuovo',
    least(99999999.99, greatest(0, coalesce((p_order->>'total')::numeric, 0)))
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty   := greatest(1, least(100000, coalesce((v_item->>'quantity')::numeric, 1)::int));
    v_price := least(9999999, greatest(0, coalesce((v_item->>'unit_price')::numeric, 0)));
    v_pid   := NULL;
    v_raw_pid := v_item->>'product_id';
    IF v_raw_pid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT p.id INTO v_pid FROM public.products p WHERE p.id = v_raw_pid::uuid;
    END IF;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (
      v_id,
      v_pid,
      left(coalesce(nullif(trim(v_item->>'product_name'), ''), 'Articolo'), 300),
      v_qty,
      round(v_price, 2),
      least(99999999.99, round(v_price * v_qty, 2))
    );
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_order(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_order(jsonb, jsonb) TO anon, authenticated;
