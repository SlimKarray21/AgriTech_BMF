import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Calendar, Upload, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState<"avatar" | "logo" | null>(null);
  const [companyName, setCompanyName] = useState(profile?.company_name ?? "");
  const [savingCompany, setSavingCompany] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const isSousAdmin = profile?.user_role === "SOUS_ADMIN";

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : user?.email ?? "";

  const initials = profile?.first_name
    ? `${profile.first_name[0]}${(profile.last_name?.[0] ?? "")}`.toUpperCase()
    : (user?.email?.[0] ?? "U").toUpperCase();

  const uploadFile = async (file: File, kind: "avatar" | "logo") => {
    if (!user || !profile) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(path);
      const field = kind === "avatar" ? "avatar_url" : "company_logo";
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ [field]: publicUrl } as any)
        .eq("id", profile.id);
      if (updErr) throw updErr;
      toast({ title: kind === "avatar" ? "Photo mise à jour" : "Logo mis à jour" });
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const saveCompany = async () => {
    if (!profile) return;
    setSavingCompany(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ company_name: companyName } as any)
        .eq("id", profile.id);
      if (error) throw error;
      toast({ title: "Entreprise mise à jour" });
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nav.profile")}</h2>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInput.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90"
                title="Changer la photo"
              >
                {uploading === "avatar" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "avatar")}
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{displayName}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: User, label: t("auth.firstName"), value: profile?.first_name ?? "—" },
              { icon: User, label: t("auth.lastName"), value: profile?.last_name ?? "—" },
              { icon: Mail, label: t("auth.email"), value: user?.email ?? "—" },
              { icon: Calendar, label: t("profile.memberSince"), value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isSousAdmin && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Branding entreprise</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Personnalisez le nom et le logo de votre entreprise. Ils remplaceront "Tesla Energie" dans la barre latérale.
            </p>

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                {profile?.company_logo ? (
                  <img src={profile.company_logo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button variant="outline" onClick={() => logoInput.current?.click()} disabled={uploading === "logo"}>
                  {uploading === "logo" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Changer le logo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG (carré recommandé)</p>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")}
                />
              </div>
            </div>

            <div>
              <Label>Nom de l'entreprise</Label>
              <div className="flex gap-2 mt-1">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mon entreprise" />
                <Button onClick={saveCompany} disabled={savingCompany || companyName === (profile?.company_name ?? "")}>
                  {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
