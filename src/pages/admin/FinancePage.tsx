import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getProfiles } from "@/services/data-service";
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

type Plan = { id: string; name: string; price_dt: number; duration_days: number; features: string[]; active: boolean; };
type SubPay = { id: string; profile_id: string; plan_id: string; amount_dt: number; payment_method: string; status: string; date_start: string | null; date_exp: string | null; created_at: string; };
type Reservation = { id: string; profile_id: string | null; subscription_plan_id: string | null; total_devices_price_dt: number; status: string; created_at: string };

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;
const METHODS = ["carte", "virement", "electronique", "main_a_main"];
const METHOD_LABEL: Record<string, string> = { carte: "Carte bancaire", virement: "Virement", electronique: "Paiement électronique", main_a_main: "Main à main", especes: "Espèces", mobile: "Paiement mobile" };

export default function FinancePage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.user_role === "ADMIN" || profile?.user_role === "SOUS_ADMIN";

  useEffect(() => {
    const ch = supabase.channel("finance-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_plans" }, () => qc.invalidateQueries({ queryKey: ["plans"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_payments" }, () => qc.invalidateQueries({ queryKey: ["subpays"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "material_reservations" }, () => qc.invalidateQueries({ queryKey: ["finance-reservations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "client_sales" }, () => qc.invalidateQueries({ queryKey: ["client-sales"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["plans"], queryFn: async () => (await supabase.from("subscription_plans").select("*").order("price_dt")).data as any || [] });
  const { data: subpays = [] } = useQuery<SubPay[]>({ queryKey: ["subpays"], queryFn: async () => (await supabase.from("subscription_payments").select("*").order("created_at", { ascending: false })).data as any || [] });
  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const profById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Finance</h2>
        <p className="text-sm text-muted-foreground">Abonnements, paiements et clients</p>
      </div>

      <Tabs defaultValue="clients">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1.5" />Clients</TabsTrigger>
          <TabsTrigger value="plans"><Package className="h-4 w-4 mr-1.5" />Abonnements</TabsTrigger>
          <TabsTrigger value="subpays"><ShieldCheck className="h-4 w-4 mr-1.5" />Paiements abos</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4"><ClientsTab profById={profById} planById={planById} plans={plans} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="plans" className="mt-4"><PlansTab plans={plans} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="subpays" className="mt-4"><SubPaysTab subpays={subpays} planById={planById} profById={profById} isAdmin={isAdmin} userId={profile?.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============== CLIENTS (réservations -> ventes) ============== */
function ClientsTab({ profById, planById, plans, isAdmin }: { profById: Record<string, any>; planById: Record<string, Plan>; plans: Plan[]; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<{ res: Reservation; method: string } | null>(null);
  const [methodChoice, setMethodChoice] = useState<Record<string, string>>({});

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["finance-reservations"],
    queryFn: async () => (await supabase.from("material_reservations").select("*").in("status", ["reserve", "confirme"]).order("created_at", { ascending: false })).data as any || [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["client-sales"],
    queryFn: async () => (await supabase.from("client_sales").select("reservation_id").not("reservation_id", "is", null)).data as any || [],
  });
  const salesByRes = useMemo(() => new Set(sales.map((s: any) => s.reservation_id)), [sales]);

  const updatePlan = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from("material_reservations").update({ subscription_plan_id: planId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-reservations"] }),
  });

  const deleteRes = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("material_reservations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-reservations"] }); toast({ title: "Supprimé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const confirmSale = async () => {
    if (!pendingSale) return;
    const { res, method } = pendingSale;
    const plan = res.subscription_plan_id ? planById[res.subscription_plan_id] : null;
    const subPrice = plan?.price_dt ?? 0;
    const total = subPrice + (res.total_devices_price_dt ?? 0);

    const { error } = await supabase.from("client_sales").insert({
      profile_id: res.profile_id,
      reservation_id: res.id,
      subscription_plan_id: res.subscription_plan_id,
      subscription_price_dt: subPrice,
      equipment_price_dt: res.total_devices_price_dt,
      total_dt: total,
      payment_method: method,
      status: "confirme",
      confirmed_at: new Date().toISOString(),
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }

    await supabase.from("material_reservations").update({ status: "installe" }).eq("id", res.id);
    await supabase.from("support_notifications").insert({
      notif_type: "sale_confirmed", title: "Vente confirmée",
      message: `Vente de ${DT(total)} confirmée`, link: "/admin/ventes", created_for_role: "ADMIN",
    });
    qc.invalidateQueries({ queryKey: ["finance-reservations"] });
    qc.invalidateQueries({ queryKey: ["ventes"] });
    toast({ title: "Vente confirmée ✓", description: "Transférée vers la section Ventes" });
    setPendingSale(null);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Clients prêts à la confirmation</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Client</TableHead><TableHead>Abonnement</TableHead><TableHead>Prix Abo</TableHead>
            <TableHead>Prix Appareillage</TableHead><TableHead>Prix Total</TableHead>
            <TableHead>Méthode</TableHead><TableHead className="w-44">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {reservations.map(r => {
              const client = profById[r.profile_id ?? ""];
              const plan = r.subscription_plan_id ? planById[r.subscription_plan_id] : null;
              const subPrice = plan?.price_dt ?? 0;
              const total = subPrice + (r.total_devices_price_dt ?? 0);
              const sold = salesByRes.has(r.id);
              const method = methodChoice[r.id] ?? "carte";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{client ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email : "—"}</TableCell>
                  <TableCell>
                    <Select value={r.subscription_plan_id ?? ""} onValueChange={(v) => updatePlan.mutate({ id: r.id, planId: v })} disabled={sold}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{DT(subPrice)}</TableCell>
                  <TableCell>{DT(r.total_devices_price_dt)}</TableCell>
                  <TableCell className="font-bold text-primary">{DT(total)}</TableCell>
                  <TableCell>
                    <Select value={method} onValueChange={v => setMethodChoice({ ...methodChoice, [r.id]: v })} disabled={sold}>
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
                        <Button size="sm" disabled={!r.subscription_plan_id} onClick={() => { setPendingSale({ res: r, method }); setSecurityOpen(true); }}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Confirmer
                        </Button>
                      )}
                      {isAdmin && !sold && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer cette réservation ?")) deleteRes.mutate(r.id); }}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {reservations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucun client en attente. Réservez du matériel dans la section "Réservation Matériel".</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <SecurityConfirmDialog
        open={securityOpen}
        onClose={() => { setSecurityOpen(false); setPendingSale(null); }}
        onSuccess={() => { setSecurityOpen(false); confirmSale(); }}
        title="Confirmer la vente"
        description="Authentifiez-vous (ADMIN ou SOUS_ADMIN) pour valider cette vente."
      />
    </Card>
  );
}

/* ============== PLANS ============== */
function PlansTab({ plans, isAdmin }: { plans: Plan[]; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Plan> | null>(null);

  const save = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const payload: any = { ...p };
      if (typeof payload.features === "string") payload.features = (payload.features as string).split(",").map((s: string) => s.trim()).filter(Boolean);
      if (p.id) { const { error } = await supabase.from("subscription_plans").update(payload).eq("id", p.id); if (error) throw error; }
      else { const { error } = await supabase.from("subscription_plans").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); setEdit(null); toast({ title: "Plan enregistré" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("subscription_plans").delete().eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });

  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base">Plans d'abonnement</CardTitle>
      {isAdmin && <Button size="sm" onClick={() => setEdit({ name: "", price_dt: 0, duration_days: 30, features: [], active: true })}><Plus className="h-4 w-4 mr-1" />Nouveau plan</Button>}
    </CardHeader><CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(p => (
          <Card key={p.id} className="border-2 hover:border-primary/40 transition">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.active ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300" variant="outline">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
              </div>
              <div><span className="text-3xl font-bold text-primary">{DT(p.price_dt)}</span><span className="text-sm text-muted-foreground"> / {p.duration_days}j</span></div>
              <ul className="text-sm space-y-1">{(p.features || []).map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
              {isAdmin && <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEdit({ ...p, features: (p.features || []).join(", ") as any })}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>}
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-muted-foreground text-center col-span-3 py-8">Aucun plan</p>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier plan" : "Nouveau plan"}</DialogTitle></DialogHeader>
          {edit && <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-3">
            <div><Label>Nom</Label><Input value={edit.name ?? ""} onChange={e => setEdit({ ...edit, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix (DT)</Label><Input type="number" step="0.01" value={edit.price_dt ?? 0} onChange={e => setEdit({ ...edit, price_dt: +e.target.value })} required /></div>
              <div><Label>Durée (jours)</Label><Input type="number" value={edit.duration_days ?? 30} onChange={e => setEdit({ ...edit, duration_days: +e.target.value })} required /></div>
            </div>
            <div><Label>Fonctionnalités (séparées par virgule)</Label><Input value={(edit.features as any) ?? ""} onChange={e => setEdit({ ...edit, features: e.target.value as any })} /></div>
            <div className="flex items-center gap-2"><Switch checked={edit.active ?? true} onCheckedChange={v => setEdit({ ...edit, active: v })} /><Label>Actif</Label></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

/* ============== SUB PAYMENTS ============== */
function SubPaysTab({ subpays, planById, profById, isAdmin, userId }: { subpays: SubPay[]; planById: Record<string, Plan>; profById: Record<string, any>; isAdmin: boolean; userId?: string }) {
  const qc = useQueryClient();
  const validate = useMutation({
    mutationFn: async ({ s, status }: { s: SubPay; status: string }) => {
      const { error } = await supabase.from("subscription_payments").update({ status, validated_by: userId, validated_at: new Date().toISOString() }).eq("id", s.id);
      if (error) throw error;
      if (status === "valide") {
        await supabase.from("profiles").update({ date_deb_abo: s.date_start, date_exp_abo: s.date_exp }).eq("id", s.profile_id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subpays"] }); qc.invalidateQueries({ queryKey: ["profiles"] }); toast({ title: "Mise à jour" }); },
  });
  return (
    <Card><CardHeader><CardTitle className="text-base">Paiements d'abonnement</CardTitle></CardHeader><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Utilisateur</TableHead><TableHead>Plan</TableHead><TableHead>Montant</TableHead><TableHead>Méthode</TableHead><TableHead>Expire</TableHead><TableHead>Statut</TableHead>{isAdmin && <TableHead>Actions</TableHead>}
        </TableRow></TableHeader>
        <TableBody>
          {subpays.map(s => {
            const u = profById[s.profile_id]; const p = planById[s.plan_id];
            return <TableRow key={s.id}>
              <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString("fr-FR")}</TableCell>
              <TableCell>{u ? `${u.first_name} ${u.last_name}` : "—"}</TableCell>
              <TableCell>{p?.name ?? "—"}</TableCell>
              <TableCell className="font-semibold">{DT(s.amount_dt)}</TableCell>
              <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
              <TableCell className="text-xs">{s.date_exp ?? "—"}</TableCell>
              <TableCell><Badge variant="outline" className={s.status === "valide" ? "bg-emerald-500/15 text-emerald-700 border-emerald-300" : s.status === "refuse" ? "bg-red-500/15 text-red-700 border-red-300" : "bg-orange-500/15 text-orange-700 border-orange-300"}>{s.status}</Badge></TableCell>
              {isAdmin && <TableCell>{s.status === "en_attente" && <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => validate.mutate({ s, status: "valide" })}><CheckCircle2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => validate.mutate({ s, status: "refuse" })}><XCircle className="h-4 w-4" /></Button>
              </div>}</TableCell>}
            </TableRow>;
          })}
          {subpays.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">Aucun paiement</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
