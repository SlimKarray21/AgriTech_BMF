import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, getRapportsSol, createRapportSol, deleteRapportSol, getSurfaces } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Search, ArrowLeft, Plus, Eye, FileText, Calendar, FlaskConical } from "lucide-react";
import {
  interpretPH, interpretCE, interpretMO, interpretCEC, interpretGranulo,
} from "@/utils/soil-interpretations";

type View = "users" | "history" | "form" | "detail";

type RapportSol = {
  id: string;
  report_name: string;
  parcel_id: number;
  user_id: number;
  analysis_date: string;
  argile_percent: number;
  limon_percent: number;
  sable_percent: number;
  ph: number;
  ce_ds_m: number;
  calcaire_total_percent: number;
  calcaire_actif_percent: number;
  mo_percent: number;
  rapport_cn: number;
  p2o5_ppm: number;
  k2o_ppm: number;
  mgo_ppm: number;
  cec_meq_100g: number;
  esp_percent: number;
  interpretations: string | null;
  created_at: string;
};

const SOL_FIELDS = [
  { key: "ph",                    label: "pH (eau)",                       unit: "—",        interp: interpretPH },
  { key: "ce_ds_m",               label: "Conductivité (CE)",              unit: "dS/m",     interp: interpretCE },
  { key: "mo_percent",            label: "Matière organique",              unit: "%",        interp: interpretMO },
  { key: "cec_meq_100g",          label: "CEC",                            unit: "meq/100g", interp: interpretCEC },
  { key: "calcaire_total_percent",label: "Calcaire total",                 unit: "%",        interp: null },
  { key: "calcaire_actif_percent",label: "Calcaire actif",                 unit: "%",        interp: null },
  { key: "rapport_cn",            label: "Rapport C/N",                    unit: "—",        interp: null },
  { key: "p2o5_ppm",              label: "Phosphore assimilable (P₂O₅)",   unit: "ppm",      interp: null },
  { key: "k2o_ppm",               label: "Potassium échangeable (K₂O)",    unit: "ppm",      interp: null },
  { key: "mgo_ppm",               label: "Magnésium (MgO)",                unit: "ppm",      interp: null },
  { key: "esp_percent",           label: "ESP (Exchangeable Sodium %)",    unit: "%",        interp: null },
];

const GRANULO_FIELDS = [
  { key: "argile_percent", label: "Argile" },
  { key: "limon_percent",  label: "Limon"  },
  { key: "sable_percent",  label: "Sable"  },
];

const interpColor = (label: string | undefined) => {
  if (!label) return "";
  if (label === "Élevé" || label === "Alcalin" || label === "Fortement alcalin" || label === "Déficient") return "text-red-600";
  if (label === "Normal" || label === "Neutre" || label === "Optimal" || label === "Suffisant") return "text-emerald-600";
  return "text-orange-500";
};

function SectionBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-600 text-white text-xs font-bold mr-2">
      {num}
    </span>
  );
}

export default function RapportSolPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("users");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<RapportSol | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const profById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);

  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  // Parcelles appartenant à l'utilisateur sélectionné.
  const userParcelles = useMemo(
    () => surfaces.filter(s => String(s.fkUser) === selectedUserId),
    [surfaces, selectedUserId]
  );
  const parcelleNameById = useMemo(
    () => Object.fromEntries(surfaces.map(s => [String(s.id), s.nomSurface])),
    [surfaces]
  );

  const { data: rawRapports = [], isLoading } = useQuery({
    queryKey: ["rapports-sol"],
    queryFn: async () => {
      const data: any[] = await getRapportsSol();
      return data.map(r => ({ ...r, id: String(r.id) })) as RapportSol[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRapportSol(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rapports-sol"] });
      setView("history");
      toast({ title: "Rapport supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async (payload: any) => createRapportSol(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rapports-sol"] });
      setForm({});
      setView("history");
      toast({ title: "Rapport enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const n = (k: string): number | null => {
    const v = form[k];
    if (!v?.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
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
      report_name:             fd.get("report_name") as string || `Rapport Sol - ${new Date().toLocaleDateString("fr-FR")}`,
      parcel_id:               Number(selectedParcelId) || 0,
      user_id:                 Number(selectedUserId),
      analysis_date:           fd.get("analysis_date") as string || new Date().toISOString().split("T")[0],
      ph:                      num("ph"),
      ce_ds_m:                 num("ce_ds_m"),
      mo_percent:              num("mo_percent"),
      cec_meq_100g:            num("cec_meq_100g"),
      calcaire_total_percent:  num("calcaire_total_percent"),
      calcaire_actif_percent:  num("calcaire_actif_percent"),
      rapport_cn:              num("rapport_cn"),
      p2o5_ppm:                num("p2o5_ppm"),
      k2o_ppm:                 num("k2o_ppm"),
      mgo_ppm:                 num("mgo_ppm"),
      esp_percent:             num("esp_percent"),
      argile_percent:          num("argile_percent"),
      limon_percent:           num("limon_percent"),
      sable_percent:           num("sable_percent"),
    });
  };

  // ── USERS LIST ───────────────────────────────────────────────────────────────
  if (view === "users") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">Rapports Sol</h2>
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
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
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
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => { setView("users"); setSelectedUserId(null); setSelectedParcelId(null); }}
          className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
        <div className="flex items-center gap-2">
          <Select value={selectedParcelId ?? ""} onValueChange={setSelectedParcelId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choisir une parcelle" />
            </SelectTrigger>
            <SelectContent>
              {userParcelles.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nomSurface}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!selectedParcelId}
            onClick={() => setView("form")}
          >
            <Plus className="mr-2 h-4 w-4" />Nouveau rapport
          </Button>
        </div>
      </div>
      {userParcelles.length === 0 && (
        <p className="text-xs text-orange-500">Ce client n'a aucune parcelle. Créez-en une avant d'ajouter un rapport.</p>
      )}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
          {(selectedProfile?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold">{selectedProfile?.first_name} {selectedProfile?.last_name}</h3>
          <p className="text-sm text-muted-foreground">{userRapports.length} rapport{userRapports.length !== 1 ? "s" : ""} sol</p>
        </div>
      </div>
      <div className="space-y-3">
        {userRapports.map(r => (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setViewing(r); setView("detail"); }}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.report_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{r.analysis_date}
                  </p>
                  {r.parcel_id ? (
                    <Badge variant="outline" className="text-[10px]">
                      {parcelleNameById[String(r.parcel_id)] ?? `Parcelle #${r.parcel_id}`}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
        {userRapports.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun rapport sol pour ce client</p>}
      </div>
    </div>
  );

  // ── DETAIL ───────────────────────────────────────────────────────────────────
  if (view === "detail" && viewing) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
        <DeleteDialog onConfirm={() => deleteMut.mutate(viewing.id)} itemName={viewing.report_name} />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{viewing.report_name}</h3>
          <p className="text-xs text-muted-foreground">{selectedProfile?.first_name} {selectedProfile?.last_name} • {viewing.analysis_date}</p>
        </div>
      </div>

      {/* Analyses physico-chimiques */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={1} />Analyses physico-chimiques</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
              </tr></thead>
              <tbody>
                {SOL_FIELDS.map(f => {
                  const val = (viewing as any)[f.key] as number;
                  const interp = f.interp ? f.interp(val) : null;
                  return (
                    <tr key={f.key} className="border-b last:border-0">
                      <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                      <td className="py-3 font-semibold">{val ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{f.unit}</td>
                      <td className={`py-3 font-semibold ${interpColor(interp?.label)}`}>{interp?.label ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Granulométrie */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={2} />Analyse Granulométrique</h3>
          <table className="text-sm max-w-xs">
            <thead><tr className="border-b">
              <th className="text-left py-2 text-muted-foreground font-medium">Fraction</th>
              <th className="text-left py-2 text-muted-foreground font-medium">%</th>
            </tr></thead>
            <tbody>
              {GRANULO_FIELDS.map(f => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="py-3 pr-8 text-emerald-700 font-medium">{f.label}</td>
                  <td className="py-3 font-semibold">{(viewing as any)[f.key] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {viewing.argile_percent != null && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Classe texturale : </span>
              <span className="text-emerald-600 font-bold">{interpretGranulo(viewing.argile_percent, viewing.limon_percent, viewing.sable_percent)}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
          {(selectedProfile?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold">{selectedProfile?.first_name} {selectedProfile?.last_name}</h3>
          <p className="text-xs text-muted-foreground">Nouveau rapport sol</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-base font-semibold">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom du rapport</label>
                <Input name="report_name" placeholder="ex: Parcelle Nord - Juin 2026" className="mt-1" />
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
            <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={1} />Analyses physico-chimiques</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Valeur</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                </tr></thead>
                <tbody>
                  {SOL_FIELDS.map(f => {
                    const val = n(f.key);
                    const interp = f.interp && val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.key} className="border-b last:border-0">
                        <td className="py-2 text-emerald-700 font-medium pr-4">{f.label}</td>
                        <td className="py-2">
                          <Input name={f.key} type="number" step="any" className="w-24 h-8"
                            value={form[f.key] ?? ""}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                        </td>
                        <td className="py-2 text-muted-foreground">{f.unit}</td>
                        <td className={`py-2 font-semibold text-sm ${interpColor(interp?.label)}`}>{interp?.label ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center"><SectionBadge num={2} />Analyse granulométrique</h3>
            <table className="text-sm max-w-xs">
              <thead><tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Fraction</th>
                <th className="text-left py-2 text-muted-foreground font-medium">%</th>
              </tr></thead>
              <tbody>
                {GRANULO_FIELDS.map(f => (
                  <tr key={f.key} className="border-b last:border-0">
                    <td className="py-2 pr-8 text-emerald-700 font-medium">{f.label}</td>
                    <td className="py-2">
                      <Input name={f.key} type="number" step="any" className="w-20 h-8" placeholder="%"
                        value={form[f.key] ?? ""}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {n("argile_percent") != null && n("limon_percent") != null && n("sable_percent") != null && (
              <p className="mt-3 text-sm">
                <span className="font-semibold">Classe texturale : </span>
                <span className="text-emerald-600 font-bold">{interpretGranulo(n("argile_percent")!, n("limon_percent")!, n("sable_percent")!)}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMut.isPending}>
            {createMut.isPending ? "Enregistrement..." : "Enregistrer le rapport"}
          </Button>
        </div>
      </form>
    </div>
  );
}
