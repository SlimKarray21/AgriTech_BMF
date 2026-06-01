import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSurfaces, createSurface, updateSurface, deleteSurface, getProfiles } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Plus, X, Pencil } from "lucide-react";
import LocationSelector from "@/components/LocationSelector";
import { Surface } from "@/types/models";

export default function SurfacesPage() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [editing, setEditing] = useState<Surface | null>(null);
  const [editLoc, setEditLoc] = useState("");
  const qc = useQueryClient();

  const { data: allSurfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profilesList = useFilteredProfiles(allProfiles.filter(p => p.user_role === "CLIENT"));
  const visibleIds = useMemo(() => new Set(profilesList.map(p => p.id)), [profilesList]);
  const items = useMemo(() => allSurfaces.filter(s => !s.fkUser || visibleIds.has(s.fkUser)), [allSurfaces, visibleIds]);

  const createMut = useMutation({
    mutationFn: createSurface,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["surfaces"] }); setShowForm(false); setSelectedUser(""); setLocalisation(""); toast({ title: t("parcelle.new") + " ✓" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Surface> }) => updateSurface(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["surfaces"] }); setEditing(null); toast({ title: t("surface.updated") }); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteSurface,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["surfaces"] }); toast({ title: t("common.delete") + " ✓" }); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tailleStr = fd.get("tailleHa") as string;
    createMut.mutate({
      nomSurface: fd.get("nomSurface") as string,
      localisation,
      fkUser: selectedUser,
      tailleHa: tailleStr ? parseFloat(tailleStr) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t("parcelle.title")}</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="mr-2 h-4 w-4" />{t("common.cancel")}</> : <><Plus className="mr-2 h-4 w-4" />{t("parcelle.new")}</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t("parcelle.new")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>{t("wizard.surfaceName")}</Label><Input name="nomSurface" required /></div>
                <div><Label>{t("parcelle.taille")}</Label><Input name="tailleHa" type="number" step="0.01" min="0" /></div>
                <div>
                  <Label>{t("wizard.user")}</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{profilesList.map((p) => <SelectItem key={p.id} value={p.id}>{p.email || `${p.first_name} ${p.last_name}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <LocationSelector value={localisation} onChange={setLocalisation} />
              <div><Button type="submit" disabled={createMut.isPending || !selectedUser}>{t("common.create")}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>{t("surface.location")}</TableHead>
                <TableHead>{t("parcelle.taille")}</TableHead>
                <TableHead>Nb vannes</TableHead>
                <TableHead>{t("wizard.user")}</TableHead>
                <TableHead>Type sol</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.nomSurface}</TableCell>
                  <TableCell>{s.localisation}</TableCell>
                  <TableCell>{s.tailleHa != null ? `${s.tailleHa} ha` : "—"}</TableCell>
                  <TableCell>{s.nbVanne}</TableCell>
                  <TableCell>{s.userEmail}</TableCell>
                  <TableCell>{s.typeSol ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setEditLoc(s.localisation); }}><Pencil className="h-3 w-3" /></Button>
                      <DeleteDialog onConfirm={() => deleteMut.mutate(s.id)} itemName={s.nomSurface} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("parcelle.none")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("surface.editSurface")}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editing) return; const fd = new FormData(e.currentTarget); const th = fd.get("tailleHa") as string; updateMut.mutate({ id: editing.id, data: { nomSurface: fd.get("nomSurface") as string, localisation: editLoc, tailleHa: th ? parseFloat(th) : undefined } }); }} className="space-y-4">
            <div><Label>Nom</Label><Input name="nomSurface" defaultValue={editing?.nomSurface} required /></div>
            <div><Label>{t("parcelle.taille")}</Label><Input name="tailleHa" type="number" step="0.01" min="0" defaultValue={editing?.tailleHa ?? ""} /></div>
            <LocationSelector value={editLoc} onChange={setEditLoc} />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
