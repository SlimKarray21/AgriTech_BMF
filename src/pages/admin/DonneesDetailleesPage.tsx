import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTypesPlante, createTypePlante, updateTypePlante, deleteTypePlante,
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
import { Plus, Pencil, Leaf, Droplets, Workflow } from "lucide-react";
import { TypePlante, Plante, Vanne } from "@/types/models";

export default function DonneesDetailleesPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: types = [] } = useQuery({ queryKey: ["types-plante"], queryFn: getTypesPlante });
  const { data: plantes = [] } = useQuery({ queryKey: ["plantes"], queryFn: getPlantes });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });

  const userBySurfaceId = useMemo(() => {
    const m = new Map<string, string>();
    surfaces.forEach(s => {
      const u = profiles.find(p => p.id === s.fkUser);
      if (u) m.set(s.id, `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "—");
    });
    return m;
  }, [surfaces, profiles]);

  // Types CRUD
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editType, setEditType] = useState<TypePlante | null>(null);
  const createTypeMut = useMutation({ mutationFn: createTypePlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["types-plante"] }); setShowTypeForm(false); toast({ title: t("donnees.typeCreated") }); } });
  const updateTypeMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<TypePlante> }) => updateTypePlante(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["types-plante"] }); setEditType(null); toast({ title: t("donnees.typeUpdated") }); } });
  const deleteTypeMut = useMutation({ mutationFn: deleteTypePlante, onSuccess: () => { qc.invalidateQueries({ queryKey: ["types-plante"] }); toast({ title: t("donnees.typeDeleted") }); } });

  // Plantes CRUD
  const [showPlanteForm, setShowPlanteForm] = useState(false);
  const [selSurface, setSelSurface] = useState("");
  const [selType, setSelType] = useState("");
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
      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types"><Workflow className="mr-1 h-4 w-4" /> {t("donnees.typesPlante")}</TabsTrigger>
          <TabsTrigger value="plantes"><Leaf className="mr-1 h-4 w-4" /> {t("donnees.plantes")}</TabsTrigger>
          <TabsTrigger value="vannes"><Droplets className="mr-1 h-4 w-4" /> {t("donnees.vannes")}</TabsTrigger>
        </TabsList>

        {/* Types de plante */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowTypeForm(!showTypeForm)}><Plus className="mr-2 h-4 w-4" /> {t("donnees.newType")}</Button></div>
          {showTypeForm && (
            <Card><CardContent className="pt-4">
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createTypeMut.mutate({ nomPlante: fd.get("nomPlante") as string, typePlante: fd.get("typePlante") as string, besoinEauParPlante: 0 }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nom</Label><Input name="nomPlante" required /></div>
                <div><Label>Type</Label><Input name="typePlante" required /></div>
                <div className="md:col-span-2 flex gap-2"><Button type="submit">{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowTypeForm(false)}>{t("common.cancel")}</Button></div>
              </form>
            </CardContent></Card>
          )}
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {types.map(tp => (
                  <TableRow key={tp.id}>
                    <TableCell>{tp.nomPlante}</TableCell>
                    <TableCell>{tp.typePlante}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditType(tp)}><Pencil className="h-3 w-3" /></Button>
                        <DeleteDialog onConfirm={() => deleteTypeMut.mutate(tp.id)} itemName={tp.nomPlante} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("donnees.noType")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Plantes */}
        <TabsContent value="plantes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowPlanteForm(!showPlanteForm)}><Plus className="mr-2 h-4 w-4" /> {t("donnees.newPlante")}</Button></div>
          {showPlanteForm && (
            <Card><CardContent className="pt-4">
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createPlanteMut.mutate({ nomPlante: fd.get("nomPlante") as string, age: parseInt(fd.get("age") as string), fkSurface: selSurface, fkTypePlante: selType }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nom</Label><Input name="nomPlante" required /></div>
                <div><Label>Âge (ans)</Label><Input name="age" type="number" min="0" required /></div>
                <div>
                  <Label>Surface</Label>
                  <Select value={selSurface} onValueChange={setSelSurface}>
                    <SelectTrigger><SelectValue placeholder="Surface" /></SelectTrigger>
                    <SelectContent>{surfaces.map(s => <SelectItem key={s.id} value={s.id}>{s.nomSurface}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={selType} onValueChange={setSelType}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.nomPlante}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex gap-2"><Button type="submit" disabled={!selSurface || !selType}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowPlanteForm(false)}>{t("common.cancel")}</Button></div>
              </form>
            </CardContent></Card>
          )}
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Âge</TableHead><TableHead>👤 Utilisateur</TableHead><TableHead>🌱 Parcelle</TableHead><TableHead>Type</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {plantes.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.nomPlante}</TableCell><TableCell>{p.age} ans</TableCell>
                    <TableCell className="text-sm">{userBySurfaceId.get(p.fkSurface) ?? "—"}</TableCell>
                    <TableCell>{p.surfaceNom}</TableCell><TableCell>{p.typePlanteNom}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditPlante(p)}><Pencil className="h-3 w-3" /></Button>
                        <DeleteDialog onConfirm={() => deletePlanteMut.mutate(p.id)} itemName={p.nomPlante} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {plantes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("donnees.noPlante")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
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
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Débit (L/h)</TableHead><TableHead>Nb plantes</TableHead><TableHead>👤 Utilisateur</TableHead><TableHead>🌱 Parcelle</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {vannes.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{v.nomVanne}</TableCell><TableCell>{v.debitEauParVanne}</TableCell>
                    <TableCell>{v.nbPlantParVanne}</TableCell>
                    <TableCell className="text-sm">{userBySurfaceId.get(v.fkSurface) ?? "—"}</TableCell>
                    <TableCell>{v.surfaceNom}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditVanne(v)}><Pencil className="h-3 w-3" /></Button>
                        <DeleteDialog onConfirm={() => deleteVanneMut.mutate(v.id)} itemName={v.nomVanne} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vannes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("donnees.noVanne")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Edit Type Dialog */}
      <Dialog open={!!editType} onOpenChange={(o) => !o && setEditType(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("donnees.editType")}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editType) return; const fd = new FormData(e.currentTarget); updateTypeMut.mutate({ id: editType.id, data: { nomPlante: fd.get("nomPlante") as string, typePlante: fd.get("typePlante") as string } }); }} className="space-y-4">
            <div><Label>Nom</Label><Input name="nomPlante" defaultValue={editType?.nomPlante} required /></div>
            <div><Label>Type</Label><Input name="typePlante" defaultValue={editType?.typePlante} required /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditType(null)}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

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
