import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getClientSales, getSubscriptionPayments, getProfiles, getSubscriptionPlans } from "@/services/data-service";
import { DT } from "@/lib/format";
import { METHOD_LABEL } from "@/pages/admin/finance/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, TrendingUp, Wallet, Package, Clock, Download } from "lucide-react";

// Une ligne du journal = un encaissement, étiqueté par nature.
type Nature = "abonnement" | "appareillage";
type EtatPaiement = "encaisse" | "en_attente" | "refuse";

type Recette = {
  id: string;
  date: string;          // created_at ISO
  clientId: string;
  clientName: string;
  nature: Nature;
  detail: string;        // nom du plan (abo) / "Matériel" (appareillage)
  amount: number;
  method: string;
  etat: EtatPaiement;
};

type Range = "day" | "week" | "month" | "year" | "all";
const RANGE_LABEL: Record<Range, string> = {
  day: "Aujourd'hui", week: "7 jours", month: "30 jours", year: "12 mois", all: "Tout",
};

// Borne basse (rolling window) pour le filtre période ; null = pas de borne.
function rangeCutoff(range: Range): number | null {
  if (range === "all") return null;
  const day = 86_400_000;
  const spans: Record<Exclude<Range, "all">, number> = { day, week: 7 * day, month: 30 * day, year: 365 * day };
  return Date.now() - spans[range];
}

export default function RecettesPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("month");
  const [natureFilter, setNatureFilter] = useState<"all" | Nature>("all");
  const [etatFilter, setEtatFilter] = useState<"all" | EtatPaiement>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const { data: rawSubPays = [] } = useQuery({ queryKey: ["subpays"], queryFn: getSubscriptionPayments });
  const { data: rawSales = [] } = useQuery({ queryKey: ["client-sales"], queryFn: getClientSales });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: getSubscriptionPlans });

  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const planName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of plans as any[]) m[String(p.id)] = p.name ?? "—";
    return m;
  }, [plans]);

  const clientName = (id: string) => {
    const p = profById[String(id)];
    return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "—";
  };

  // Construction du journal unifié : abonnements (subscription_payments) +
  // appareillage (part équipement des client_sales).
  const journal = useMemo<Recette[]>(() => {
    const abo: Recette[] = (rawSubPays as any[]).map((s) => ({
      id: `sub-${s.id}`,
      date: s.created_at ?? "",
      clientId: String(s.profile_id),
      clientName: clientName(s.profile_id),
      nature: "abonnement" as const,
      detail: planName[String(s.plan_id)] ?? "Abonnement",
      amount: Number(s.amount_dt ?? 0),
      method: s.payment_method ?? "cash",
      etat: s.status === "valide" ? "encaisse" : s.status === "refuse" ? "refuse" : "en_attente",
    }));
    const equip: Recette[] = (rawSales as any[])
      .filter((s) => Number(s.equipment_price_dt ?? 0) > 0)
      .map((s) => ({
        id: `sale-${s.id}`,
        date: s.created_at ?? "",
        clientId: String(s.profile_id),
        clientName: clientName(s.profile_id),
        nature: "appareillage" as const,
        detail: "Matériel",
        amount: Number(s.equipment_price_dt ?? 0),
        method: s.payment_method ?? "cash",
        etat: s.status === "confirme" ? "encaisse" : s.status === "annule" || s.status === "refuse" ? "refuse" : "en_attente",
      }));
    return [...abo, ...equip];
  }, [rawSubPays, rawSales, profById, planName]);

  const filtered = useMemo(() => {
    const cutoff = rangeCutoff(range);
    return journal.filter((r) => {
      if (cutoff !== null && (!r.date || new Date(r.date).getTime() < cutoff)) return false;
      if (natureFilter !== "all" && r.nature !== natureFilter) return false;
      if (etatFilter !== "all" && r.etat !== etatFilter) return false;
      if (methodFilter !== "all" && r.method !== methodFilter) return false;
      return true;
    });
  }, [journal, range, natureFilter, etatFilter, methodFilter]);

  // KPIs ventilés par flux (sur encaissé uniquement), + en attente.
  const kpis = useMemo(() => {
    const enc = filtered.filter((r) => r.etat === "encaisse");
    const abo = enc.filter((r) => r.nature === "abonnement").reduce((a, r) => a + r.amount, 0);
    const appareillage = enc.filter((r) => r.nature === "appareillage").reduce((a, r) => a + r.amount, 0);
    const attente = filtered.filter((r) => r.etat === "en_attente").reduce((a, r) => a + r.amount, 0);
    return { ca: abo + appareillage, abo, appareillage, attente };
  }, [filtered]);

  const { sorted, sort } = useTableSort(filtered, {
    date: (r) => (r.date ? new Date(r.date) : null),
    client: (r) => r.clientName,
    nature: (r) => r.nature,
    detail: (r) => r.detail,
    amount: (r) => r.amount,
    method: (r) => METHOD_LABEL[r.method] ?? r.method,
    etat: (r) => r.etat,
  });

  const natureBadge = (n: Nature) =>
    n === "abonnement"
      ? <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-300"><Wallet className="h-3 w-3 mr-1" />Abonnement</Badge>
      : <Badge variant="outline" className="bg-violet-500/15 text-violet-700 border-violet-300"><Package className="h-3 w-3 mr-1" />Appareillage</Badge>;

  const etatBadge = (e: EtatPaiement) => {
    if (e === "encaisse") return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Encaissé</Badge>;
    if (e === "refuse") return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">Refusé/Annulé</Badge>;
    return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">En attente</Badge>;
  };

  const exportCsv = () => {
    const sep = ";";
    const header = ["Date", "Client", "Nature", "Détail", "Montant (DT)", "Méthode", "Statut"];
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = sorted.map((r) => [
      r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "",
      r.clientName,
      r.nature === "abonnement" ? "Abonnement" : "Appareillage",
      r.detail,
      r.amount.toFixed(2),
      METHOD_LABEL[r.method] ?? r.method,
      r.etat === "encaisse" ? "Encaissé" : r.etat === "refuse" ? "Refusé/Annulé" : "En attente",
    ]);
    const csv = "﻿" + [header, ...lines].map((row) => row.map(cell).join(sep)).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `recettes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Journal des Recettes</h2>
          <p className="text-sm text-muted-foreground">Encaissements abonnements &amp; appareillage — {RANGE_LABEL[range]}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Exporter CSV</Button>
      </div>

      {/* KPIs ventilés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Chiffre d'affaires</p><p className="text-xl font-bold text-primary">{DT(kpis.ca)}</p></div><TrendingUp className="h-5 w-5 text-primary" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">dont Abonnement</p><p className="text-xl font-bold text-blue-600">{DT(kpis.abo)}</p></div><Wallet className="h-5 w-5 text-blue-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">dont Appareillage</p><p className="text-xl font-bold text-violet-600">{DT(kpis.appareillage)}</p></div><Package className="h-5 w-5 text-violet-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">En attente</p><p className="text-xl font-bold text-orange-600">{DT(kpis.attente)}</p></div><Clock className="h-5 w-5 text-orange-500" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Mouvements ({filtered.length})</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(RANGE_LABEL) as Range[]).map((r) => <SelectItem key={r} value={r}>{RANGE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={natureFilter} onValueChange={(v) => setNatureFilter(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes natures</SelectItem>
                <SelectItem value="abonnement">Abonnement</SelectItem>
                <SelectItem value="appareillage">Appareillage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={etatFilter} onValueChange={(v) => setEtatFilter(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="encaisse">Encaissé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="refuse">Refusé/Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes méthodes</SelectItem>
                {Object.entries(METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead field="date" sort={sort}>Date</SortableHead>
                <SortableHead field="client" sort={sort}>Client</SortableHead>
                <SortableHead field="nature" sort={sort}>Nature</SortableHead>
                <SortableHead field="detail" sort={sort}>Détail</SortableHead>
                <SortableHead field="amount" sort={sort}>Montant</SortableHead>
                <SortableHead field="method" sort={sort}>Méthode</SortableHead>
                <SortableHead field="etat" sort={sort}>Statut</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate(`/admin/fiche-client/${r.clientId}`)}
                >
                  <TableCell className="text-xs">{r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell className="font-medium">{r.clientName}</TableCell>
                  <TableCell>{natureBadge(r.nature)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                  <TableCell className="font-semibold text-primary">{DT(r.amount)}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABEL[r.method] ?? r.method}</TableCell>
                  <TableCell>{etatBadge(r.etat)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucune recette sur cette période</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
