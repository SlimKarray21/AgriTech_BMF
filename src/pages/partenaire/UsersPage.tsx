import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/token";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/DeleteDialog";
import { toast } from "@/hooks/use-toast";
import { Clock, Search, Plus, User as UserIcon, KeyRound, Copy, CheckCircle2, Mail } from "lucide-react";
import { registerUserApi, verifyEmailApi } from "@/services/auth-api";
import { getProfiles } from "@/services/data-service";
import { API_BASE_URL } from "@/services/api-config";

export default function UsersPage() {
  const { t } = useLanguage();
  const { profile: currentProfile } = useAuth();
  const token = getToken() ?? "";
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // État dialog vérification
  const [verifyDialog, setVerifyDialog] = useState<{
    userId: string;
    email: string;
    otpCode: string | null;
    expires: number;
  } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
    enabled: !!token,
  });

  const myClients = allProfiles.filter(
    (p) => p.user_role === "CLIENT" && String(p.created_by) === String(currentProfile?.id)
  );

  const filtered = myClients.filter((u) =>
    `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.email ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch(`${API_BASE_URL}/api/agri/profiles/${profileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Client supprimé" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
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
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setCreating(false);
      setPhoneRaw("");
      // Ouvrir le dialog de vérification
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

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setPhoneRaw(digits);
    if (digits.length > 0 && digits.length < 8) {
      setPhoneError("Le numéro doit contenir 8 chiffres après +216");
    } else {
      setPhoneError("");
    }
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
      createdBy: currentProfile?.id ? Number(currentProfile.id) : undefined,
    });
  };

  const handleVerify = async () => {
    if (!verifyDialog) return;
    setVerifying(true);
    try {
      await verifyEmailApi(verifyDialog.userId, otpInput);
      setVerified(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Mes clients</h2>
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
            <Plus className="mr-2 h-4 w-4" />Ajouter
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
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.first_name || "—"}</TableCell>
                  <TableCell>{u.last_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.phone_number || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary"><UserIcon className="h-3 w-3 mr-1" />Client</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="h-4 w-4" />—
                    </span>
                  </TableCell>
                  <TableCell>
                    <DeleteDialog onConfirm={() => deleteMut.mutate(u.id)} itemName={u.email ?? u.id} />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun client trouvé.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground px-4 py-2 border-t">
            {myClients.length} client{myClients.length > 1 ? "s" : ""} au total
          </p>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un client</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Un code de vérification sera envoyé par email au client.
          </p>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Mot de passe *</Label>
              <Input name="password" type="password" required minLength={8} />
              <p className="text-xs text-muted-foreground mt-1">Min. 8 caractères, 1 majuscule, 1 chiffre</p>
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
              <Button type="button" variant="outline" onClick={() => { setCreating(false); setPhoneRaw(""); setPhoneError(""); }}>{t("common.cancel")}</Button>
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

              {/* Code généré affiché si disponible */}
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

              {/* Saisie du code */}
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
                <Button variant="outline" className="flex-1" onClick={closeVerifyDialog}>
                  Plus tard
                </Button>
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
