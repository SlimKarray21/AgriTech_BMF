import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Mail, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    // Check role - CLIENT cannot access admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("user_id", authData.user.id)
      .single();
    
    if (profile?.user_role === "CLIENT") {
      await supabase.auth.signOut();
      toast({ title: "Accès refusé", description: "Les clients n'ont pas accès à l'interface d'administration.", variant: "destructive" });
      return;
    }
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><Droplets className="h-10 w-10 text-primary" /></div>
          <CardTitle className="text-2xl">{t("auth.loginTitle")}</CardTitle>
          <CardDescription>{t("auth.loginDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.logging") : t("auth.login")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-center">
          <Link to="/auth/forgot-password" className="text-primary hover:underline">{t("auth.forgotPassword")}</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
