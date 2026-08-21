
-- ROLES
CREATE TYPE public.app_role AS ENUM ('customer','staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'staff'));

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SERVICES
CREATE TYPE public.pricing_type AS ENUM ('per_kg','flat','tier','quote');

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  pricing_type public.pricing_type NOT NULL,
  unit text NOT NULL DEFAULT '',
  base_price numeric(10,2),
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "services_staff_write" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

CREATE TABLE public.service_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label text NOT NULL,
  price numeric(10,2) NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.service_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tiers TO authenticated;
GRANT ALL ON public.service_tiers TO service_role;
ALTER TABLE public.service_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_public_read" ON public.service_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tiers_staff_write" ON public.service_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pending','received','washing','ready','delivered','collected','cancelled');
CREATE TYPE public.fulfillment_type AS ENUM ('pickup','dropoff');
CREATE TYPE public.payment_timing AS ENUM ('before','after');
CREATE TYPE public.payment_method AS ENUM ('cash','mpesa');
CREATE TYPE public.payment_status AS ENUM ('unpaid','paid');

CREATE SEQUENCE public.order_number_seq START 1001;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number int NOT NULL DEFAULT nextval('public.order_number_seq'),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'pending',
  fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  address text,
  latitude double precision,
  longitude double precision,
  scheduled_date date,
  scheduled_time text,
  payment_timing public.payment_timing NOT NULL DEFAULT 'after',
  payment_method public.payment_method NOT NULL DEFAULT 'mpesa',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  estimated_total numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  rider_name text,
  rider_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders_staff_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));
CREATE POLICY "orders_staff_delete" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  pricing_type public.pricing_type NOT NULL,
  tier_id uuid REFERENCES public.service_tiers(id) ON DELETE SET NULL,
  tier_label text,
  unit text NOT NULL DEFAULT '',
  estimated_quantity numeric(10,2) NOT NULL DEFAULT 1,
  actual_quantity numeric(10,2),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(),'staff'))));
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(),'staff'))));
CREATE POLICY "order_items_staff_update" ON public.order_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));
CREATE POLICY "order_items_staff_delete" ON public.order_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method public.payment_method NOT NULL,
  reference text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(),'staff'))));
CREATE POLICY "payments_staff_write" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  reorder_level numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_staff_all" ON public.inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Bridgette Laundry',
  tagline text NOT NULL DEFAULT 'Freshness You Can Trust.',
  phone_primary text NOT NULL DEFAULT '0706174676',
  phone_secondary text NOT NULL DEFAULT '0737070520',
  mpesa_till text NOT NULL DEFAULT '5387296',
  service_area text NOT NULL DEFAULT 'Juja Road, Muiri & Kimbo',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_staff_write" ON public.business_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER inventory_touch BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED
INSERT INTO public.business_settings (id) VALUES (gen_random_uuid());

INSERT INTO public.services (slug, name, description, pricing_type, unit, base_price, sort_order) VALUES
  ('laundry','Laundry','Wash, dry & fold, priced per kilogram.','per_kg','kg',50,1),
  ('curtains','Curtains','Deep-cleaned curtains, priced per kilogram.','per_kg','kg',70,2),
  ('mats','Mats','Flat rate per mat.','flat','mat',50,3),
  ('shoes','Shoes','Flat rate per pair.','flat','pair',50,4),
  ('duvets','Duvets','Priced by duvet size.','tier','duvet',NULL,5),
  ('carpets','Carpets','Priced by carpet size.','tier','carpet',NULL,6),
  ('house-cleaning','House Cleaning','Quote on request.','quote','visit',NULL,7);

INSERT INTO public.service_tiers (service_id, label, price, sort_order)
SELECT id, t.label, t.price, t.sort FROM public.services s,
  (VALUES ('Small',200,1),('Medium',350,2),('Large',500,3)) AS t(label,price,sort)
WHERE s.slug = 'duvets';

INSERT INTO public.service_tiers (service_id, label, price, sort_order)
SELECT id, t.label, t.price, t.sort FROM public.services s,
  (VALUES ('Small',200,1),('Medium',400,2),('Large',550,3),('Extra Large',700,4)) AS t(label,price,sort)
WHERE s.slug = 'carpets';

INSERT INTO public.inventory (name, quantity, unit, reorder_level) VALUES
  ('Washing powder',25,'kg',10),
  ('Fabric softener',12,'litres',5),
  ('Bleach',8,'litres',4),
  ('Stain remover',3,'bottles',5),
  ('Laundry bags',40,'pcs',15),
  ('Hangers',120,'pcs',50);
