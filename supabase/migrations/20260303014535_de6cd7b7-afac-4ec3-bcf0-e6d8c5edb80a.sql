
-- Remove FK to clients table so we can use auth user IDs
ALTER TABLE public.soil_reports DROP CONSTRAINT soil_reports_client_id_fkey;
