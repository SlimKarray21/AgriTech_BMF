import { useState, useEffect } from "react";
import { createWizardParcelle } from "@/services/data-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, ArrowRight, ArrowLeft as ArrowLeftIcon, Save, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/models";
import LocationSelector from "@/components/LocationSelector";
import { roleBadgeClass } from "./utils";

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

export function NewProjectDialog({ open, onClose, profiles, preselectedUserId, qc, t }: {
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
