
-- 1. Add missing columns to profiles (from clients table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS date_of_birth text,
  ADD COLUMN IF NOT EXISTS date_deb_abo date,
  ADD COLUMN IF NOT EXISTS date_exp_abo date,
  ADD COLUMN IF NOT EXISTS type_abo text,
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Migrate data from clients to profiles
UPDATE public.profiles p
SET
  phone_number = c.phone_number,
  location = c.location,
  country = c.country,
  city = c.city,
  date_of_birth = c.date_of_birth,
  date_deb_abo = c.date_deb_abo,
  date_exp_abo = c.date_exp_abo,
  type_abo = c.type_abo,
  email = c.email
FROM public.clients c
WHERE p.user_id = c.user_id;

-- 3. Update soil_reports client_id to reference profiles
-- (client_id already has no FK constraint from previous migration)

-- 4. Drop clients table
DROP TABLE IF EXISTS public.clients CASCADE;

-- 5. Create types_plante table
CREATE TABLE public.types_plante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_plante text NOT NULL,
  type_plante text NOT NULL,
  besoin_eau_par_plante numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.types_plante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view types_plante" ON public.types_plante FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert types_plante" ON public.types_plante FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update types_plante" ON public.types_plante FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete types_plante" ON public.types_plante FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. Create sols table
CREATE TABLE public.sols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nature text NOT NULL,
  humidite numeric NOT NULL DEFAULT 0,
  salinite numeric NOT NULL DEFAULT 0,
  ph numeric NOT NULL DEFAULT 7,
  temperature numeric NOT NULL DEFAULT 0,
  date_mesure timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sols" ON public.sols FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert sols" ON public.sols FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update sols" ON public.sols FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete sols" ON public.sols FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7. Create climats table
CREATE TABLE public.climats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temperature_c numeric NOT NULL DEFAULT 0,
  humidite_c numeric NOT NULL DEFAULT 0,
  vitesse_vent numeric NOT NULL DEFAULT 0,
  puissance_ensoleillement numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.climats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view climats" ON public.climats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert climats" ON public.climats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update climats" ON public.climats FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete climats" ON public.climats FOR DELETE USING (auth.uid() IS NOT NULL);

-- 8. Create surfaces table
CREATE TABLE public.surfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_surface text NOT NULL,
  localisation text NOT NULL DEFAULT '',
  type_sol text,
  fk_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  fk_sol uuid REFERENCES public.sols(id) ON DELETE SET NULL,
  fk_climat uuid REFERENCES public.climats(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surfaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view surfaces" ON public.surfaces FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert surfaces" ON public.surfaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update surfaces" ON public.surfaces FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete surfaces" ON public.surfaces FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_surfaces_updated_at BEFORE UPDATE ON public.surfaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Create plantes table
CREATE TABLE public.plantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_plante text NOT NULL,
  age integer NOT NULL DEFAULT 0,
  fk_type_plante uuid REFERENCES public.types_plante(id) ON DELETE SET NULL,
  fk_surface uuid REFERENCES public.surfaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view plantes" ON public.plantes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert plantes" ON public.plantes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update plantes" ON public.plantes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete plantes" ON public.plantes FOR DELETE USING (auth.uid() IS NOT NULL);

-- 10. Create vannes table
CREATE TABLE public.vannes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_vanne text NOT NULL,
  nb_plant_par_vanne integer NOT NULL DEFAULT 0,
  debit_eau_par_vanne numeric NOT NULL DEFAULT 0,
  fk_surface uuid REFERENCES public.surfaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vannes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view vannes" ON public.vannes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert vannes" ON public.vannes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update vannes" ON public.vannes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete vannes" ON public.vannes FOR DELETE USING (auth.uid() IS NOT NULL);
