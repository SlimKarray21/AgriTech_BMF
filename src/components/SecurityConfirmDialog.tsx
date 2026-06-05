import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loginApi, ApiError } from "@/services/auth-api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function SecurityConfirmDialog({
  open,
  onClose,
  onSuccess,
  title = "Confirmation sécurisée",
  description = "Veuillez confirmer votre identité pour valider cette action.",
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!email || !password) {
      toast({ title: "Champs requis", description: "Email et mot de passe sont obligatoires", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      if (data.role !== "admin") {
        toast({ title: "Accès refusé", description: "Rôle insuffisant pour valider cette action.", variant: "destructive" });
        return;
      }
      toast({ title: "Identité vérifiée ✓" });
      setEmail("");
      setPassword("");
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403 && apiErr.userId) {
        toast({ title: "Email non vérifié", description: "Veuillez vérifier votre email avant d'effectuer cette action.", variant: "destructive" });
      } else {
        toast({ title: "Échec d'authentification", description: apiErr.error ?? apiErr.message ?? "Identifiants invalides.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email administrateur</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoFocus
            />
          </div>
          <div>
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Vérifier & Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
