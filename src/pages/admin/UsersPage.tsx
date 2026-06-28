import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/token";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, CheckCircle, Clock, Search, Plus, ShieldCheck, Handshake, User as UserIcon, ChevronRight, KeyRound, Copy, CheckCircle2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AdminUser,
  getAdminUsersApi,
  updateUserRoleApi,
  deleteAdminUserApi,
  registerUserApi,
  verifyEmailApi,
} from "@/services/auth-api";
import { getProfiles, assignClientToPartner } from "@/services/data-service";

export default function UsersPage() {
  const { t } = useLanguage();
  const { profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const token = getToken() ?? "";
  const qc = useQueryClient();

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Vérification OTP
  const [verifyDialog, setVerifyDialog] = useState<{
    userId: string;
    email: string;
    otpCode: string | null;
    expires: number;
  } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsersApi(token),
    enabled: !!token,
  });

  const { data: profilesData = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
    enabled: true,
  });

  const users: AdminUser[] = data?.users ?? [];

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

  // Affectation client → partenaire (created_by sur le profil du client).
  const assignMut = useMutation({
    mutationFn: ({ clientProfileId, partnerId }: { clientProfileId: number; partnerId: number | null }) =>
      assignClientToPartner(clientProfileId, partnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) =>
      toast({ title: "Erreur d'affectation", description: e.error ?? e.message, variant: "destructive" }),
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
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setCreating(false);
      setPhoneRaw("");
      setOtpInput(data.otpCode ?? "");
      setVerified(false);
      setVerifyDialog({
        userId: data.userId,
        email: variables.email,
        otpCode: data.otpCode ?? null,
        expires: data.expiresInMinutes ?? 10,
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.error ?? e.message, variant: "destructive" }),
  });

  // Validation téléphone tunisien +216 suivi de 8 chiffres
  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setPhoneRaw(digits);
    if (digits.length > 0 && digits.length < 8) {
      setPhoneError("Le numéro doit contenir 8 chiffres après +216");
    } else {
      setPhoneError("");
    }
  };

  const handleVerify = async () => {
    if (!verifyDialog) return;
    setVerifying(true);
    try {
      await verifyEmailApi(verifyDialog.userId, otpInput);
      setVerified(true);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch {
      toast({ title: "Code incorrect", description: "Vérifiez le code et réessayez.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const closeVerifyDialog = () => {
    setVerifyDialog(null);
    setOtpInput("");
    setVerified(false);
  };

  const codeLength = verifyDialog?.otpCode?.length ?? 6;

  // IDs des users créés par un partenaire (ne pas afficher dans la liste principale)
  const partenaireCreatedIds = new Set(
    profilesData.filter((p) => p.created_by).map((p) => p.user_id)
  );

  const filtered = users
    .filter((u) => !partenaireCreatedIds.has(u.id))
    .filter((u) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const resolveRole = (u: AdminUser): string => {
    const r = (u.userRole ?? u.role ?? "").toUpperCase();
    if (r === "ADMIN") return "admin";
    if (r === "PARTENAIRE") return "partenaire";
    return "user";
  };

  const getRoleBadge = (u: AdminUser) => {
    const r = (u.userRole ?? u.role ?? "").toUpperCase();
    if (r === "ADMIN")
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          <ShieldCheck className="h-3 w-3 mr-1" />Admin
        </Badge>
      );
    if (r === "PARTENAIRE")
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
          <Handshake className="h-3 w-3 mr-1" />Partenaire
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <UserIcon className="h-3 w-3 mr-1" />Client
      </Badge>
    );
  };

  // Profil (BIGINT id + created_by) du user en cours d'édition, et liste des partenaires.
  const editingProfile = editing
    ? profilesData.find((p) => p.user_id === editing.id)
    : null;
  const partners = profilesData.filter(
    (p) => (p.user_role ?? "").toUpperCase() === "PARTENAIRE"
  );

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const frontendRole = fd.get("role") as string;
    const backendRole = frontendRole === "admin" ? "admin" : frontendRole === "partenaire" ? "partenaire" : "user";

    // Affectation à un partenaire (clients uniquement). "none" = rattaché à l'admin.
    if (frontendRole === "user" && editingProfile) {
      const partnerVal = fd.get("partner") as string | null;
      const newCreatedBy = partnerVal && partnerVal !== "none" ? Number(partnerVal) : null;
      const currentCreatedBy = editingProfile.created_by ?? null;
      if (newCreatedBy !== currentCreatedBy) {
        try {
          await assignMut.mutateAsync({ clientProfileId: Number(editingProfile.id), partnerId: newCreatedBy });
        } catch {
          return; // l'erreur est déjà affichée par onError
        }
      }
    }

    updateRoleMut.mutate({ userId: editing.id, role: backendRole });
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phoneRaw.length > 0 && phoneRaw.length < 8) {
      setPhoneError("Le numéro doit contenir 8 chiffres après +216");
      return;
    }
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      phoneNumber: phoneRaw.length === 8 ? `+216${phoneRaw}` : "",
      createdBy: undefined,
    });
  };

  const { sorted, sort } = useTableSort(filtered, {
    email: (u) => u.email,
    firstName: (u) => u.firstName,
    lastName: (u) => u.lastName,
    phone: (u) => u.phoneNumber,
    role: (u) => resolveRole(u),
    verified: (u) => (u.emailVerified ? 1 : 0),
    createdAt: (u) => (u.createdAt ? new Date(u.createdAt) : null),
  });

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
                <SortableHead field="email" sort={sort}>{t("auth.email")}</SortableHead>
                <SortableHead field="firstName" sort={sort}>{t("auth.firstName")}</SortableHead>
                <SortableHead field="lastName" sort={sort}>{t("auth.lastName")}</SortableHead>
                <SortableHead field="phone" sort={sort}>{t("auth.phone")}</SortableHead>
                <SortableHead field="role" sort={sort}>Rôle</SortableHead>
                <SortableHead field="verified" sort={sort}>Email vérifié</SortableHead>
                <SortableHead field="createdAt" sort={sort}>Inscrit le</SortableHead>
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
              {!isLoading && sorted.map((u) => {
                const isPartenaire = resolveRole(u) === "partenaire";
                return (
                <TableRow
                  key={u.id}
                  className={isPartenaire ? "cursor-pointer hover:bg-blue-50/50" : ""}
                  onClick={isPartenaire ? () => navigate(`/admin/partenaire/${u.id}`) : undefined}
                >
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.firstName || "—"}</TableCell>
                  <TableCell>{u.lastName || "—"}</TableCell>
                  <TableCell className="text-sm">{u.phoneNumber || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getRoleBadge(u)}
                      {isPartenaire && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
                );
              })}
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
              {users.length - partenaireCreatedIds.size} utilisateur{users.length - partenaireCreatedIds.size > 1 ? "s" : ""} au total
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog — role only */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <form key={editing?.id} onSubmit={handleEditSubmit} className="space-y-4">
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
                  <SelectItem value="partenaire">Partenaire</SelectItem>
                  <SelectItem value="user">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editing && resolveRole(editing) === "user" && (
              <div>
                <Label>Partenaire</Label>
                <Select name="partner" defaultValue={editingProfile?.created_by ? String(editingProfile.created_by) : "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun (rattaché à l'admin)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun (rattaché à l'admin)</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Affecte ce client à un partenaire : il apparaîtra alors sous ce partenaire.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateRoleMut.isPending || assignMut.isPending}>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium bg-muted px-3 py-2 rounded-md border border-input text-muted-foreground select-none">+216</span>
                <div className="flex-1">
                  <Input
                    name="phone"
                    inputMode="numeric"
                    placeholder="00 000 000"
                    value={phoneRaw.replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3")}
                    onChange={(e) => formatPhone(e.target.value)}
                    maxLength={10}
                    className={phoneError ? "border-destructive" : ""}
                  />
                  {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setCreating(false); setPhoneRaw(""); setPhoneError(""); }}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={!!verifyDialog} onOpenChange={(o) => { if (!o) closeVerifyDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Vérification du compte
            </DialogTitle>
          </DialogHeader>

          {!verified ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Un email a été envoyé à <span className="font-medium">{verifyDialog?.email}</span></span>
              </div>

              {verifyDialog?.otpCode && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Code généré :</p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3">
                    <span className="text-2xl font-mono font-bold tracking-[0.3em] text-primary flex-1 text-center">
                      {verifyDialog.otpCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(verifyDialog.otpCode!);
                        toast({ title: "Code copié" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 text-center">
                    Expire dans {verifyDialog.expires} minutes
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Entrer le code de vérification</Label>
                <Input
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, codeLength))}
                  inputMode="numeric"
                  className="text-center font-mono text-xl tracking-[0.4em]"
                  placeholder={"_".repeat(codeLength)}
                  maxLength={codeLength}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={closeVerifyDialog}>Plus tard</Button>
                <Button
                  className="flex-1"
                  disabled={verifying || otpInput.length !== codeLength}
                  onClick={handleVerify}
                >
                  {verifying ? "Vérification..." : "Vérifier"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg">Compte vérifié !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le compte de <span className="font-medium">{verifyDialog?.email}</span> est maintenant actif.
                </p>
              </div>
              <Button className="w-full" onClick={closeVerifyDialog}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
