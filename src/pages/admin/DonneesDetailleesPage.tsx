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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Leaf, Droplets } from "lucide-react";
import { Plante, Vanne } from "@/types/models";

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
  const [selSurface, setSelSurface] = useState("");
  const [editPlante, setEditPlante] = useState<Plante | null>(null);
  const createPlanteMut = useMutation({ mutationFn: createPlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); setShowPlanteForm(false); toast({ title: t("donnees.planteCreated") }); } });
  const updatePlanteMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Plante> }) => updatePlante(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); setEditPlante(null); toast({ title: t("donnees.planteUpdated") }); } });
  const deletePlanteMut = useMutation({ mutationFn: deletePlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["plantes"] }); toast({ title: t("donnees.planteDeleted") }); } });

  // Vannes CRUD
  const [showVanneForm, setShowVanneForm] = useState(false);
  const [selVanneSurface, setSelVanneSurface] = useState("");
  const [editVanne, setEditVanne] = useState<Vanne | null>(null);
  const createVanneMut = useMutation({ mutationFn: createVanne, onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); qc.invalidateQueries({ queryKey: ["surfaces"] }); setShowVanneForm(false); toast({ title: t("donnees.vanneCreated") }); } });
  const updateVanneMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Vanne> }) => updateVanne(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); setEditVanne(null); toast({ title: t("donnees.vanneUpdated") }); } });
  const deleteVanneMut = useMutation({ mutationFn: deleteVanne, onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); qc.invalidateQueries({ queryKey: ["surfaces"] }); toast({ title: t("donnees.vanneDeleted") }); } });

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
                <div><Label>Nom</Label><Input name="nomPlante" required /></div>
                <div><Label>Âge (ans)</Label><Input name="age" type="number" min="0" required /></div>
                <div className="md:col-span-2">
                  <Label>Surface</Label>
                  <Select value={selSurface} onValueChange={setSelSurface}>
                    <SelectTrigger><SelectValue placeholder="Surface" /></SelectTrigger>
                    <SelectContent>{surfaces.map(s => <SelectItem key={s.id} value={s.id}>{s.nomSurface}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex gap-2"><Button type="submit" disabled={!selSurface}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowPlanteForm(false)}>{t("common.cancel")}</Button></div>
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
                    <Table>
                      <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Âge</TableHead><TableHead className="w-24 text-right">{t("common.actions")}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {sPlantes.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.nomPlante}</TableCell>
                            <TableCell>{p.age} ans</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditPlante(p)}><Pencil className="h-3 w-3" /></Button>
                                <DeleteDialog onConfirm={() => deletePlanteMut.mutate(p.id)} itemName={p.nomPlante} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
            <Card><CardContent className="pt-4">
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createVanneMut.mutate({ nomVanne: fd.get("nomVanne") as string, debitEauParVanne: parseFloat(fd.get("debit") as string), nbPlantParVanne: parseInt(fd.get("nbPlant") as string), fkSurface: selVanneSurface }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nom</Label><Input name="nomVanne" required /></div>
                <div><Label>Débit (L/h)</Label><Input name="debit" type="number" step="0.1" required /></div>
                <div><Label>Nb plantes</Label><Input name="nbPlant" type="number" min="0" required /></div>
                <div>
                  <Label>Surface</Label>
                  <Select value={selVanneSurface} onValueChange={setSelVanneSurface}>
                    <SelectTrigger><SelectValue placeholder="Surface" /></SelectTrigger>
                    <SelectContent>{surfaces.map(s => <SelectItem key={s.id} value={s.id}>{s.nomSurface}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex gap-2"><Button type="submit" disabled={!selVanneSurface}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowVanneForm(false)}>{t("common.cancel")}</Button></div>
              </form>
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
                    <Table>
                      <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Débit (L/h)</TableHead><TableHead>Nb plantes</TableHead><TableHead className="w-24 text-right">{t("common.actions")}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {sVannes.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.nomVanne}</TableCell>
                            <TableCell>{v.debitEauParVanne}</TableCell>
                            <TableCell>{v.nbPlantParVanne}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditVanne(v)}><Pencil className="h-3 w-3" /></Button>
                                <DeleteDialog onConfirm={() => deleteVanneMut.mutate(v.id)} itemName={v.nomVanne} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
