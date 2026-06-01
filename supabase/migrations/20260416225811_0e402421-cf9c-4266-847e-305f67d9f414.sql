-- 1. Abonnements modulaires
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS abo_capteur_sol boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS abo_electrovanne boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abo_sante_plante boolean NOT NULL DEFAULT false;

-- 2. Statut connecté sur parcelles
ALTER TABLE public.surfaces
  ADD COLUMN IF NOT EXISTS is_connected boolean NOT NULL DEFAULT false;

-- 3. Table reclamations
CREATE TABLE IF NOT EXISTS public.reclamations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid,
  sujet text NOT NULL,
  message text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente',
  traite_at timestamptz,
  traite_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reclamations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reclamations"
  ON public.reclamations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert reclamations"
  ON public.reclamations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and sous-admins can update reclamations"
  ON public.reclamations FOR UPDATE
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'SOUS_ADMIN'));

CREATE POLICY "Admins can delete reclamations"
  ON public.reclamations FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE TRIGGER update_reclamations_updated_at
  BEFORE UPDATE ON public.reclamations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket pour logos d'entreprise
INSERT INTO storage.buckets (id, name, public)
  VALUES ('company-logos', 'company-logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated can upload company logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update own company logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete own company logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);