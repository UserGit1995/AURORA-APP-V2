ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS piva text,
  ADD COLUMN IF NOT EXISTS sdi text,
  ADD COLUMN IF NOT EXISTS pec text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS province text;
