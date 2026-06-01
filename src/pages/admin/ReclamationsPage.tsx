import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getReclamations, updateReclamationStatus, deleteReclamation, createReclamation, getProfiles } from "@/services/data-service";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteDialog } from "@/components/DeleteDialog";
import { CheckCircle2, Clock, Plus, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ReclamationsPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "en_attente" | "traite">("all");

  const { data: reclamations = [] } = useQuery({ queryKey: ["reclamations"], queryFn: getReclamations });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });

  const isPrivileged = profile?.user_role === "ADMIN" || profile?.user_role === "SOUS_ADMIN";

  const setStatusMut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: "en_attente" | "traite" }) =>
      updateReclamationStatus(id, statut, profile?.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reclamations"] }); toast({ title: "Statut mis à jour" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReclamation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reclamations"] }); toast({ title: "Réclamation supprimée" }); },
  });

  const createMut = useMutation({
    mutationFn: createReclamation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reclamations"] }); setCreating(false); toast({ title: "Réclamation créée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const targetUserId = (fd.get("user_id") as string) || user.id;
    const targetProfile = profiles.find(p => p.user_id === targetUserId);
    createMut.mutate({
      user_id: targetUserId,
      profile_id: targetProfile?.id,
      sujet: fd.get("sujet") as string,
      message: fd.get("message") as string,
    });
  };

  const filtered = reclamations.filter(r => filterStatus === "all" || r.statut === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Liste des réclamations</h2>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="traite">Traité</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle réclamation</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div>{r.userName}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                  </TableCell>
                  <TableCell>{r.sujet}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.message}</TableCell>
                  <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    {r.statut === "traite" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Traité
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30">
                        <Clock className="mr-1 h-3 w-3" /> En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isPrivileged && r.statut === "en_attente" && (
                        <Button variant="ghost" size="sm" title="Marquer comme traité" onClick={() => setStatusMut.mutate({ id: r.id, statut: "traite" })}>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        </Button>
                      )}
                      {isPrivileged && r.statut === "traite" && (
                        <Button variant="ghost" size="sm" title="Rouvrir" onClick={() => setStatusMut.mutate({ id: r.id, statut: "en_attente" })}>
                          <RotateCcw className="h-3 w-3 text-amber-600" />
                        </Button>
                      )}
                      {profile?.user_role === "ADMIN" && (
                        <DeleteDialog onConfirm={() => deleteMut.mutate(r.id)} itemName={r.sujet} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Aucune réclamation
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle réclamation</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {isPrivileged && (
              <div>
                <Label>Utilisateur concerné</Label>
                <Select name="user_id" defaultValue={user?.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.first_name} {p.last_name} — {p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Sujet *</Label>
              <Input name="sujet" required />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea name="message" required rows={5} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "..." : "Créer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
