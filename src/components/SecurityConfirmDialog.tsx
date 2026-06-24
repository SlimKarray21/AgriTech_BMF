import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** Code de sécurité à composer pour valider une action sensible. */
const SECURITY_CODE = "Karray2026";

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
  description = "Veuillez saisir le code de sécurité pour valider cette action.",
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    if (!code) {
      toast({ title: "Champ requis", description: "Le code de sécurité est obligatoire", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (code !== SECURITY_CODE) {
      toast({ title: "Code incorrect", description: "Le code de sécurité est invalide.", variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Code vérifié ✓" });
    setCode("");
    setLoading(false);
    onSuccess();
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
            <Label>Code de sécurité</Label>
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="Entrez le code"
              autoFocus
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
