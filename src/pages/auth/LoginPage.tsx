import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, KeyRound } from "lucide-react";
import teslaLogo from "@/assets/logo-tesla-energie.png";
import { toast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { loginApi, verifyEmailApi, resendCodeApi, ApiError } from "@/services/auth-api";
import { API_BASE_URL } from "@/services/api-config";
import { useAuth } from "@/hooks/useAuth";

async function checkIsSousAdmin(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agri/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const profiles: any[] = await res.json();
    // Trouver le profil de l'utilisateur connecté via le token
    const me = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!me.ok) return false;
    const meData = await me.json();
    const myProfile = profiles.find(
      (p: any) => p.email?.toLowerCase() === meData.email?.toLowerCase()
    );
    return myProfile?.user_role === "SOUS_ADMIN";
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP verification step
  const [otpStep, setOtpStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLength, setOtpLength] = useState(6);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      // Pour les users, vérifier si leur profil est SOUS_ADMIN via l'API profiles
      if (data.role !== "admin") {
        const isSousAdmin = await checkIsSousAdmin(data.token);
        if (!isSousAdmin) {
          toast({ title: "Accès refusé", description: "Seuls les administrateurs peuvent accéder à ce panneau.", variant: "destructive" });
          return;
        }
      }
      await setToken(data.token);
      navigate("/admin/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403 && apiErr.userId) {
        setPendingUserId(apiErr.userId);
        setOtpLength(apiErr.otpLength ?? 6);
        setOtpStep(true);
        toast({ title: "Vérification requise", description: apiErr.message ?? "Veuillez vérifier votre email avant de vous connecter." });
      } else {
        toast({ title: "Erreur de connexion", description: apiErr.error ?? apiErr.message ?? "Email ou mot de passe incorrect.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyEmailApi(pendingUserId, otpCode);
      if (data.role !== "admin") {
        const isSousAdmin = await checkIsSousAdmin(data.token);
        if (!isSousAdmin) {
          toast({ title: "Accès refusé", description: "Seuls les administrateurs peuvent accéder à ce panneau.", variant: "destructive" });
          return;
        }
      }
      await setToken(data.token);
      navigate("/admin/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({ title: "Code invalide", description: apiErr.error ?? apiErr.message ?? "Le code saisi est incorrect ou expiré.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCodeApi(pendingUserId);
      toast({ title: "Code renvoyé", description: "Un nouveau code a été envoyé à votre email." });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({ title: "Erreur", description: apiErr.error ?? "Impossible de renvoyer le code pour le moment.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={teslaLogo}
              alt="Tesla Energie"
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl">
            {otpStep ? "Vérification de l'email" : t("auth.loginTitle")}
          </CardTitle>
          <CardDescription>
            {otpStep
              ? `Entrez le code à ${otpLength} chiffres envoyé à votre adresse email.`
              : t("auth.loginDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!otpStep ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.logging") : t("auth.login")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Code de vérification</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={otpLength}
                    placeholder={"0".repeat(otpLength)}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, otpLength))}
                    className="pl-9 tracking-[0.4em] text-center font-mono text-lg"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length !== otpLength}>
                {loading ? "Vérification..." : "Confirmer le code"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleResend} disabled={loading}>
                Renvoyer le code
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => { setOtpStep(false); setOtpCode(""); }} disabled={loading}>
                ← Retour à la connexion
              </Button>
            </form>
          )}
        </CardContent>

        {!otpStep && (
          <CardFooter className="flex flex-col gap-2 text-sm text-center">
            <Link to="/auth/forgot-password" className="text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
