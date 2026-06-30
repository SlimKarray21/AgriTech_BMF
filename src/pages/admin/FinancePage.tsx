import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getProfiles, getSubscriptionPlans, getSubscriptionPayments, getClientSales } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, ShieldCheck, Package } from "lucide-react";
import { Plan, SubPay, MatPay } from "./finance/types";
import { normalizePlan } from "./finance/utils";
import SubPaysTab from "./finance/SubPaysTab";
import MatPaysTab from "./finance/MatPaysTab";

export default function FinancePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.user_role === "ADMIN";
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "clients";

  const { data: rawPlans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: getSubscriptionPlans,
  });
  const plans: Plan[] = useMemo(() => rawPlans.map(normalizePlan), [rawPlans]);

  const { data: rawSubpays = [] } = useQuery({
    queryKey: ["subpays"],
    queryFn: getSubscriptionPayments,
  });
  const subpays: SubPay[] = useMemo(() =>
    rawSubpays.map((s: any) => ({
      id: String(s.id),
      profile_id: String(s.profile_id),
      plan_id: String(s.plan_id),
      amount_dt: Number(s.amount_dt ?? 0),
      payment_method: s.payment_method ?? "cash",
      status: s.status ?? "en_attente",
      date_start: s.date_start ?? null,
      date_exp: s.date_exp ?? null,
      created_at: s.created_at ?? "",
    })), [rawSubpays]);

  const { data: rawSales = [] } = useQuery({
    queryKey: ["client-sales"],
    queryFn: getClientSales,
  });
  const matpays: MatPay[] = useMemo(() =>
    rawSales.map((s: any) => ({
      id: String(s.id),
      profile_id: s.profile_id != null ? String(s.profile_id) : "",
      reservation_id: s.reservation_id != null ? String(s.reservation_id) : null,
      amount_dt: Number(s.equipment_price_dt ?? s.total_dt ?? 0),
      payment_method: s.payment_method ?? "—",
      status: s.status ?? "confirme",
      created_at: s.created_at ?? "",
    })), [rawSales]);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const profById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Finance
        </h2>
        <p className="text-sm text-muted-foreground">Abonnements, paiements et clients</p>
      </div>

      <Tabs defaultValue={initialTab === "subpays" || initialTab === "matpays" ? initialTab : "subpays"}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="subpays"><ShieldCheck className="h-4 w-4 mr-1.5" />Paiements abos</TabsTrigger>
          <TabsTrigger value="matpays"><Package className="h-4 w-4 mr-1.5" />Paiements matériels</TabsTrigger>
        </TabsList>

        <TabsContent value="subpays" className="mt-4">
          <SubPaysTab subpays={subpays} planById={planById} profById={profById} isAdmin={isAdmin} userId={profile?.id} />
        </TabsContent>
        <TabsContent value="matpays" className="mt-4">
          <MatPaysTab sales={matpays} profById={profById} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
