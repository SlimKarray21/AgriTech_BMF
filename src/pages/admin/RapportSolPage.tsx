
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getProfiles } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Search, ArrowLeft, Plus, Eye, FileText, Calendar } from "lucide-react";
import {
  interpretPH, interpretCE, interpretMO, interpretAzote, interpretPhosphore,
  interpretPotassium, interpretCalcium, interpretMagnesium, interpretSodium,
  interpretCEC, interpretFer, interpretZinc, interpretCuivre, interpretManganese,
  interpretBore, interpretGranulo,
} from "@/utils/soil-interpretations";

interface DbClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

type View = "users" | "history" | "form" | "result";

interface SoilReport {
  id: string;
  client_id: string;
  report_type: string;
  created_at: string;
  ph: number | null;
  conductivite: number | null;
  matiere_organique: number | null;
  azote: number | null;
  phosphore: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  sodium: number | null;
  cec: number | null;
  argile: number | null;
  limon: number | null;
  sable: number | null;
  fer: number | null;
  zinc: number | null;
  cuivre: number | null;
  manganese: number | null;
  bore: number | null;
}

/* ── Physico-chimique table config ── */
const PHYSICO_FIELDS = [
  { name: "ph", label: "pH (eau)", unit: "—", method: "ISO 10390", interp: interpretPH },
  { name: "conductivite", label: "Conductivité (CE)", unit: "mS/cm", method: "ISO 11265", interp: interpretCE },
  { name: "matiere_organique", label: "Matière organique", unit: "%", method: "Walkley-Black", interp: interpretMO },
  { name: "azote", label: "Azote total (N)", unit: "%", method: "Kjeldahl", interp: interpretAzote },
  { name: "phosphore", label: "Phosphore assimilable (P₂O₅)", unit: "mg/kg", method: "Olsen", interp: interpretPhosphore },
  { name: "potassium", label: "Potassium échangeable (K₂O)", unit: "mg/kg", method: "Ammonium acétate", interp: interpretPotassium },
  { name: "calcium", label: "Calcium (Ca²⁺)", unit: "mg/kg", method: "ICP", interp: interpretCalcium },
  { name: "magnesium", label: "Magnésium (Mg²⁺)", unit: "mg/kg", method: "ICP", interp: interpretMagnesium },
  { name: "sodium", label: "Sodium (Na⁺)", unit: "mg/kg", method: "ICP", interp: interpretSodium },
  { name: "cec", label: "CEC", unit: "meq/100g", method: "Ammonium acétate", interp: interpretCEC },
];

const OLIGO_FIELDS = [
  { name: "fer", label: "Fer (Fe)", unit: "mg/kg", interp: interpretFer },
  { name: "zinc", label: "Zinc (Zn)", unit: "mg/kg", interp: interpretZinc },
  { name: "cuivre", label: "Cuivre (Cu)", unit: "mg/kg", interp: interpretCuivre },
  { name: "manganese", label: "Manganèse (Mn)", unit: "mg/kg", interp: interpretManganese },
  { name: "bore", label: "Bore (B)", unit: "mg/kg", interp: interpretBore },
];

const GRANULO_FIELDS = [
  { name: "sable", label: "Sable" },
  { name: "limon", label: "Limon" },
  { name: "argile", label: "Argile" },
];

function SectionBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-600 text-white text-xs font-bold mr-2">
      {num}
    </span>
  );
}

/* ── Result display (all sections in one view) ── */
function ReportResultView({ r }: { r: SoilReport }) {
  return (
    <div className="space-y-8">
      {/* Physico-chimique */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <SectionBadge num={2} />Analyses Physico-Chimiques
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Méthode</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                </tr>
              </thead>
              <tbody>
                {PHYSICO_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  const interp = val != null ? f.interp(val) : null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                      <td className="py-3">{val ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{f.unit}</td>
                      <td className="py-3 text-muted-foreground">{f.method}</td>
                      <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Granulométrique */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <SectionBadge num={3} />Analyse Granulométrique
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-md">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Fraction</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {GRANULO_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                      <td className="py-3">{val ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {r.argile != null && r.limon != null && r.sable != null && (
            <p className="mt-4 text-sm">
              <span className="font-semibold">Classe texturale : </span>
              <span className="text-emerald-600 font-bold">{interpretGranulo(r.argile, r.limon, r.sable)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Oligo-éléments */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <SectionBadge num={4} />Analyse des oligo-éléments
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Élément</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                </tr>
              </thead>
              <tbody>
                {OLIGO_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  const interp = val != null ? f.interp(val) : null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                      <td className="py-3">{val ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{f.unit}</td>
                      <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
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
}

export default function RapportSolPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("users");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const updateField = (name: string, value: string) => setFormValues((prev) => ({ ...prev, [name]: value }));
  const numVal = (name: string): number | null => {
    const v = formValues[name];
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const filteredProfiles = useFilteredProfiles(allProfiles.filter(p => p.user_role === "CLIENT"));
  
  const clients: DbClient[] = useMemo(() => filteredProfiles.map(p => ({
    id: p.user_id,
    first_name: p.first_name || null,
    last_name: p.last_name || null,
    email: p.email || "",
  })), [filteredProfiles]);


  const { data: reports = [] } = useQuery({
    queryKey: ["soil_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("soil_reports").select("*").order("created_at", { ascending: false });
      return (data ?? []) as SoilReport[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("soil_reports").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["soil_reports"] }); toast({ title: "Rapport supprimé" }); },
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("soil_reports").insert(payload as any).select().single();
      if (error) throw error;
      return data as SoilReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soil_reports"] });
      setFormValues({});
      setView("history");
      toast({ title: "Rapport enregistré" });
    },
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const clientReports = useMemo(() =>
    reports.filter((r) => r.client_id === selectedClientId),
    [reports, selectedClientId]
  );

  const viewingReport = reports.find((r) => r.id === viewingReportId) ?? null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => { const v = fd.get(k); return v && (v as string).trim() !== "" ? parseFloat(v as string) : null; };
    createMut.mutate({
      client_id: selectedClientId,
      report_type: "full",
      ph: num("ph"), conductivite: num("conductivite"), matiere_organique: num("matiere_organique"),
      azote: num("azote"), phosphore: num("phosphore"), potassium: num("potassium"),
      calcium: num("calcium"), magnesium: num("magnesium"), sodium: num("sodium"), cec: num("cec"),
      argile: num("argile"), limon: num("limon"), sable: num("sable"),
      fer: num("fer"), zinc: num("zinc"), cuivre: num("cuivre"), manganese: num("manganese"), bore: num("bore"),
    });
  };

  // ── Users list ──
  if (view === "users") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Rapport Sol</h2>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c) => {
            const count = reports.filter((r) => r.client_id === c.id).length;
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedClientId(c.id); setView("history"); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {(c.first_name?.[0] ?? "").toUpperCase()}{(c.last_name?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{count} rapport{count !== 1 ? "s" : ""}</span>
                </CardContent>
              </Card>
            );
          })}
          {filteredClients.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Aucun utilisateur trouvé</p>}
        </div>
      </div>
    );
  }

  // ── History ──
  if (view === "history") {
    return (
      <div className="space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-xl font-bold">Historique</h2>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => { setView("users"); setSelectedClientId(null); }} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("form")}>
            <Plus className="mr-2 h-4 w-4" />Nouveau rapport
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
            {(selectedClient?.first_name?.[0] ?? "").toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold">{selectedClient?.first_name} {selectedClient?.last_name}</h3>
            <p className="text-sm text-muted-foreground">Historique des rapports</p>
          </div>
        </div>

        <div className="space-y-3">
          {clientReports.map((r, idx) => {
            const num = clientReports.length - idx;
            return (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setViewingReportId(r.id); setView("result"); }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Rapport #{num}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
          {clientReports.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun rapport pour cet utilisateur</p>}
        </div>
      </div>
    );
  }

  // ── Result view ──
  if (view === "result" && viewingReport) {
    const client = clients.find((c) => c.id === viewingReport.client_id);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
          <DeleteDialog onConfirm={() => { deleteMut.mutate(viewingReport.id); setView("history"); }} itemName="ce rapport" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
            {(client?.first_name?.[0] ?? "").toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold">{client?.first_name} {client?.last_name}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(viewingReport.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <ReportResultView r={viewingReport} />
      </div>
    );
  }

  // ── Form view (all sections in one form, with live interpretation) ──

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
          {(selectedClient?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold">{selectedClient?.first_name} {selectedClient?.last_name}</h3>
          <p className="text-xs text-muted-foreground">Nouveau rapport</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Physico-chimique */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <SectionBadge num={2} />Analyses Physico-Chimiques
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Méthode</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {PHYSICO_FIELDS.map((f) => {
                    const val = numVal(f.name);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                        <td className="py-3">
                          <Input name={f.name} type="number" step="any" className="w-24 h-8" placeholder="—"
                            value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} />
                        </td>
                        <td className="py-3 text-muted-foreground">{f.unit}</td>
                        <td className="py-3 text-muted-foreground">{f.method}</td>
                        <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Granulométrique */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <SectionBadge num={3} />Analyse Granulométrique
            </h3>
            <table className="text-sm max-w-md">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Fraction</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {GRANULO_FIELDS.map((f) => (
                  <tr key={f.name} className="border-b last:border-0">
                    <td className="py-3 pr-8 text-emerald-700 font-medium">{f.label}</td>
                    <td className="py-3">
                      <Input name={f.name} type="number" step="any" className="w-20 h-8" placeholder="%"
                        value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {numVal("argile") != null && numVal("limon") != null && numVal("sable") != null && (
              <p className="mt-4 text-sm">
                <span className="font-semibold">Classe texturale : </span>
                <span className="text-emerald-600 font-bold">{interpretGranulo(numVal("argile")!, numVal("limon")!, numVal("sable")!)}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Oligo-éléments */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <SectionBadge num={4} />Analyse des oligo-éléments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Élément</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Résultat</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Unité</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {OLIGO_FIELDS.map((f) => {
                    const val = numVal(f.name);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-3 text-emerald-700 font-medium">{f.label}</td>
                        <td className="py-3">
                          <Input name={f.name} type="number" step="any" className="w-24 h-8" placeholder="—"
                            value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} />
                        </td>
                        <td className="py-3 text-muted-foreground">{f.unit}</td>
                        <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMut.isPending}>
            Enregistrer le rapport
          </Button>
        </div>
      </form>
    </div>
  );
}
