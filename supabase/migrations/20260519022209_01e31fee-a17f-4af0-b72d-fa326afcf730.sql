
-- STOCK ITEMS
CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  purchase_price_dt numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  features text,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view stock_items" ON public.stock_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin ins stock_items" ON public.stock_items FOR INSERT WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin upd stock_items" ON public.stock_items FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin del stock_items" ON public.stock_items FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');
CREATE TRIGGER stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL,
  movement_type text NOT NULL DEFAULT 'adjustment',
  quantity integer NOT NULL DEFAULT 0,
  reason text,
  reservation_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view stock_movements" ON public.stock_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin del stock_movements" ON public.stock_movements FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- MATERIAL RESERVATIONS (Kanban)
CREATE TABLE public.material_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  surface_id uuid,
  subscription_plan_id uuid,
  status text NOT NULL DEFAULT 'nouvelle_demande',
  notes text,
  total_devices_price_dt numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view mr" ON public.material_reservations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins mr" ON public.material_reservations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin upd mr" ON public.material_reservations FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin del mr" ON public.material_reservations FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');
CREATE TRIGGER mr_updated_at BEFORE UPDATE ON public.material_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RESERVATION ITEMS
CREATE TABLE public.reservation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  stock_item_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_dt numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view ri" ON public.reservation_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins ri" ON public.reservation_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd ri" ON public.reservation_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth del ri" ON public.reservation_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- CLIENT SALES
CREATE TABLE public.client_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  reservation_id uuid,
  subscription_plan_id uuid,
  subscription_price_dt numeric NOT NULL DEFAULT 0,
  equipment_price_dt numeric NOT NULL DEFAULT 0,
  total_dt numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'especes',
  status text NOT NULL DEFAULT 'en_attente',
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view cs" ON public.client_sales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins cs" ON public.client_sales FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin upd cs" ON public.client_sales FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['ADMIN','SOUS_ADMIN']));
CREATE POLICY "admin del cs" ON public.client_sales FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- SUPPORT NOTIFICATIONS
CREATE TABLE public.support_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notif_type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_for_role text DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view sn" ON public.support_notifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth ins sn" ON public.support_notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd sn" ON public.support_notifications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del sn" ON public.support_notifications FOR DELETE USING (get_user_role(auth.uid()) = 'ADMIN');

-- TRIGGER: auto reservation + notification on new surface
CREATE OR REPLACE FUNCTION public.handle_new_surface()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
  v_profile_name text;
  v_vanne_count integer;
BEGIN
  INSERT INTO public.material_reservations (profile_id, surface_id, status, notes)
  VALUES (NEW.fk_user, NEW.id, 'nouvelle_demande', 'Demande créée automatiquement à la création de la parcelle')
  RETURNING id INTO v_reservation_id;

  SELECT COALESCE(first_name || ' ' || last_name, email, 'Client') INTO v_profile_name
  FROM public.profiles WHERE id = NEW.fk_user OR user_id = NEW.fk_user LIMIT 1;

  SELECT COUNT(*) INTO v_vanne_count FROM public.vannes WHERE fk_surface = NEW.id;

  INSERT INTO public.support_notifications (notif_type, title, message, link, created_for_role)
  VALUES (
    'new_parcelle',
    'Nouvelle demande d''installation détectée',
    COALESCE(v_profile_name, 'Client') || ' a créé la parcelle "' || NEW.nom_surface || '"',
    '/admin/reservation-materiel',
    'ADMIN'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_surface_created ON public.surfaces;
CREATE TRIGGER on_surface_created
AFTER INSERT ON public.surfaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_surface();

-- TRIGGER: decrement stock when reservation -> reserve
CREATE OR REPLACE FUNCTION public.handle_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_remaining integer;
BEGIN
  IF NEW.status = 'reserve' AND (OLD.status IS DISTINCT FROM 'reserve') THEN
    FOR r IN SELECT ri.stock_item_id, ri.quantity, si.name, si.low_stock_threshold
             FROM public.reservation_items ri
             JOIN public.stock_items si ON si.id = ri.stock_item_id
             WHERE ri.reservation_id = NEW.id LOOP
      UPDATE public.stock_items SET quantity = quantity - r.quantity WHERE id = r.stock_item_id
      RETURNING quantity INTO v_remaining;

      INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity, reason, reservation_id)
      VALUES (r.stock_item_id, 'reservation', -r.quantity, 'Réservation matériel', NEW.id);

      IF v_remaining <= r.low_stock_threshold THEN
        INSERT INTO public.support_notifications (notif_type, title, message, link, created_for_role)
        VALUES ('low_stock', 'Stock faible',
                'Article "' || r.name || '" : ' || v_remaining || ' restant(s)',
                '/admin/stock', 'ADMIN');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reservation_status ON public.material_reservations;
CREATE TRIGGER on_reservation_status
AFTER UPDATE OF status ON public.material_reservations
FOR EACH ROW EXECUTE FUNCTION public.handle_reservation_status();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_notifications;
