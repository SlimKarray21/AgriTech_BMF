import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClientSale } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";
import { MatPay } from "./types";
import { DT, METHOD_LABEL } from "./utils";

// Traçabilité des paiements d'appareillage (ventes client), calquée sur SubPaysTab.
export default function MatPaysTab({
  sales, profById, isAdmin,
}: {
  sales: MatPay[];
  profById: Record<string, any>;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id: string; amount: string; method: string } | null>(null);

  const editMut = useMutation({
    mutationFn: async (d: { id: string; amount: string; method: string }) => {
      await updateClientSale(d.id, {
        equipment_price_dt: Number(d.amount),
        total_dt: Number(d.amount),
        payment_method: d.method,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-sales"] });
      setEdit(null);
      toast({ title: "Paiement modifié" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const { sorted, sort } = useTableSort(sales, {
    date: (s) => (s.created_at ? new Date(s.created_at) : null),
    user: (s) => {
      const u = profById[s.profile_id];
      return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id;
    },
    amount: (s) => s.amount_dt,
    method: (s) => METHOD_LABEL[s.payment_method] ?? s.payment_method,
    status: (s) => s.status,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paiements appareillage</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="date" sort={sort}>Date</SortableHead>
              <SortableHead field="user" sort={sort}>Client</SortableHead>
              <SortableHead field="amount" sort={sort}>Montant</SortableHead>
              <SortableHead field="method" sort={sort}>Méthode</SortableHead>
              <SortableHead field="status" sort={sort}>Statut</SortableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const u = profById[s.profile_id];
              const paid = s.status === "confirme" || s.status === "valide";
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>{u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id}</TableCell>
                  <TableCell className="font-semibold">{DT(s.amount_dt)}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        paid
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                          : s.status === "refuse"
                          ? "bg-red-500/15 text-red-700 border-red-300"
                          : "bg-orange-500/15 text-orange-700 border-orange-300"
                      }
                    >
                      {paid ? "payé" : s.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Modifier"
                        onClick={() => setEdit({ id: s.id, amount: String(s.amount_dt), method: s.payment_method })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Aucun paiement appareillage
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modifier un paiement appareillage (montant, méthode) */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le paiement appareillage</DialogTitle></DialogHeader>
          {edit && (
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
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
            <Button disabled={editMut.isPending} onClick={() => edit && editMut.mutate(edit)}>
              {editMut.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
