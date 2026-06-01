import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, CheckCircle, Clock, Search, Plus } from "lucide-react";

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  user_role?: string;
  phone_number?: string;
  location?: string;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [createElectro, setCreateElectro] = useState(false);
  const [createSante, setCreateSante] = useState(false);
  const qc = useQueryClient();
  const isAdmin = currentProfile?.user_role === "ADMIN";
  const isSousAdmin = currentProfile?.user_role === "SOUS_ADMIN";

  const { data: authUsers = [] } = useQuery<AuthUser[]>({
    queryKey: ["auth-users"],
    queryFn: async () => {
      const { data: users, error } = await supabase.rpc("get_all_auth_users");
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, user_role, first_name, last_name, phone_number, location, created_by");

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      let result = (users ?? []).map((u: any) => {
        const prof = profileMap.get(u.id);
        return {
          ...u,
          first_name: prof?.first_name || u.first_name || "",
          last_name: prof?.last_name || u.last_name || "",
          user_role: prof?.user_role || "CLIENT",
          phone_number: prof?.phone_number || "",
          location: prof?.location || "",
          created_by: prof?.created_by || null,
          profile_id: prof?.id || null,
        };
      });

      // SOUS_ADMIN: only see CLIENTs they created
      if (isSousAdmin && currentProfile?.id) {
        result = result.filter(
          (u: any) => u.created_by === currentProfile.id || u.profile_id === currentProfile.id
        );
      }

      return result;
    },
    enabled: !!currentProfile,
  });

  const updateMut = useMutation({
    mutationFn: async (payload: {
      userId: string;
      role: string;
      firstName: string;
      lastName: string;
      phone: string;
      location: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          user_role: payload.role,
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone_number: payload.phone,
          location: payload.location,
        } as any)
        .eq("user_id", payload.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-users"] });
      setEditing(null);
      toast({ title: "Utilisateur mis à jour" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("profiles").delete().eq("user_id", userId);
      await supabase.from("soil_reports").delete().eq("client_id", userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-users"] });
      toast({ title: "Utilisateur supprimé" });
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      phone: string;
      location: string;
      aboElectrovanne: boolean;
      aboSantePlante: boolean;
    }) => {
      const res = await supabase.functions.invoke("create-user", { body: payload });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-users"] });
      setCreating(false);
      setCreateElectro(false);
      setCreateSante(false);
      toast({ title: "Utilisateur créé avec succès" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      role: fd.get("role") as string,
      phone: fd.get("phone") as string,
      location: fd.get("location") as string,
      aboElectrovanne: createElectro,
      aboSantePlante: createSante,
    });
  };

  const filtered = authUsers.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Admin</Badge>;
      case "SOUS_ADMIN":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Sous-admin</Badge>;
      default:
        return <Badge variant="secondary">Client</Badge>;
    }
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    updateMut.mutate({
      userId: editing.id,
      role: fd.get("role") as string,
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      phone: fd.get("phone") as string,
      location: fd.get("location") as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">{t("users.title")}</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("auth.email")}</TableHead>
                <TableHead>{t("auth.firstName")}</TableHead>
                <TableHead>{t("auth.lastName")}</TableHead>
                <TableHead>{t("auth.phone")}</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Email vérifié</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.first_name || "—"}</TableCell>
                  <TableCell>{u.last_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.phone_number || "—"}</TableCell>
                  <TableCell>{getRoleBadge(u.user_role ?? "CLIENT")}</TableCell>
                  <TableCell>
                    {u.email_confirmed_at ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Vérifié</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">En attente</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <DeleteDialog onConfirm={() => deleteMut.mutate(u.id)} itemName={u.email} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">{t("users.noUser")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{editing?.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("auth.firstName")}</Label>
                <Input name="firstName" defaultValue={editing?.first_name} required />
              </div>
              <div>
                <Label>{t("auth.lastName")}</Label>
                <Input name="lastName" defaultValue={editing?.last_name} required />
              </div>
            </div>
            <div>
              <Label>Rôle</Label>
              <Select name="role" defaultValue={editing?.user_role ?? "CLIENT"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SOUS_ADMIN">Sous-admin</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input name="phone" defaultValue={editing?.phone_number} />
            </div>
            <div>
              <Label>{t("surface.location")}</Label>
              <Input name="location" defaultValue={editing?.location} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={updateMut.isPending}>{t("common.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Mot de passe *</Label>
              <Input name="password" type="password" required minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("auth.firstName")} *</Label>
                <Input name="firstName" required />
              </div>
              <div>
                <Label>{t("auth.lastName")} *</Label>
                <Input name="lastName" required />
              </div>
            </div>
            <div>
              <Label>Rôle</Label>
              <Select name="role" defaultValue="CLIENT">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
                  {isAdmin && <SelectItem value="SOUS_ADMIN">Sous-admin</SelectItem>}
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input name="phone" />
            </div>
            <div>
              <Label>{t("surface.location")}</Label>
              <Input name="location" />
            </div>
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">Options d'abonnement</p>
              <div className="flex items-center gap-2 opacity-80">
                <Checkbox checked disabled />
                <Label className="text-sm">CapteurSol <span className="text-xs text-muted-foreground">(toujours inclus)</span></Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="c-electro" checked={createElectro} onCheckedChange={(v) => setCreateElectro(!!v)} />
                <Label htmlFor="c-electro" className="text-sm cursor-pointer">ElectroVanne</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="c-sante" checked={createSante} onCheckedChange={(v) => setCreateSante(!!v)} />
                <Label htmlFor="c-sante" className="text-sm cursor-pointer">SantéPlante</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
