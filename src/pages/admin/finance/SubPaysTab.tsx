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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Pencil } from "lucide-react";
import { Plan, SubPay } from "./types";
import { DT, METHOD_LABEL } from "./utils";

// Brouillon de paiement pré-rempli depuis l'abonnement choisi par le client.
type Draft = {
  profileId: string;
  planId: string;
  planName: string;
  amount: number;
  method: string;
  dateStart: string;
  dateExp: string;
};

// Cible de la fenêtre « Modifier » : soit un brouillon (à confirmer), soit un
// paiement en_attente déjà enregistré.
type EditState = {
  mode: "draft" | "pending";
  payId?: string;
  profileId: string;
  planId: string;
  amount: string;
  method: string;
  dateStart: string;
  dateExp: string;
};

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
  const [edit, setEdit] = useState<EditState | null>(null);
  const profiles = Object.values(profById);
  const plans = Object.values(planById);

  const autoDates = (days: number) => {
    const start = new Date();
    const exp = new Date();
    exp.setDate(exp.getDate() + (days || 30));
    return { dateStart: start.toISOString().slice(0, 10), dateExp: exp.toISOString().slice(0, 10) };
  };

  const validatedStamp = () => ({
    validated_by: userId ? Number(userId) : undefined,
    validated_at: new Date().toISOString(),
  });

  // Clients ayant choisi un abonnement (type_abo) mais dont le service n'est pas
  // actif et qui n'ont aucun paiement déjà traité (en attente ou refusé)
  // → un brouillon de paiement « à confirmer » est généré pour eux.
  const handledByProfile = useMemo(
    () => new Set(
      subpays
        .filter((s) => s.status === "en_attente" || s.status === "refuse")
        .map((s) => String(s.profile_id)),
    ),
    [subpays],
  );

  const drafts = useMemo<Draft[]>(
    () => (profiles as any[])
      .filter((p) => {
        if (!p.type_abo) return false;
        const active = !!p.date_exp_abo && new Date(p.date_exp_abo).getTime() > Date.now();
        return !active && !handledByProfile.has(String(p.id));
      })
      .map((p) => {
        const plan = (plans as Plan[]).find((pl) => pl.name === p.type_abo);
        const d = autoDates(plan?.duration_days ?? 30);
        return {
          profileId: String(p.id),
          planId: plan ? String(plan.id) : "",
          planName: p.type_abo,
          amount: plan ? plan.price_dt : 0,
          method: "especes",
          dateStart: d.dateStart,
          dateExp: d.dateExp,
        };
      }),
    [profiles, plans, handledByProfile],
  );

  // Valider un paiement en attente déjà enregistré (table principale).
  const validate = useMutation({
    mutationFn: async ({ s, status }: { s: SubPay; status: string }) => {
      await updateSubscriptionPayment(s.id, { status, ...validatedStamp() });
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

  // Confirmer un brouillon → crée le paiement validé + active l'abonnement.
  const confirmDraft = useMutation({
    mutationFn: async (d: { profileId: string; planId: string; amount: string | number; method: string; dateStart: string; dateExp: string }) => {
      await createSubscriptionPayment({
        profile_id: Number(d.profileId),
        plan_id: Number(d.planId),
        amount_dt: Number(d.amount),
        payment_method: d.method,
        status: "valide",
        date_start: d.dateStart || null,
        date_exp: d.dateExp || null,
        ...validatedStamp(),
      });
      await updateProfile(d.profileId, {
        date_deb_abo: d.dateStart || undefined,
        date_exp_abo: d.dateExp || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpays"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setEdit(null);
      toast({ title: "Paiement confirmé", description: "Abonnement activé." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Refuser un brouillon → trace un paiement refusé (le client n'est pas activé).
  const refuseDraft = useMutation({
    mutationFn: async (d: { profileId: string; planId: string; amount: string | number; method: string; dateStart: string; dateExp: string }) => {
      await createSubscriptionPayment({
        profile_id: Number(d.profileId),
        plan_id: Number(d.planId),
        amount_dt: Number(d.amount),
        payment_method: d.method,
        status: "refuse",
        date_start: d.dateStart || null,
        date_exp: d.dateExp || null,
        ...validatedStamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpays"] });
      setEdit(null);
      toast({ title: "Paiement refusé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Modifier un paiement en attente déjà enregistré (montant, méthode, dates).
  const editPending = useMutation({
    mutationFn: async (d: { payId: string; amount: string | number; method: string; dateStart: string; dateExp: string }) => {
      await updateSubscriptionPayment(d.payId, {
        amount_dt: Number(d.amount),
        payment_method: d.method,
        date_start: d.dateStart || null,
        date_exp: d.dateExp || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpays"] });
      setEdit(null);
      toast({ title: "Paiement modifié" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openEditDraft = (d: Draft) => setEdit({
    mode: "draft",
    profileId: d.profileId,
    planId: d.planId,
    amount: String(d.amount),
    method: d.method,
    dateStart: d.dateStart,
    dateExp: d.dateExp,
  });

  const openEditPending = (s: SubPay) => setEdit({
    mode: "pending",
    payId: s.id,
    profileId: String(s.profile_id),
    planId: String(s.plan_id),
    amount: String(s.amount_dt),
    method: s.payment_method,
    dateStart: s.date_start ?? "",
    dateExp: s.date_exp ?? "",
  });

  const savingEdit = confirmDraft.isPending || refuseDraft.isPending || editPending.isPending;

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
      {isAdmin && drafts.length > 0 && (
        <Card className="border-orange-300 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" /> Paiements à confirmer ({drafts.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Pré-remplis depuis l'abonnement choisi par le client. Confirmez, refusez ou modifiez —
              aucune saisie manuelle nécessaire.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead className="w-44">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((d) => {
                  const p = profById[d.profileId];
                  const noPlan = !d.planId;
                  return (
                    <TableRow key={d.profileId}>
                      <TableCell className="font-medium">
                        {p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : d.profileId}
                      </TableCell>
                      <TableCell>{d.planName}</TableCell>
                      <TableCell className="font-semibold">{DT(d.amount)}</TableCell>
                      <TableCell className="text-xs">{d.dateStart} → {d.dateExp}</TableCell>
                      <TableCell className="text-xs">{METHOD_LABEL[d.method] ?? d.method}</TableCell>
                      <TableCell>
                        {noPlan ? (
                          <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">
                            Plan introuvable
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditDraft(d)}>
                              <Pencil className="h-3 w-3 mr-1" />Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              title="Refuser"
                              disabled={refuseDraft.isPending}
                              onClick={() => refuseDraft.mutate(d)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              title="Confirmer"
                              disabled={confirmDraft.isPending}
                              onClick={() => confirmDraft.mutate(d)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />Confirmer
                            </Button>
                          </div>
                        )}
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
      <CardHeader>
        <CardTitle className="text-base">Paiements d'abonnement</CardTitle>
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
                </TableRow>
              );
            })}
            {subpays.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucun paiement
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modifier un paiement (brouillon à confirmer ou paiement en attente) */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.mode === "draft" ? "Confirmer le paiement" : "Modifier le paiement"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Client : <span className="font-medium text-foreground">
                  {(() => {
                    const u = profById[edit.profileId];
                    return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : edit.profileId;
                  })()}
                </span>
                {planById[edit.planId]?.name && <> — {planById[edit.planId].name}</>}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Montant (DT) *</Label>
                  <Input type="number" step="0.01" min="0" value={edit.amount}
                    onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Méthode *</Label>
                  <select value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="especes">Espèces</option>
                    <option value="carte">Carte</option>
                    <option value="virement">Virement</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date début</Label>
                  <Input type="date" value={edit.dateStart} onChange={(e) => setEdit({ ...edit, dateStart: e.target.value })} />
                </div>
                <div>
                  <Label>Date expiration</Label>
                  <Input type="date" value={edit.dateExp} onChange={(e) => setEdit({ ...edit, dateExp: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
            {edit?.mode === "draft" ? (
              <>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  disabled={savingEdit}
                  onClick={() => edit && refuseDraft.mutate(edit)}
                >
                  <XCircle className="h-4 w-4 mr-1" />Refuser
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={savingEdit}
                  onClick={() => edit && confirmDraft.mutate(edit)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />Confirmer le paiement
                </Button>
              </>
            ) : (
              <Button
                disabled={savingEdit}
                onClick={() => edit?.payId && editPending.mutate({ payId: edit.payId, amount: edit.amount, method: edit.method, dateStart: edit.dateStart, dateExp: edit.dateExp })}
              >
                {editPending.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
    </div>
  );
}
