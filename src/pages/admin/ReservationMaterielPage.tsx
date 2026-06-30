import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Trash2, MapPin, User as UserIcon, Search, CheckCircle2, XCircle, RotateCcw, Wifi, WifiOff, Clock, Pencil, Sparkles, CreditCard, Package, AlertTriangle, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getSurfaces, updateSurface,
  getProfiles,
  getSubscriptionPlans,
  getStockItems, updateStockItem, createStockMovement,
  getMaterialReservations, createMaterialReservation, updateMaterialReservation,
  getReservationItemsByReservation, createReservationItem, deleteReservationItem,
  getClientSales, createClientSale,
  createSubscriptionPayment, updateProfile,
} from "@/services/data-service";
import type { Surface } from "@/types/models";
import { DT } from "@/lib/format";

type Reservation = {
  id: string; profile_id: string | null; surface_id: string | null;
  subscription_plan_id: string | null; status: string; notes: string | null;
  total_devices_price_dt: number; created_at: string; created_by: string | null;
};
type StockItem = { id: string; name: string; quantity: number; purchase_price_dt: number; category: string };
type ResItem = { id: string; reservation_id: string; stock_item_id: string; quantity: number; unit_price_dt: number };
type Plan = { id: string; name: string; price_dt: number; duration_days: number };

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
  const { data: clientSales = [] } = useQuery<any[]>({
    queryKey: ["client-sales"],
    queryFn: getClientSales,
    refetchInterval: 10000,
  });

  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p: any) => [p.id, p])), [plans]);

  // Réservations dont l'appareillage est déjà payé (vente client confirmée).
  const salesByRes = useMemo(
    () => new Set(
      clientSales
        .filter((s) => s.reservation_id != null && s.status === "confirme")
        .map((s) => String(s.reservation_id)),
    ),
    [clientSales],
  );

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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> Réservation Matériel</h2>
        <p className="text-sm text-muted-foreground">Workflow professionnel : Non Connectées → En Attente → Connectées</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="non" className="gap-2"><WifiOff className="h-4 w-4" /> Non Connectées <Badge variant="secondary" className="ml-1">{buckets.nonConn.length}</Badge></TabsTrigger>
          <TabsTrigger value="att" className="gap-2"><Clock className="h-4 w-4" /> En Attente <Badge variant="secondary" className="ml-1">{buckets.enAtt.length}</Badge></TabsTrigger>
          <TabsTrigger value="conn" className="gap-2"><Wifi className="h-4 w-4" /> Connectées <Badge variant="secondary" className="ml-1">{buckets.conn.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="non" className="mt-4">
          <SurfaceTable surfaces={buckets.nonConn} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} salesByRes={salesByRes} search={search} setSearch={setSearch} mode="non" onEdit={setEditSurface} />
        </TabsContent>
        <TabsContent value="att" className="mt-4">
          <SurfaceTable surfaces={buckets.enAtt} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} salesByRes={salesByRes} search={search} setSearch={setSearch} mode="att" onEdit={setEditSurface} />
        </TabsContent>
        <TabsContent value="conn" className="mt-4">
          <SurfaceTable surfaces={buckets.conn} profById={profById} resBySurface={resBySurface} planById={planById} stockItems={stockItems} plans={plans} salesByRes={salesByRes} search={search} setSearch={setSearch} mode="conn" onEdit={setEditSurface} />
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
  surfaces, profById, resBySurface, planById, stockItems, plans, salesByRes, search, setSearch, mode, onEdit,
}: {
  surfaces: Surface[]; profById: Record<string, any>; resBySurface: Map<string, Reservation>;
  planById: Record<string, Plan>; stockItems: StockItem[]; plans: Plan[]; salesByRes: Set<string>;
  search: string; setSearch: (v: string) => void;
  mode: "non" | "att" | "conn"; onEdit: (s: Surface) => void;
}) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  // Parcelle en cours de retour "en attente" + cause sélectionnée (dialog).
  const [returnFor, setReturnFor] = useState<Surface | null>(null);
  const [returnReason, setReturnReason] = useState("Panne");

  // Dialog de paiement d'abonnement (déclenché par « Passer au paiement »).
  const [payFor, setPayFor] = useState<Surface | null>(null);
  const [payForm, setPayForm] = useState({
    planId: "", planName: "", amount: 0, method: "especes", dateStart: "", dateExp: "",
  });

  const todayIso = () => new Date().toISOString().slice(0, 10);
  const addDaysIso = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + (days || 30));
    return d.toISOString().slice(0, 10);
  };

  // Ouvre le dialog en pré-remplissant tout depuis l'abonnement choisi du client.
  const openPay = (s: Surface) => {
    const p = s.fkUser ? profById[s.fkUser] : null;
    const plan = p?.type_abo ? plans.find((pl) => pl.name === p.type_abo) : undefined;
    const start = p?.date_deb_abo || todayIso();
    setPayForm({
      planId: plan ? String(plan.id) : "",
      planName: p?.type_abo ?? "—",
      amount: plan ? Number(plan.price_dt) : 0,
      method: "especes",
      dateStart: start,
      dateExp: plan ? addDaysIso(start, plan.duration_days) : (p?.date_exp_abo || ""),
    });
    setPayFor(s);
  };

  // Choix / changement du plan directement dans le dialog (cas « pas d'abonnement »).
  const pickPlanInPay = (planId: string) => {
    const plan = plans.find((pl) => String(pl.id) === planId);
    setPayForm((f) => plan
      ? { ...f, planId, planName: plan.name, amount: Number(plan.price_dt), dateExp: addDaysIso(f.dateStart || todayIso(), plan.duration_days) }
      : { ...f, planId: "", planName: "—", amount: 0 });
  };

  // Abonnement client actif (payé) ?
  const isSubActive = (s: Surface) => {
    const p = s.fkUser ? profById[s.fkUser] : null;
    return !!p?.date_exp_abo && new Date(p.date_exp_abo).getTime() > Date.now();
  };

  const payClient = payFor?.fkUser ? profById[payFor.fkUser] : null;

  const payMut = useMutation({
    mutationFn: async ({ s, status }: { s: Surface; status: "valide" | "refuse" }) => {
      if (!payForm.planId) throw new Error("Aucun plan d'abonnement associé à ce client.");
      const p = s.fkUser ? profById[s.fkUser] : null;
      await createSubscriptionPayment({
        profile_id: p ? Number(p.id) : null,
        plan_id: Number(payForm.planId),
        amount_dt: Number(payForm.amount),
        payment_method: payForm.method,
        status,
        date_start: payForm.dateStart || null,
        date_exp: payForm.dateExp || null,
        validated_by: profile?.id ? Number(profile.id) : undefined,
        validated_at: new Date().toISOString(),
      });
      // Accepté → on active l'abonnement du client (type + dates posés sur le profil).
      if (status === "valide" && p) {
        await updateProfile(String(p.id), {
          type_abo: payForm.planName && payForm.planName !== "—" ? payForm.planName : undefined,
          date_deb_abo: payForm.dateStart || undefined,
          date_exp_abo: payForm.dateExp || undefined,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["profiles-all"] });
      qc.invalidateQueries({ queryKey: ["subpays"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      setPayFor(null);
      toast({
        title: vars.status === "valide" ? "Paiement accepté" : "Paiement refusé",
        description: vars.status === "valide" ? "Abonnement activé. La parcelle peut être connectée." : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ── Paiement appareillage (matériels) ──────────────────────────────────────
  const [payMatFor, setPayMatFor] = useState<Surface | null>(null);
  const [matMethod, setMatMethod] = useState("carte");

  // Cause active d'un retour en attente (panne, etc.), lue depuis les notes de
  // la réservation. Null si aucune cause ou si la dernière action est « Corrigé ».
  const ISSUE_PREFIX = "Retour en attente:";
  const FIXED_PREFIX = "Corrigé";
  const activeIssue = (r?: Reservation | null): string | null => {
    if (!r?.notes) return null;
    const parts = r.notes.split("|").map((x) => x.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i];
      if (seg.startsWith(FIXED_PREFIX)) return null;
      if (seg.startsWith(ISSUE_PREFIX))
        return seg.slice(ISSUE_PREFIX.length).replace(/\s*\([^)]*\)\s*$/, "").trim();
    }
    return null;
  };

  // Appareillage payé ? (vente client confirmée pour cette réservation)
  const equipmentPaid = (s: Surface) => {
    const r = resBySurface.get(s.id);
    if (!r) return false;
    if ((r.total_devices_price_dt ?? 0) <= 0) return true; // rien à facturer
    return salesByRes.has(String(r.id));
  };

  const payMatRes = payMatFor ? resBySurface.get(payMatFor.id) ?? null : null;
  const payMatClient = payMatFor?.fkUser ? profById[payMatFor.fkUser] : null;

  const { data: matItems = [] } = useQuery<ResItem[]>({
    queryKey: ["res-items-pay", payMatRes?.id],
    queryFn: () => getReservationItemsByReservation(payMatRes!.id),
    enabled: !!payMatRes,
  });

  const openPayMat = (s: Surface) => { setMatMethod("carte"); setPayMatFor(s); };

  const payMatMut = useMutation({
    mutationFn: async ({ s, status }: { s: Surface; status: "confirme" | "refuse" }) => {
      const r = resBySurface.get(s.id);
      if (!r) throw new Error("Aucune réservation");
      await createClientSale({
        profile_id: r.profile_id ? Number(r.profile_id) : null,
        reservation_id: Number(r.id),
        subscription_plan_id: null,
        subscription_price_dt: 0,
        equipment_price_dt: r.total_devices_price_dt,
        total_dt: r.total_devices_price_dt,
        payment_method: matMethod,
        status,
        confirmed_at: status === "confirme" ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-sales"] });
      setPayMatFor(null);
      toast({
        title: vars.status === "confirme" ? "Paiement appareillage accepté" : "Paiement appareillage refusé",
        description: vars.status === "confirme" ? "La parcelle peut être connectée." : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

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
      const hasMat = !!r && (r.total_devices_price_dt ?? 0) > 0;
      if (!hasMat)
        throw new Error("Ajoutez au moins un matériel à cette parcelle avant de confirmer.");

      // Réservation = appareillage uniquement. L'abonnement est un flux séparé
      // (Finance → paiement d'abonnement). Le backend décrémente le stock au passage à "reserve".
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
      // Incident non corrigé → reconnexion bloquée.
      const issue = activeIssue(r);
      if (issue)
        throw new Error(`Incident « ${issue} » non corrigé : marquez-le corrigé avant de reconnecter.`);
      const p = s.fkUser ? profById[s.fkUser] : null;
      // Activation du service conditionnée à un abonnement client ACTIF (payé).
      const subActive = !!p?.date_exp_abo && new Date(p.date_exp_abo).getTime() > Date.now();
      if (!subActive)
        throw new Error("Abonnement inactif : le client doit régler son abonnement avant l'activation du service.");
      // L'appareillage doit être payé (vente confirmée) avant la connexion.
      if (!equipmentPaid(s))
        throw new Error("Appareillage non payé : enregistrez le paiement des matériels avant la connexion.");

      // La vente d'appareillage est enregistrée à l'étape « paiement matériels ».
      await updateMaterialReservation(r.id, { status: "installe" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      toast({ title: "Parcelle connectée ✓", description: "La parcelle est désormais active." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const backToWaiting = useMutation({
    mutationFn: async ({ s, reason }: { s: Surface; reason: string }) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      const stamp = new Date().toLocaleDateString("fr-FR");
      const note = `Retour en attente: ${reason} (${stamp})`;
      const notes = [r.notes, note].filter(Boolean).join(" | ");
      await updateMaterialReservation(r.id, { status: "reserve", notes });
      await updateSurface(s.id, { isConnected: false });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      qc.invalidateQueries({ queryKey: ["surfaces-all"] });
      setReturnFor(null);
      toast({ title: "Parcelle remise en attente", description: `Cause : ${vars.reason}` });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Marquer l'incident corrigé → débloque la connexion (ajoute un marqueur « Corrigé »).
  const markFixed = useMutation({
    mutationFn: async (s: Surface) => {
      const r = resBySurface.get(s.id);
      if (!r) return;
      const stamp = new Date().toLocaleDateString("fr-FR");
      const notes = [r.notes, `${FIXED_PREFIX} (${stamp})`].filter(Boolean).join(" | ");
      await updateMaterialReservation(r.id, { notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-all"] });
      toast({ title: "Incident corrigé", description: "La parcelle peut être reconnectée." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
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

  // Client a-t-il choisi un abonnement (type_abo renseigné) ?
  const hasSub = (s: Surface) => {
    const p = s.fkUser ? profById[s.fkUser] : null;
    return !!p?.type_abo;
  };

  // Statut explicite : connectée, pas d'abonnement, en attente de paiement (abo),
  // paiement appareillage (abo payé, matériel non payé), de confirmation (tout payé).
  const statusBadge = (m: "non" | "att" | "conn", subActive: boolean, clientHasSub: boolean, equipPaid: boolean, hasMaterial: boolean, issue: string | null) => {
    if (m === "conn")
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300"><Wifi className="h-3 w-3 mr-1" />Connectée</Badge>;
    if (m === "non") {
      if (!hasMaterial)
        return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300"><Package className="h-3 w-3 mr-1" />Sélectionne matériels</Badge>;
      return <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-300"><CheckCircle2 className="h-3 w-3 mr-1" />Prêt à confirmer</Badge>;
    }
    // Incident en cours (retour en attente non corrigé) → priorité sur tout le reste.
    if (issue)
      return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />{issue === "Panne" ? "En panne" : issue}</Badge>;
    if (!subActive) {
      if (!clientHasSub)
        return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Pas d'abonnement</Badge>;
      return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300"><CreditCard className="h-3 w-3 mr-1" />En attente de paiement</Badge>;
    }
    if (!equipPaid)
      return <Badge variant="outline" className="bg-purple-500/15 text-purple-700 border-purple-300"><Package className="h-3 w-3 mr-1" />Paiement appareillage</Badge>;
    return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />En attente de confirmation</Badge>;
  };

  const { sorted, sort } = useTableSort(surfaces, {
    parcelle: (s) => s.nomSurface,
    client: (s) => {
      const p = s.fkUser ? profById[s.fkUser] : null;
      return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : null;
    },
  });

  return (
    <>
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">
          {mode === "non" && "Parcelles Non Connectées — Ajouter du matériel & confirmer"}
          {mode === "att" && "Parcelles En Attente — Installation en cours"}
          {mode === "conn" && "Parcelles Connectées — Actives"}
        </CardTitle>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher client, parcelle..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <SortableHead field="parcelle" sort={sort}>Parcelle</SortableHead><SortableHead field="client" sort={sort}>Client</SortableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-72">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {sorted.map(s => {
              const p = s.fkUser ? profById[s.fkUser] : null;
              const subActive = isSubActive(s);
              const clientHasSub = hasSub(s);
              const equipPaid = equipmentPaid(s);
              const r = resBySurface.get(s.id);
              const hasMaterial = !!r && (r.total_devices_price_dt ?? 0) > 0;
              const issue = activeIssue(r);
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
                  <TableCell>{statusBadge(mode, subActive, clientHasSub, equipPaid, hasMaterial, issue)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => onEdit(s)}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                      {mode === "non" && (
                        <Button size="sm" onClick={() => confirmRes.mutate(s)} disabled={confirmRes.isPending}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Confirmer
                        </Button>
                      )}
                      {mode === "att" && (issue ? (
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={() => markFixed.mutate(s)}
                          disabled={markFixed.isPending}
                          title={`Incident « ${issue} » — marquer corrigé pour autoriser la reconnexion`}
                        >
                          <Wrench className="h-3 w-3 mr-1" />Corrigé
                        </Button>
                      ) : !subActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className={clientHasSub
                            ? "border-orange-300 text-orange-700 hover:bg-orange-50"
                            : "border-red-300 text-red-700 hover:bg-red-50"}
                          onClick={() => openPay(s)}
                          title={clientHasSub
                            ? "Abonnement non payé — enregistrer le paiement"
                            : "Aucun abonnement — choisir un abonnement pour ce client"}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          {clientHasSub ? "Passer au paiement" : "Passer à l'abonnement"}
                        </Button>
                      ) : !equipPaid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => openPayMat(s)}
                          title="Appareillage non payé — enregistrer le paiement des matériels"
                        >
                          <Package className="h-3 w-3 mr-1" />Passer au paiement matériels
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => markConnected.mutate(s)}
                          disabled={markConnected.isPending}
                        >
                          <Wifi className="h-3 w-3 mr-1" />Connecter
                        </Button>
                      ))}
                      {mode === "conn" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setReturnReason("Panne"); setReturnFor(s); }}><RotateCcw className="h-3 w-3 mr-1" />En attente</Button>
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
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Aucune parcelle dans cette catégorie</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Cause du retour en attente (mode Connecté) */}
    <Dialog open={!!returnFor} onOpenChange={(o) => !o && setReturnFor(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remettre la parcelle en attente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Indiquez la cause du retour en attente pour « {returnFor?.nomSurface} ».
          </p>
          <div>
            <Label>Cause *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Panne">Panne</SelectItem>
                <SelectItem value="Problème d'installation">Problème d'installation</SelectItem>
                <SelectItem value="Retour d'appareillage">Retour d'appareillage</SelectItem>
                <SelectItem value="Demande client">Demande client</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReturnFor(null)}>Annuler</Button>
          <Button
            disabled={backToWaiting.isPending}
            onClick={() => returnFor && backToWaiting.mutate({ s: returnFor, reason: returnReason })}
          >
            <RotateCcw className="h-4 w-4 mr-1" />Confirmer le retour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Paiement d'abonnement (mode En Attente — « Passer au paiement ») */}
    <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {payForm.planId ? "Paiement d'abonnement" : "Choisir l'abonnement"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Utilisateur</Label>
              <p className="font-medium">
                {payClient ? `${payClient.first_name ?? ""} ${payClient.last_name ?? ""}`.trim() || payClient.email : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{payClient?.email}</p>
            </div>
            <div>
              <Label>Plan d'abonnement *</Label>
              <Select value={payForm.planId} onValueChange={pickPlanInPay}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un abonnement..." /></SelectTrigger>
                <SelectContent>
                  {plans.map((pl) => (
                    <SelectItem key={pl.id} value={String(pl.id)}>{pl.name} — {DT(pl.price_dt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Prix du plan</Label>
              <p className="font-semibold">{DT(payForm.amount)}</p>
            </div>
            <div>
              <Label>Méthode de paiement *</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="mobile">Paiement mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date début abonnement</Label>
              <Input type="date" value={payForm.dateStart}
                onChange={(e) => setPayForm({ ...payForm, dateStart: e.target.value })} />
            </div>
            <div>
              <Label>Date expiration</Label>
              <Input type="date" value={payForm.dateExp}
                onChange={(e) => setPayForm({ ...payForm, dateExp: e.target.value })} />
            </div>
          </div>
          {!payForm.planId && (
            <p className="text-xs text-muted-foreground">
              Ce client n'a pas encore d'abonnement. Sélectionnez un plan ci-dessus pour pouvoir accepter le paiement.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPayFor(null)}>Annuler</Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={payMut.isPending || !payForm.planId}
            onClick={() => payFor && payMut.mutate({ s: payFor, status: "refuse" })}
          >
            <XCircle className="h-4 w-4 mr-1" />Refuser
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={payMut.isPending || !payForm.planId}
            onClick={() => payFor && payMut.mutate({ s: payFor, status: "valide" })}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Paiement appareillage (mode En Attente — « Passer au paiement matériels ») */}
    <Dialog open={!!payMatFor} onOpenChange={(o) => !o && setPayMatFor(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Paiement appareillage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Utilisateur</Label>
              <p className="font-medium">
                {payMatClient ? `${payMatClient.first_name ?? ""} ${payMatClient.last_name ?? ""}`.trim() || payMatClient.email : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{payMatClient?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Parcelle</Label>
              <p className="font-medium">{payMatFor?.nomSurface ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{payMatFor?.localisation}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Matériel réservé</Label>
            <div className="rounded-md border divide-y mt-1 max-h-48 overflow-auto">
              {matItems.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Aucun détail de matériel.</p>
              )}
              {matItems.map((it) => {
                const si = stockItems.find((x) => String(x.id) === String(it.stock_item_id));
                return (
                  <div key={it.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span>{si?.name ?? `#${it.stock_item_id}`} <span className="text-xs text-muted-foreground">× {it.quantity}</span></span>
                    <span className="font-medium">{DT(it.unit_price_dt * it.quantity)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Total appareillage</Label>
              <p className="text-lg font-bold text-primary">{DT(payMatRes?.total_devices_price_dt ?? 0)}</p>
            </div>
            <div>
              <Label>Méthode de paiement *</Label>
              <Select value={matMethod} onValueChange={setMatMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="mobile">Paiement mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPayMatFor(null)}>Annuler</Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={payMatMut.isPending}
            onClick={() => payMatFor && payMatMut.mutate({ s: payMatFor, status: "refuse" })}
          >
            <XCircle className="h-4 w-4 mr-1" />Refuser
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={payMatMut.isPending}
            onClick={() => payMatFor && payMatMut.mutate({ s: payMatFor, status: "confirme" })}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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

  if (!surface) return null;

  return (
    <Dialog open={!!surface} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {surface.nomSurface}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
