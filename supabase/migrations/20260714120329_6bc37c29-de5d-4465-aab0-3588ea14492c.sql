
-- Roles enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, company)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'company');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_price numeric(10,2),
  image_url text,
  sku text,
  in_stock boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_on_offer boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Order status enum + sequence
CREATE TYPE public.order_status AS ENUM ('nuovo', 'in_lavorazione', 'evaso', 'annullato');
CREATE SEQUENCE public.order_number_seq START 1;

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_province text NOT NULL,
  notes text,
  status order_status NOT NULL DEFAULT 'nuovo',
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items read via parent" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Order items insert via parent" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order number generator
CREATE OR REPLACE FUNCTION public.generate_order_number() RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.order_number_seq');
  RETURN 'AUR-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END; $$;
