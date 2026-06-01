
-- Create a security definer function to list all auth users
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.email::text,
    u.email_confirmed_at,
    u.created_at,
    COALESCE(u.raw_user_meta_data->>'first_name', '')::text as first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', '')::text as last_name,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '')::text as avatar_url
  FROM auth.users u
  ORDER BY u.created_at;
$$;

-- Add a user_role column to profiles for role management (ADMIN, SOUS_ADMIN, CLIENT)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_role text NOT NULL DEFAULT 'CLIENT';
