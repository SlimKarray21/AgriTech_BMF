import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubscriptionPayment, updateSubscriptionPayment, updateProfile } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { Plan, SubPay } from "./types";
import { DT, METHOD_LABEL } from "./utils";

export default function SubPaysTab({
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
