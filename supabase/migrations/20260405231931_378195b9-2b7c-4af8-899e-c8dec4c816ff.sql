-- Add taille_ha to surfaces
ALTER TABLE public.surfaces ADD COLUMN taille_ha numeric NULL DEFAULT NULL;

-- Add company branding fields to profiles for sous-admin
ALTER TABLE public.profiles ADD COLUMN company_name text NULL DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN company_logo text NULL DEFAULT NULL;

-- Create water_reports table
CREATE TABLE public.water_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'water',
  ph numeric NULL,
  cew numeric NULL,
  residu_sec numeric NULL,
  chlorures numeric NULL,
  sulfates numeric NULL,
  bicarbonates numeric NULL,
  sodium numeric NULL,
  calcium numeric NULL,
  magnesium numeric NULL,
  sar numeric NULL,
  durete numeric NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.water_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view water reports"
ON public.water_reports FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert water reports"
ON public.water_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete water reports"
ON public.water_reports FOR DELETE
USING (auth.uid() IS NOT NULL);