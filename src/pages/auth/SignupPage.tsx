import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, Mail, Lock, User, Phone, Globe, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { countries } from "@/data/countries";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SignupPage() {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("TN");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const selectedCountry = countries.find((c) => c.code === countryCode);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fullPhone = `${selectedCountry?.dialCode ?? ""}${phone}`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName, phone: fullPhone, country: countryCode, city },
      },
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
            <div className="flex justify-center mb-2"><Mail className="h-10 w-10 text-primary" /></div>
            <CardTitle>{t("auth.checkEmail")}</CardTitle>
            <CardDescription>{t("auth.checkEmailDesc")} <strong>{email}</strong>.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/auth/login" className="text-primary hover:underline text-sm">{t("auth.backToLogin")}</Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><Droplets className="h-10 w-10 text-primary" /></div>
          <CardTitle className="text-2xl">{t("auth.signup")}</CardTitle>
          <CardDescription>{t("auth.signupDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("auth.firstName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t("auth.firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.lastName")}</Label>
                <Input placeholder={t("auth.lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("auth.country")}</Label>
                <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); setCity(""); }}>
                  <SelectTrigger><Globe className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name} ({c.dialCode})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.city")}</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><MapPin className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue placeholder={t("auth.city")} /></SelectTrigger>
                  <SelectContent>
                    {(selectedCountry?.governorates.flatMap((g) => g.cities) ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("auth.phone")}</Label>
              <div className="flex gap-2">
                <div className="flex items-center border rounded-md px-3 bg-muted text-sm text-muted-foreground min-w-[72px] justify-center">
                  {selectedCountry?.dialCode}
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={6} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.registering") : t("auth.register")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link to="/auth/login" className="text-primary hover:underline ml-1">{t("auth.login")}</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
