import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Trash2, User as UserIcon, MapPin, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Reservation = {
  id: string;
  profile_id: string | null;
  surface_id: string | null;
  subscription_plan_id: string | null;
  status: string;
  notes: string | null;
  total_devices_price_dt: number;
  created_at: string;
};

type StockItem = { id: string; name: string; quantity: number; purchase_price_dt: number; category: string };
type ResItem = { id: string; reservation_id: string; stock_item_id: string; quantity: number; unit_price_dt: number };
type Plan = { id: string; name: string; price_dt: number };

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "nouvelle_demande", label: "Nouvelle Demande", color: "border-t-blue-500" },
  { id: "en_analyse", label: "En Analyse", color: "border-t-amber-500" },
  { id: "reserve", label: "Réservé", color: "border-t-purple-500" },
  { id: "confirme", label: "Confirmé", color: "border-t-emerald-500" },
  { id: "installe", label: "Installé", color: "border-t-gray-500" },
];

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;

export default function ReservationMaterielPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Reservation | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const ch = supabase.channel("res-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "material_reservations" }, () => qc.invalidateQueries({ queryKey: ["reservations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_items" }, () => qc.invalidateQueries({ queryKey: ["reservation-items"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["reservations"],
    queryFn: async () => (await supabase.from("material_reservations").select("*").order("created_at", { ascending: false })).data as any || [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("id,first_name,last_name,email")).data as any || [],
  });
  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);

  const { data: surfaces = [] } = useQuery({
    queryKey: ["surfaces-min"],
    queryFn: async () => (await supabase.from("surfaces").select("id,nom_surface").limit(1000)).data as any || [],
  });
  const surfById = useMemo(() => Object.fromEntries(surfaces.map((s: any) => [s.id, s])), [surfaces]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("material_reservations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      if (v.status === "reserve") toast({ title: "Stock décrémenté automatiquement" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const handleDragStart = (e: DragStartEvent) => {
    const r = reservations.find(r => r.id === e.active.id);
    setActive(r ?? null);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const newStatus = e.over?.id as string | undefined;
    const id = e.active.id as string;
    const r = reservations.find(r => r.id === id);
    if (!r || !newStatus || r.status === newStatus) return;
    updateStatus.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> Réservation Matériel</h2>
        <p className="text-sm text-muted-foreground">Pipeline Kanban — glisser-déposer pour changer le statut</p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const cards = reservations.filter(r => r.status === col.id);
            return (
              <KanbanColumn key={col.id} id={col.id} label={col.label} color={col.color} count={cards.length}>
                {cards.map(r => (
                  <KanbanCard key={r.id} reservation={r} profile={profById[r.profile_id ?? ""]} surface={surfById[r.surface_id ?? ""]} onClick={() => setDetail(r)} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
        <DragOverlay>
          {active && <KanbanCard reservation={active} profile={profById[active.profile_id ?? ""]} surface={surfById[active.surface_id ?? ""]} dragging />}
        </DragOverlay>
      </DndContext>

      <ReservationDetailDialog reservation={detail} onClose={() => setDetail(null)} profile={detail ? profById[detail.profile_id ?? ""] : null} surface={detail ? surfById[detail.surface_id ?? ""] : null} />
    </div>
  );
}

function KanbanColumn({ id, label, color, count, children }: { id: string; label: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`bg-muted/30 rounded-lg border-t-4 ${color} min-h-[400px] transition ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-muted/30 backdrop-blur z-10">
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="p-2 space-y-2">{children}</div>
    </div>
  );
}

function KanbanCard({ reservation, profile, surface, onClick, dragging }: { reservation: Reservation; profile?: any; surface?: any; onClick?: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: reservation.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick?.(); }}
      className={`cursor-grab active:cursor-grabbing transition shadow-sm hover:shadow-md ${isDragging || dragging ? "opacity-50" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "Client inconnu"}</span>
        </div>
        {surface && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{surface.nom_surface}</span></div>}
        {reservation.total_devices_price_dt > 0 && <div className="text-xs"><span className="text-muted-foreground">Total :</span> <span className="font-semibold text-primary">{DT(reservation.total_devices_price_dt)}</span></div>}
        <div className="text-[10px] text-muted-foreground">{new Date(reservation.created_at).toLocaleDateString("fr-FR")}</div>
      </CardContent>
    </Card>
  );
}

function ReservationDetailDialog({ reservation, onClose, profile, surface }: { reservation: Reservation | null; onClose: () => void; profile: any; surface: any }) {
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [addItem, setAddItem] = useState<{ stock_item_id: string; quantity: number }>({ stock_item_id: "", quantity: 1 });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans-min"],
    queryFn: async () => (await supabase.from("subscription_plans").select("id,name,price_dt").eq("active", true)).data as any || [],
  });
  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ["stock-items-min"],
    queryFn: async () => (await supabase.from("stock_items").select("id,name,quantity,purchase_price_dt,category")).data as any || [],
  });
  const { data: items = [] } = useQuery<ResItem[]>({
    queryKey: ["reservation-items", reservation?.id],
    queryFn: async () => {
      if (!reservation) return [];
      return (await supabase.from("reservation_items").select("*").eq("reservation_id", reservation.id)).data as any || [];
    },
    enabled: !!reservation,
  });
  const stockById = useMemo(() => Object.fromEntries(stockItems.map(s => [s.id, s])), [stockItems]);

  useEffect(() => {
    if (reservation) { setPlanId(reservation.subscription_plan_id ?? ""); setNotes(reservation.notes ?? ""); }
  }, [reservation]);

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price_dt, 0), [items]);

  const addItemMut = useMutation({
    mutationFn: async () => {
      if (!reservation || !addItem.stock_item_id) return;
      const stock = stockById[addItem.stock_item_id];
      if (!stock) return;
      const { error } = await supabase.from("reservation_items").insert({
        reservation_id: reservation.id,
        stock_item_id: addItem.stock_item_id,
        quantity: addItem.quantity,
        unit_price_dt: stock.purchase_price_dt,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await recalcTotal();
      qc.invalidateQueries({ queryKey: ["reservation-items"] });
      setAddItem({ stock_item_id: "", quantity: 1 });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reservation_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: async () => { await recalcTotal(); qc.invalidateQueries({ queryKey: ["reservation-items"] }); },
  });

  const recalcTotal = async () => {
    if (!reservation) return;
    const { data } = await supabase.from("reservation_items").select("quantity,unit_price_dt").eq("reservation_id", reservation.id);
    const t = (data ?? []).reduce((s: number, i: any) => s + i.quantity * i.unit_price_dt, 0);
    await supabase.from("material_reservations").update({ total_devices_price_dt: t }).eq("id", reservation.id);
    qc.invalidateQueries({ queryKey: ["reservations"] });
  };

  const savePlan = useMutation({
    mutationFn: async () => {
      if (!reservation) return;
      const { error } = await supabase.from("material_reservations").update({
        subscription_plan_id: planId || null,
        notes,
      }).eq("id", reservation.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reservations"] }); toast({ title: "Enregistré" }); },
  });

  const reserveNow = useMutation({
    mutationFn: async () => {
      if (!reservation) return;
      const { error } = await supabase.from("material_reservations").update({ status: "reserve" }).eq("id", reservation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      toast({ title: "Matériel réservé", description: "Stock décrémenté automatiquement" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (!reservation) return null;

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Réservation — {profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "Client"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/40 rounded-lg">
            <div><span className="text-muted-foreground">Parcelle :</span> <span className="font-medium">{surface?.nom_surface ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Statut :</span> <Badge variant="outline">{COLUMNS.find(c => c.id === reservation.status)?.label}</Badge></div>
          </div>

          <div>
            <Label>Abonnement</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un abonnement" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {DT(p.price_dt)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes support</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Discussion avec le client, besoins..." />
          </div>

          <Button variant="outline" size="sm" onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>Enregistrer abonnement & notes</Button>

          <div className="border rounded-lg">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-semibold text-sm">Matériel à réserver</h4>
              <div className="text-sm">Total : <span className="font-bold text-primary">{DT(total)}</span></div>
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
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem.mutate(i.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">Aucun appareil sélectionné</TableCell></TableRow>}
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
              <Button size="sm" onClick={() => addItemMut.mutate()} disabled={!addItem.stock_item_id || addItemMut.isPending}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
            </div>
          </div>

          {reservation.status !== "reserve" && reservation.status !== "confirme" && reservation.status !== "installe" && (
            <Button className="w-full" onClick={() => reserveNow.mutate()} disabled={items.length === 0 || reserveNow.isPending}>
              Réserver le matériel (décrémente le stock)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
