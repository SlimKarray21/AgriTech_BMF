import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { verifyEmailApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Copy, CheckCircle2, ArrowLeft } from "lucide-react";

interface LocationState {
  userId: string;
  email: string;
  otpCode: string;
  expires: number;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const state = location.state as LocationState | null;

  const [otpInput, setOtpInput] = useState(state?.otpCode ?? "");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Si on arrive sans state (accès direct à l'URL), rediriger
  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Aucun compte en attente de vérification.</p>
        <Button variant="outline" onClick={() => navigate("/partenaire/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux clients
        </Button>
      </div>
    );
  }

  const codeLength = state.otpCode.length;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await verifyEmailApi(state.userId, otpInput);
      setVerified(true);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch {
      toast({
        title: "Code incorrect",
        description: "Vérifiez le code et réessayez.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/partenaire/users")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux clients
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Vérification du compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Compte créé pour{" "}
                <span className="font-medium text-foreground">{state.email}</span>.
                Entrez le code ci-dessous pour activer le compte immédiatement.
              </p>

              {/* Code généré */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Code généré :</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3">
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-primary flex-1 text-center">
                    {state.otpCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(state.otpCode);
                      toast({ title: "Code copié" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600 text-center">
                  Expire dans {state.expires} minutes
                </p>
              </div>

              {/* Saisie */}
              <div className="space-y-2">
                <Label>Entrer le code pour vérifier</Label>
                <Input
                  value={otpInput}
                  onChange={(e) =>
                    setOtpInput(e.target.value.replace(/\D/g, "").slice(0, codeLength))
                  }
                  inputMode="numeric"
                  className="text-center font-mono text-xl tracking-[0.4em]"
                  placeholder={"_".repeat(codeLength)}
                  maxLength={codeLength}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/partenaire/users")}
                >
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
                <p className="font-semibold text-foreground text-lg">Compte vérifié !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le compte de{" "}
                  <span className="font-medium">{state.email}</span> est maintenant actif.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/partenaire/users")}>
                Retour aux clients
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
