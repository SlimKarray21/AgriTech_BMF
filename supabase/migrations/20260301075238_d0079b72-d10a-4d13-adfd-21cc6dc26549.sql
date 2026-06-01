
CREATE TABLE public.soil_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Physico-chimique
  ph NUMERIC,
  conductivite NUMERIC,
  matiere_organique NUMERIC,
  azote NUMERIC,
  phosphore NUMERIC,
  potassium NUMERIC,
  calcium NUMERIC,
  magnesium NUMERIC,
  sodium NUMERIC,
  cec NUMERIC,
  -- Granulometrique
  argile NUMERIC,
  limon NUMERIC,
  sable NUMERIC,
  -- Oligo-elements
  fer NUMERIC,
  zinc NUMERIC,
  cuivre NUMERIC,
  manganese NUMERIC,
  bore NUMERIC
);

ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view soil reports"
ON public.soil_reports FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert soil reports"
ON public.soil_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete soil reports"
ON public.soil_reports FOR DELETE
USING (auth.uid() IS NOT NULL);
