import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfiles, getSurfaces, getVannes, getPlantes, getSols, getClimats } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, ArrowLeft, User, Mail, Phone, MapPin, ShieldCheck, Calendar,
  CreditCard, Droplets, Leaf, FileText, Eye, Grid3X3, Cpu, CheckCircle,
  AlertTriangle, XCircle, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Profile, WaterReport } from "@/types/models";

interface SoilReport {
  id: string;
  client_id: string;
  report_type: string;
  created_at: string;
  ph: number | null;
  conductivite: number | null;
}

function SubscriptionStatus({ profile }: { profile: Profile }) {
  if (!profile.date_exp_abo || !profile.type_abo) {
    return (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Pas d'abonnement</span>
      </div>
    );
  }
  const diff = Math.ceil((new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = diff <= 0;
  const isExpiring = !isExpired && diff <= 30;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isExpired ? (
          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expiré</Badge>
        ) : isExpiring ? (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600"><AlertTriangle className="h-3 w-3" /> Expire bientôt</Badge>
        ) : (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="h-3 w-3" /> Actif</Badge>
        )}
        <Badge variant="outline">{profile.type_abo === "op1" ? "Option 1" : profile.type_abo === "op1_op2" ? "Option 1+2" : "Full"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Temps restant</span>
          <p className={`font-semibold ${isExpired ? "text-destructive" : "text-foreground"}`}>
            {isExpired ? "Expiré" : `${diff} jours`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Début</span>
          <p className="font-medium">{profile.date_deb_abo || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Fin</span>
          <p className="font-medium">{profile.date_exp_abo || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export default function BaseDonneesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: plantes = [] } = useQuery({ queryKey: ["plantes"], queryFn: getPlantes });
  const { data: sols = [] } = useQuery({ queryKey: ["sols"], queryFn: getSols });
  const { data: climats = [] } = useQuery({ queryKey: ["climats"], queryFn: getClimats });

  const { data: waterReports = [] } = useQuery({
    queryKey: ["water_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("water_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaterReport[];
    },
  });

  const { data: soilReports = [] } = useQuery({
    queryKey: ["soil_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("soil_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SoilReport[];
    },
  });

  // Auth users for email_confirmed_at
  const { data: authUsers = [] } = useQuery({
    queryKey: ["auth-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_auth_users");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredProfiles = useMemo(() => {
    if (!search) return profiles;
    const s = search.toLowerCase();
    return profiles.filter(p =>
      `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(s)
    );
  }, [profiles, search]);

  const selectedProfile = useMemo(() => profiles.find(p => p.id === selectedUserId), [profiles, selectedUserId]);
  const authUser = useMemo(() => {
    if (!selectedProfile) return null;
    return authUsers.find((u: any) => u.id === selectedProfile.user_id);
  }, [authUsers, selectedProfile]);

  const userSurfaces = useMemo(() => surfaces.filter(s => s.fkUser === selectedUserId), [surfaces, selectedUserId]);
  const userWaterReports = useMemo(() => waterReports.filter(r => r.client_id === selectedUserId), [waterReports, selectedUserId]);
  const userSoilReports = useMemo(() => soilReports.filter(r => r.client_id === selectedUserId), [soilReports, selectedUserId]);

  if (selectedProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedProfile.first_name} {selectedProfile.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">{t("bdd.userFile")}</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="gap-1 text-xs"><User className="h-3.5 w-3.5" /> {t("bdd.info")}</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1 text-xs"><CreditCard className="h-3.5 w-3.5" /> {t("bdd.subscription")}</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" /> {t("bdd.reports")}</TabsTrigger>
            <TabsTrigger value="parcelles" className="gap-1 text-xs"><Grid3X3 className="h-3.5 w-3.5" /> {t("bdd.parcelles")}</TabsTrigger>
            <TabsTrigger value="capteurs" className="gap-1 text-xs"><Cpu className="h-3.5 w-3.5" /> {t("bdd.capteurs")}</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> {t("bdd.userInfo")}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow icon={<User className="h-4 w-4" />} label={t("auth.lastName")} value={selectedProfile.last_name} />
                  <InfoRow icon={<User className="h-4 w-4" />} label={t("auth.firstName")} value={selectedProfile.first_name} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label={t("auth.email")} value={selectedProfile.email || "—"} />
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rôle</p>
                      <Badge variant={selectedProfile.user_role === "ADMIN" ? "default" : selectedProfile.user_role === "SOUS_ADMIN" ? "secondary" : "outline"}>
                        {selectedProfile.user_role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email vérifié</p>
                      {authUser?.email_confirmed_at ? (
                        <Badge className="bg-emerald-600">Oui</Badge>
                      ) : (
                        <Badge variant="destructive">Non</Badge>
                      )}
                    </div>
                  </div>
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Inscrit le" value={authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString("fr") : "—"} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label={t("auth.phone")} value={selectedProfile.phone_number || "—"} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Localisation" value={selectedProfile.location || "—"} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBSCRIPTION */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> {t("bdd.subscription")}</CardTitle></CardHeader>
              <CardContent>
                <SubscriptionStatus profile={selectedProfile} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* REPORTS */}
          <TabsContent value="reports">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-500" /> {t("rapports.waterReport")} ({userWaterReports.length})</CardTitle></CardHeader>
                <CardContent>
                  {userWaterReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("rapports.noReport")}</p>
                  ) : (
                    <div className="space-y-2">
                      {userWaterReports.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{t("rapports.waterReport")}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(r.created_at).toLocaleDateString("fr")}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/rapport-eau")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4 text-emerald-500" /> {t("rapports.soilReport")} ({userSoilReports.length})</CardTitle></CardHeader>
                <CardContent>
                  {userSoilReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("rapports.noReport")}</p>
                  ) : (
                    <div className="space-y-2">
                      {userSoilReports.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Leaf className="h-4 w-4 text-emerald-500" />
                            <div>
                              <p className="font-medium text-sm">{t("rapports.soilReport")}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(r.created_at).toLocaleDateString("fr")}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/rapport-sol")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PARCELLES */}
          <TabsContent value="parcelles">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="h-4 w-4" /> {t("bdd.parcelles")} ({userSurfaces.length})</CardTitle></CardHeader>
              <CardContent>
                {userSurfaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("parcelle.none")}</p>
                ) : (
                  <div className="space-y-3">
                    {userSurfaces.map(s => {
                      const sVannes = vannes.filter(v => v.fkSurface === s.id);
                      const sPlantes = plantes.filter(p => p.fkSurface === s.id);
                      return (
                        <div key={s.id} className="border rounded-lg p-4 bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{s.nomSurface}</h4>
                            {s.tailleHa != null && <Badge variant="outline">{s.tailleHa} ha</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.localisation}</span>
                            <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {sVannes.length} vanne(s)</span>
                            <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {sPlantes.length} plante(s)</span>
                          </div>
                          {sVannes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {sVannes.map(v => (
                                <Badge key={v.id} variant="secondary" className="text-xs">
                                  <Droplets className="mr-1 h-3 w-3" /> {v.nomVanne}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAPTEURS */}
          <TabsContent value="capteurs">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{t("capteur.sol")}</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const userSolIds = userSurfaces.filter(s => s.fkSol).map(s => s.fkSol!);
                    const userSols = sols.filter(s => userSolIds.includes(s.id));
                    if (userSols.length === 0) return <p className="text-sm text-muted-foreground">{t("capteur.noSol")}</p>;
                    return (
                      <div className="space-y-2">
                        {userSols.map(s => (
                          <div key={s.id} className="border rounded-lg p-3 bg-muted/30 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div><span className="text-muted-foreground">Nature:</span> {s.nature}</div>
                              <div><span className="text-muted-foreground">pH:</span> {s.ph}</div>
                              <div><span className="text-muted-foreground">Humidité:</span> {s.humidite}%</div>
                              <div><span className="text-muted-foreground">Temp:</span> {s.temperature}°C</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{t("capteur.climat")}</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const userClimatIds = userSurfaces.filter(s => s.fkClimat).map(s => s.fkClimat!);
                    const userClimats = climats.filter(c => userClimatIds.includes(c.id));
                    if (userClimats.length === 0) return <p className="text-sm text-muted-foreground">{t("capteur.noClimat")}</p>;
                    return (
                      <div className="space-y-2">
                        {userClimats.map(c => (
                          <div key={c.id} className="border rounded-lg p-3 bg-muted/30 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div><span className="text-muted-foreground">Temp:</span> {c.temperatureC}°C</div>
                              <div><span className="text-muted-foreground">Humidité:</span> {c.humiditeC}%</div>
                              <div><span className="text-muted-foreground">Vent:</span> {c.vitesseVent} km/h</div>
                              <div><span className="text-muted-foreground">Soleil:</span> {c.puissanceEnsoleillement} W/m²</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // User list view
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("bdd.title")}</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("travail.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map(p => {
          const pSurfaces = surfaces.filter(s => s.fkUser === p.id);
          const pWater = waterReports.filter(r => r.client_id === p.id).length;
          const pSoil = soilReports.filter(r => r.client_id === p.id).length;
          const subDiff = p.date_exp_abo ? Math.ceil((new Date(p.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

          return (
            <Card
              key={p.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-border"
              onClick={() => setSelectedUserId(p.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <Badge variant={p.user_role === "ADMIN" ? "default" : p.user_role === "SOUS_ADMIN" ? "secondary" : "outline"} className="text-[10px]">
                    {p.user_role}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Grid3X3 className="h-3 w-3" /> {pSurfaces.length} parcelle(s)</span>
                  <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {pWater} rapport eau</span>
                  <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {pSoil} rapport sol</span>
                </div>
                {subDiff !== null && (
                  <Badge variant={subDiff <= 0 ? "destructive" : subDiff <= 30 ? "outline" : "default"} className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {subDiff <= 0 ? "Expiré" : `${subDiff}j restants`}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">{t("users.noUser")}</div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
