import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClientSales, createClientSale, getMaterialReservations, updateMaterialReservation } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Trash2, CheckCircle2 } from "lucide-react";
import SecurityConfirmDialog from "@/components/SecurityConfirmDialog";
import { Plan, Reservation } from "./types";
import { DT } from "./utils";

export default function ClientsTab({
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
      // soft-delete via status "annule" — le backend restitue le stock réservé.
      await updateMaterialReservation(id, { status: "annule" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-reservations"] });
      // Le stock a été restitué côté backend : rafraîchir l'inventaire et l'historique.
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast({ title: "Réservation annulée" });
    },
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
