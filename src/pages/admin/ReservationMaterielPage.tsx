import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Trash2, MapPin, User as UserIcon, Search, CheckCircle2, RotateCcw, Wifi, WifiOff, Clock, Pencil, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getSurfaces, updateSurface,
  getProfiles, updateProfile,
  getSubscriptionPlans,
  getStockItems, updateStockItem, createStockMovement,
  getMaterialReservations, createMaterialReservation, updateMaterialReservation,
  getReservationItemsByReservation, createReservationItem, deleteReservationItem,
  getClientSales, createClientSale,
  createSubscriptionPayment,
} from "@/services/data-service";
import type { Surface } from "@/types/models";

type Reservation = {
  id: string; profile_id: string | null; surface_id: string | null;
  subscription_plan_id: string | null; status: string; notes: string | null;
  total_devices_price_dt: number; created_at: string; created_by: string | null;
};
type StockItem = { id: string; name: string; quantity: number; purchase_price_dt: number; category: string };
type ResItem = { id: string; reservation_id: string; stock_item_id: string; quantity: number; unit_price_dt: number };
type Plan = { id: string; name: string; price_dt: number; duration_days: number };

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;

export default function ReservationMaterielPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("non");

  const { data: rawSurfaces = [] } = useQuery({
    queryKey: ["surfaces-all"],
    queryFn: getSurfaces,
    refetchInterval: 10000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: getProfiles,
    refetchInterval: 10000,
  });
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["reservations-all"],
    queryFn: getMaterialReservations,
    refetchInterval: 10000,
  });
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans-active"],
    queryFn: getSubscriptionPlans,
  });
  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ["stock-items-all"],
    queryFn: getStockItems,
    refetchInterval: 10000,
  });

  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p: any) => [p.id, p])), [plans]);

  const resBySurface = useMemo(() => {
    const m = new Map<string, Reservation>();
    const sorted = [...reservations].sort((a, b) => b.created_at?.localeCompare(a.created_at ?? "") ?? 0);
    for (const r of sorted) {
      if (r.surface_id == null) continue;
      const key = String(r.surface_id);
      if (!m.has(key)) m.set(key, r);
    }
    return m;
  }, [reservations]);

  const buckets = useMemo(() => {
    const nonConn: Surface[] = [];
    const enAtt: Surface[] = [];
    const conn: Surface[] = [];
    for (const s of rawSurfaces) {
      const r = resBySurface.get(s.id);
      const st = r?.status;
      if (s.isConnected || st === "installe") conn.push(s);
      else if (st === "reserve" || st === "confirme") enAtt.push(s);
      else nonConn.push(s);
    }
    const filter = (arr: Surface[]) => arr.filter(s => {
      if (!search) return true;
      const p = s.fkUser ? profById[s.fkUser] : null;
      const hay = `${s.nomSurface} ${s.localisation ?? ""} ${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
    return { nonConn: filter(nonConn), enAtt: filter(enAtt), conn: filter(conn) };
  }, [rawSurfaces, resBySurface, search, profById]);

  const [editSurface, setEditSurface] = useState<Surface | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> Réservation Matériel</h2>
          <p className="text-sm text-muted-foreground">Workflow professionnel : Non Connectées → En Attente → Connectées</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher client, parcelle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="non" className="gap-2"><WifiOff className="h-4 w-4" /> Non Connectées <Badge variant="secondary" className="ml-1">{buckets.nonConn.length}</Badge></TabsTrigger>
          <TabsTrigger value="att" className="gap-2"><Clock className="h-4 w-4" /> En Attente <Badge variant="secondary" className="ml-1">{buckets.enAtt.length}</Badge></TabsTrigger>
          <TabsTrigger value="conn" className="gap-2"><Wifi className="h-4 w-4" /> Connectées <Badge variant="secondary" className="ml-1">{buckets.conn.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="non" className="mt-4">
          <SurfaceTable surfaces={buckets.nonConn} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} mode="non" onEdit={setEditSurface} />
        </TabsContent>
        <TabsContent value="att" className="mt-4">
          <SurfaceTable surfaces={buckets.enAtt} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} mode="att" onEdit={setEditSurface} />
        </TabsContent>
        <TabsContent value="conn" className="mt-4">
          <SurfaceTable surfaces={buckets.conn} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} mode="conn" onEdit={setEditSurface} />
        </TabsContent>
      </Tabs>

      <ParcelleEditDialog
        surface={editSurface}
        reservation={editSurface ? resBySurface.get(editSurface.id) ?? null : null}
        profile={editSurface?.fkUser ? profById[editSurface.fkUser] : null}
        stockItems={stockItems}
        plans={plans}
        onClose={() => setEditSurface(null)}
      />
    </div>
  );
}

/* ============ TABLE ============ */
function SurfaceTable({
  surfaces, profById, resBySurface, planById, stockItems, plans, mode, onEdit,
}: {
  surfaces: Surface[]; profById: Record<string, any>; resBySurface: Map<string, Reservation>;
  planById: Record<string, Plan>; stockItems: StockItem[]; plans: Plan[];
  mode: "non" | "att" | "conn"; onEdit: (s: Surface) => void;
}) {
  const qc = useQueryClient();

  const ensureReservation = async (s: Surface): Promise<Reservation> => {
    const existing = resBySurface.get(s.id);
    if (existing) return existing;
    const data = await createMaterialReservation({
      profile_id: s.fkUser ? Number(s.fkUser) : null,
      surface_id: Number(s.id),
      status: "nouvelle_demande",
    });
    return data as Reservation;
  };

  const confirmRes = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      const p = s.fkUser ? profById[s.fkUser] : null;
      const hasMat = !!r && (r.total_devices_price_dt ?? 0) > 0;
      const hasAbo = !!r?.subscription_plan_id || !!p?.type_abo;
      if (!hasMat)
        throw new Error("Ajoutez au moins un matériel à cette parcelle avant de confirmer.");
      if (!hasAbo)
        throw new Error("Ajoutez un abonnement à cette parcelle avant de confirmer.");

      // Le backend décrémente le stock et enregistre les mouvements lors du passage à "reserve"
      await updateMaterialReservation(r!.id, { status: "reserve" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["stock-items-all"] });
      toast({ title: "Réservation confirmée", description: "Stock décrémenté. La parcelle passe en attente d'installation." });
    },
    onError: (e: any) => toast({ title: "Action impossible", description: e.message, variant: "destructive" }),
  });

  const markConnected = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) throw new Error("Aucune réservation");
      const plan = r.subscription_plan_id ? planById[r.subscription_plan_id] : null;
      const subPrice = plan?.price_dt ?? 0;
      const total = subPrice + (r.total_devices_price_dt ?? 0);
      await createClientSale({
        profile_id: r.profile_id ? Number(r.profile_id) : null,
        reservation_id: Number(r.id),
        subscription_plan_id: r.subscription_plan_id ? Number(r.subscription_plan_id) : null,
        subscription_price_dt: subPrice,
        equipment_price_dt: r.total_devices_price_dt,
        total_dt: total,
        payment_method: "carte",
        status: "confirme",
        confirmed_at: new Date().toISOString(),
      });
      if (plan && r.profile_id) {
        const start = new Date(); const exp = new Date(); exp.setDate(exp.getDate() + (plan.duration_days || 30));
        await updateProfile(r.profile_id, {
          date_deb_abo: start.toISOString().slice(0, 10),
          date_exp_abo: exp.toISOString().slice(0, 10),
        });
      }
      await updateMaterialReservation(r.id, { status: "installe" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      qc.invalidateQueries({ queryKey: ["profiles-all"] });
      toast({ title: "Parcelle connectée ✓", description: "Vente créée dans le module Ventes." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const backToWaiting = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      await updateMaterialReservation(r.id, { status: "reserve" });
      await updateSurface(s.id, { isConnected: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      toast({ title: "Parcelle remise en attente" });
    },
  });

  const removeConnection = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      const items = await getReservationItemsByReservation(r.id);
      for (const it of items) {
        const cur = stockItems.find(si => String(si.id) === String(it.stock_item_id));
        const newQty = (cur?.quantity ?? 0) + it.quantity;
        await updateStockItem(String(it.stock_item_id), { quantity: newQty });
        await createStockMovement({
          stock_item_id: Number(it.stock_item_id),
          movement_type: "adjustment",
          quantity: it.quantity,
          reason: "Désinstallation parcelle — retour stock",
          reservation_id: Number(r.id),
        });
        await deleteReservationItem(String(it.id));
      }
      await updateMaterialReservation(r.id, { status: "nouvelle_demande", total_devices_price_dt: 0 });
      await updateSurface(s.id, { isConnected: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      qc.invalidateQueries({ queryKey: ["stock-items-all"] });
      toast({ title: "Parcelle déconnectée", description: "Le matériel est retourné au stock." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (m: "non" | "att" | "conn") => {
    if (m === "non") return <Badge variant="outline" className="bg-slate-500/15 text-slate-700 border-slate-300"><WifiOff className="h-3 w-3 mr-1" />Non Connectée</Badge>;
    if (m === "att") return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />En Attente</Badge>;
    return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300"><Wifi className="h-3 w-3 mr-1" />Connectée</Badge>;
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">
        {mode === "non" && "Parcelles Non Connectées — Ajouter du matériel & confirmer"}
        {mode === "att" && "Parcelles En Attente — Installation en cours"}
        {mode === "conn" && "Parcelles Connectées — Actives"}
      </CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Parcelle</TableHead><TableHead>Client</TableHead>
            <TableHead>Matériel</TableHead><TableHead>Abonnement</TableHead>
            <TableHead>Total</TableHead><TableHead>Statut</TableHead>
            <TableHead className="w-72">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {surfaces.map(s => {
              const r = resBySurface.get(s.id);
              const p = s.fkUser ? profById[s.fkUser] : null;
              const plan = r?.subscription_plan_id ? planById[r.subscription_plan_id] : null;
              const aboPlan = plan ?? (p?.type_abo ? plans.find(pl => pl.name === p.type_abo) : null);
              const subPrice = aboPlan?.price_dt ?? 0;
              const matPrice = r?.total_devices_price_dt ?? 0;
              const total = subPrice + matPrice;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" />{s.nomSurface}</div>
                    <div className="text-xs text-muted-foreground">{s.localisation || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "—"}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{DT(matPrice)}</TableCell>
                  <TableCell className="text-sm">
                    {aboPlan?.name
                      ? <div><span className="font-medium">{aboPlan.name}</span><div className="text-xs text-muted-foreground">{DT(subPrice)}</div></div>
                      : p?.type_abo
                        ? <div><span className="font-medium">{p.type_abo}</span>{p.date_exp_abo && <div className="text-xs text-muted-foreground">exp. {p.date_exp_abo}</div>}</div>
                        : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{total > 0 ? DT(total) : "—"}</TableCell>
                  <TableCell>{statusBadge(mode)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => onEdit(s)}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                      {mode === "non" && (
                        <Button size="sm" onClick={() => confirmRes.mutate(s)} disabled={confirmRes.isPending}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Confirmer
                        </Button>
                      )}
                      {mode === "att" && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markConnected.mutate(s)} disabled={markConnected.isPending || !r?.subscription_plan_id}>
                          <Wifi className="h-3 w-3 mr-1" />Connecter
                        </Button>
                      )}
                      {mode === "conn" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => backToWaiting.mutate(s)}><RotateCcw className="h-3 w-3 mr-1" />En attente</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Désinstaller cette parcelle ? Le matériel revient au stock.")) removeConnection.mutate(s); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {surfaces.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucune parcelle dans cette catégorie</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ============ EDIT DIALOG ============ */
function ParcelleEditDialog({
  surface, reservation, profile, stockItems, plans, onClose,
}: {
  surface: Surface | null; reservation: Reservation | null; profile: any;
  stockItems: StockItem[]; plans: Plan[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [addItem, setAddItem] = useState<{ stock_item_id: string; quantity: number }>({ stock_item_id: "", quantity: 1 });
  // Track reservation ID internally so items show immediately after first add
  const [internalResId, setInternalResId] = useState<string | null>(null);
  const currentResId = internalResId ?? (reservation?.id != null ? String(reservation.id) : null);

  const stockById = useMemo(() => Object.fromEntries(stockItems.map(s => [String(s.id), s])), [stockItems]);

  const hasActiveSub = !!profile?.date_exp_abo;
  const selectedPlan = plans.find((p: any) => p.id === planId);
  const baseAbo = selectedPlan?.price_dt ?? 0;
  const discount = hasActiveSub ? baseAbo * 0.1 : 0;
  const finalAbo = baseAbo - discount;

  const { data: items = [], refetch: refetchItems } = useQuery<ResItem[]>({
    queryKey: ["reservation-items", currentResId],
    queryFn: () => currentResId ? getReservationItemsByReservation(currentResId) : Promise.resolve([]),
    enabled: !!currentResId,
  });

  useEffect(() => {
    // Reset internal state when dialog surface changes
    setInternalResId(null);
    if (reservation) { setPlanId(String(reservation.subscription_plan_id ?? "")); setNotes(reservation.notes ?? ""); }
    else { setPlanId(""); setNotes(""); }
  }, [surface?.id]);

  const ensureReservation = async (): Promise<string> => {
    if (currentResId) return currentResId;
    if (!surface) throw new Error("Aucune parcelle");
    const data = await createMaterialReservation({
      profile_id: surface.fkUser ? Number(surface.fkUser) : null,
      surface_id: Number(surface.id),
      status: "nouvelle_demande",
    });
    const rid = String(data.id);
    setInternalResId(rid);
    qc.invalidateQueries({ queryKey: ["reservations-all"] });
    return rid;
  };

  const recalcTotal = async (rid: string) => {
    const latest = await getReservationItemsByReservation(rid);
    const t = latest.reduce((s: number, i: any) => s + i.quantity * i.unit_price_dt, 0);
    await updateMaterialReservation(rid, { total_devices_price_dt: t });
    qc.invalidateQueries({ queryKey: ["reservations-all"] });
  };

  const addMut = useMutation({
    mutationFn: async () => {
      if (!addItem.stock_item_id) return;
      const stock = stockById[addItem.stock_item_id];
      if (!stock) return;
      const rid = await ensureReservation();
      await createReservationItem({
        reservation_id: Number(rid),
        stock_item_id: Number(addItem.stock_item_id),
        quantity: addItem.quantity,
        unit_price_dt: stock.purchase_price_dt,
      });
      await recalcTotal(rid);
      return rid;
    },
    onSuccess: (rid) => {
      qc.invalidateQueries({ queryKey: ["reservation-items", rid] });
      setAddItem({ stock_item_id: "", quantity: 1 });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      await deleteReservationItem(id);
      if (currentResId) await recalcTotal(currentResId);
    },
    onSuccess: () => {
      if (currentResId) qc.invalidateQueries({ queryKey: ["reservation-items", currentResId] });
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const rid = await ensureReservation();
      // Recompute material total from actual items so the "Matériel" column reflects it
      const latest = await getReservationItemsByReservation(rid);
      const matTotal = latest.reduce((s: number, i: any) => s + i.quantity * i.unit_price_dt, 0);
      await updateMaterialReservation(rid, {
        subscription_plan_id: planId ? Number(planId) : null,
        notes,
        total_devices_price_dt: matTotal,
      });
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["reservations-all"] });
      toast({ title: "Enregistré" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const reabonner = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !selectedPlan) throw new Error("Sélectionnez un abonnement et un client");
      const start = new Date(); const exp = new Date(); exp.setDate(exp.getDate() + (selectedPlan.duration_days || 30));
      await createSubscriptionPayment({
        profile_id: Number(profile.id),
        plan_id: Number(selectedPlan.id),
        amount_dt: finalAbo,
        payment_method: "carte",
        status: "en_attente",
        date_start: start.toISOString().slice(0, 10),
        date_exp: exp.toISOString().slice(0, 10),
      });
    },
    onSuccess: () => toast({ title: "Réabonnement créé", description: `Montant: ${DT(finalAbo)}${hasActiveSub ? " (remise 10% appliquée)" : ""}. À valider dans Finance.` }),
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (!surface) return null;

  return (
    <Dialog open={!!surface} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {surface.nomSurface}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedPlan ? (
            <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="text-sm font-medium text-primary mb-2">Abonnement</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{selectedPlan.name}</span>
                <span className="font-semibold">{DT(selectedPlan.price_dt)}</span>
              </div>
            </div>
          ) : profile?.type_abo ? (
            <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="text-sm font-medium text-primary mb-2">Abonnement</div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{profile.type_abo}</span>
                {profile.date_exp_abo && <span className="text-xs text-muted-foreground">exp. {profile.date_exp_abo}</span>}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">Aucun abonnement</div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/40 rounded-lg">
            <div><UserIcon className="h-3 w-3 inline mr-1 text-muted-foreground" />{profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "—"}</div>
            <div><MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />{surface.localisation || "—"}</div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="border rounded-lg">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-semibold text-sm">Matériel</h4>
              <div className="text-sm">Total : <span className="font-bold text-primary">{DT(items.reduce((a, i) => a + i.quantity * i.unit_price_dt, 0))}</span></div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Appareil</TableHead><TableHead>Qté</TableHead><TableHead>PU</TableHead><TableHead>Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(i => {
                  const s = stockById[String(i.stock_item_id)];
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{s?.name ?? "—"}</TableCell>
                      <TableCell>{i.quantity}</TableCell>
                      <TableCell>{DT(i.unit_price_dt)}</TableCell>
                      <TableCell className="font-semibold">{DT(i.quantity * i.unit_price_dt)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => delItem.mutate(String(i.id))}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">Aucun appareil</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="p-3 border-t bg-muted/20 flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Appareil</Label>
                <Select value={addItem.stock_item_id} onValueChange={v => setAddItem({ ...addItem, stock_item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {stockItems.filter(s => s.quantity > 0).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} (stock: {s.quantity}) — {DT(s.purchase_price_dt)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label className="text-xs">Qté</Label>
                <Input type="number" min="1" value={addItem.quantity} onChange={e => setAddItem({ ...addItem, quantity: +e.target.value })} />
              </div>
              <Button size="sm" onClick={() => addMut.mutate()} disabled={!addItem.stock_item_id || addMut.isPending}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-primary hover:bg-primary/90">
            {saveMut.isPending ? "Confirmation..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
