
-- DEVICES catalog
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_type text NOT NULL,
  price_dt numeric NOT NULL DEFAULT 0,
  connected_state text NOT NULL DEFAULT 'non_connecte',
  available boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view devices" ON public.devices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage devices ins" ON public.devices FOR INSERT WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin manage devices upd" ON public.devices FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin manage devices del" ON public.devices FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');
CREATE TRIGGER trg_devices_upd BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SUBSCRIPTION PLANS
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_dt numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view plans" ON public.subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin ins plans" ON public.subscription_plans FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'ADMIN');
CREATE POLICY "admin upd plans" ON public.subscription_plans FOR UPDATE USING (get_user_role(auth.uid()) = 'ADMIN');
CREATE POLICY "admin del plans" ON public.subscription_plans FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- DEVICE SALES
CREATE TABLE public.device_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  buyer_profile_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_dt numeric NOT NULL DEFAULT 0,
  total_dt numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'carte',
  status text NOT NULL DEFAULT 'en_attente',
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.device_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view sales" ON public.device_sales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins sales" ON public.device_sales FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin upd sales" ON public.device_sales FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin del sales" ON public.device_sales FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- SUBSCRIPTION PAYMENTS
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  amount_dt numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'carte',
  status text NOT NULL DEFAULT 'en_attente',
  date_start date,
  date_exp date,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view subpay" ON public.subscription_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins subpay" ON public.subscription_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin upd subpay" ON public.subscription_payments FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin del subpay" ON public.subscription_payments FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- Realtime
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.device_sales REPLICA IDENTITY FULL;
ALTER TABLE public.subscription_plans REPLICA IDENTITY FULL;
ALTER TABLE public.subscription_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_payments;

-- Seed default subscription plans
INSERT INTO public.subscription_plans (name, price_dt, duration_days, features, active) VALUES
  ('Basic', 120, 30, '["CapteurSol"]'::jsonb, true),
  ('Pro', 220, 30, '["CapteurSol","ElectroVanne"]'::jsonb, true),
  ('Annuel Pro', 2200, 365, '["CapteurSol","ElectroVanne"]'::jsonb, true);

-- Seed default devices
INSERT INTO public.devices (name, device_type, price_dt, connected_state, available, stock, info) VALUES
  ('Capteur de sol 4-en-1', 'capteur_sol', 450, 'connecte', true, 25, 'Humidité, salinité, pH, température - LoRaWAN'),
  ('Capteur de sol basique', 'capteur_sol', 280, 'non_connecte', true, 40, 'Humidité, température - lecture manuelle'),
  ('ElectroVanne 1 pouce', 'electrovanne', 320, 'connecte', true, 18, 'Vanne 24V DC contrôlée à distance via gateway'),
  ('Gateway LoRaWAN', 'gateway', 780, 'connecte', true, 8, 'Hub central jusqu''à 50 capteurs');
