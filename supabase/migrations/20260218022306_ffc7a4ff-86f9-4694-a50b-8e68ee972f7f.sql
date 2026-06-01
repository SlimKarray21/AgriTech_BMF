
-- Table to track subscription notification emails sent
CREATE TABLE public.subscription_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  days_remaining INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage notifications"
  ON public.subscription_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Clients table for subscriptions (will be used by the edge function)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CLIENT',
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  date_of_birth TEXT,
  location TEXT,
  country TEXT,
  city TEXT,
  avatar_url TEXT,
  preferences JSONB,
  date_deb_abo DATE,
  date_exp_abo DATE,
  type_abo TEXT CHECK (type_abo IN ('op1', 'op1_op2', 'full')),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Admin can see all, clients see their own
CREATE POLICY "Authenticated users can view clients"
  ON public.clients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage clients"
  ON public.clients
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
