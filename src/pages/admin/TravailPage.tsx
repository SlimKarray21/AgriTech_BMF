import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, getSurfaces, getVannes, getTypesPlante, updateProfile, updateSurface, createSurface, createPlante, createVanne } from "@/services/data-service";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useAuth } from "@/hooks/useAuth";
import LocationSelector from "@/components/LocationSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Wifi, WifiOff, Droplets, MapPin, Leaf, SlidersHorizontal, X, Pencil, CreditCard, ArrowRight, ArrowLeft, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Profile, Surface } from "@/types/models";
import LocationPicker from "@/components/LocationPicker";

function SubscriptionBadge({ profile, t }: { profile: Profile; t: (k: string) => string }) {
  if (!profile.date_exp_abo || !profile.type_abo) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">{t("sub.noSub")}</Badge>;
  }
  const diff = Math.ceil((new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = diff <= 0;
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={isExpired ? "destructive" : "default"} className="text-xs">
        <CreditCard className="mr-1 h-3 w-3" />
        {t(`sub.${profile.type_abo}`)}
      </Badge>
      <span className={`text-xs font-medium ${isExpired ? "text-destructive" : "text-primary"}`}>
        {isExpired ? t("sub.expired") : `${diff} ${t("sub.daysLeft")}`}
      </span>
    </div>
  );
}

interface VanneData { nomVanne: string; nbPlantParVanne: number; debitEauParVanne: number; }

export default function TravailPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHasSurfaces, setFilterHasSurfaces] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editingSurface, setEditingSurface] = useState<Surface | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Realtime sync for travail page
  useEffect(() => {
    const ch = supabase
      .channel("travail-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "surfaces" }, () => qc.invalidateQueries({ queryKey: ["surfaces"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => qc.invalidateQueries({ queryKey: ["profiles"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: typesList = [] } = useQuery({ queryKey: ["types-plante"], queryFn: getTypesPlante });
  
  const profiles = useFilteredProfiles(allProfiles.filter(p => p.user_role === "CLIENT"));

  const updateProfileMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Profile> }) => updateProfile(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profiles"] }); setEditingProfile(null); toast({ title: t("users.updated") }); },
  });
  const updateSurfaceMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Surface> }) => updateSurface(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["surfaces"] }); setEditingSurface(null); toast({ title: t("surface.updated") }); },
  });

  const locations = useMemo(() => Array.from(new Set(surfaces.map((s) => s.localisation))), [surfaces]);
  const activeFilters = useMemo(() => [filterLocation, filterStatus, filterHasSurfaces].filter(f => f !== "all").length, [filterLocation, filterStatus, filterHasSurfaces]);
  const clearFilters = () => { setFilterLocation("all"); setFilterStatus("all"); setFilterHasSurfaces("all"); setSearch(""); };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch = search === "" || `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      const ps = surfaces.filter((s) => s.fkUser === p.id);
      if (filterLocation !== "all" && !ps.some((s) => s.localisation === filterLocation)) return false;
      if (filterHasSurfaces === "yes" && ps.length === 0) return false;
      if (filterHasSurfaces === "no" && ps.length > 0) return false;
      return true;
    });
  }, [profiles, search, filterLocation, filterStatus, filterHasSurfaces, surfaces]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t("travail.title")}</h2>
        <Button onClick={() => setShowWizard(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {t("travail.newProject")}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("travail.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant={showAdvanced ? "default" : "outline"} onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" /> {t("travail.filters")}
            {activeFilters > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilters}</Badge>}
          </Button>
        </div>
        {showAdvanced && (
          <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-muted/30">
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[200px] bg-background"><SelectValue placeholder={t("travail.allLocations")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("travail.allLocations")}</SelectItem>{locations.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterHasSurfaces} onValueChange={setFilterHasSurfaces}>
              <SelectTrigger className="w-[180px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("travail.allSurfaces")}</SelectItem><SelectItem value="yes">{t("travail.withSurfaces")}</SelectItem><SelectItem value="no">{t("travail.withoutSurfaces")}</SelectItem></SelectContent>
            </Select>
            {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground"><X className="mr-1 h-3 w-3" /> {t("travail.clearFilters")}</Button>}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {filteredProfiles.map((profile) => {
          const profileSurfaces = filterLocation !== "all" ? surfaces.filter((s) => s.fkUser === profile.id && s.localisation === filterLocation) : surfaces.filter((s) => s.fkUser === profile.id);
          const connectedCount = profileSurfaces.filter(s => s.isConnected).length;
          const totalCount = profileSurfaces.length;
          const userConnected = totalCount > 0 && connectedCount > 0;
          return (
            <Card key={profile.id} className="border-border hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="cursor-pointer" onClick={() => navigate(`/admin/travail/client/${profile.id}`)}>
                  <CardTitle className="text-lg">{profile.first_name} {profile.last_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="mt-1"><SubscriptionBadge profile={profile} t={t} /></div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(profile)}>
                    <Pencil className="mr-1 h-3 w-3" /> {t("travail.edit")}
                  </Button>
                  {totalCount > 0 ? (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${userConnected ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {userConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {connectedCount}/{totalCount} parcelle(s) connectée(s)
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucune parcelle</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {profileSurfaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t("travail.noSurface")}</p>
                ) : (
                  <div className="space-y-3">
                    {profileSurfaces.map((surface) => {
                      const surfaceVannes = vannes.filter((v) => v.fkSurface === surface.id);
                      return (
                        <div key={surface.id} className={`border rounded-lg p-3 transition-colors ${surface.isConnected ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/40" : "bg-muted/30 hover:bg-muted/50"}`}>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-foreground cursor-pointer hover:underline" onClick={() => navigate(`/admin/travail/surface/${surface.id}`)}>{surface.nomSurface}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`inline-block h-2 w-2 rounded-full ${surface.isConnected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                <span className={`text-xs font-medium ${surface.isConnected ? "text-emerald-600" : "text-muted-foreground"}`}>
                                  {surface.isConnected ? "Connectée" : "Non connectée"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!surface.isConnected}
                                onCheckedChange={(v) => updateSurfaceMut.mutate({ id: surface.id, data: { isConnected: v } })}
                                title={surface.isConnected ? "Déconnecter" : "Connecter"}
                              />
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingSurface(surface)}><Pencil className="h-3 w-3 text-muted-foreground" /></Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {surface.localisation}</div>
                            <div className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {surface.nbVanne} vannes</div>
                            {surface.tailleHa != null && <div className="flex items-center gap-1">📐 {surface.tailleHa} ha</div>}
                          </div>
                          {surfaceVannes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {surfaceVannes.map((v) => <Badge key={v.id} variant="secondary" className="text-xs"><Droplets className="mr-1 h-3 w-3" /> {v.nomVanne}</Badge>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filteredProfiles.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>{t("travail.noUser")}</p></div>}
      </div>

      <EditProfileDialog profile={editingProfile} onClose={() => setEditingProfile(null)} onSave={(id, data) => updateProfileMut.mutate({ id, data })} />
      <EditSurfaceDialog surface={editingSurface} profiles={profiles} onClose={() => setEditingSurface(null)} onSave={(id, data) => updateSurfaceMut.mutate({ id, data })} />
      <NewProjectDialog open={showWizard} onClose={() => setShowWizard(false)} profiles={profiles} typesList={typesList} qc={qc} t={t} />
    </div>
  );
}

function EditProfileDialog({ profile, onClose, onSave }: { profile: Profile | null; onClose: () => void; onSave: (id: string, data: Partial<Profile>) => void }) {
  const { t } = useLanguage();
  const [loc, setLoc] = useState(profile?.location ?? "");
  return (
    <Dialog open={!!profile} onOpenChange={(o) => { if (!o) onClose(); else if (profile) setLoc(profile.location ?? ""); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("travail.edit")} - {profile?.first_name} {profile?.last_name}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!profile) return;
          const fd = new FormData(e.currentTarget);
          onSave(profile.id, {
            first_name: fd.get("firstName") as string,
            last_name: fd.get("lastName") as string,
            email: fd.get("email") as string,
            phone_number: fd.get("phoneNumber") as string,
            location: loc,
            city: fd.get("city") as string,
            country: fd.get("country") as string,
          });
        }} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("auth.firstName")}</Label><Input name="firstName" defaultValue={profile?.first_name} /></div>
            <div><Label>{t("auth.lastName")}</Label><Input name="lastName" defaultValue={profile?.last_name} /></div>
          </div>
          <div><Label>{t("auth.email")}</Label><Input name="email" defaultValue={profile?.email} /></div>
          <div><Label>{t("auth.phone")}</Label><Input name="phoneNumber" defaultValue={profile?.phone_number} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ville</Label><Input name="city" defaultValue={profile?.city} /></div>
            <div><Label>Pays</Label><Input name="country" defaultValue={profile?.country} /></div>
          </div>
          <div><Label>{t("surface.location")}</Label><LocationPicker value={loc} onChange={setLoc} /></div>
          <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-2"><Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSurfaceDialog({ surface, profiles, onClose, onSave }: { surface: Surface | null; profiles: Profile[]; onClose: () => void; onSave: (id: string, data: Partial<Surface>) => void }) {
  const { t } = useLanguage();
  const [nomSurface, setNomSurface] = useState("");
  const [loc, setLoc] = useState("");
  const [tailleHa, setTailleHa] = useState<number | undefined>(undefined);
  const [fkUser, setFkUser] = useState("");

  useEffect(() => {
    if (surface) {
      setNomSurface(surface.nomSurface);
      setLoc(surface.localisation);
      setTailleHa(surface.tailleHa ?? undefined);
      setFkUser(surface.fkUser ?? "");
    }
  }, [surface]);

  return (
    <Dialog open={!!surface} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la parcelle — {surface?.nomSurface}</DialogTitle>
          <DialogDescription>Formulaire complet, champs pré-remplis.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!surface) return;
            onSave(surface.id, { nomSurface, localisation: loc, tailleHa, fkUser });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("wizard.surfaceName")}</Label>
              <Input value={nomSurface} onChange={(e) => setNomSurface(e.target.value)} required />
            </div>
            <div>
              <Label>{t("parcelle.taille")}</Label>
              <Input type="number" step="0.01" min="0" value={tailleHa ?? ""} onChange={(e) => setTailleHa(e.target.value ? parseFloat(e.target.value) : undefined)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t("wizard.user")}</Label>
              <Select value={fkUser} onValueChange={setFkUser}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.email || `${p.first_name} ${p.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("surface.location")}</Label>
            <LocationSelector value={loc} onChange={setLoc} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit"><Save className="mr-2 h-4 w-4" />{t("common.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PlantEntry { nomPlante: string; age: number; fkTypePlante: string; }

function NewProjectDialog({ open, onClose, profiles, typesList, qc, t }: { open: boolean; onClose: () => void; profiles: Profile[]; typesList: any[]; qc: any; t: (k: string) => string }) {
  const [step, setStep] = useState(0);
  const [samePlants, setSamePlants] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [nomSurface, setNomSurface] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [fkUser, setFkUser] = useState("");
  const [tailleHa, setTailleHa] = useState<number | undefined>(undefined);
  const [nbPlanteTotal, setNbPlanteTotal] = useState(0);

  const [nomPlante, setNomPlante] = useState("");
  const [agePlante, setAgePlante] = useState(0);
  const [fkTypePlante, setFkTypePlante] = useState("");

  const [plantEntries, setPlantEntries] = useState<PlantEntry[]>([{ nomPlante: "", age: 0, fkTypePlante: "" }]);

  const [nbVanne, setNbVanne] = useState(1);
  const [vannesData, setVannesData] = useState<VanneData[]>([{ nomVanne: "Vanne 1", nbPlantParVanne: 0, debitEauParVanne: 0 }]);

  const updateNbVanne = (n: number) => {
    setNbVanne(n);
    const arr = [...vannesData];
    while (arr.length < n) arr.push({ nomVanne: `Vanne ${arr.length + 1}`, nbPlantParVanne: 0, debitEauParVanne: 0 });
    setVannesData(arr.slice(0, n));
  };

  const addPlantEntry = () => setPlantEntries([...plantEntries, { nomPlante: "", age: 0, fkTypePlante: "" }]);
  const removePlantEntry = (idx: number) => setPlantEntries(plantEntries.filter((_, i) => i !== idx));
  const updatePlantEntry = (idx: number, field: keyof PlantEntry, value: string | number) => {
    const arr = [...plantEntries];
    arr[idx] = { ...arr[idx], [field]: value };
    setPlantEntries(arr);
  };

  const canStep1 = nomSurface && localisation && fkUser && nbVanne > 0 && (
    samePlants
      ? (nomPlante && fkTypePlante)
      : plantEntries.every(p => p.nomPlante && p.fkTypePlante)
  );
  const canStep2 = vannesData.every(v => v.nomVanne && v.debitEauParVanne > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const surface = await createSurface({ nomSurface, localisation, fkUser, tailleHa });

      if (samePlants) {
        await createPlante({ nomPlante, age: agePlante, fkTypePlante, fkSurface: surface.id });
      } else {
        for (const p of plantEntries) {
          await createPlante({ nomPlante: p.nomPlante, age: p.age, fkTypePlante: p.fkTypePlante, fkSurface: surface.id });
        }
      }

      for (const v of vannesData) {
        await createVanne({ nomVanne: v.nomVanne, nbPlantParVanne: v.nbPlantParVanne, debitEauParVanne: v.debitEauParVanne, fkSurface: surface.id });
      }

      qc.invalidateQueries({ queryKey: ["surfaces"] });
      qc.invalidateQueries({ queryKey: ["plantes"] });
      qc.invalidateQueries({ queryKey: ["vannes"] });
      toast({ title: t("wizard.success") });
      setStep(0); setSamePlants(null); setNomSurface(""); setLocalisation(""); setFkUser(""); setNomPlante(""); setAgePlante(0); setFkTypePlante(""); setNbVanne(1); setNbPlanteTotal(0); setTailleHa(undefined);
      setVannesData([{ nomVanne: "Vanne 1", nbPlantParVanne: 0, debitEauParVanne: 0 }]);
      setPlantEntries([{ nomPlante: "", age: 0, fkTypePlante: "" }]);
      onClose();
    } catch { toast({ title: "Erreur", variant: "destructive" }); } finally { setSaving(false); }
  };

  const stepLabels = [t("wizard.step0"), t("wizard.step1"), t("wizard.step2")];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("travail.newProject")}</DialogTitle>
          <DialogDescription>{stepLabels[step]}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-sm hidden sm:inline ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("wizard.samePlantsQuestion")}</p>
            <div className="flex gap-3">
              <Button variant={samePlants === true ? "default" : "outline"} onClick={() => { setSamePlants(true); setStep(1); }}>{t("common.yes")}</Button>
              <Button variant={samePlants === false ? "default" : "outline"} onClick={() => { setSamePlants(false); setStep(1); }}>{t("common.no")}</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>{t("wizard.surfaceName")}</Label><Input value={nomSurface} onChange={(e) => setNomSurface(e.target.value)} /></div>
              <div><Label>{t("parcelle.taille")}</Label><Input type="number" step="0.01" min="0" value={tailleHa ?? ""} onChange={(e) => setTailleHa(e.target.value ? parseFloat(e.target.value) : undefined)} /></div>
              <div>
                <Label>{t("wizard.user")}</Label>
                <Select value={fkUser} onValueChange={setFkUser}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.email || `${p.first_name} ${p.last_name}`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <LocationSelector value={localisation} onChange={setLocalisation} />
            <div><Label>{t("wizard.nbVannes")}</Label><Input type="number" min="1" value={nbVanne} onChange={(e) => updateNbVanne(Math.max(1, parseInt(e.target.value) || 1))} /></div>

            {samePlants ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>{t("wizard.plantName")}</Label><Input value={nomPlante} onChange={(e) => setNomPlante(e.target.value)} /></div>
                <div><Label>{t("wizard.plantAge")}</Label><Input type="number" min="0" value={agePlante} onChange={(e) => setAgePlante(parseInt(e.target.value) || 0)} /></div>
                <div>
                  <Label>{t("wizard.plantType")}</Label>
                  <Select value={fkTypePlante} onValueChange={setFkTypePlante}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>{typesList.map((tp: any) => <SelectItem key={tp.id} value={tp.id}>{tp.nomPlante}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {plantEntries.map((pe, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border p-3 rounded-lg">
                    <div><Label>{t("wizard.plantName")}</Label><Input value={pe.nomPlante} onChange={(e) => updatePlantEntry(idx, "nomPlante", e.target.value)} /></div>
                    <div><Label>{t("wizard.plantAge")}</Label><Input type="number" min="0" value={pe.age} onChange={(e) => updatePlantEntry(idx, "age", parseInt(e.target.value) || 0)} /></div>
                    <div>
                      <Label>{t("wizard.plantType")}</Label>
                      <Select value={pe.fkTypePlante} onValueChange={(v) => updatePlantEntry(idx, "fkTypePlante", v)}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>{typesList.map((tp: any) => <SelectItem key={tp.id} value={tp.id}>{tp.nomPlante}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {plantEntries.length > 1 && <Button variant="ghost" size="sm" onClick={() => removePlantEntry(idx)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPlantEntry}><Plus className="mr-1 h-3 w-3" /> {t("wizard.addPlant")}</Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canStep1}>{t("common.next")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {vannesData.map((v, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Vanne {i + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>{t("wizard.vanneName")}</Label><Input value={v.nomVanne} onChange={(e) => { const arr = [...vannesData]; arr[i] = { ...arr[i], nomVanne: e.target.value }; setVannesData(arr); }} /></div>
                  <div><Label>{t("wizard.vanneNbPlant")}</Label><Input type="number" min="0" value={v.nbPlantParVanne} onChange={(e) => { const arr = [...vannesData]; arr[i] = { ...arr[i], nbPlantParVanne: parseInt(e.target.value) || 0 }; setVannesData(arr); }} /></div>
                  <div><Label>{t("wizard.vanneDebit")}</Label><Input type="number" step="0.1" min="0" value={v.debitEauParVanne} onChange={(e) => { const arr = [...vannesData]; arr[i] = { ...arr[i], debitEauParVanne: parseFloat(e.target.value) || 0 }; setVannesData(arr); }} /></div>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> {t("common.previous")}</Button>
              <Button onClick={handleSave} disabled={saving || !canStep2}><Save className="mr-2 h-4 w-4" /> {saving ? "..." : t("common.save")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
