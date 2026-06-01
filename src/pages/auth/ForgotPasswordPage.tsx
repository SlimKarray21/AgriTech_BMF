import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Email envoyé</CardTitle>
            <CardDescription>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/auth/login" className="text-primary hover:underline text-sm">
              Retour à la connexion
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Droplets className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>Entrez votre email pour recevoir un lien de réinitialisation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/auth/login" className="text-primary hover:underline text-sm">
            Retour à la connexion
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
