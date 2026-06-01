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
import { WaterReport } from "@/types/models";
import {
  interpretWaterPH, interpretCEW, interpretResiduSec, interpretChlorures,
  interpretSulfates, interpretBicarbonates, interpretSodiumW, interpretCalciumW,
  interpretMagnesiumW, interpretMgVsCa, interpretSAR, interpretDurete,
} from "@/utils/water-interpretations";
import { useLanguage } from "@/contexts/LanguageContext";

interface DbClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

type View = "users" | "history" | "form" | "result";

function SectionBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-600 text-white text-xs font-bold mr-2">
      {num}
    </span>
  );
}

const PHYSICO_FIELDS = [
  { name: "ph", label: "pH", unit: "—", method: "ISO 10523", interp: interpretWaterPH },
  { name: "cew", label: "Conductivité (CEw)", unit: "dS/m", method: "ISO 7888", interp: interpretCEW },
  { name: "residu_sec", label: "Résidu sec", unit: "mg/L", method: "Gravimétrie", interp: interpretResiduSec },
];

const ION_FIELDS = [
  { name: "chlorures", label: "Chlorures (Cl⁻)", unit: "meq/L", method: "Mohr", interp: interpretChlorures },
  { name: "sulfates", label: "Sulfates (SO₄²⁻)", unit: "meq/L", method: "Turbidimétrie", interp: interpretSulfates },
  { name: "bicarbonates", label: "Bicarbonates (HCO₃⁻)", unit: "meq/L", method: "Titrimétrie", interp: interpretBicarbonates },
  { name: "sodium", label: "Sodium (Na⁺)", unit: "meq/L", method: "Photométrie", interp: interpretSodiumW },
  { name: "calcium", label: "Calcium (Ca²⁺)", unit: "meq/L", method: "Titrimétrie", interp: interpretCalciumW },
  { name: "magnesium", label: "Magnésium (Mg²⁺)", unit: "meq/L", method: "Titrimétrie", interp: interpretMagnesiumW },
];

const INDEX_FIELDS = [
  { name: "sar", label: "SAR", unit: "—", method: "Calcul", interp: interpretSAR },
  { name: "durete", label: "Dureté", unit: "°F", method: "Calcul", interp: interpretDurete },
];

function ReportResultView({ r }: { r: WaterReport }) {
  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={1} />Physico-chimique</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Méthode</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
              <tbody>
                {PHYSICO_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  const interp = val != null ? f.interp(val) : null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-blue-700 font-medium">{f.label}</td>
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

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={2} />Ions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Méthode</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
              <tbody>
                {ION_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  const interp = val != null ? f.interp(val) : null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-blue-700 font-medium">{f.label}</td>
                      <td className="py-3">{val ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{f.unit}</td>
                      <td className="py-3 text-muted-foreground">{f.method}</td>
                      <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
                    </tr>
                  );
                })}
                {r.magnesium != null && r.calcium != null && (
                  <tr className="border-b last:border-0">
                    <td className="py-3 text-blue-700 font-medium">Rapport Mg/Ca</td>
                    <td className="py-3">{(r.magnesium / (r.calcium || 1)).toFixed(2)}</td>
                    <td className="py-3 text-muted-foreground">—</td>
                    <td className="py-3 text-muted-foreground">Calcul</td>
                    <td className={`py-3 font-semibold ${interpretMgVsCa(r.magnesium, r.calcium).color}`}>{interpretMgVsCa(r.magnesium, r.calcium).label}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={3} />Indices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
              <tbody>
                {INDEX_FIELDS.map((f) => {
                  const val = (r as any)[f.name] as number | null;
                  const interp = val != null ? f.interp(val) : null;
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="py-3 text-blue-700 font-medium">{f.label}</td>
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

export default function RapportEauPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
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
    queryKey: ["water_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("water_reports").select("*").order("created_at", { ascending: false });
      return (data ?? []) as unknown as WaterReport[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("water_reports").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["water_reports"] }); toast({ title: t("rapports.reportDeleted") }); },
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("water_reports").insert(payload as any).select().single();
      if (error) throw error;
      return data as unknown as WaterReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["water_reports"] });
      setFormValues({});
      setView("history");
      toast({ title: t("rapports.reportSaved") });
    },
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q));
  }, [clients, search]);

  const clientReports = useMemo(() => reports.filter((r) => r.client_id === selectedClientId), [reports, selectedClientId]);
  const viewingReport = reports.find((r) => r.id === viewingReportId) ?? null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const num = (k: string) => { const v = formValues[k]; return v && v.trim() !== "" ? parseFloat(v) : null; };
    createMut.mutate({
      client_id: selectedClientId,
      report_type: "water",
      ph: num("ph"), cew: num("cew"), residu_sec: num("residu_sec"),
      chlorures: num("chlorures"), sulfates: num("sulfates"), bicarbonates: num("bicarbonates"),
      sodium: num("sodium"), calcium: num("calcium"), magnesium: num("magnesium"),
      sar: num("sar"), durete: num("durete"),
    });
  };

  if (view === "users") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("rapports.waterReport")}</h2>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("travail.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c) => {
            const count = reports.filter((r) => r.client_id === c.id).length;
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedClientId(c.id); setView("history"); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {(c.first_name?.[0] ?? "").toUpperCase()}{(c.last_name?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{count} {t("rapports.report")}{count !== 1 ? "s" : ""}</span>
                </CardContent>
              </Card>
            );
          })}
          {filteredClients.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">{t("travail.noUser")}</p>}
        </div>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { setView("users"); setSelectedClientId(null); }} className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />{t("rapports.back")}
          </button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setView("form")}>
            <Plus className="mr-2 h-4 w-4" />{t("rapports.newReport")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
            {(selectedClient?.first_name?.[0] ?? "").toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold">{selectedClient?.first_name} {selectedClient?.last_name}</h3>
            <p className="text-sm text-muted-foreground">{t("rapports.history")}</p>
          </div>
        </div>
        <div className="space-y-3">
          {clientReports.map((r, idx) => {
            const num = clientReports.length - idx;
            return (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setViewingReportId(r.id); setView("result"); }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t("rapports.report")} #{num}</p>
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
          {clientReports.length === 0 && <p className="text-muted-foreground text-center py-12">{t("rapports.noReport")}</p>}
        </div>
      </div>
    );
  }

  if (view === "result" && viewingReport) {
    const client = clients.find((c) => c.id === viewingReport.client_id);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />{t("rapports.back")}
          </button>
          <DeleteDialog onConfirm={() => { deleteMut.mutate(viewingReport.id); setView("history"); }} itemName={t("rapports.thisReport")} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
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

  // Form
  return (
    <div className="space-y-6">
      <button onClick={() => setView("history")} className="flex items-center gap-2 text-sm text-blue-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />{t("rapports.back")}
      </button>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
          {(selectedClient?.first_name?.[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold">{selectedClient?.first_name} {selectedClient?.last_name}</h3>
          <p className="text-xs text-muted-foreground">{t("rapports.newReport")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={1} />{t("rapports.physico")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Méthode</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
                <tbody>
                  {PHYSICO_FIELDS.map((f) => {
                    const val = numVal(f.name);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-3 text-blue-700 font-medium">{f.label}</td>
                        <td className="py-3"><Input name={f.name} type="number" step="any" className="w-24 h-8" placeholder="—" value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} /></td>
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

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={2} />{t("rapports.ions")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Méthode</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
                <tbody>
                  {ION_FIELDS.map((f) => {
                    const val = numVal(f.name);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-3 text-blue-700 font-medium">{f.label}</td>
                        <td className="py-3"><Input name={f.name} type="number" step="any" className="w-24 h-8" placeholder="—" value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} /></td>
                        <td className="py-3 text-muted-foreground">{f.unit}</td>
                        <td className="py-3 text-muted-foreground">{f.method}</td>
                        <td className={`py-3 font-semibold ${interp?.color ?? ""}`}>{interp?.label ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {numVal("magnesium") != null && numVal("calcium") != null && (
                    <tr className="border-b last:border-0 bg-muted/30">
                      <td className="py-3 text-blue-700 font-medium">Rapport Mg/Ca</td>
                      <td className="py-3">{(numVal("magnesium")! / (numVal("calcium")! || 1)).toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">—</td>
                      <td className="py-3 text-muted-foreground">Calcul</td>
                      <td className={`py-3 font-semibold ${interpretMgVsCa(numVal("magnesium")!, numVal("calcium")!).color}`}>{interpretMgVsCa(numVal("magnesium")!, numVal("calcium")!).label}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><SectionBadge num={3} />{t("rapports.indices")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Paramètre</th><th className="text-left py-2 text-muted-foreground font-medium">Résultat</th><th className="text-left py-2 text-muted-foreground font-medium">Unité</th><th className="text-left py-2 text-muted-foreground font-medium">Interprétation</th></tr></thead>
                <tbody>
                  {INDEX_FIELDS.map((f) => {
                    const val = numVal(f.name);
                    const interp = val != null ? f.interp(val) : null;
                    return (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-3 text-blue-700 font-medium">{f.label}</td>
                        <td className="py-3"><Input name={f.name} type="number" step="any" className="w-24 h-8" placeholder="—" value={formValues[f.name] ?? ""} onChange={(e) => updateField(f.name, e.target.value)} /></td>
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
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending}>
            {t("rapports.saveReport")}
          </Button>
        </div>
      </form>
    </div>
  );
}
