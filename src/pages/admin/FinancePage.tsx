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
  updateProfile,
} from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
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

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  price_dt: number;
  duration_days: number;
  features: string[];
  page_access: string[];
  active: boolean;
};

// Arbre des accès mobiles (uiearth_flutter) sélectionnables pour un plan :
// chaque page peut déverrouiller des fonctionnalités fines (clés `page.fonction`).
// Doit rester aligné avec kPageFeatures côté Flutter (access_provider.dart).
// "meteo" et "profil" sont toujours autorisées et ne sont donc pas listées ici.
type PageNode = { key: string; label: string; features: { key: string; label: string }[] };

const PAGE_TREE: PageNode[] = [
  {
    key: "accueil",
    label: "Accueil",
    features: [
      { key: "accueil.ia", label: "IA (chatbot)" },
      { key: "accueil.add_rapport", label: "Ajouter rapport" },
      { key: "accueil.add_parcelle", label: "Ajouter parcelle" },
    ],
  },
  {
    key: "parcelles",
    label: "Parcelles",
    features: [
      { key: "parcelles.add_rapport", label: "Ajouter rapport" },
      { key: "parcelles.climat", label: "Valeurs climat" },
      { key: "parcelles.sol", label: "Valeurs sol (capteur)" },
      { key: "parcelles.controle_vanne", label: "Contrôle vannes" },
    ],
  },
  { key: "sante", label: "Santé plante", features: [] },
  { key: "vannes", label: "Vannes", features: [] },
];

const ALWAYS_ALLOWED_PAGES: { key: string; label: string }[] = [
  { key: "meteo", label: "Météo" },
  { key: "profil", label: "Profil" },
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;

const METHOD_LABEL: Record<string, string> = {
  carte: "Carte bancaire",
  virement: "Virement",
  electronique: "Paiement électronique",
  main_a_main: "Main à main",
  especes: "Espèces",
  mobile: "Paiement mobile",
  cash: "Espèces",
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

function parsePageAccess(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
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
    page_access: parsePageAccess(raw.page_access),
    active: raw.active ?? true,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.user_role === "ADMIN";

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
          <PlansTab plans={plans} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="subpays" className="mt-4">
          <SubPaysTab subpays={subpays} planById={planById} profById={profById} isAdmin={isAdmin} userId={profile?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────

function PlansTab({ plans, isAdmin }: { plans: Plan[]; isAdmin: boolean }) {
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
        features: featuresArr,   // array → Kotlin .toString() donne ["f1","f2"]
        page_access: p.page_access ?? [],  // pages mobiles déverrouillées par ce plan
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
      toast({ title: "Plan enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openNew = () => setEdit({ name: "", price_dt: 0, duration_days: 30, featuresStr: "", page_access: [], active: true });
  const openEdit = (p: Plan) => setEdit({ ...p, featuresStr: p.features.join(", ") });

  const togglePage = (node: PageNode) => {
    if (!edit) return;
    const current = edit.page_access ?? [];
    const featureKeys = node.features.map((f) => f.key);
    const next = current.includes(node.key)
      ? // décocher la page retire aussi ses fonctionnalités
        current.filter((k) => k !== node.key && !featureKeys.includes(k))
      : [...current, node.key];
    setEdit({ ...edit, page_access: next });
  };

  const toggleFeature = (node: PageNode, featureKey: string) => {
    if (!edit) return;
    const current = edit.page_access ?? [];
    if (current.includes(featureKey)) {
      setEdit({ ...edit, page_access: current.filter((k) => k !== featureKey) });
    } else {
      // cocher une fonctionnalité accorde implicitement la page
      const withPage = current.includes(node.key) ? current : [...current, node.key];
      setEdit({ ...edit, page_access: [...withPage, featureKey] });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Plans d'abonnement</CardTitle>
        {isAdmin && (
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
                  {p.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                </ul>
                <div className="flex flex-wrap gap-1 pt-1">
                  {PAGE_TREE.filter((node) => p.page_access.includes(node.key)).length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Aucune page mobile déverrouillée</span>
                  ) : (
                    PAGE_TREE.filter((node) => p.page_access.includes(node.key)).map((node) => {
                      const selected = node.features.filter((f) => p.page_access.includes(f.key));
                      return (
                        <Badge key={node.key} variant="outline" className="text-xs">
                          {node.label}
                          {selected.length > 0 && ` (${selected.length})`}
                        </Badge>
                      );
                    })
                  )}
                </div>
                {isAdmin && (
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
            <p className="text-muted-foreground text-center col-span-3 py-8">Aucun plan. Créez-en un.</p>
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
                    <Label>Durée (jours) *</Label>
                    <Input type="number" min="1" value={edit.duration_days ?? 30}
                      onChange={(e) => setEdit({ ...edit, duration_days: +e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>Fonctionnalités <span className="text-muted-foreground text-xs">(séparées par virgule)</span></Label>
                  <Input
                    value={edit.featuresStr ?? ""}
                    onChange={(e) => setEdit({ ...edit, featuresStr: e.target.value })}
                    placeholder="Capteur sol, Électrovanne, Rapports..."
                  />
                </div>

                {/* Accès aux pages & fonctionnalités mobiles déverrouillées par ce plan */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label className="text-sm font-medium">Accès mobile (pages & fonctionnalités)</Label>
                  <p className="text-xs text-muted-foreground">
                    Cochez les pages, puis affinez les fonctionnalités. Si aucune fonctionnalité
                    n'est cochée pour une page, toute la page est accessible.
                  </p>
                  <div className="space-y-2 pt-1">
                    {PAGE_TREE.map((node) => {
                      const access = edit.page_access ?? [];
                      const pageOn = access.includes(node.key);
                      return (
                        <div key={node.key} className="rounded-md border bg-background">
                          <button
                            type="button"
                            onClick={() => togglePage(node)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
                              pageOn ? "text-foreground" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                pageOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                              }`}
                            >
                              {pageOn && <CheckCircle2 className="h-3 w-3" />}
                            </span>
                            <span className="font-medium">{node.label}</span>
                            {node.features.length === 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">page entière</span>
                            )}
                          </button>
                          {pageOn && node.features.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 border-t px-3 py-2">
                              {node.features.map((f) => {
                                const on = access.includes(f.key);
                                return (
                                  <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => toggleFeature(node, f.key)}
                                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition ${
                                      on
                                        ? "border border-primary bg-primary/10 text-foreground"
                                        : "border border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                        on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                      }`}
                                    >
                                      {on && <CheckCircle2 className="h-2.5 w-2.5" />}
                                    </span>
                                    {f.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Toujours autorisées : {ALWAYS_ALLOWED_PAGES.map((p) => p.label).join(", ")}.
                  </p>
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

// ── Clients Tab ───────────────────────────────────────────────────────────────

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-reservations"] }); toast({ title: "Réservation annulée" }); },
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
      qc.invalidateQueries({ queryKey: ["finance-reservations"] });
      qc.invalidateQueries({ queryKey: ["client-sales"] });
      toast({ title: "Vente confirmée ✓", description: "Transférée vers la section Ventes" });
      setPendingSale(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const subPriceOf = (r: Reservation) =>
    (r.subscription_plan_id ? planById[r.subscription_plan_id]?.price_dt ?? 0 : 0);
  const { sorted, sort } = useTableSort(reservations, {
    client: (r) => {
      const c = profById[r.profile_id ?? ""];
      return c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email : null;
    },
    plan: (r) => (r.subscription_plan_id ? planById[r.subscription_plan_id]?.name ?? null : null),
    subPrice: (r) => subPriceOf(r),
    material: (r) => r.total_devices_price_dt ?? 0,
    total: (r) => subPriceOf(r) + (r.total_devices_price_dt ?? 0),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Clients prêts à la confirmation</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="client" sort={sort}>Client</SortableHead>
              <SortableHead field="plan" sort={sort}>Abonnement</SortableHead>
              <SortableHead field="subPrice" sort={sort}>Prix Abo</SortableHead>
              <SortableHead field="material" sort={sort}>Prix Matériel</SortableHead>
              <SortableHead field="total" sort={sort}>Total</SortableHead>
              <TableHead>Méthode</TableHead>
              <TableHead className="w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const client = profById[r.profile_id ?? ""];
              const plan = r.subscription_plan_id ? planById[r.subscription_plan_id] : null;
              const subPrice = plan?.price_dt ?? 0;
              const total = subPrice + (r.total_devices_price_dt ?? 0);
              const sold = salesByRes.has(r.id);
              const method = methodChoice[r.id] ?? "especes";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {client ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email : "—"}
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
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="carte">Carte</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {sold ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">✓ Vendu</Badge>
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
                          onClick={() => { if (confirm("Annuler cette réservation ?")) deleteResMut.mutate(r.id); }}
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
                  Aucun client en attente. Réservez du matériel dans "Réservation Matériel".
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

// ── SubPays Tab ───────────────────────────────────────────────────────────────

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
      toast({ title: "Mise à jour" });
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
      toast({ title: "Paiement créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const { sorted, sort } = useTableSort(subpays, {
    date: (s) => (s.created_at ? new Date(s.created_at) : null),
    user: (s) => {
      const u = profById[s.profile_id];
      return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id;
    },
    plan: (s) => planById[s.plan_id]?.name ?? null,
    amount: (s) => s.amount_dt,
    method: (s) => METHOD_LABEL[s.payment_method] ?? s.payment_method,
    expire: (s) => (s.date_exp ? new Date(s.date_exp) : null),
    status: (s) => s.status,
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
              <SortableHead field="date" sort={sort}>Date</SortableHead>
              <SortableHead field="user" sort={sort}>Utilisateur</SortableHead>
              <SortableHead field="plan" sort={sort}>Plan</SortableHead>
              <SortableHead field="amount" sort={sort}>Montant</SortableHead>
              <SortableHead field="method" sort={sort}>Méthode</SortableHead>
              <SortableHead field="expire" sort={sort}>Expire</SortableHead>
              <SortableHead field="status" sort={sort}>Statut</SortableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const u = profById[s.profile_id];
              const p = planById[s.plan_id];
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id}</TableCell>
                  <TableCell>{p?.name ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{DT(s.amount_dt)}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                  <TableCell className="text-xs">{s.date_exp ?? "—"}</TableCell>
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
                <option value="">Sélectionner...</option>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} — {p.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plan *</Label>
              <select name="plan_id" required className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">Sélectionner...</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — {DT(p.price_dt)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant (DT) *</Label>
                <Input name="amount_dt" type="number" step="0.01" min="0" required />
              </div>
              <div>
                <Label>Méthode *</Label>
                <select name="payment_method" required className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                  <option value="virement">Virement</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date début</Label><Input name="date_start" type="date" /></div>
              <div><Label>Date expiration</Label><Input name="date_exp" type="date" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
