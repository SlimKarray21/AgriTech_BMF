
-- Fix overly permissive policy on subscription_notifications
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.subscription_notifications;

-- Only allow INSERT (from edge function via service role) and SELECT for authenticated users
CREATE POLICY "Authenticated can view notifications"
  ON public.subscription_notifications
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No direct INSERT/UPDATE/DELETE from client - only service role (edge functions) can write
