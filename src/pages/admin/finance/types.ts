// Types partagés par les onglets de la page Finance.

export type Plan = {
  id: string;
  name: string;
  price_dt: number;
  duration_days: number;
  features: string[];
  page_access: string[];
  active: boolean;
};

export type SubPay = {
  id: string;
  profile_id: string;
  plan_id: string;
  amount_dt: number;
  payment_method: string;
  status: string;
  date_start: string | null;
  date_exp: string | null;
  created_at: string;
};

export type Reservation = {
  id: string;
  profile_id: string | null;
  subscription_plan_id: string | null;
  total_devices_price_dt: number;
  status: string;
  created_at: string;
};
