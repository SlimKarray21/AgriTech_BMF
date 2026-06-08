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
import { CheckCircle2, Clock, Plus, Package, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ReqItem = { id: string; qty: number };

export default function DemandeMaterielPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<ReqItem[]>([]);
  const [addId, setAddId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [notes, setNotes] = useState("");

  const { data: reclamations = [] } = useQuery({ queryKey: ["reclamations"], queryFn: getReclamations, refetchInterval: 10000 });
  const { data: stockItems = [] } = useQuery<any[]>({ queryKey: ["stock-items"], queryFn: getStockItems });

  const stockById = useMemo(() => Object.fromEntries(stockItems.map(s => [String(s.id), s])), [stockItems]);

  // Mes demandes = réclamations dont je suis l'auteur (partenaire)
  const myDemandes = useMemo(
    () => reclamations.filter(r => String(r.profile_id) === String(profile?.id)),
    [reclamations, profile?.id],
  );

  const resetForm = () => { setItems([]); setAddId(""); setAddQty(1); setNotes(""); };

  const addItem = () => {
    if (!addId) return;
    setItems(prev => {
      const existing = prev.find(i => i.id === addId);
      if (existing) return prev.map(i => i.id === addId ? { ...i, qty: i.qty + addQty } : i);
      return [...prev, { id: addId, qty: addQty }];
    });
    setAddId("");
    setAddQty(1);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const createMut = useMutation({
    mutationFn: createReclamation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reclamations"] });
      setCreating(false);
      resetForm();
      toast({ title: "Demande envoyée à l'admin" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!user || !profile) return;
    if (items.length === 0) { toast({ title: "Ajoutez au moins un matériel", variant: "destructive" }); return; }
    const lines = items.map(i => `- ${stockById[i.id]?.name ?? "?"} ×${i.qty}`);
    createMut.mutate({
      // user_id doit être numérique côté backend (le profile.id), pas l'UUID auth
      user_id: profile.id,
      profile_id: profile.id,
      sujet: `Demande matériel (${items.length} article${items.length > 1 ? "s" : ""})`,
      message: `${lines.join("\n")}${notes.trim() ? `\n\n${notes.trim()}` : ""}`,
    });
  };

  // Matériels encore disponibles à ajouter (pas déjà dans la liste)
  const availableToAdd = stockItems.filter(s => !items.some(i => i.id === String(s.id)));

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

      <Dialog open={creating} onOpenChange={(o) => { setCreating(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de matériel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Matériel(s)</Label>
              <div className="flex gap-2 items-end mt-1">
                <div className="flex-1">
                  <Select value={addId} onValueChange={setAddId}>
                    <SelectTrigger><SelectValue placeholder="Choisir un matériel..." /></SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                      {availableToAdd.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucun autre matériel</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Input type="number" min="1" value={addQty} onChange={e => setAddQty(Math.max(1, +e.target.value))} />
                </div>
                <Button type="button" onClick={addItem} disabled={!addId}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-lg divide-y">
                {items.map(i => (
                  <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium">{stockById[i.id]?.name ?? "?"}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">×{i.qty}</span>
                      <Button type="button" size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => removeItem(i.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Message (optionnel)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Précisions sur votre demande..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setCreating(false); resetForm(); }}>Annuler</Button>
              <Button type="button" onClick={handleSubmit} disabled={createMut.isPending || items.length === 0}>
                {createMut.isPending ? "..." : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
