
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
