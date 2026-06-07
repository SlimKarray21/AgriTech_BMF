import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReclamations, createReclamation, getStockItems } from "@/services/data-service";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Plus, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DemandeMaterielPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [stockItemId, setStockItemId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: reclamations = [] } = useQuery({ queryKey: ["reclamations"], queryFn: getReclamations, refetchInterval: 10000 });
  const { data: stockItems = [] } = useQuery<any[]>({ queryKey: ["stock-items"], queryFn: getStockItems });

  // Mes demandes = réclamations dont je suis l'auteur (partenaire)
  const myDemandes = useMemo(
    () => reclamations.filter(r => String(r.profile_id) === String(profile?.id)),
    [reclamations, profile?.id],
  );

  const createMut = useMutation({
    mutationFn: createReclamation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reclamations"] });
      setCreating(false);
      setStockItemId("");
      setQuantity(1);
      toast({ title: "Demande envoyée à l'admin" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;
    const item = stockItems.find(s => String(s.id) === stockItemId);
    if (!item) { toast({ title: "Sélectionnez un matériel", variant: "destructive" }); return; }
    const fd = new FormData(e.currentTarget);
    const notes = (fd.get("message") as string) || "";
    createMut.mutate({
      user_id: user.id,
      profile_id: profile.id,
      sujet: `Demande matériel: ${item.name} ×${quantity}`,
      message: `Quantité demandée: ${quantity}${notes ? `\n${notes}` : ""}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Demande Matériel</h2>
          <p className="text-sm text-muted-foreground">Demandez du matériel à l'administration</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nouvelle demande</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matériel</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myDemandes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.sujet}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground whitespace-pre-line">{r.message}</TableCell>
                  <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    {r.statut === "traite" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Traité
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-400 bg-orange-50 text-orange-700">
                        <Clock className="mr-1 h-3 w-3" /> En attente
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {myDemandes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Aucune demande de matériel
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de matériel</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Matériel *</Label>
              <Select value={stockItemId} onValueChange={setStockItemId}>
                <SelectTrigger><SelectValue placeholder="Choisir un matériel..." /></SelectTrigger>
                <SelectContent>
                  {stockItems.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} (stock: {s.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantité *</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(Math.max(1, +e.target.value))} required />
            </div>
            <div>
              <Label>Message (optionnel)</Label>
              <Textarea name="message" rows={4} placeholder="Précisions sur votre demande..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || !stockItemId}>{createMut.isPending ? "..." : "Envoyer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
