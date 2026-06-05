import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

type Reservation = {
  id: string; profile_id: string | null; surface_id: string | null;
  subscription_plan_id: string | null; status: string; notes: string | null;
  total_devices_price_dt: number; created_at: string; created_by: string | null;
};
type Surface = { id: string; nom_surface: string; localisation: string; fk_user: string | null; is_connected: boolean; created_at: string };
type StockItem = { id: string; name: string; quantity: number; purchase_price_dt: number; category: string };
type ResItem = { id: string; reservation_id: string; stock_item_id: string; quantity: number; unit_price_dt: number };
type Plan = { id: string; name: string; price_dt: number; duration_days: number };

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;

export default function ReservationMaterielPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isSousAdmin = profile?.user_role === "SOUS_ADMIN";
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("non");

  useEffect(() => {
    const ch = supabase.channel("res-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "material_reservations" }, () => { qc.invalidateQueries({ queryKey: ["reservations-all"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_items" }, () => qc.invalidateQueries({ queryKey: ["reservation-items"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "surfaces" }, () => qc.invalidateQueries({ queryKey: ["surfaces-all"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items" }, () => qc.invalidateQueries({ queryKey: ["stock-items-all"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["reservations-all"],
    queryFn: async () => (await supabase.from("material_reservations").select("*").order("created_at", { ascending: false })).data as any || [],
  });
  const { data: surfaces = [] } = useQuery<Surface[]>({
    queryKey: ["surfaces-all"],
    queryFn: async () => (await supabase.from("surfaces").select("id,nom_surface,localisation,fk_user,is_connected,created_at").limit(2000)).data as any || [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("id,first_name,last_name,email,date_exp_abo,type_abo,created_by")).data as any || [],
  });
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans-active"],
    queryFn: async () => (await supabase.from("subscription_plans").select("id,name,price_dt,duration_days").eq("active", true)).data as any || [],
  });
  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ["stock-items-all"],
    queryFn: async () => (await supabase.from("stock_items").select("id,name,quantity,purchase_price_dt,category")).data as any || [],
  });

  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);

  // SOUS_ADMIN filtering: only see surfaces of their clients
  const visibleProfileIds = useMemo(() => {
    if (!isSousAdmin || !profile?.id) return null;
    const s = new Set<string>([profile.id]);
    profiles.forEach((p: any) => { if (p.created_by === profile.id) s.add(p.id); });
    return s;
  }, [isSousAdmin, profile, profiles]);

  const visibleSurfaces = useMemo(() => {
    if (!visibleProfileIds) return surfaces;
    return surfaces.filter(s => s.fk_user && visibleProfileIds.has(s.fk_user));
  }, [surfaces, visibleProfileIds]);

  // Latest reservation per surface
  const resBySurface = useMemo(() => {
    const m = new Map<string, Reservation>();
    for (const r of reservations) {
      if (!r.surface_id) continue;
      if (!m.has(r.surface_id)) m.set(r.surface_id, r); // already sorted desc
    }
    return m;
  }, [reservations]);

  // Bucketize surfaces
  const buckets = useMemo(() => {
    const nonConn: Surface[] = [];
    const enAtt: Surface[] = [];
    const conn: Surface[] = [];
    for (const s of visibleSurfaces) {
      const r = resBySurface.get(s.id);
      const st = r?.status;
      if (s.is_connected || st === "installe") {
        conn.push(s);
      } else if (st === "reserve" || st === "confirme") {
        enAtt.push(s);
      } else {
        nonConn.push(s);
      }
    }
    const filter = (arr: Surface[]) => arr.filter(s => {
      if (!search) return true;
      const p = s.fk_user ? profById[s.fk_user] : null;
      const hay = `${s.nom_surface} ${s.localisation} ${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
    return { nonConn: filter(nonConn), enAtt: filter(enAtt), conn: filter(conn) };
  }, [visibleSurfaces, resBySurface, search, profById]);

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
        profile={editSurface?.fk_user ? profById[editSurface.fk_user] : null}
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
    const { data, error } = await supabase.from("material_reservations").insert({
      profile_id: s.fk_user, surface_id: s.id, status: "nouvelle_demande",
    }).select("*").single();
    if (error) throw error;
    return data as any;
  };

  // CONFIRMER RESERVATION (non -> att) : sets status='reserve' -> trigger decrements stock
  const confirmRes = useMutation({
    mutationFn: async (s: Surface) => {
      const r = await ensureReservation(s);
      const { data: items } = await supabase.from("reservation_items").select("id").eq("reservation_id", r.id);
      if (!items || items.length === 0) throw new Error("Ajoutez au moins un matériel à cette parcelle avant de confirmer.");
      const { error } = await supabase.from("material_reservations").update({ status: "reserve" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["stock-items-all"] });
      toast({ title: "Réservation confirmée", description: "Stock décrémenté. La parcelle passe en attente d'installation." });
    },
    onError: (e: any) => toast({ title: "Action impossible", description: e.message, variant: "destructive" }),
  });

  // PASSER A CONNECTÉE (att -> conn) : status='installe' -> trigger updates surface.is_connected, also creates client_sale
  const markConnected = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) throw new Error("Aucune réservation");
      const plan = r.subscription_plan_id ? planById[r.subscription_plan_id] : null;
      const subPrice = plan?.price_dt ?? 0;
      const total = subPrice + (r.total_devices_price_dt ?? 0);
      // Create sale (integration Ventes)
      await supabase.from("client_sales").insert({
        profile_id: r.profile_id, reservation_id: r.id, subscription_plan_id: r.subscription_plan_id,
        subscription_price_dt: subPrice, equipment_price_dt: r.total_devices_price_dt,
        total_dt: total, payment_method: "carte", status: "confirme", confirmed_at: new Date().toISOString(),
      });
      // Update subscription dates on profile
      if (plan && r.profile_id) {
        const start = new Date(); const exp = new Date(); exp.setDate(exp.getDate() + (plan.duration_days || 30));
        await supabase.from("profiles").update({
          date_deb_abo: start.toISOString().slice(0, 10), date_exp_abo: exp.toISOString().slice(0, 10),
        }).eq("id", r.profile_id);
      }
      const { error } = await supabase.from("material_reservations").update({ status: "installe" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      qc.invalidateQueries({ queryKey: ["profiles-all"] });
      toast({ title: "Parcelle connectée ✓", description: "Vente créée dans le module Ventes." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // RETOUR EN ATTENTE (conn -> att)
  const backToWaiting = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      const { error } = await supabase.from("material_reservations").update({ status: "reserve" }).eq("id", r.id);
      if (error) throw error;
      await supabase.from("surfaces").update({ is_connected: false }).eq("id", s.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      toast({ title: "Parcelle remise en attente" });
    },
  });

  // SUPPRESSION (conn -> non) : retour matériel au stock + reset
  const removeConnection = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      const { data: items } = await supabase.from("reservation_items").select("stock_item_id,quantity").eq("reservation_id", r.id);
      for (const it of items ?? []) {
        const cur = await supabase.from("stock_items").select("quantity").eq("id", it.stock_item_id).single();
        const newQty = (cur.data?.quantity ?? 0) + it.quantity;
        await supabase.from("stock_items").update({ quantity: newQty }).eq("id", it.stock_item_id);
        await supabase.from("stock_movements").insert({
          stock_item_id: it.stock_item_id, movement_type: "adjustment", quantity: it.quantity,
          reason: "Désinstallation parcelle — retour stock", reservation_id: r.id,
        });
      }
      await supabase.from("reservation_items").delete().eq("reservation_id", r.id);
      await supabase.from("material_reservations").update({ status: "nouvelle_demande", total_devices_price_dt: 0 }).eq("id", r.id);
      await supabase.from("surfaces").update({ is_connected: false }).eq("id", s.id);
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
              const p = s.fk_user ? profById[s.fk_user] : null;
              const plan = r?.subscription_plan_id ? planById[r.subscription_plan_id] : null;
              const subPrice = plan?.price_dt ?? 0;
              const total = subPrice + (r?.total_devices_price_dt ?? 0);
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" />{s.nom_surface}</div>
                    <div className="text-xs text-muted-foreground">{s.localisation || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "—"}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r?.total_devices_price_dt ? DT(r.total_devices_price_dt) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{plan?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
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

  const stockById = useMemo(() => Object.fromEntries(stockItems.map(s => [s.id, s])), [stockItems]);

  // Renewal discount logic: 10% if user already has an active/past subscription
  const hasActiveSub = !!profile?.date_exp_abo;
  const selectedPlan = plans.find(p => p.id === planId);
  const baseAbo = selectedPlan?.price_dt ?? 0;
  const discount = hasActiveSub ? baseAbo * 0.1 : 0;
  const finalAbo = baseAbo - discount;

  const { data: items = [] } = useQuery<ResItem[]>({
    queryKey: ["reservation-items", reservation?.id],
    queryFn: async () => {
      if (!reservation) return [];
      return (await supabase.from("reservation_items").select("*").eq("reservation_id", reservation.id)).data as any || [];
    },
    enabled: !!reservation,
  });

  useEffect(() => {
    if (reservation) { setPlanId(reservation.subscription_plan_id ?? ""); setNotes(reservation.notes ?? ""); }
    else { setPlanId(""); setNotes(""); }
  }, [reservation]);

  const ensureReservation = async (): Promise<string> => {
    if (reservation) return reservation.id;
    if (!surface) throw new Error("Aucune parcelle");
    const { data, error } = await supabase.from("material_reservations").insert({
      profile_id: surface.fk_user, surface_id: surface.id, status: "nouvelle_demande",
    }).select("id").single();
    if (error) throw error;
    return data!.id;
  };

  const recalcTotal = async (rid: string) => {
    const { data } = await supabase.from("reservation_items").select("quantity,unit_price_dt").eq("reservation_id", rid);
    const t = (data ?? []).reduce((s: number, i: any) => s + i.quantity * i.unit_price_dt, 0);
    await supabase.from("material_reservations").update({ total_devices_price_dt: t }).eq("id", rid);
    qc.invalidateQueries({ queryKey: ["reservations-all"] });
  };

  const addMut = useMutation({
    mutationFn: async () => {
      if (!addItem.stock_item_id) return;
      const stock = stockById[addItem.stock_item_id];
      if (!stock) return;
      const rid = await ensureReservation();
      const { error } = await supabase.from("reservation_items").insert({
        reservation_id: rid, stock_item_id: addItem.stock_item_id,
        quantity: addItem.quantity, unit_price_dt: stock.purchase_price_dt,
      });
      if (error) throw error;
      await recalcTotal(rid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation-items"] });
      setAddItem({ stock_item_id: "", quantity: 1 });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservation_items").delete().eq("id", id);
      if (error) throw error;
      if (reservation) await recalcTotal(reservation.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservation-items"] }),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const rid = await ensureReservation();
      const { error } = await supabase.from("material_reservations").update({
        subscription_plan_id: planId || null, notes,
      }).eq("id", rid);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reservations-all"] }); toast({ title: "Enregistré" }); },
  });

  // RÉABONNER: create a subscription_payment with discounted amount
  const reabonner = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !selectedPlan) throw new Error("Sélectionnez un abonnement et un client");
      const start = new Date(); const exp = new Date(); exp.setDate(exp.getDate() + (selectedPlan.duration_days || 30));
      const { error } = await supabase.from("subscription_payments").insert({
        profile_id: profile.id, plan_id: selectedPlan.id,
        amount_dt: finalAbo, payment_method: "carte", status: "en_attente",
        date_start: start.toISOString().slice(0, 10), date_exp: exp.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Réabonnement créé", description: `Montant: ${DT(finalAbo)}${hasActiveSub ? " (remise 10% appliquée)" : ""}. À valider dans Finance.` }),
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (!surface) return null;

  return (
    <Dialog open={!!surface} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {surface.nom_surface}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/40 rounded-lg">
            <div><UserIcon className="h-3 w-3 inline mr-1 text-muted-foreground" />{profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "—"}</div>
            <div><MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />{surface.localisation || "—"}</div>
          </div>

          <div>
            <Label>Abonnement (Finance/Abonnements)</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un abonnement" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {DT(p.price_dt)} / {p.duration_days}j</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <div className="mt-2 p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Prix de l'abonnement</span>
                  <span className={hasActiveSub ? "line-through text-muted-foreground" : "font-semibold"}>{DT(baseAbo)}</span>
                </div>
                {hasActiveSub && (
                  <>
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Remise réabonnement (-10%)</span>
                      <span>-{DT(discount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-bold text-primary border-t mt-2 pt-2">
                      <span>Nouveau prix</span><span>{DT(finalAbo)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Enregistrer</Button>
            <Button size="sm" variant="outline" onClick={() => reabonner.mutate()} disabled={!selectedPlan || !profile} className="border-primary text-primary hover:bg-primary/10">
              <Sparkles className="h-3 w-3 mr-1" /> Réabonner {hasActiveSub && "(−10%)"}
            </Button>
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
                  const s = stockById[i.stock_item_id];
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{s?.name ?? "—"}</TableCell>
                      <TableCell>{i.quantity}</TableCell>
                      <TableCell>{DT(i.unit_price_dt)}</TableCell>
                      <TableCell className="font-semibold">{DT(i.quantity * i.unit_price_dt)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => delItem.mutate(i.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
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
                    {stockItems.filter(s => s.quantity > 0).map(s => <SelectItem key={s.id} value={s.id}>{s.name} (stock: {s.quantity}) — {DT(s.purchase_price_dt)}</SelectItem>)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
