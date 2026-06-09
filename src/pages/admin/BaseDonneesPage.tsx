import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, getSurfaces, getVannes, getPlantes, getSols, getClimats, getRapportsEau, getRapportsSol, createWizardParcelle, deleteSurface, deleteVanne } from "@/services/data-service";
import { getAdminUsersApi } from "@/services/auth-api";
import { DeleteDialog } from "@/components/DeleteDialog";
import { getToken } from "@/lib/token";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Search, ArrowLeft, User, Mail, Phone, MapPin, ShieldCheck, Calendar,
  CreditCard, Droplets, Leaf, FileText, Eye, Grid3X3, Cpu, CheckCircle,
  AlertTriangle, XCircle, Clock, Plus, ArrowRight, ArrowLeft as ArrowLeftIcon,
  Save, Trash2, ChevronsUpDown, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/models";
import LocationSelector from "@/components/LocationSelector";

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

// Couleur du badge selon le rôle : Admin=rouge, Partenaire=bleu, Client=vert
const roleBadgeClass = (role?: string): string => {
  const r = (role ?? "").toUpperCase();
  if (r === "ADMIN") return "bg-red-100 text-red-700 border-red-300";
  if (r === "PARTENAIRE") return "bg-blue-100 text-blue-700 border-blue-300";
  return "bg-emerald-100 text-emerald-700 border-emerald-300"; // CLIENT
};

export default function BaseDonneesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const deleteSurfaceMut = useMutation({
    mutationFn: deleteSurface,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["surfaces"] }); qc.invalidateQueries({ queryKey: ["vannes"] }); toast({ title: "Parcelle supprimée" }); },
    onError: () => toast({ title: "Erreur suppression parcelle", variant: "destructive" }),
  });
  const deleteVanneMut = useMutation({
    mutationFn: deleteVanne,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vannes"] }); toast({ title: "Vanne supprimée" }); },
    onError: () => toast({ title: "Erreur suppression vanne", variant: "destructive" }),
  });

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: plantes = [] } = useQuery({ queryKey: ["plantes"], queryFn: getPlantes });
  const { data: sols = [] } = useQuery({ queryKey: ["sols"], queryFn: getSols });
  const { data: climats = [] } = useQuery({ queryKey: ["climats"], queryFn: getClimats });

  const { data: waterReports = [] } = useQuery({
    queryKey: ["rapports-eau"],
    queryFn: async () => {
      const data: any[] = await getRapportsEau();
      return data.map(r => ({ ...r, id: String(r.id), user_id: String(r.user_id) }));
    },
  });

  const { data: soilReports = [] } = useQuery({
    queryKey: ["rapports-sol"],
    queryFn: async () => {
      const data: any[] = await getRapportsSol();
      return data.map(r => ({ ...r, id: String(r.id), user_id: String(r.user_id) }));
    },
  });

  const token = getToken() ?? "";
  const { data: adminUsersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsersApi(token),
    enabled: !!token,
  });
  const authUsers = adminUsersData?.users ?? [];

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
    // Jointure par user_id (UUID) en priorité, fallback par email
    return authUsers.find((u: any) =>
      (selectedProfile.user_id && u.id === selectedProfile.user_id) ||
      u.email?.toLowerCase() === selectedProfile.email?.toLowerCase()
    );
  }, [authUsers, selectedProfile]);

  const userSurfaces = useMemo(() => surfaces.filter(s => s.fkUser === selectedUserId), [surfaces, selectedUserId]);
  const userWaterReports = useMemo(() => waterReports.filter((r: any) => r.user_id === selectedUserId), [waterReports, selectedUserId]);
  const userSoilReports = useMemo(() => soilReports.filter((r: any) => r.user_id === selectedUserId), [soilReports, selectedUserId]);

  if (selectedProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
        </div>

        <NewProjectDialog
          open={showWizard}
          onClose={() => setShowWizard(false)}
          profiles={allProfiles}
          preselectedUserId={selectedUserId ?? undefined}
          qc={qc}
          t={t}
        />

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
                      <Badge variant="outline" className={roleBadgeClass(selectedProfile.user_role)}>
                        {selectedProfile.user_role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email vérifié</p>
                      {authUser?.emailVerified ? (
                        <Badge className="bg-emerald-600">Oui</Badge>
                      ) : (
                        <Badge variant="destructive">Non</Badge>
                      )}
                    </div>
                  </div>
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Inscrit le" value={authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString("fr-FR") : "—"} />
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
                      {userWaterReports.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{r.report_name || t("rapports.waterReport")}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {r.analysis_date}
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
                      {userSoilReports.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Leaf className="h-4 w-4 text-emerald-500" />
                            <div>
                              <p className="font-medium text-sm">{r.report_name || t("rapports.soilReport")}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {r.analysis_date}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="h-4 w-4" /> {t("bdd.parcelles")} ({userSurfaces.length})</CardTitle>
                <Button onClick={() => setShowWizard(true)} size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Nouveau Projet
                </Button>
              </CardHeader>
              <CardContent>
                {userSurfaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("parcelle.none")}</p>
                ) : (
                  <div className="space-y-3">
                    {userSurfaces.map(s => {
                      const sVannes = vannes.filter(v => v.fkSurface === s.id);
                      const sPlantes = plantes.filter(p => p.fkSurface === s.id);
                      return (
                        <div key={s.id} className="border rounded-lg p-4 bg-muted/30 space-y-3">
                          {/* En-tête parcelle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{s.nomSurface}</h4>
                              {s.tailleHa != null && <Badge variant="outline">{s.tailleHa} ha</Badge>}
                            </div>
                            <DeleteDialog
                              onConfirm={() => deleteSurfaceMut.mutate(s.id)}
                              itemName={`la parcelle "${s.nomSurface}" et toutes ses vannes`}
                            />
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.localisation}</span>
                            <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {sVannes.length} vanne(s)</span>
                            <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {sPlantes.length} plante(s)</span>
                          </div>

                          {/* Vannes avec bouton supprimer */}
                          {sVannes.length > 0 && (
                            <div className="space-y-1.5">
                              {sVannes.map(v => (
                                <div key={v.id} className="flex items-center justify-between bg-background rounded-md px-3 py-1.5 border">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Droplets className="h-3.5 w-3.5 text-blue-500" />
                                    <span className="font-medium">{v.nomVanne}</span>
                                    <span className="text-xs text-muted-foreground">{v.debitEauParVanne} L/min · {v.nbPlantParVanne} plantes</span>
                                  </div>
                                  <DeleteDialog
                                    onConfirm={() => deleteVanneMut.mutate(v.id)}
                                    itemName={`la vanne "${v.nomVanne}"`}
                                  />
                                </div>
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t("bdd.title")}</h2>
      </div>
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
          const pWater = waterReports.filter((r: any) => r.user_id === p.id).length;
          const pSoil = soilReports.filter((r: any) => r.user_id === p.id).length;
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
                  <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(p.user_role)}`}>
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

      <NewProjectDialog
        open={showWizard}
        onClose={() => setShowWizard(false)}
        profiles={allProfiles}
        qc={qc}
        t={t}
      />
    </div>

  );
}

// ── Wizard Nouveau Projet ────────────────────────────────────────────────────

interface VanneData { nomVanne: string; nbPlantParVanne: number; debitEauParVanne: number; }
interface PlantEntry { name: string; category: string; type: string; age: number; ageUnit: string; count: number; }

// Reprise du code mobile (formulaire_screen.dart) : catégories -> types
const PLANT_TYPES_BY_CATEGORY: Record<string, string[]> = {
  "Cultures maraichères": ["Tomate", "Piment", "Pomme de terre", "Oignon", "Ail", "Carotte", "Laitue", "Courgette", "Aubergine", "Concombre"],
  "Arbres fruitiers": ["Olivier", "Oranger", "Citronnier", "Mandarinier", "Pommier", "Poirier", "Pêcher", "Abricotier", "Grenadier", "Figuier"],
  "Grandes cultures": ["Blé", "Orge", "Avoine", "Maïs", "Sorgho"],
  "Légumineuses": ["Pois chiche", "Lentille", "Fève", "Haricot"],
  "Cultures spéciales": ["Palmier dattier", "Vigne", "Pastèque", "Melon", "Fraisier"],
};

// _toYears du mobile : convertit l'âge saisi vers des années
const ageToYears = (value: number, unit: string): number => {
  if (unit === "jours") return Math.max(0, Math.min(999, Math.round(value / 365)));
  if (unit === "mois") return Math.max(0, Math.min(999, Math.round(value / 12)));
  return value; // ans
};

function ClientCombobox({ profiles, value, onChange, open, onOpenChange }: {
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const selected = profiles.find(p => p.id === value);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto min-h-10">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium">{selected.first_name} {selected.last_name}</span>
              <span className="text-muted-foreground text-xs truncate">{selected.email}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Rechercher un utilisateur...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ minWidth: 400 }}>
        <Command>
          <CommandInput placeholder="Nom, prénom ou email..." />
          <CommandList>
            <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
            <CommandGroup heading={`${profiles.length} utilisateur(s)`}>
              {profiles.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.first_name} ${p.last_name} ${p.email}`}
                  onSelect={() => { onChange(p.id); onOpenChange(false); }}
                  className="flex items-center gap-3 cursor-pointer py-2"
                >
                  <Check className={`h-4 w-4 shrink-0 ${value === p.id ? "opacity-100 text-primary" : "opacity-0"}`} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{p.first_name} {p.last_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                  </div>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${roleBadgeClass(p.user_role)}`}>
                    {p.user_role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function NewProjectDialog({ open, onClose, profiles, preselectedUserId, qc, t }: {
  open: boolean; onClose: () => void; profiles: Profile[];
  preselectedUserId?: string; qc: any; t: (k: string) => string;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [nomSurface, setNomSurface] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [fkUser, setFkUser] = useState(preselectedUserId ?? "");
  const [tailleHa, setTailleHa] = useState<number | undefined>(undefined);
  const [plantEntries, setPlantEntries] = useState<PlantEntry[]>([{ name: "", category: "", type: "", age: 1, ageUnit: "ans", count: 100 }]);
  const [vannesData, setVannesData] = useState<VanneData[]>([{ nomVanne: "Vanne 1", nbPlantParVanne: 100, debitEauParVanne: 2 }]);

  // Sync preselectedUserId quand le dialog s'ouvre
  useEffect(() => {
    if (open) setFkUser(preselectedUserId ?? "");
  }, [open, preselectedUserId]);

  const reset = () => {
    setStep(0); setNomSurface(""); setLocalisation(""); setFkUser(preselectedUserId ?? ""); setTailleHa(undefined);
    setClientOpen(false);
    setPlantEntries([{ name: "", category: "", type: "", age: 1, ageUnit: "ans", count: 100 }]);
    setVannesData([{ nomVanne: "Vanne 1", nbPlantParVanne: 100, debitEauParVanne: 2 }]);
  };

  const addPlant = () => setPlantEntries([...plantEntries, { name: "", category: "", type: "", age: 1, ageUnit: "ans", count: 50 }]);
  const removePlant = (i: number) => setPlantEntries(plantEntries.filter((_, idx) => idx !== i));
  const updatePlant = (i: number, field: keyof PlantEntry, val: string | number) => {
    const arr = [...plantEntries]; arr[i] = { ...arr[i], [field]: val }; setPlantEntries(arr);
  };
  const updateNbVannes = (n: number) => {
    const arr = [...vannesData];
    while (arr.length < n) arr.push({ nomVanne: `Vanne ${arr.length + 1}`, nbPlantParVanne: 50, debitEauParVanne: 2 });
    setVannesData(arr.slice(0, n));
  };
  const updateVanne = (i: number, field: keyof VanneData, val: string | number) => {
    const arr = [...vannesData]; arr[i] = { ...arr[i], [field]: val }; setVannesData(arr);
  };

  const categories = Object.keys(PLANT_TYPES_BY_CATEGORY);

  const canStep1 = !!(nomSurface && localisation && fkUser && (tailleHa ?? 0) > 0 && plantEntries.every(p => p.name && p.category && p.type));
  const canStep2 = vannesData.every(v => v.nomVanne && v.debitEauParVanne > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createWizardParcelle({
        nomSurface, localisation, fkUser, tailleHa,
        plants: plantEntries.map(p => ({ name: p.name, type: p.type, age: ageToYears(p.age, p.ageUnit), count: p.count, waterNeedPerPlant: 2 })),
        vannes: vannesData.map(v => ({ name: v.nomVanne, nbPlants: v.nbPlantParVanne, debit: v.debitEauParVanne })),
      });
      qc.invalidateQueries({ queryKey: ["surfaces"] });
      qc.invalidateQueries({ queryKey: ["vannes"] });
      toast({ title: "Projet créé avec succès" });
      reset(); onClose();
    } catch (e: any) {
      toast({ title: "Erreur lors de la création", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const stepLabels = [t("wizard.step1"), t("wizard.step2")];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Projet</DialogTitle>
          <DialogDescription>{stepLabels[step]}</DialogDescription>
        </DialogHeader>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Étape 1 : Parcelle + Plantes */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("wizard.surfaceName")}</Label>
                <Input value={nomSurface} onChange={(e) => setNomSurface(e.target.value)} placeholder="ex: Parcelle Nord" />
              </div>
              <div>
                <Label>{t("parcelle.taille")} *</Label>
                <Input type="number" step="0.01" min="0" value={tailleHa ?? ""} onChange={(e) => setTailleHa(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="ex: 2.5" />
              </div>
              {!preselectedUserId && (
                <div className="md:col-span-2">
                  <Label>{t("wizard.user")}</Label>
                  <ClientCombobox profiles={profiles} value={fkUser} onChange={setFkUser} open={clientOpen} onOpenChange={setClientOpen} />
                </div>
              )}
              {preselectedUserId && (() => {
                const u = profiles.find(p => p.id === preselectedUserId);
                return u ? (
                  <div className="md:col-span-2 flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <LocationSelector value={localisation} onChange={setLocalisation} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">🌱 Plantes ({plantEntries.length})</Label>
                <Button variant="outline" size="sm" onClick={addPlant}><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
              </div>
              <div className="space-y-3">
                {plantEntries.map((pe, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Plante {idx + 1}</span>
                      {plantEntries.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removePlant(idx)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">{t("wizard.plantName")}</Label>
                        <Input value={pe.name} onChange={(e) => updatePlant(idx, "name", e.target.value)} placeholder="Nom" className="h-8 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Catégorie</Label>
                          <Select
                            value={pe.category}
                            onValueChange={(v) => {
                              const arr = [...plantEntries];
                              arr[idx] = { ...arr[idx], category: v, type: "" };
                              setPlantEntries(arr);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={pe.type} onValueChange={(v) => updatePlant(idx, "type", v)} disabled={!pe.category}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={pe.category ? "Type" : "Choisir d'abord une catégorie"} /></SelectTrigger>
                            <SelectContent>
                              {(PLANT_TYPES_BY_CATEGORY[pe.category] ?? []).map((tp) => (
                                <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Âge</Label>
                          <div className="flex gap-2">
                            <Input type="number" min="0" value={pe.age} onChange={(e) => updatePlant(idx, "age", parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                            <Select value={pe.ageUnit} onValueChange={(v) => updatePlant(idx, "ageUnit", v)}>
                              <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="jours">Jours</SelectItem>
                                <SelectItem value="mois">Mois</SelectItem>
                                <SelectItem value="ans">Ans</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Nombre de plantes</Label>
                          <Input type="number" min="1" value={pe.count} onChange={(e) => updatePlant(idx, "count", parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!canStep1}>
                {t("common.next")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 : Vannes */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">🚰 Vannes ({vannesData.length})</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={vannesData.length <= 1} onClick={() => updateNbVannes(vannesData.length - 1)}>−</Button>
                <span className="text-sm font-bold w-6 text-center">{vannesData.length}</span>
                <Button variant="outline" size="sm" onClick={() => updateNbVannes(vannesData.length + 1)}>+</Button>
              </div>
            </div>
            <div className="space-y-3">
              {vannesData.map((v, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚰</span>
                    <span className="font-semibold text-sm">Vanne {i + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{t("wizard.vanneName")}</Label>
                      <Input value={v.nomVanne} onChange={(e) => updateVanne(i, "nomVanne", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">{t("wizard.vanneNbPlant")}</Label>
                      <Input type="number" min="0" value={v.nbPlantParVanne} onChange={(e) => updateVanne(i, "nbPlantParVanne", parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">{t("wizard.vanneDebit")} (L/min)</Label>
                      <Input type="number" step="0.1" min="0" value={v.debitEauParVanne} onChange={(e) => updateVanne(i, "debitEauParVanne", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" /> {t("common.previous")}
              </Button>
              <Button onClick={handleSave} disabled={saving || !canStep2}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
