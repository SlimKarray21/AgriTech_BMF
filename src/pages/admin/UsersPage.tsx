import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, TOKEN_KEY } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, CheckCircle, Clock, Search, Plus, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  AdminUser,
  getAdminUsersApi,
  updateUserRoleApi,
  deleteAdminUserApi,
  registerUserApi,
} from "@/services/auth-api";
import { getProfiles } from "@/services/data-service";
import { API_BASE_URL } from "@/services/api-config";

export default function UsersPage() {
  const { t } = useLanguage();
  const { profile: currentProfile } = useAuth();
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  const qc = useQueryClient();

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsersApi(token),
    enabled: !!token,
  });

  const userRole = currentProfile?.user_role ?? "";
  const isSousAdmin = userRole === "SOUS_ADMIN";
  const currentProfileId = currentProfile?.id ?? "";

  // Profils pour le filtrage SOUS_ADMIN et la mise à jour des rôles
  const { data: profilesData = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
    enabled: true,
  });
  const myCreatedEmails = isSousAdmin
    ? new Set(profilesData.filter(p => p.created_by === currentProfileId).map(p => p.email))
    : null;

  const allUsers: AdminUser[] = data?.users ?? [];
  const users: AdminUser[] = isSousAdmin && myCreatedEmails
    ? allUsers.filter(u => myCreatedEmails.has(u.email))
    : allUsers;

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRoleApi(token, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditing(null);
      toast({ title: "Rôle mis à jour" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.error ?? e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteAdminUserApi(token, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Utilisateur supprimé" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.error ?? e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      createdBy?: number;
    }) => registerUserApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setCreating(false);
      toast({
        title: "Utilisateur créé",
        description: "Un email de vérification a été envoyé à l'utilisateur.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.error ?? e.message, variant: "destructive" }),
  });

  const filtered = users.filter((u) =>
    `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Résout le vrai rôle en croisant le rôle auth avec le profil
  const resolveRole = (u: AdminUser): string => {
    if (u.role === "admin") return "admin";
    const profile = profilesData.find(p => p.email?.toLowerCase() === u.email?.toLowerCase());
    if (profile?.user_role === "SOUS_ADMIN") return "sous_admin";
    return "user";
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin")
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          <ShieldCheck className="h-3 w-3 mr-1" />Admin
        </Badge>
      );
    if (role === "sous_admin")
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          <ShieldCheck className="h-3 w-3 mr-1" />Sous-Admin
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <UserIcon className="h-3 w-3 mr-1" />Client
      </Badge>
    );
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const frontendRole = fd.get("role") as string;

    if (frontendRole === "sous_admin" || frontendRole === "user") {
      // Pour Sous-Admin et Client : on met à jour uniquement profiles.user_role
      // sans toucher au rôle auth (qui reste "user")
      const userProfile = profilesData.find(
        p => p.email?.toLowerCase() === editing.email?.toLowerCase()
      );
      if (!userProfile) {
        toast({ title: "Profil introuvable — connectez-vous d'abord avec ce compte", variant: "destructive" });
        return;
      }
      const profileRole = frontendRole === "sous_admin" ? "SOUS_ADMIN" : "CLIENT";
      try {
        await fetch(`${API_BASE_URL}/api/agri/profiles/${userProfile.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("agritech_admin_token") ?? ""}`,
          },
          body: JSON.stringify({ user_role: profileRole }),
        });
        qc.invalidateQueries({ queryKey: ["profiles"] });
        qc.invalidateQueries({ queryKey: ["admin-users"] });
        setEditing(null);
        toast({ title: `Rôle mis à jour → ${profileRole}` });
      } catch {
        toast({ title: "Erreur mise à jour", variant: "destructive" });
      }
    } else {
      // Admin : on change le rôle auth + profil
      updateRoleMut.mutate({ userId: editing.id, role: "admin" });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      phoneNumber: (fd.get("phone") as string) || "",
      createdBy: isSousAdmin && currentProfileId ? Number(currentProfileId) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">{t("users.title")}</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.firstName || "—"}</TableCell>
                  <TableCell>{u.lastName || "—"}</TableCell>
                  <TableCell className="text-sm">{u.phoneNumber || "—"}</TableCell>
                  <TableCell>{getRoleBadge(resolveRole(u))}</TableCell>
                  <TableCell>
                    {u.emailVerified ? (
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
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <DeleteDialog
                        onConfirm={() => deleteMut.mutate(u.id)}
                        itemName={u.email}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("users.noUser")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data && (
            <p className="text-xs text-muted-foreground px-4 py-2 border-t">
              {data.total} utilisateur{data.total > 1 ? "s" : ""} au total
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog — role only */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{editing?.email}</p>
            </div>
            <div>
              <Label>Rôle</Label>
              <Select name="role" defaultValue={editing ? resolveRole(editing) : "user"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sous_admin">Sous-Admin</SelectItem>
                  <SelectItem value="user">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateRoleMut.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Un email de vérification sera envoyé. Le rôle peut être changé après vérification.
          </p>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Mot de passe *</Label>
              <Input name="password" type="password" required minLength={8} />
              <p className="text-xs text-muted-foreground mt-1">
                Min. 8 caractères, 1 majuscule, 1 chiffre
              </p>
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
              <Label>{t("auth.phone")}</Label>
              <Input name="phone" placeholder="+21600000000" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                {t("common.cancel")}
              </Button>
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
