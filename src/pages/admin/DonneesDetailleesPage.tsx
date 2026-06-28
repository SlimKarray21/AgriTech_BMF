import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlantes, createPlante, updatePlante, deletePlante,
  getVannes, createVanne, updateVanne, deleteVanne,
  getSurfaces, getProfiles,
} from "@/services/data-service";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Leaf, Droplets, Trash2 } from "lucide-react";
import { Plante, Vanne } from "@/types/models";

interface VanneRow { nomVanne: string; debit: string; nbPlant: string; deviceId: string; pistonNumber: string; }

const roleBadgeClass = (role?: string) => {
  const r = (role ?? "").toUpperCase();
  if (r === "ADMIN") return "bg-red-100 text-red-700 border-red-300";
  if (r === "PARTENAIRE") return "bg-blue-100 text-blue-700 border-blue-300";
  return "bg-emerald-100 text-emerald-700 border-emerald-300";
};

export default function DonneesDetailleesPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: plantes = [] } = useQuery({ queryKey: ["plantes"], queryFn: getPlantes });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });

  const userName = (u: any) =>
    u ? (`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "—") : "Utilisateur inconnu";

  // Plantes groupées : user -> parcelle -> plantes
  const plantesGrouped = useMemo(() => {
    const bySurface = new Map<string, Plante[]>();
    for (const p of plantes) {
      const arr = bySurface.get(p.fkSurface) ?? [];
      arr.push(p);
      bySurface.set(p.fkSurface, arr);
    }
    const byUser = new Map<string, { user: any; surfaces: { surface: any; plantes: Plante[] }[] }>();
    for (const s of surfaces) {
      const sp = bySurface.get(s.id);
      if (!sp || sp.length === 0) continue;
      const key = s.fkUser ?? "unknown";
      if (!byUser.has(key)) byUser.set(key, { user: profiles.find(pr => pr.id === s.fkUser), surfaces: [] });
      byUser.get(key)!.surfaces.push({ surface: s, plantes: sp });
    }
    return Array.from(byUser.values());
  }, [plantes, surfaces, profiles]);

  // Vannes groupées : user -> parcelle -> vannes
  const vannesGrouped = useMemo(() => {
    const bySurface = new Map<string, Vanne[]>();
    for (const v of vannes) {
      const arr = bySurface.get(v.fkSurface) ?? [];
      arr.push(v);
      bySurface.set(v.fkSurface, arr);
    }
    const byUser = new Map<string, { user: any; surfaces: { surface: any; vannes: Vanne[] }[] }>();
    for (const s of surfaces) {
      const sv = bySurface.get(s.id);
      if (!sv || sv.length === 0) continue;
      const key = s.fkUser ?? "unknown";
      if (!byUser.has(key)) byUser.set(key, { user: profiles.find(pr => pr.id === s.fkUser), surfaces: [] });
      byUser.get(key)!.surfaces.push({ surface: s, vannes: sv });
    }
    return Array.from(byUser.values());
  }, [vannes, surfaces, profiles]);

  // Plantes CRUD
  const [showPlanteForm, setShowPlanteForm] = useState(false);
  const [selPlanteUser, setSelPlanteUser] = useState("");
  const [selSurface, setSelSurface] = useState("");
  const [editPlante, setEditPlante] = useState<Plante | null>(null);
  const createPlanteMut = useMutation({ mutationFn: createPlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); setShowPlanteForm(false); setSelPlanteUser(""); setSelSurface(""); toast({ title: t("donnees.planteCreated") }); } });
  const updatePlanteMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Plante> }) => updatePlante(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); setEditPlante(null); toast({ title: t("donnees.planteUpdated") }); } });
  const deletePlanteMut = useMutation({ mutationFn: deletePlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); toast({ title: t("donnees.planteDeleted") }); } });

  // Vannes CRUD
  const [showVanneForm, setShowVanneForm] = useState(false);
  const [selVanneUser, setSelVanneUser] = useState("");
  const [selVanneSurface, setSelVanneSurface] = useState("");
  const [vanneRows, setVanneRows] = useState<VanneRow[]>([{ nomVanne: "", debit: "", nbPlant: "", deviceId: "", pistonNumber: "" }]);
  const [isSavingVannes, setIsSavingVannes] = useState(false);
  const [editVanne, setEditVanne] = useState<Vanne | null>(null);
  const updateVanneMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Vanne> }) => updateVanne(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); setEditVanne(null); toast({ title: t("donnees.vanneUpdated") }); } });
  const deleteVanneMut = useMutation({ mutationFn: deleteVanne, onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); qc.invalidateQueries({ queryKey: ["surfaces"] }); toast({ title: t("donnees.vanneDeleted") }); } });

  const userFilteredSurfaces = useMemo(
    () => selVanneUser ? surfaces.filter(s => s.fkUser === selVanneUser) : surfaces,
    [surfaces, selVanneUser]
  );

  // Surfaces filtrées par l'utilisateur choisi dans le formulaire Plante.
  const planteFilteredSurfaces = useMemo(
    () => selPlanteUser ? surfaces.filter(s => s.fkUser === selPlanteUser) : surfaces,
    [surfaces, selPlanteUser]
  );

  const addVanneRow = () => setVanneRows(r => [...r, { nomVanne: "", debit: "", nbPlant: "", deviceId: "", pistonNumber: "" }]);
  const removeVanneRow = (i: number) => setVanneRows(r => r.filter((_, idx) => idx !== i));
  const updateVanneRow = (i: number, field: keyof VanneRow, val: string) =>
    setVanneRows(r => { const a = [...r]; a[i] = { ...a[i], [field]: val }; return a; });

  const handleBulkCreate = async () => {
    if (!selVanneSurface) return;
    const valid = vanneRows.filter(r => r.nomVanne.trim() && parseFloat(r.debit) > 0);
    if (valid.length === 0) return;
    setIsSavingVannes(true);
    try {
      for (const row of valid) {
        await createVanne({
          nomVanne: row.nomVanne.trim(),
          debitEauParVanne: parseFloat(row.debit),
          nbPlantParVanne: parseInt(row.nbPlant) || 0,
          fkSurface: selVanneSurface,
          deviceId: row.deviceId.trim() || undefined,
          pistonNumber: row.pistonNumber ? parseInt(row.pistonNumber) : undefined,
        });
      }
      qc.invalidateQueries({ queryKey: ["vannes"] });
      qc.invalidateQueries({ queryKey: ["surfaces"] });
      toast({ title: `${valid.length} vanne(s) créée(s) avec succès` });
      setShowVanneForm(false);
      setSelVanneUser("");
      setSelVanneSurface("");
      setVanneRows([{ nomVanne: "", debit: "", nbPlant: "", deviceId: "", pistonNumber: "" }]);
    } catch (e: any) {
      toast({ title: "Erreur lors de la création", description: e?.message, variant: "destructive" });
    } finally {
      setIsSavingVannes(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nav.donneesDetaillees")}</h2>
      <Tabs defaultValue="plantes">
        <TabsList>
          <TabsTrigger value="plantes"><Leaf className="mr-1 h-4 w-4" /> {t("donnees.plantes")}</TabsTrigger>
          <TabsTrigger value="vannes"><Droplets className="mr-1 h-4 w-4" /> {t("donnees.vannes")}</TabsTrigger>
        </TabsList>

        {/* Plantes */}
        <TabsContent value="plantes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowPlanteForm(!showPlanteForm)}><Plus className="mr-2 h-4 w-4" /> {t("donnees.newPlante")}</Button></div>
          {showPlanteForm && (
            <Card><CardContent className="pt-4">
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createPlanteMut.mutate({ nomPlante: fd.get("nomPlante") as string, age: parseInt(fd.get("age") as string), fkSurface: selSurface }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Utilisateur</Label>
                  <Select value={selPlanteUser} onValueChange={(v) => { setSelPlanteUser(v); setSelSurface(""); }}>
                    <SelectTrigger><SelectValue placeholder="Filtrer par utilisateur..." /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.first_name} {p.last_name}</span>
                            <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(p.user_role)}`}>{p.user_role}</Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nom</Label><Input name="nomPlante" required /></div>
                <div><Label>Âge (ans)</Label><Input name="age" type="number" min="0" required /></div>
                <div className="md:col-span-2">
                  <Label>Surface *</Label>
                  <Select value={selSurface} onValueChange={setSelSurface} disabled={!selPlanteUser}>
                    <SelectTrigger><SelectValue placeholder={selPlanteUser ? "Choisir une surface..." : "Sélectionnez d'abord un utilisateur"} /></SelectTrigger>
                    <SelectContent>{planteFilteredSurfaces.map(s => <SelectItem key={s.id} value={s.id}>{s.nomSurface}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex gap-2"><Button type="submit" disabled={!selSurface}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => { setShowPlanteForm(false); setSelPlanteUser(""); setSelSurface(""); }}>{t("common.cancel")}</Button></div>
              </form>
            </CardContent></Card>
          )}
          {plantesGrouped.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">{t("donnees.noPlante")}</CardContent></Card>
          )}
          {plantesGrouped.map(group => (
            <Card key={group.user?.id ?? "unknown"}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  👤 {userName(group.user)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.surfaces.map(({ surface, plantes: sPlantes }) => (
                  <div key={surface.id} className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 font-medium text-sm flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-600" /> {surface.nomSurface}
                      <span className="text-xs text-muted-foreground">({sPlantes.length} plante{sPlantes.length > 1 ? "s" : ""})</span>
                    </div>
                    <PlantesTable
                      plantes={sPlantes}
                      actionsLabel={t("common.actions")}
                      onEdit={setEditPlante}
                      onDelete={(id) => deletePlanteMut.mutate(id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Vannes */}
        <TabsContent value="vannes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowVanneForm(!showVanneForm)}><Plus className="mr-2 h-4 w-4" /> {t("donnees.newVanne")}</Button></div>
          {showVanneForm && (
            <Card><CardContent className="pt-4 space-y-4">
              {/* User + Surface selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Utilisateur</Label>
                  <Select value={selVanneUser} onValueChange={(v) => { setSelVanneUser(v); setSelVanneSurface(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par utilisateur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.first_name} {p.last_name}</span>
                            <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(p.user_role)}`}>{p.user_role}</Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Surface *</Label>
                  <Select value={selVanneSurface} onValueChange={setSelVanneSurface} disabled={!selVanneUser}>
                    <SelectTrigger><SelectValue placeholder={selVanneUser ? "Choisir une surface..." : "Sélectionnez d'abord un utilisateur"} /></SelectTrigger>
                    <SelectContent>
                      {userFilteredSurfaces.map(s => <SelectItem key={s.id} value={s.id}>{s.nomSurface}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multi-vanne rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">🚰 Vannes ({vanneRows.length})</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVanneRow}>
                    <Plus className="mr-1 h-3 w-3" /> Ajouter vanne
                  </Button>
                </div>
                {vanneRows.map((row, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-muted/20 space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <div>
                        <Label className="text-xs">Nom</Label>
                        <Input value={row.nomVanne} onChange={(e) => updateVanneRow(i, "nomVanne", e.target.value)} placeholder={`Vanne ${i + 1}`} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Débit (L/h)</Label>
                        <Input type="number" step="0.1" min="0" value={row.debit} onChange={(e) => updateVanneRow(i, "debit", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Nb plantes</Label>
                        <Input type="number" min="0" value={row.nbPlant} onChange={(e) => updateVanneRow(i, "nbPlant", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={vanneRows.length === 1} onClick={() => removeVanneRow(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                      <div>
                        <Label className="text-xs text-blue-600">Device UUID (ESP32)</Label>
                        <Input value={row.deviceId} onChange={(e) => updateVanneRow(i, "deviceId", e.target.value)} placeholder="ex: 09fe96be-54a6-48c3-8342-ea55dafe5f20" className="h-8 text-xs font-mono" />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-blue-600">Piston N° (1-8)</Label>
                        <Input type="number" min="1" max="8" value={row.pistonNumber} onChange={(e) => updateVanneRow(i, "pistonNumber", e.target.value)} placeholder="1-8" className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={handleBulkCreate} disabled={!selVanneSurface || isSavingVannes}>
                  {isSavingVannes ? "Création..." : `Créer ${vanneRows.filter(r => r.nomVanne.trim()).length || ""} vanne(s)`}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowVanneForm(false); setSelVanneUser(""); setSelVanneSurface(""); setVanneRows([{ nomVanne: "", debit: "", nbPlant: "", deviceId: "", pistonNumber: "" }]); }}>{t("common.cancel")}</Button>
              </div>
            </CardContent></Card>
          )}
          {vannesGrouped.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">{t("donnees.noVanne")}</CardContent></Card>
          )}
          {vannesGrouped.map(group => (
            <Card key={group.user?.id ?? "unknown"}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  👤 {userName(group.user)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.surfaces.map(({ surface, vannes: sVannes }) => (
                  <div key={surface.id} className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 font-medium text-sm flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" /> {surface.nomSurface}
                      <span className="text-xs text-muted-foreground">({sVannes.length} vanne{sVannes.length > 1 ? "s" : ""})</span>
                    </div>
                    <VannesTable
                      vannes={sVannes}
                      actionsLabel={t("common.actions")}
                      onEdit={setEditVanne}
                      onDelete={(id) => deleteVanneMut.mutate(id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Plante Dialog */}
      <Dialog open={!!editPlante} onOpenChange={(o) => !o && setEditPlante(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("donnees.editPlante")}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editPlante) return; const fd = new FormData(e.currentTarget); updatePlanteMut.mutate({ id: editPlante.id, data: { nomPlante: fd.get("nomPlante") as string, age: parseInt(fd.get("age") as string) } }); }} className="space-y-4">
            <div><Label>Nom</Label><Input name="nomPlante" defaultValue={editPlante?.nomPlante} required /></div>
            <div><Label>Âge (ans)</Label><Input name="age" type="number" defaultValue={editPlante?.age} required /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditPlante(null)}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Vanne Dialog */}
      <Dialog open={!!editVanne} onOpenChange={(o) => !o && setEditVanne(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("donnees.editVanne")}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editVanne) return; const fd = new FormData(e.currentTarget); updateVanneMut.mutate({ id: editVanne.id, data: { nomVanne: fd.get("nomVanne") as string, debitEauParVanne: parseFloat(fd.get("debit") as string), nbPlantParVanne: parseInt(fd.get("nbPlant") as string) } }); }} className="space-y-4">
            <div><Label>Nom</Label><Input name="nomVanne" defaultValue={editVanne?.nomVanne} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Débit (L/h)</Label><Input name="debit" type="number" step="0.1" defaultValue={editVanne?.debitEauParVanne} required /></div>
              <div><Label>Nb plantes</Label><Input name="nbPlant" type="number" defaultValue={editVanne?.nbPlantParVanne} required /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditVanne(null)}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlantesTable({
  plantes, actionsLabel, onEdit, onDelete,
}: {
  plantes: Plante[];
  actionsLabel: string;
  onEdit: (p: Plante) => void;
  onDelete: (id: string) => void;
}) {
  const { sorted, sort } = useTableSort(plantes, {
    nom: (p) => p.nomPlante,
    age: (p) => p.age,
  });
  return (
    <Table>
      <TableHeader><TableRow>
        <SortableHead field="nom" sort={sort}>Nom</SortableHead>
        <SortableHead field="age" sort={sort}>Âge</SortableHead>
        <TableHead className="w-24 text-right">{actionsLabel}</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {sorted.map(p => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.nomPlante}</TableCell>
            <TableCell>{p.age} ans</TableCell>
            <TableCell>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => onEdit(p)}><Pencil className="h-3 w-3" /></Button>
                <DeleteDialog onConfirm={() => onDelete(p.id)} itemName={p.nomPlante} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VannesTable({
  vannes, actionsLabel, onEdit, onDelete,
}: {
  vannes: Vanne[];
  actionsLabel: string;
  onEdit: (v: Vanne) => void;
  onDelete: (id: string) => void;
}) {
  const { sorted, sort } = useTableSort(vannes, {
    nom: (v) => v.nomVanne,
    debit: (v) => v.debitEauParVanne,
    nbPlantes: (v) => v.nbPlantParVanne,
  });
  return (
    <Table>
      <TableHeader><TableRow>
        <SortableHead field="nom" sort={sort}>Nom</SortableHead>
        <SortableHead field="debit" sort={sort}>Débit (L/h)</SortableHead>
        <SortableHead field="nbPlantes" sort={sort}>Nb plantes</SortableHead>
        <TableHead className="w-24 text-right">{actionsLabel}</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {sorted.map(v => (
          <TableRow key={v.id}>
            <TableCell className="font-medium">{v.nomVanne}</TableCell>
            <TableCell>{v.debitEauParVanne}</TableCell>
            <TableCell>{v.nbPlantParVanne}</TableCell>
            <TableCell>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => onEdit(v)}><Pencil className="h-3 w-3" /></Button>
                <DeleteDialog onConfirm={() => onDelete(v.id)} itemName={v.nomVanne} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
