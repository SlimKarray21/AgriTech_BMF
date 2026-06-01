
-- Add created_by column to profiles to track which admin/sous-admin created which client
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT NULL;

-- Create security definer function to get user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_role FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create security definer function to get profile id from user_id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Add DELETE policy for profiles (admin only via security definer)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'ADMIN');
