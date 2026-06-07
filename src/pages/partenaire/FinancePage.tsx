import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getProfiles,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPayments,
  createSubscriptionPayment,
  updateSubscriptionPayment,
  getClientSales,
  createClientSale,
  getMaterialReservations,
  updateMaterialReservation,
  createSupportNotification,
  updateProfile,
} from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, CreditCard, Package, ShieldCheck, Users } from "lucide-react";
import SecurityConfirmDialog from "@/components/SecurityConfirmDialog";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Plan = {
  id: string;
  name: string;
  price_dt: number;
  duration_days: number;
  features: string[];
  active: boolean;
};

type SubPay = {
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

type Reservation = {
  id: string;
  profile_id: string | null;
  subscription_plan_id: string | null;
  total_devices_price_dt: number;
  status: string;
  created_at: string;
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;

const METHOD_LABEL: Record<string, string> = {
  carte: "Carte bancaire",
  virement: "Virement",
  electronique: "Paiement Ã©lectronique",
  main_a_main: "Main Ã  main",
  especes: "EspÃ¨ces",
  mobile: "Paiement mobile",
  cash: "EspÃ¨ces",
};

function parseFeatures(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (typeof raw === "string" && raw.trim() && raw !== "{}") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizePlan(raw: any): Plan {
  return {
    id: String(raw.id),
    name: raw.name ?? "",
    price_dt: Number(raw.price_dt ?? 0),
    duration_days: Number(raw.duration_days ?? 30),
    features: parseFeatures(raw.features),
    active: raw.active ?? true,
  };
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function FinancePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.user_role === "PARTENAIRE";

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

      <Tabs defaultValue="clients">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1.5" />Clients</TabsTrigger>
          <TabsTrigger value="plans"><Package className="h-4 w-4 mr-1.5" />Abonnements</TabsTrigger>
          <TabsTrigger value="subpays"><ShieldCheck className="h-4 w-4 mr-1.5" />Paiements abos</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <ClientsTab profById={profById} planById={planById} plans={plans} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          {/* Le partenaire voit les abonnements en lecture seule (gestion réservée à l'admin) */}
          <PlansTab plans={plans} canManage={false} />
        </TabsContent>
        <TabsContent value="subpays" className="mt-4">
          <SubPaysTab subpays={subpays} planById={planById} profById={profById} isAdmin={isAdmin} userId={profile?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// â”€â”€ Plans Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlansTab({ plans, canManage }: { plans: Plan[]; canManage: boolean }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<(Partial<Plan> & { featuresStr?: string }) | null>(null);

  const save = useMutation({
    mutationFn: async (p: Partial<Plan> & { featuresStr?: string }) => {
      const featuresArr = (p.featuresStr ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: p.name,
        price_dt: p.price_dt,
        duration_days: p.duration_days,
        features: featuresArr,   // array â†’ Kotlin .toString() donne ["f1","f2"]
        active: p.active ?? true,
      };
      if (p.id) {
        await updateSubscriptionPlan(p.id, payload);
      } else {
        await createSubscriptionPlan(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setEdit(null);
      toast({ title: "Plan enregistrÃ©" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan supprimÃ©" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openNew = () => setEdit({ name: "", price_dt: 0, duration_days: 30, featuresStr: "", active: true });
  const openEdit = (p: Plan) => setEdit({ ...p, featuresStr: p.features.join(", ") });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Plans d'abonnement</CardTitle>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />Nouveau plan
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="border-2 hover:border-primary/40 transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  {p.active
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300" variant="outline">Actif</Badge>
                    : <Badge variant="outline">Inactif</Badge>}
                </div>
                <div>
                  <span className="text-3xl font-bold text-primary">{DT(p.price_dt)}</span>
                  <span className="text-sm text-muted-foreground"> / {p.duration_days}j</span>
                </div>
                <ul className="text-sm space-y-1">
                  {p.features.map((f, i) => <li key={i}>âœ“ {f}</li>)}
                </ul>
                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm(`Supprimer "${p.name}" ?`)) del.mutate(p.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-muted-foreground text-center col-span-3 py-8">Aucun plan. CrÃ©ez-en un.</p>
          )}
        </div>

        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Modifier plan" : "Nouveau plan"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prix (DT) *</Label>
                    <Input type="number" step="0.01" min="0" value={edit.price_dt ?? 0}
                      onChange={(e) => setEdit({ ...edit, price_dt: +e.target.value })} required />
                  </div>
                  <div>
                    <Label>DurÃ©e (jours) *</Label>
                    <Input type="number" min="1" value={edit.duration_days ?? 30}
                      onChange={(e) => setEdit({ ...edit, duration_days: +e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>FonctionnalitÃ©s <span className="text-muted-foreground text-xs">(sÃ©parÃ©es par virgule)</span></Label>
                  <Input
                    value={edit.featuresStr ?? ""}
                    onChange={(e) => setEdit({ ...edit, featuresStr: e.target.value })}
                    placeholder="Capteur sol, Ã‰lectrovanne, Rapports..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={edit.active ?? true} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />
                  <Label>Actif</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// â”€â”€ Clients Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ClientsTab({
  profById, planById, plans, isAdmin,
}: {
  profById: Record<string, any>;
  planById: Record<string, Plan>;
  plans: Plan[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<{ res: Reservation; method: string } | null>(null);
  const [methodChoice, setMethodChoice] = useState<Record<string, string>>({});

  const { data: rawReservations = [] } = useQuery({
    queryKey: ["finance-reservations"],
    queryFn: getMaterialReservations,
  });
  const reservations: Reservation[] = useMemo(() =>
    rawReservations
      .filter((r: any) => r.status === "reserve" || r.status === "confirme")
      .map((r: any) => ({
        id: String(r.id),
        profile_id: r.profile_id != null ? String(r.profile_id) : null,
        subscription_plan_id: r.subscription_plan_id != null ? String(r.subscription_plan_id) : null,
        total_devices_price_dt: Number(r.total_devices_price_dt ?? 0),
        status: r.status,
        created_at: r.created_at ?? "",
      })),
    [rawReservations]);

  const { data: rawSales = [] } = useQuery({
    queryKey: ["client-sales"],
    queryFn: getClientSales,
  });
  const salesByRes = useMemo(
    () => new Set(rawSales.filter((s: any) => s.reservation_id != null).map((s: any) => String(s.reservation_id))),
    [rawSales]
  );

  const updatePlanMut = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      updateMaterialReservation(id, { subscription_plan_id: Number(planId) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-reservations"] }),
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteResMut = useMutation({
    mutationFn: async (id: string) => {
      // soft-delete via status "annule"
      await updateMaterialReservation(id, { status: "annule" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-reservations"] }); toast({ title: "RÃ©servation annulÃ©e" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const confirmSale = async () => {
    if (!pendingSale) return;
    const { res, method } = pendingSale;
    const plan = res.subscription_plan_id ? planById[res.subscription_plan_id] : null;
    const subPrice = plan?.price_dt ?? 0;
    const total = subPrice + (res.total_devices_price_dt ?? 0);

    try {
      await createClientSale({
        profile_id: Number(res.profile_id),
        reservation_id: Number(res.id),
        subscription_plan_id: res.subscription_plan_id ? Number(res.subscription_plan_id) : null,
        subscription_price_dt: subPrice,
        equipment_price_dt: res.total_devices_price_dt,
        total_dt: total,
        payment_method: method,
        status: "confirme",
      });
      await updateMaterialReservation(res.id, { status: "installe" });
      await createSupportNotification({
        notif_type: "sale_confirmed",
        title: "Vente confirmÃ©e",
        message: `Vente de ${DT(total)} confirmÃ©e`,
        link: "/admin/ventes",
        created_for_role: "ADMIN",
      });
      qc.invalidateQueries({ queryKey: ["finance-reservations"] });
      qc.invalidateQueries({ queryKey: ["client-sales"] });
      toast({ title: "Vente confirmÃ©e âœ“", description: "TransfÃ©rÃ©e vers la section Ventes" });
      setPendingSale(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Clients prÃªts Ã  la confirmation</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Abonnement</TableHead>
              <TableHead>Prix Abo</TableHead>
              <TableHead>Prix MatÃ©riel</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>MÃ©thode</TableHead>
              <TableHead className="w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => {
              const client = profById[r.profile_id ?? ""];
              const plan = r.subscription_plan_id ? planById[r.subscription_plan_id] : null;
              const subPrice = plan?.price_dt ?? 0;
              const total = subPrice + (r.total_devices_price_dt ?? 0);
              const sold = salesByRes.has(r.id);
              const method = methodChoice[r.id] ?? "especes";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {client ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email : "â€”"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.subscription_plan_id ?? ""}
                      onValueChange={(v) => updatePlanMut.mutate({ id: r.id, planId: v })}
                      disabled={sold}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{DT(subPrice)}</TableCell>
                  <TableCell>{DT(r.total_devices_price_dt)}</TableCell>
                  <TableCell className="font-bold text-primary">{DT(total)}</TableCell>
                  <TableCell>
                    <Select
                      value={method}
                      onValueChange={(v) => setMethodChoice({ ...methodChoice, [r.id]: v })}
                      disabled={sold}
                    >
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">EspÃ¨ces</SelectItem>
                        <SelectItem value="carte">Carte</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {sold ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">âœ“ Vendu</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!r.subscription_plan_id}
                          onClick={() => { setPendingSale({ res: r, method }); setSecurityOpen(true); }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />Confirmer
                        </Button>
                      )}
                      {isAdmin && !sold && (
                        <Button
                          size="sm" variant="ghost" className="text-destructive"
                          onClick={() => { if (confirm("Annuler cette rÃ©servation ?")) deleteResMut.mutate(r.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {reservations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun client en attente. RÃ©servez du matÃ©riel dans "RÃ©servation MatÃ©riel".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <SecurityConfirmDialog
        open={securityOpen}
        onClose={() => { setSecurityOpen(false); setPendingSale(null); }}
        onSuccess={() => { setSecurityOpen(false); confirmSale(); }}
        title="Confirmer la vente"
        description="Authentifiez-vous pour valider cette vente."
      />
    </Card>
  );
}

// â”€â”€ SubPays Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SubPaysTab({
  subpays, planById, profById, isAdmin, userId,
}: {
  subpays: SubPay[];
  planById: Record<string, Plan>;
  profById: Record<string, any>;
  isAdmin: boolean;
  userId?: string;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const profiles = Object.values(profById);
  const plans = Object.values(planById);

  const validate = useMutation({
    mutationFn: async ({ s, status }: { s: SubPay; status: string }) => {
      await updateSubscriptionPayment(s.id, {
        status,
        validated_by: userId ? Number(userId) : undefined,
        validated_at: new Date().toISOString(),
      });
      if (status === "valide" && s.profile_id) {
        await updateProfile(s.profile_id, {
          date_deb_abo: s.date_start ?? undefined,
          date_exp_abo: s.date_exp ?? undefined,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpays"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Mise Ã  jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async (payload: any) => {
      await createSubscriptionPayment({
        profile_id: Number(payload.profile_id),
        plan_id: Number(payload.plan_id),
        amount_dt: Number(payload.amount_dt),
        payment_method: payload.payment_method,
        status: "en_attente",
        date_start: payload.date_start || null,
        date_exp: payload.date_exp || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpays"] });
      setCreating(false);
      toast({ title: "Paiement crÃ©Ã©" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Paiements d'abonnement</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />Nouveau paiement
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>MÃ©thode</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Statut</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {subpays.map((s) => {
              const u = profById[s.profile_id];
              const p = planById[s.plan_id];
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id}</TableCell>
                  <TableCell>{p?.name ?? "â€”"}</TableCell>
                  <TableCell className="font-semibold">{DT(s.amount_dt)}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                  <TableCell className="text-xs">{s.date_exp ?? "â€”"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        s.status === "valide"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                          : s.status === "refuse"
                          ? "bg-red-500/15 text-red-700 border-red-300"
                          : "bg-orange-500/15 text-orange-700 border-orange-300"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {s.status === "en_attente" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => validate.mutate({ s, status: "valide" })}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => validate.mutate({ s, status: "refuse" })}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {subpays.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
                  Aucun paiement
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create payment dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau paiement d'abonnement</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createMut.mutate({
                profile_id: fd.get("profile_id"),
                plan_id: fd.get("plan_id"),
                amount_dt: fd.get("amount_dt"),
                payment_method: fd.get("payment_method"),
                date_start: fd.get("date_start"),
                date_exp: fd.get("date_exp"),
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label>Client *</Label>
              <select name="profile_id" required className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">SÃ©lectionner...</option>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} â€” {p.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plan *</Label>
              <select name="plan_id" required className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">SÃ©lectionner...</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} â€” {DT(p.price_dt)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant (DT) *</Label>
                <Input name="amount_dt" type="number" step="0.01" min="0" required />
              </div>
              <div>
                <Label>MÃ©thode *</Label>
                <select name="payment_method" required className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="especes">EspÃ¨ces</option>
                  <option value="carte">Carte</option>
                  <option value="virement">Virement</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date dÃ©but</Label><Input name="date_start" type="date" /></div>
              <div><Label>Date expiration</Label><Input name="date_exp" type="date" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "CrÃ©ation..." : "CrÃ©er"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
