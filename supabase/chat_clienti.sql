-- =============================================================================
-- CHAT CLIENTI (stile WhatsApp, dentro l'app)
--
-- Il cliente scrive con nome e numero di telefono, senza registrarsi.
-- Ogni conversazione ha un codice segreto che resta solo sul telefono del
-- cliente: così ognuno vede SOLO i propri messaggi.
-- L'amministratore vede tutte le conversazioni e risponde dal pannello admin.
--
-- Cosa fa questo script:
--   * crea 2 tabelle NUOVE: chat_conversations e chat_messages
--   * crea le funzioni per leggere/inviare i messaggi
-- Cosa NON fa: non tocca prodotti, categorie, ordini, immagini o altri dati.
-- Nessun UPDATE/DELETE su tabelle esistenti.
-- Si può eseguire più volte senza problemi.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           uuid NOT NULL DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  phone           text NOT NULL,
  user_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message    text,
  unread_admin    int NOT NULL DEFAULT 0,
  unread_client   int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender          text NOT NULL CHECK (sender IN ('cliente', 'admin')),
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON public.chat_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS chat_conversations_last_idx ON public.chat_conversations (last_message_at DESC);

-- Nessuno legge le tabelle direttamente: si passa solo dalle funzioni qui sotto
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_conversations FROM anon, authenticated;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- -----------------------------------------------------------------------------
-- LATO CLIENTE
-- -----------------------------------------------------------------------------

-- Apre una nuova conversazione: restituisce id + codice segreto
CREATE OR REPLACE FUNCTION public.chat_start(p_name text, p_phone text)
RETURNS TABLE (id uuid, token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name  text := left(trim(coalesce(p_name, '')), 80);
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF char_length(v_name) < 2 THEN RAISE EXCEPTION 'Inserisci il tuo nome'; END IF;
  IF char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) NOT BETWEEN 6 AND 15 THEN
    RAISE EXCEPTION 'Numero di telefono non valido';
  END IF;
  -- anti-abuso: massimo 5 nuove chat all'ora per lo stesso numero
  IF (SELECT count(*) FROM public.chat_conversations c
      WHERE c.phone = v_phone AND c.created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Troppi tentativi, riprova più tardi';
  END IF;
  RETURN QUERY
    INSERT INTO public.chat_conversations (name, phone, user_id)
    VALUES (v_name, v_phone, auth.uid())
    RETURNING chat_conversations.id, chat_conversations.token;
END $$;

-- Messaggi della propria conversazione (tutti, oppure solo quelli dopo p_after)
CREATE OR REPLACE FUNCTION public.chat_get(p_id uuid, p_token uuid, p_after timestamptz DEFAULT NULL)
RETURNS TABLE (id uuid, sender text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = p_id AND c.token = p_token) THEN
    RAISE EXCEPTION 'Conversazione non trovata';
  END IF;
  UPDATE public.chat_conversations c SET unread_client = 0 WHERE c.id = p_id AND c.unread_client <> 0;
  RETURN QUERY
    SELECT m.id, m.sender, m.body, m.created_at
    FROM public.chat_messages m
    WHERE m.conversation_id = p_id AND (p_after IS NULL OR m.created_at > p_after)
    ORDER BY m.created_at
    LIMIT 500;
END $$;

-- Invia un messaggio dal cliente
CREATE OR REPLACE FUNCTION public.chat_send(p_id uuid, p_token uuid, p_body text)
RETURNS TABLE (id uuid, sender text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_body text := left(trim(coalesce(p_body, '')), 2000);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = p_id AND c.token = p_token) THEN
    RAISE EXCEPTION 'Conversazione non trovata';
  END IF;
  IF v_body = '' THEN RAISE EXCEPTION 'Messaggio vuoto'; END IF;
  -- anti-abuso: massimo 20 messaggi al minuto
  IF (SELECT count(*) FROM public.chat_messages m
      WHERE m.conversation_id = p_id AND m.sender = 'cliente' AND m.created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'Stai scrivendo troppo velocemente, attendi un attimo';
  END IF;
  UPDATE public.chat_conversations c
     SET last_message_at = now(), last_message = left(v_body, 140), unread_admin = c.unread_admin + 1
   WHERE c.id = p_id;
  RETURN QUERY
    INSERT INTO public.chat_messages (conversation_id, sender, body)
    VALUES (p_id, 'cliente', v_body)
    RETURNING chat_messages.id, chat_messages.sender, chat_messages.body, chat_messages.created_at;
END $$;

-- Numero di risposte non lette dal cliente (per il pallino sul pulsante)
CREATE OR REPLACE FUNCTION public.chat_unread(p_id uuid, p_token uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT c.unread_client FROM public.chat_conversations c WHERE c.id = p_id AND c.token = p_token), 0)
$$;

-- -----------------------------------------------------------------------------
-- LATO AMMINISTRATORE (solo utenti con ruolo admin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.chat_admin_list()
RETURNS TABLE (id uuid, name text, phone text, created_at timestamptz, last_message_at timestamptz,
               last_message text, unread_admin int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accesso negato'; END IF;
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.created_at, c.last_message_at, c.last_message, c.unread_admin
    FROM public.chat_conversations c
    WHERE EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.conversation_id = c.id)
    ORDER BY c.last_message_at DESC
    LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.chat_admin_get(p_id uuid, p_after timestamptz DEFAULT NULL)
RETURNS TABLE (id uuid, sender text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accesso negato'; END IF;
  UPDATE public.chat_conversations c SET unread_admin = 0 WHERE c.id = p_id AND c.unread_admin <> 0;
  RETURN QUERY
    SELECT m.id, m.sender, m.body, m.created_at
    FROM public.chat_messages m
    WHERE m.conversation_id = p_id AND (p_after IS NULL OR m.created_at > p_after)
    ORDER BY m.created_at
    LIMIT 1000;
END $$;

CREATE OR REPLACE FUNCTION public.chat_admin_send(p_id uuid, p_body text)
RETURNS TABLE (id uuid, sender text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_body text := left(trim(coalesce(p_body, '')), 2000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accesso negato'; END IF;
  IF v_body = '' THEN RAISE EXCEPTION 'Messaggio vuoto'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = p_id) THEN
    RAISE EXCEPTION 'Conversazione non trovata';
  END IF;
  UPDATE public.chat_conversations c
     SET last_message_at = now(), last_message = left(v_body, 140), unread_client = c.unread_client + 1
   WHERE c.id = p_id;
  RETURN QUERY
    INSERT INTO public.chat_messages (conversation_id, sender, body)
    VALUES (p_id, 'admin', v_body)
    RETURNING chat_messages.id, chat_messages.sender, chat_messages.body, chat_messages.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.chat_admin_unread()
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN 0; END IF;
  RETURN coalesce((SELECT sum(c.unread_admin)::int FROM public.chat_conversations c), 0);
END $$;

CREATE OR REPLACE FUNCTION public.chat_admin_delete(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accesso negato'; END IF;
  DELETE FROM public.chat_conversations c WHERE c.id = p_id;  -- solo la chat scelta (e i suoi messaggi)
  RETURN true;
END $$;

-- Permessi: le funzioni cliente per tutti, quelle admin solo per chi ha fatto login
REVOKE ALL ON FUNCTION public.chat_start(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_get(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_send(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_unread(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_admin_list() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_admin_get(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_admin_send(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_admin_unread() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_admin_delete(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.chat_start(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_get(uuid, uuid, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_send(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_unread(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_admin_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_admin_get(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_admin_send(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_admin_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_admin_delete(uuid) TO authenticated;
