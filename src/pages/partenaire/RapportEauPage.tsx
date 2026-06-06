import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, getRapportsEau, createRapportEau, deleteRapportEau } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Search, ArrowLeft, Plus, Eye, FileText, Calendar, Droplets } from "lucide-react";
import {
  interpretWaterPH, interpretCEW, interpretResiduSec,
  interpretChlorures, interpretSulfates, interpretBicarbonates,
  interpretSodiumW, interpretCalciumW, interpretMagnesiumW,
  interpretSAR, interpretDurete,
} from "@/utils/water-interpretations";

type View = "users" | "history" | "form" | "detail";

type RapportEau = {
  id: string;
  report_name: string;
  parcel_id: number;
  user_id: number;
  analysis_date: string;
  ph: number;
  cew_ds_m: number;
  residu_sec_mg_l: number;
  chlorures_meq_l: number;
  sulfates_meq_l: number;
  bicarbonates_meq_l: number;
  sodium_meq_l: number;
  calcium_meq_l: number;
  magnesium_meq_l: number;
  sar_ratio: number;
  durete_f: number;
  interpretations: string | null;
  created_at: string;
};

const EAU_FIELDS = [
  { key: "ph",               label: "pH",                        unit: "—",    method: "ISO 10523",    interp: interpretWaterPH },
  { key: "cew_ds_m",         label: "Conductivité (CEw)",        unit: "dS/m", method: "ISO 7888",     interp: interpretCEW },
  { key: "residu_sec_mg_l",  label: "Résidu sec",                unit: "mg/L", method: "Gravimétrie",  interp: interpretResiduSec },
  { key: "chlorures_meq_l",  label: "Chlorures (Cl⁻)",          unit: "meq/L",method: "Mohr",         interp: interpretChlorures },
  { key: "sulfates_meq_l",   label: "Sulfates (SO₄²⁻)",        unit: "meq/L",method: "Turbidimétrie", interp: interpretSulfates },
  { key: "bicarbonates_meq_l",label:"Bicarbonates (HCO₃⁻)",    unit: "meq/L",method: "Titrimétrie",   interp: interpretBicarbonates },
  { key: "sodium_meq_l",     label: "Sodium (Na⁺)",             unit: "meq/L",method: "Photométrie",   interp: interpretSodiumW },
  { key: "calcium_meq_l",    label: "Calcium (Ca²⁺)",           unit: "meq/L",method: "Titrimétrie",   interp: interpretCalciumW },
  { key: "magnesium_meq_l",  label: "Magnésium (Mg²⁺)",         unit: "meq/L",method: "Titrimétrie",   interp: interpretMagnesiumW },
  { key: "sar_ratio",        label: "SAR",                       unit: "—",    method: "Calcul",       interp: interpretSAR },
  { key: "durete_f",         label: "Dureté totale",             unit: "°F",   method: "Titrimétrie",  interp: interpretDurete },
];

const interpColor = (label: string | undefined) => {
  if (!label) return "";
  const l = label.toLowerCase();
  if (l.includes("élevé") || l.includes("fort") || l.includes("très") || l.includes("inadapté")) return "text-red-600";
  if (l.includes("bon") || l.includes("normal") || l.includes("neutre") || l.includes("optimal") || l.includes("faible")) return "text-emerald-600";
  return "text-orange-500";
};

function SectionBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-600 text-white text-xs font-bold mr-2">
      {num}
    </span>
  );
}

export default function RapportEauPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("users");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<RapportEau | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const profById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);

  const { data: rawRapports = [], isLoading } = useQuery({
    queryKey: ["rapports-eau"],
    queryFn: async () => {
      const data: any[] = await getRapportsEau();
      return data.map(r => ({ ...r, id: String(r.id) })) as RapportEau[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRapportEau(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rapports-eau"] });
      setView("history");
      toast({ title: "Rapport supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async (payload: any) => createRapportEau(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rapports-eau"] });
      setForm({});
      setView("history");
      toast({ title: "Rapport enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const n = (k: string): number | null => {
    const v = form[k];
    if (!v?.trim()) return null;
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
  };

  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter(p => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(q));
  }, [profiles, search]);

  const userRapports = useMemo(() =>
    rawRapports.filter(r => String(r.user_id) === selectedUserId),
    [rawRapports, selectedUserId]
  );

  const selectedProfile = selectedUserId ? profById[selectedUserId] : null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => { const v = fd.get(k); return v && (v as string).trim() !== "" ? parseFloat(v as string) : 0; };
    createMut.mutate({
      report_name:        fd.get("report_name") as string || `Rapport Eau - ${new Date().toLocaleDateString("fr-FR")}`,
      parcel_id:          0,
      user_id:            Number(selectedUserId),
      analysis_date:      fd.get("analysis_date") as string || new Date().toISOString().split("T")[0],
      ph:                 num("ph"),
      cew_ds_m:           num("cew_ds_m"),
      residu_sec_mg_l:    num("residu_sec_mg_l"),
      chlorures_meq_l:    num("chlorures_meq_l"),
      sulfates_meq_l:     num("sulfates_meq_l"),
      bicarbonates_meq_l: num("bicarbonates_meq_l"),
      sodium_meq_l:       num("sodium_meq_l"),
      calcium_meq_l:      num("calcium_meq_l"),
      magnesium_meq_l:    num("magnesium_meq_l"),
      sar_ratio:          num("sar_ratio"),
      durete_f:           num("durete_f"),
    });
  };

  // ── USERS LIST ───────────────────────────────────────────────────────────────
  if (view === "users") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Droplets className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Rapports Eau</h2>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(p => {
            const count = rawRapports.filter(r => String(r.user_id) === p.id).length;
            return (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedUserId(p.id); setView("history"); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {(p.first_name?.[0] ?? "").toUpperCase()}{(p.last_name?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <Badge variant="secondary">{count} rapport{count !== 1 ? "s" : ""}</Badge>
                </CardContent>
              </Card>
            );
          })}
          {filteredProfiles.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Aucun client</p>}
        </div>
      )}
    </div>
  );

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  if (view === "history") return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => { setView("users"); setSelectedUserId(null); }}
          className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setView("form")}>
          <Plus className="mr-2 h-4 w-4" />Nouveau rapport
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
          {(selectedProfile?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold">{selectedProfile?.first_name} {selectedProfile?.last_name}</h3>
          <p className="text-sm text-muted-foreground">{userRapports.length} rapport{userRapports.length !== 1 ? "s" : ""} eau</p>
        </div>
      </div>
      <div className="space-y-3">
        {userRapports.map(r => (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setViewing(r); setView("detail"); }}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.report_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{r.analysis_date}
                </p>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
        {userRapports.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun rapport eau pour ce client</p>}
      </div>
    </div>
  );

  // ── DETAIL ───────────────────────────────────────────────────────────────────
  if (view === "detail" && viewing) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
        <DeleteDialog onConfirm={() => deleteMut.mutate(viewing.id)} itemName={viewing.report_name} />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Droplets className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{viewing.report_name}</h3>
          <p className="text-xs text-muted-foreground">{selectedProfile?.first_name} {selectedProfile?.last_name} • {viewing.analysis_date}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={1} />Paramètres physico-chimiques</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Méthode</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
              </tr></thead>
              <tbody>
                {EAU_FIELDS.map(f => {
                  const val = (viewing as any)[f.key] as number;
                  const interp = f.interp(val);
                  return (
                    <tr key={f.key} className="border-b last:border-0">
                      <td className="py-3 text-blue-700 font-medium">{f.label}</td>
                      <td className="py-3 font-semibold">{val ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{f.unit}</td>
                      <td className="py-3 text-muted-foreground text-xs">{f.method}</td>
                      <td className={`py-3 font-semibold ${interpColor(interp?.label)}`}>{interp?.label ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
          {(selectedProfile?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold">{selectedProfile?.first_name} {selectedProfile?.last_name}</h3>
          <p className="text-xs text-muted-foreground">Nouveau rapport eau</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-base font-semibold">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom du rapport</label>
                <Input name="report_name" placeholder="ex: Puits principal - Juin 2026" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date d'analyse</label>
                <Input name="analysis_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={1} />Paramètres physico-chimiques</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Valeur</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Méthode</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                </tr></thead>
                <tbody>
                  {EAU_FIELDS.map(f => {
                    const val = n(f.key);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.key} className="border-b last:border-0">
                        <td className="py-2 text-blue-700 font-medium pr-4">{f.label}</td>
                        <td className="py-2">
                          <Input name={f.key} type="number" step="any" className="w-24 h-8"
                            value={form[f.key] ?? ""}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                        </td>
                        <td className="py-2 text-muted-foreground">{f.unit}</td>
                        <td className="py-2 text-muted-foreground text-xs">{f.method}</td>
                        <td className={`py-2 font-semibold text-sm ${interpColor(interp?.label)}`}>{interp?.label ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending}>
            {createMut.isPending ? "Enregistrement..." : "Enregistrer le rapport"}
          </Button>
        </div>
      </form>
    </div>
  );
}
