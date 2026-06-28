import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Plus, Pencil, Trash2, History, AlertTriangle, Boxes, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getStockMovements,
} from "@/services/data-service";
import { DT } from "@/lib/format";

type StockItem = {
  id: string;
  name: string;
  category: string;
  purchase_price_dt: number;
  quantity: number;
  features: string | null;
  low_stock_threshold: number;
  created_at: string;
};

type StockMovement = {
  id: string;
  stock_item_id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
};

const CATEGORIES = ["capteur", "vanne", "module", "controleur", "gateway", "autre"];
const CAT_LABEL: Record<string, string> = {
  capteur: "Capteur",
  vanne: "Électrovanne",
  module: "Module GSM/Comm",
  controleur: "Contrôleur",
  gateway: "Gateway/ESP32",
  autre: "Autre",
};

export default function StockPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<StockItem> | null>(null);
  const [historyOf, setHistoryOf] = useState<StockItem | null>(null);

  const { data: items = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["stock-items"],
    queryFn: async () => {
      const raw: any[] = await getStockItems();
      return raw.map((i) => ({
        id: String(i.id),
        name: i.name,
        category: i.category ?? "autre",
        purchase_price_dt: Number(i.purchase_price_dt ?? 0),
        quantity: Number(i.quantity ?? 0),
        features: i.features ?? null,
        low_stock_threshold: Number(i.low_stock_threshold ?? 5),
        created_at: i.created_at ?? "",
      }));
    },
  });

  const save = useMutation({
    mutationFn: async (i: Partial<StockItem>) => {
      const payload = {
        name: i.name,
        category: i.category,
        purchase_price_dt: i.purchase_price_dt,
        quantity: i.quantity,
        low_stock_threshold: i.low_stock_threshold,
        features: i.features || null,
      };
      if (i.id) {
        await updateStockItem(i.id, payload);
      } else {
        await createStockItem(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      setEdit(null);
      toast({ title: "Appareil enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteStockItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      toast({ title: "Supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const kpis = useMemo(() => {
    const total = items.reduce((s, i) => s + i.quantity * i.purchase_price_dt, 0);
    const rupture = items.filter((i) => i.quantity === 0).length;
    const faible = items.filter((i) => i.quantity > 0 && i.quantity <= i.low_stock_threshold).length;
    return { total, count: items.length, rupture, faible };
  }, [items]);

  const statusBadge = (i: StockItem) => {
    if (i.quantity === 0)
      return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">🔴 Rupture</Badge>;
    if (i.quantity <= i.low_stock_threshold)
      return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">🟠 Stock faible</Badge>;
    return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">🟢 Disponible</Badge>;
  };

  const { sorted, sort } = useTableSort(items, {
    name: (i) => i.name,
    category: (i) => CAT_LABEL[i.category] ?? i.category,
    price: (i) => i.purchase_price_dt,
    quantity: (i) => i.quantity,
    value: (i) => i.quantity * i.purchase_price_dt,
    status: (i) => (i.quantity === 0 ? 0 : i.quantity <= i.low_stock_threshold ? 1 : 2),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Gestion du Stock
          </h2>
          <p className="text-sm text-muted-foreground">Catalogue des appareils et équipements</p>
        </div>
        <Button
          onClick={() =>
            setEdit({ name: "", category: "capteur", purchase_price_dt: 0, quantity: 0, low_stock_threshold: 5, features: "" })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter Appareil
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Valeur totale</p><p className="text-xl font-bold text-primary">{DT(kpis.total)}</p></div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Articles</p><p className="text-xl font-bold">{kpis.count}</p></div>
              <Boxes className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Stock faible</p><p className="text-xl font-bold text-orange-600">{kpis.faible}</p></div>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Ruptures</p><p className="text-xl font-bold text-red-600">{kpis.rupture}</p></div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Inventaire</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead field="name" sort={sort}>Appareil</SortableHead>
                <SortableHead field="category" sort={sort}>Catégorie</SortableHead>
                <SortableHead field="price" sort={sort}>Prix Achat</SortableHead>
                <SortableHead field="quantity" sort={sort}>Quantité</SortableHead>
                <SortableHead field="value" sort={sort}>Valeur Stock</SortableHead>
                <SortableHead field="status" sort={sort}>Statut</SortableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              )}
              {!isLoading && sorted.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {i.name}
                    {i.features && <div className="text-xs text-muted-foreground truncate max-w-xs">{i.features}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{CAT_LABEL[i.category] ?? i.category}</Badge></TableCell>
                  <TableCell>{DT(i.purchase_price_dt)}</TableCell>
                  <TableCell className="font-semibold">{i.quantity}</TableCell>
                  <TableCell className="font-semibold text-primary">{DT(i.quantity * i.purchase_price_dt)}</TableCell>
                  <TableCell>{statusBadge(i)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setHistoryOf(i)} title="Historique">
                        <History className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(i)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { if (confirm(`Supprimer ${i.name} ?`)) del.mutate(i.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Aucun article. Cliquez sur "Ajouter Appareil".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier l'appareil" : "Ajouter un appareil"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-3">
              <div>
                <Label>Nom Appareil *</Label>
                <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Catégorie *</Label>
                  <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prix Achat (DT) *</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={edit.purchase_price_dt ?? 0}
                    onChange={(e) => setEdit({ ...edit, purchase_price_dt: +e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantité *</Label>
                  <Input
                    type="number" min="0"
                    value={edit.quantity ?? 0}
                    onChange={(e) => setEdit({ ...edit, quantity: +e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Seuil alerte</Label>
                  <Input
                    type="number" min="0"
                    value={edit.low_stock_threshold ?? 5}
                    onChange={(e) => setEdit({ ...edit, low_stock_threshold: +e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Fonctionnalités</Label>
                <Textarea
                  rows={3}
                  value={edit.features ?? ""}
                  onChange={(e) => setEdit({ ...edit, features: e.target.value })}
                  placeholder="Capteur humidité + température, connectique GSM..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
                <Button type="submit" disabled={save.isPending}>Enregistrer</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <HistoryDialog item={historyOf} onClose={() => setHistoryOf(null)} />
    </div>
  );
}

function HistoryDialog({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements", item?.id],
    queryFn: async () => {
      if (!item) return [];
      const raw: any[] = await getStockMovements(item.id);
      return raw.map((m) => ({
        id: String(m.id),
        stock_item_id: String(m.stock_item_id),
        movement_type: m.movement_type,
        quantity: Number(m.quantity),
        reason: m.reason ?? null,
        created_at: m.created_at ?? "",
      }));
    },
    enabled: !!item,
  });

  const { sorted, sort } = useTableSort(movements, {
    date: (m) => (m.created_at ? new Date(m.created_at) : null),
    type: (m) => m.movement_type,
    quantity: (m) => m.quantity,
    reason: (m) => m.reason,
  });

  if (!item) return null;

  const typeLabel: Record<string, { label: string; color: string }> = {
    in:          { label: "Entrée",       color: "text-emerald-700 bg-emerald-500/15 border-emerald-300" },
    out:         { label: "Sortie",       color: "text-red-700 bg-red-500/15 border-red-300" },
    reservation: { label: "Réservation", color: "text-orange-700 bg-orange-500/15 border-orange-300" },
    adjustment:  { label: "Ajustement",  color: "text-blue-700 bg-blue-500/15 border-blue-300" },
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Historique — {item.name}</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead field="date" sort={sort}>Date</SortableHead>
                <SortableHead field="type" sort={sort}>Type</SortableHead>
                <SortableHead field="quantity" sort={sort}>Quantité</SortableHead>
                <SortableHead field="reason" sort={sort}>Raison</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{new Date(m.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeLabel[m.movement_type]?.color}>
                      {typeLabel[m.movement_type]?.label ?? m.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={m.quantity < 0 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun mouvement</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
