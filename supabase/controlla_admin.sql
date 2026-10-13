-- =====================================================================
-- CONTROLLO ACCOUNT ADMIN (chat "Accesso negato")
-- Supabase > SQL Editor > incolla > Run.
-- Mostra tutti gli account registrati e se hanno il ruolo admin.
-- =====================================================================
SELECT u.email,
       u.last_sign_in_at AS ultimo_accesso,
       EXISTS (SELECT 1 FROM public.user_roles r
               WHERE r.user_id = u.id AND r.role = 'admin') AS e_admin
FROM auth.users u
ORDER BY e_admin DESC, u.email;

-- ---------------------------------------------------------------------
-- SOLO SE la tua email risulta e_admin = false:
-- togli i due trattini "--" dalla riga qui sotto, metti la TUA email
-- (quella con cui entri nell'app come admin) e premi di nuovo Run.
-- ---------------------------------------------------------------------
-- INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email) = lower('LA-TUA-EMAIL@esempio.it') ON CONFLICT (user_id, role) DO NOTHING;
