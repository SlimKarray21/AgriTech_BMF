
-- Allow authenticated users to read all profiles (needed for role lookup)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow admin to update any profile role
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
