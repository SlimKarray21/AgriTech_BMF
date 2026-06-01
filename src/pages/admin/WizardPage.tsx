import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfiles, getTypesPlante, createSurface, createPlante, createVanne } from "@/services/data-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, Pencil } from "lucide-react";

interface VanneData {
  nomVanne: string;
  nbPlantParVanne: number;
  debitEauParVanne: number;
}

interface WizardData {
  nomSurface: string;
  localisation: string;
  fkUser: string;
  nomPlante: string;
  agePlante: number;
  fkTypePlante: string;
  nbVanne: number;
  nbPlante: number;
  vannes: VanneData[];
}

const initialData: WizardData = {
  nomSurface: "",
  localisation: "",
  fkUser: "",
  nomPlante: "",
  agePlante: 0,
  fkTypePlante: "",
  nbVanne: 1,
  nbPlante: 0,
  vannes: [{ nomVanne: "", nbPlantParVanne: 0, debitEauParVanne: 0 }],
};

export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);
  const [editBlock, setEditBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profilesList = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const { data: typesList = [] } = useQuery({ queryKey: ["types-plante"], queryFn: getTypesPlante });

  const updateField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "nbVanne") {
        const count = value as number;
        const vannes = [...prev.vannes];
        while (vannes.length < count) vannes.push({ nomVanne: "", nbPlantParVanne: 0, debitEauParVanne: 0 });
        next.vannes = vannes.slice(0, count);
      }
      return next;
    });
  };

  const updateVanne = (idx: number, field: keyof VanneData, value: string | number) => {
    setData((prev) => {
      const vannes = [...prev.vannes];
      vannes[idx] = { ...vannes[idx], [field]: value };
      return { ...prev, vannes };
    });
  };

  const canGoStep1 = data.nomSurface && data.localisation && data.fkUser && data.nomPlante && data.fkTypePlante && data.nbVanne > 0;
  const canGoStep2 = data.vannes.every((v) => v.nomVanne && v.debitEauParVanne > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const surface = await createSurface({ nomSurface: data.nomSurface, localisation: data.localisation, fkUser: data.fkUser });
      await createPlante({ nomPlante: data.nomPlante, age: data.agePlante, fkTypePlante: data.fkTypePlante, fkSurface: surface.id });
      for (const v of data.vannes) {
        await createVanne({ nomVanne: v.nomVanne, nbPlantParVanne: v.nbPlantParVanne, debitEauParVanne: v.debitEauParVanne, fkSurface: surface.id });
      }
      qc.invalidateQueries({ queryKey: ["surfaces"] });
      qc.invalidateQueries({ queryKey: ["plantes"] });
      qc.invalidateQueries({ queryKey: ["vannes"] });
      toast({ title: "Projet créé avec succès !" });
      setData(initialData);
      setStep(0);
    } catch {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const userEmail = profilesList.find((p) => p.id === data.fkUser)?.email ?? "—";
  const typePlanteNom = typesList.find((t) => t.id === data.fkTypePlante)?.nomPlante ?? "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-4">
        {["Surface & Plante", "Vannes", "Récapitulatif"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
            <span className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Informations Surface & Plante</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nom surface</Label><Input value={data.nomSurface} onChange={(e) => updateField("nomSurface", e.target.value)} required /></div>
              <div><Label>Localisation</Label><Input value={data.localisation} onChange={(e) => updateField("localisation", e.target.value)} required /></div>
              <div>
                <Label>Utilisateur</Label>
                <Select value={data.fkUser} onValueChange={(v) => updateField("fkUser", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{profilesList.map((p) => <SelectItem key={p.id} value={p.id}>{p.email || `${p.first_name} ${p.last_name}`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nom plante</Label><Input value={data.nomPlante} onChange={(e) => updateField("nomPlante", e.target.value)} required /></div>
              <div><Label>Âge plante (ans)</Label><Input type="number" min="0" value={data.agePlante} onChange={(e) => updateField("agePlante", parseInt(e.target.value) || 0)} /></div>
              <div>
                <Label>Type de plante</Label>
                <Select value={data.fkTypePlante} onValueChange={(v) => updateField("fkTypePlante", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                  <SelectContent>{typesList.map((t) => <SelectItem key={t.id} value={t.id}>{t.nomPlante}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nombre de vannes</Label><Input type="number" min="1" value={data.nbVanne} onChange={(e) => updateField("nbVanne", Math.max(1, parseInt(e.target.value) || 1))} /></div>
              <div><Label>Nombre de plantes</Label><Input type="number" min="0" value={data.nbPlante} onChange={(e) => updateField("nbPlante", parseInt(e.target.value) || 0)} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!canGoStep1}>Suivant <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Configuration des vannes ({data.nbVanne})</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {data.vannes.map((v, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Vanne {i + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Nom vanne</Label><Input value={v.nomVanne} onChange={(e) => updateVanne(i, "nomVanne", e.target.value)} required /></div>
                  <div><Label>Nb plantes par vanne</Label><Input type="number" min="0" value={v.nbPlantParVanne} onChange={(e) => updateVanne(i, "nbPlantParVanne", parseInt(e.target.value) || 0)} /></div>
                  <div><Label>Débit eau (L/h)</Label><Input type="number" step="0.1" min="0" value={v.debitEauParVanne} onChange={(e) => updateVanne(i, "debitEauParVanne", parseFloat(e.target.value) || 0)} /></div>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
              <Button onClick={() => setStep(2)} disabled={!canGoStep2}>Suivant <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setEditBlock("surface"); setStep(0); }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Surface</CardTitle>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Nom :</span> {data.nomSurface}</div>
                <div><span className="text-muted-foreground">Localisation :</span> {data.localisation}</div>
                <div><span className="text-muted-foreground">Utilisateur :</span> {userEmail}</div>
                <div><span className="text-muted-foreground">Plante :</span> {data.nomPlante} ({typePlanteNom}, {data.agePlante} ans)</div>
                <div><span className="text-muted-foreground">Nb vannes :</span> {data.nbVanne}</div>
                <div><span className="text-muted-foreground">Nb plantes :</span> {data.nbPlante}</div>
              </div>
            </CardContent>
          </Card>

          {data.vannes.map((v, i) => (
            <Card key={i} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setEditBlock(`vanne-${i}`); setStep(1); }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Vanne {i + 1}</CardTitle>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nom :</span> {v.nomVanne}</div>
                  <div><span className="text-muted-foreground">Nb plantes :</span> {v.nbPlantParVanne}</div>
                  <div><span className="text-muted-foreground">Débit :</span> {v.debitEauParVanne} L/h</div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
