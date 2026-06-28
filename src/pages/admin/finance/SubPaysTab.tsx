import { useMemo, useState } from "react";
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
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
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

  const emptyForm = { profileId: "", planId: "", amount: "", method: "especes", dateStart: "", dateExp: "" };
  const [form, setForm] = useState(emptyForm);

  const autoDates = (days: number) => {
    const start = new Date();
    const exp = new Date();
    exp.setDate(exp.getDate() + (days || 30));
    return { dateStart: start.toISOString().slice(0, 10), dateExp: exp.toISOString().slice(0, 10) };
  };

  // Sélection d'un client → pré-remplit le plan déjà choisi dans Abonnements
  // (profile.type_abo == nom du plan), ainsi que le montant et la période.
  const pickClient = (profileId: string) => {
    const client = profById[profileId];
    const matched = client?.type_abo ? (plans as Plan[]).find((p) => p.name === client.type_abo) : null;
    setForm((f) => matched
      ? { ...f, profileId, planId: String(matched.id), amount: String(matched.price_dt), ...autoDates(matched.duration_days) }
      : { ...f, profileId });
  };

  const pickPlan = (planId: string) => {
    const plan = (plans as Plan[]).find((p) => String(p.id) === planId);
    setForm((f) => plan
      ? { ...f, planId, amount: String(plan.price_dt), ...autoDates(plan.duration_days) }
      : { ...f, planId });
  };

  const openCreate = () => { setForm(emptyForm); setCreating(true); };
  const openCreateFor = (profileId: string) => { setForm(emptyForm); setCreating(true); pickClient(profileId); };

  // Clients ayant choisi un abonnement (type_abo) mais dont le service n'est pas
  // actif et sans paiement déjà en attente → "à encaisser" (action requise).
  const enAttenteByProfile = useMemo(
    () => new Set(subpays.filter((s) => s.status === "en_attente").map((s) => String(s.profile_id))),
    [subpays],
  );
  const aEncaisser = useMemo(
    () => (profiles as any[]).filter((p) => {
      if (!p.type_abo) return false;
      const active = !!p.date_exp_abo && new Date(p.date_exp_abo).getTime() > Date.now();
      return !active && !enAttenteByProfile.has(String(p.id));
    }),
    [profiles, enAttenteByProfile],
  );

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
    <div className="space-y-6">
      {isAdmin && aEncaisser.length > 0 && (
        <Card className="border-orange-300 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" /> Clients à encaisser ({aEncaisser.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Abonnement choisi</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="w-36">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aEncaisser.map((p: any) => {
                  const expired = !!p.date_exp_abo && new Date(p.date_exp_abo).getTime() <= Date.now();
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email}</TableCell>
                      <TableCell>{p.type_abo}</TableCell>
                      <TableCell>
                        {expired
                          ? <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">Expiré</Badge>
                          : <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">Jamais payé</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openCreateFor(String(p.id))}>
                          <Plus className="h-3 w-3 mr-1" />Encaisser
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Paiements d'abonnement</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
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
              createMut.mutate({
                profile_id: form.profileId,
                plan_id: form.planId,
                amount_dt: form.amount,
                payment_method: form.method,
                date_start: form.dateStart,
                date_exp: form.dateExp,
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label>Client *</Label>
              <select required value={form.profileId} onChange={(e) => pickClient(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
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
              <select required value={form.planId} onChange={(e) => pickPlan(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">Sélectionner...</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>{p.name} — {DT(p.price_dt)}</option>
                ))}
              </select>
              {form.profileId && profById[form.profileId]?.type_abo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Abonnement choisi dans Abonnements : <span className="font-medium text-foreground">{profById[form.profileId].type_abo}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant (DT) *</Label>
                <Input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Méthode *</Label>
                <select required value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                  <option value="virement">Virement</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date début</Label><Input type="date" value={form.dateStart} onChange={(e) => setForm({ ...form, dateStart: e.target.value })} /></div>
              <div><Label>Date expiration</Label><Input type="date" value={form.dateExp} onChange={(e) => setForm({ ...form, dateExp: e.target.value })} /></div>
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
    </div>
  );
}
