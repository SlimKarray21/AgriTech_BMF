import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfiles, getDeviceSales, getSubscriptionPayments, getSurfaces } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TunisiaGovMap, { governorateFromLocalisation } from "@/components/TunisiaGovMap";
import {
  Users, Wallet, Package, ShoppingBag, Clock, CheckCircle2, ShieldCheck, ShieldOff,
  TrendingUp, CalendarDays, LayoutDashboard, MapPin, Wifi, XCircle, CreditCard,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import { DT as formatDT } from "@/lib/format";
import { METHOD_LABEL } from "./finance/utils";

type Range = "day" | "week" | "month" | "year" | "all";
type View = "overview" | "payments" | "subs" | "sales" | "clients";

const DT = (n: number) => formatDT(n, 0);
const H = 170; // hauteur compacte des charts pour tenir sans scroll

// Palette « agri / Power BI » : verts + teal, warning ambre, négatif rouge.
const C = {
  green: "hsl(152,58%,39%)",
  greenDark: "hsl(152,60%,27%)",
  teal: "hsl(182,52%,40%)",
  lime: "hsl(96,48%,46%)",
  blueGreen: "hsl(196,55%,44%)",
  amber: "hsl(38,92%,52%)",
  red: "hsl(0,72%,55%)",
};

// Carte KPI façon Power BI : encadrée, barre d'accent verte, grande valeur.
function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400" />
      <CardContent className="p-3 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-foreground truncate" title={String(value)}>{value}</p>
          <div className={`p-1.5 rounded-md shrink-0 ${color}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary truncate" title={label}>{label}</p>
      </CardContent>
    </Card>
  );
}

// Carte graphique façon panneau Power BI (en-tête léger encadré).
function ChartCard({ title, children }: { title: string; children: any }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-3 border-b bg-muted/30">
        <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-1.5 pt-2">{children}</CardContent>
    </Card>
  );
}

const grid = (stroke = "hsl(var(--border))") => <CartesianGrid strokeDasharray="3 3" stroke={stroke} />;

export default function DashboardPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>("month");
  const [view, setView] = useState<View>("overview");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedGov, setSelectedGov] = useState<string | null>(null);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const allFiltered = useFilteredProfiles(allProfiles);
  const { data: rawSurfaces = [] } = useQuery<any[]>({ queryKey: ["surfaces-all"], queryFn: getSurfaces });
  const { data: rawSales = [] } = useQuery<any[]>({ queryKey: ["sales"], queryFn: getDeviceSales });
  const { data: rawSubpays = [] } = useQuery<any[]>({ queryKey: ["subpays"], queryFn: getSubscriptionPayments });

  // ── Filtre « entre deux dates » (created_at) — actif si les 2 dates sont saisies ──
  const dateActive = from !== "" && to !== "";
  const winStart = dateActive ? new Date(from).getTime() : -Infinity;
  const winEnd = dateActive ? new Date(to).getTime() + 86400000 : Infinity;
  const sales = useMemo(
    () => dateActive ? rawSales.filter((x) => { const tm = new Date(x.created_at).getTime(); return tm >= winStart && tm <= winEnd; }) : rawSales,
    [rawSales, dateActive, winStart, winEnd],
  );
  const subpays = useMemo(
    () => dateActive ? rawSubpays.filter((x) => { const tm = new Date(x.created_at).getTime(); return tm >= winStart && tm <= winEnd; }) : rawSubpays,
    [rawSubpays, dateActive, winStart, winEnd],
  );

  // ── Filtre gouvernorat (carte Tunisie) : nombre de parcelles par gouvernorat + filtrage des parcelles ──
  const govCounts = useMemo(() => {
    const m: Record<string, number> = {};
    rawSurfaces.forEach((s) => {
      const g = governorateFromLocalisation(s.localisation);
      if (g) m[g] = (m[g] || 0) + 1;
    });
    return m;
  }, [rawSurfaces]);
  const surfaces = useMemo(
    () => selectedGov ? rawSurfaces.filter((s) => governorateFromLocalisation(s.localisation) === selectedGov) : rawSurfaces,
    [rawSurfaces, selectedGov],
  );

  const validSales = sales.filter((s) => s.status === "valide");
  const validSubs = subpays.filter((s) => s.status === "valide");
  const revenusAppareils = validSales.reduce((acc, s) => acc + Number(s.total_dt || 0), 0);
  const revenusAbos = validSubs.reduce((acc, s) => acc + Number(s.amount_dt || 0), 0);
  const ca = revenusAppareils + revenusAbos;

  const allPays = [...sales, ...subpays];
  const paiementsEnAttente = allPays.filter((s) => s.status === "en_attente").length;
  const paiementsValides = validSales.length + validSubs.length;
  const paiementsRefuses = allPays.filter((s) => s.status === "refuse").length;
  const appareilsVendus = validSales.reduce((acc, s) => acc + Number(s.quantity || 0), 0);
  const nbVentes = validSales.length;
  const panierMoyen = nbVentes ? revenusAppareils / nbVentes : 0;

  const now = Date.now();
  const abosActifs = validSubs.filter((s) => s.date_exp && new Date(s.date_exp).getTime() > now).length;
  const abosExpires = validSubs.filter((s) => s.date_exp && new Date(s.date_exp).getTime() <= now).length;

  const clients = allFiltered.length;
  const parcelles = surfaces.length;
  const parcellesConn = surfaces.filter((s) => s.isConnected).length;
  const parcellesAtt = parcelles - parcellesConn;

  // ── Séries temporelles ──
  const cutoff = useMemo(() => {
    const d = new Date();
    if (range === "day") d.setDate(d.getDate() - 1);
    else if (range === "week") d.setDate(d.getDate() - 7);
    else if (range === "month") d.setMonth(d.getMonth() - 1);
    else if (range === "year") d.setFullYear(d.getFullYear() - 1);
    else return null;
    return d.getTime();
  }, [range]);

  const timeSeries = useMemo(() => {
    const buckets = range === "day" ? 12 : range === "week" ? 7 : range === "month" ? 15 : 12;
    const allCreated = allPays.map((x) => new Date(x.created_at).getTime()).filter((tm) => tm > 0);
    const start = dateActive ? winStart : (cutoff ?? (allCreated.length ? Math.min(...allCreated) : Date.now() - 30 * 86400_000));
    const end = dateActive ? winEnd : Date.now();
    const step = (end - start) / buckets;
    const fmt = (d: Date) => {
      if (range === "day") return d.getHours() + "h";
      if (range === "year" || range === "all") return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    };
    let cum = 0;
    return Array.from({ length: buckets }, (_, i) => {
      const t0 = start + step * i, t1 = start + step * (i + 1);
      const inRange = (s: any) => { const c = new Date(s.created_at).getTime(); return c >= t0 && c < t1; };
      const revA = validSales.filter(inRange).reduce((a, s) => a + Number(s.total_dt), 0);
      const revS = validSubs.filter(inRange).reduce((a, s) => a + Number(s.amount_dt), 0);
      const ventes = validSales.filter(inRange).reduce((a, s) => a + Number(s.quantity), 0);
      const paie = allPays.filter(inRange).length;
      cum += revA + revS;
      return { name: fmt(new Date(t1)), Appareils: revA, Abonnements: revS, Ventes: ventes, Paiements: paie, Total: cum };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, cutoff, sales, subpays]);

  // ── Agrégats catégoriels ──
  const methodAgg = useMemo(() => {
    const m: Record<string, number> = {};
    validSales.forEach((s) => { const k = s.payment_method || "—"; m[k] = (m[k] || 0) + Number(s.total_dt || 0); });
    validSubs.forEach((s) => { const k = s.payment_method || "—"; m[k] = (m[k] || 0) + Number(s.amount_dt || 0); });
    return Object.entries(m).map(([k, v]) => ({ name: METHOD_LABEL[k] ?? k, value: Math.round(v) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, subpays]);

  const caSplit = [
    { name: "Abonnements", value: Math.round(revenusAbos), fill: C.green },
    { name: "Appareils", value: Math.round(revenusAppareils), fill: C.teal },
  ].filter((d) => d.value > 0);
  const abosStatusData = [
    { name: "Actifs", value: abosActifs, fill: C.green },
    { name: "Expirés", value: abosExpires, fill: C.red },
  ].filter((d) => d.value > 0);
  const payStatusData = [
    { name: "Validés", value: paiementsValides, fill: C.green },
    { name: "En attente", value: paiementsEnAttente, fill: C.amber },
    { name: "Refusés", value: paiementsRefuses, fill: C.red },
  ].filter((d) => d.value > 0);
  const parcellesData = [
    { name: "Connectées", value: parcellesConn, fill: C.green },
    { name: "En attente", value: parcellesAtt, fill: C.amber },
  ].filter((d) => d.value > 0);
  const countsData = [
    { name: "Clients", value: clients, fill: C.green },
    { name: "Parcelles", value: parcelles, fill: C.teal },
    { name: "Connectées", value: parcellesConn, fill: C.lime },
    { name: "Attente", value: parcellesAtt, fill: C.amber },
  ];

  const ranges: { v: Range; label: string }[] = [
    { v: "day", label: "Jour" }, { v: "week", label: "Semaine" }, { v: "month", label: "Mois" },
    { v: "year", label: "Année" }, { v: "all", label: "Tout" },
  ];
  const views: { v: View; label: string; icon: any }[] = [
    { v: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { v: "payments", label: "Paiements", icon: Wallet },
    { v: "subs", label: "Abonnements", icon: ShieldCheck },
    { v: "sales", label: "Appareils", icon: Package },
    { v: "clients", label: "Clients & Parcelles", icon: Users },
  ];

  // Helpers de rendu de charts (compacts).
  const pie = (data: any[], empty: string) => data.length > 0 ? (
    <ResponsiveContainer width="100%" height={H}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={60} innerRadius={36} dataKey="value" paddingAngle={3}
          label={({ value }) => `${value}`} fontSize={10}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  ) : <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: H }}>{empty}</div>;

  const barChart = (key: string, color: string, money = false) => (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={timeSeries}>
        {grid()}<XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" /><YAxis allowDecimals={false} fontSize={10} width={32} />
        <Tooltip formatter={(v: any) => money ? `${v} DT` : v} />
        <Bar dataKey={key} fill={color} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const lineChart = (key: string, color: string) => (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={timeSeries}>
        {grid()}<XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" /><YAxis fontSize={10} width={36} />
        <Tooltip formatter={(v: any) => `${v} DT`} />
        <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const revenueArea = (
    <ResponsiveContainer width="100%" height={H}>
      <AreaChart data={timeSeries}>
        <defs>
          <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.55} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient>
          <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.55} /><stop offset="100%" stopColor={C.teal} stopOpacity={0} /></linearGradient>
        </defs>
        {grid()}<XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" /><YAxis fontSize={10} width={36} />
        <Tooltip formatter={(v: any) => `${v} DT`} /><Legend wrapperStyle={{ fontSize: 10 }} />
        <Area type="monotone" dataKey="Abonnements" stroke={C.green} fill="url(#gA)" strokeWidth={2} />
        <Area type="monotone" dataKey="Appareils" stroke={C.teal} fill="url(#gB)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const chartsGrid = "grid grid-cols-2 lg:grid-cols-3 gap-3";

  return (
    <div className="space-y-3">
      {/* Bandeau titre façon Power BI */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-4 py-3 text-white shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><LayoutDashboard className="h-5 w-5" /> {t("dashboard.title")}</h2>
          <p className="text-xs text-emerald-50/80 flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-white/15 p-0.5">
            {ranges.map((r) => (
              <Button
                key={r.v}
                size="sm"
                variant="ghost"
                onClick={() => { setRange(r.v); setFrom(""); setTo(""); }}
                className={`h-7 text-xs border-0 hover:text-white ${range === r.v && !dateActive ? "bg-white text-emerald-700 hover:bg-white hover:text-emerald-700" : "bg-transparent text-white hover:bg-white/20"}`}
              >
                {r.label}
              </Button>
            ))}
          </div>
          {/* Filtre entre deux dates */}
          <div className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5 text-xs">
            <span className="text-emerald-50/90">Du</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-[130px] border-0 bg-white/90 text-foreground text-xs" />
            <span className="text-emerald-50/90">au</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 w-[130px] border-0 bg-white/90 text-foreground text-xs" />
            {dateActive && (
              <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="ml-1 rounded p-0.5 text-white/90 hover:bg-white/20" title="Réinitialiser">
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'onglets (pages) façon Power BI */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {views.map((vw) => (
          <Button
            key={vw.v}
            size="sm"
            variant="ghost"
            onClick={() => setView(vw.v)}
            className={`h-8 gap-1.5 ${view === vw.v ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}
          >
            <vw.icon className="h-4 w-4" />{vw.label}
          </Button>
        ))}
      </div>

      {/* ───── VUE D'ENSEMBLE (5 charts) ───── */}
      {view === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat icon={Wallet} label="Chiffre d'affaire" value={DT(ca)} color="bg-emerald-500/10 text-emerald-600" />
            <Stat icon={Users} label="Clients" value={clients} color="bg-blue-500/10 text-blue-600" />
            <Stat icon={MapPin} label={selectedGov ? `Parcelles — ${selectedGov}` : "Parcelles"} value={parcelles} color="bg-violet-500/10 text-violet-600" />
            <Stat icon={ShieldCheck} label="Abonnements actifs" value={abosActifs} color="bg-teal-500/10 text-teal-600" />
          </div>

          {/* Carte Tunisie — filtre par gouvernorat (24) */}
          <Card className="overflow-hidden">
            <CardHeader className="py-2 px-3 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Parcelles par gouvernorat
              </CardTitle>
              {selectedGov ? (
                <button type="button" onClick={() => setSelectedGov(null)} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15">
                  {selectedGov} <XCircle className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Cliquez un gouvernorat pour filtrer</span>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <TunisiaGovMap counts={govCounts} selected={selectedGov} onSelect={setSelectedGov} height={320} />
            </CardContent>
          </Card>

          <div className={chartsGrid}>
            <ChartCard title="Évolution des revenus (DT)">{revenueArea}</ChartCard>
            <ChartCard title="CA cumulé (DT)">{lineChart("Total", C.greenDark)}</ChartCard>
            <ChartCard title="Répartition du CA">{pie(caSplit, "Aucune recette")}</ChartCard>
            <ChartCard title="Paiements par période">{barChart("Paiements", C.blueGreen)}</ChartCard>
            <ChartCard title="État des parcelles">{pie(parcellesData, "Aucune parcelle")}</ChartCard>
            <ChartCard title="Recettes par méthode (DT)">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={methodAgg} layout="vertical">
                  {grid()}<XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => `${v} DT`} /><Bar dataKey="value" fill={C.teal} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ───── PAIEMENTS (5 charts) ───── */}
      {view === "payments" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat icon={CreditCard} label="Chiffre d'affaire" value={DT(ca)} color="bg-emerald-500/10 text-emerald-600" />
            <Stat icon={CheckCircle2} label="Paiements validés" value={paiementsValides} color="bg-green-500/10 text-green-600" />
            <Stat icon={Clock} label="En attente" value={paiementsEnAttente} color="bg-orange-500/10 text-orange-600" />
            <Stat icon={XCircle} label="Refusés" value={paiementsRefuses} color="bg-red-500/10 text-red-600" />
          </div>
          <div className={chartsGrid}>
            <ChartCard title="Paiements par période">{barChart("Paiements", C.blueGreen)}</ChartCard>
            <ChartCard title="Répartition des statuts">{pie(payStatusData, "Aucun paiement")}</ChartCard>
            <ChartCard title="Recettes par méthode (DT)">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={methodAgg} layout="vertical">
                  {grid()}<XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => `${v} DT`} /><Bar dataKey="value" fill={C.teal} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Évolution des revenus (DT)">{revenueArea}</ChartCard>
            <ChartCard title="CA cumulé (DT)">{lineChart("Total", C.greenDark)}</ChartCard>
            <ChartCard title="Répartition du CA">{pie(caSplit, "Aucune recette")}</ChartCard>
          </div>
        </>
      )}

      {/* ───── ABONNEMENTS (4 charts) ───── */}
      {view === "subs" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat icon={ShieldCheck} label="Abonnements actifs" value={abosActifs} color="bg-emerald-500/10 text-emerald-700" />
            <Stat icon={ShieldOff} label="Abonnements expirés" value={abosExpires} color="bg-red-500/10 text-red-600" />
            <Stat icon={Wallet} label="Revenus abonnements" value={DT(revenusAbos)} color="bg-teal-500/10 text-teal-600" />
            <Stat icon={CheckCircle2} label="Abos payés" value={validSubs.length} color="bg-green-500/10 text-green-600" />
          </div>
          <div className={chartsGrid}>
            <ChartCard title="Actifs vs expirés">{pie(abosStatusData, "Aucun abonnement")}</ChartCard>
            <ChartCard title="Revenus abonnements (DT)">{barChart("Abonnements", C.green, true)}</ChartCard>
            <ChartCard title="Paiements par période">{barChart("Paiements", C.blueGreen)}</ChartCard>
            <ChartCard title="CA cumulé (DT)">{lineChart("Total", C.greenDark)}</ChartCard>
            <ChartCard title="Recettes par méthode (DT)">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={methodAgg} layout="vertical">
                  {grid()}<XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => `${v} DT`} /><Bar dataKey="value" fill={C.teal} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Répartition du CA">{pie(caSplit, "Aucune recette")}</ChartCard>
          </div>
        </>
      )}

      {/* ───── APPAREILS (4 charts) ───── */}
      {view === "sales" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat icon={ShoppingBag} label="Appareils vendus" value={appareilsVendus} color="bg-sky-500/10 text-sky-600" />
            <Stat icon={Wallet} label="Revenus appareils" value={DT(revenusAppareils)} color="bg-amber-500/10 text-amber-600" />
            <Stat icon={Package} label="Nombre de ventes" value={nbVentes} color="bg-indigo-500/10 text-indigo-600" />
            <Stat icon={TrendingUp} label="Panier moyen" value={DT(panierMoyen)} color="bg-fuchsia-500/10 text-fuchsia-600" />
          </div>
          <div className={chartsGrid}>
            <ChartCard title="Ventes d'appareils (qté)">{barChart("Ventes", C.teal)}</ChartCard>
            <ChartCard title="Revenus appareils (DT)">{barChart("Appareils", C.teal, true)}</ChartCard>
            <ChartCard title="Tendance revenus (DT)">{lineChart("Appareils", C.teal)}</ChartCard>
            <ChartCard title="CA cumulé (DT)">{lineChart("Total", C.greenDark)}</ChartCard>
            <ChartCard title="Évolution des revenus (DT)">{revenueArea}</ChartCard>
            <ChartCard title="Recettes par méthode (DT)">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={methodAgg} layout="vertical">
                  {grid()}<XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => `${v} DT`} /><Bar dataKey="value" fill={C.teal} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ───── CLIENTS & PARCELLES (4 charts) ───── */}
      {view === "clients" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat icon={Users} label="Total clients" value={clients} color="bg-blue-500/10 text-blue-600" />
            <Stat icon={MapPin} label="Parcelles" value={parcelles} color="bg-violet-500/10 text-violet-600" />
            <Stat icon={Wifi} label="Parcelles connectées" value={parcellesConn} color="bg-emerald-500/10 text-emerald-600" />
            <Stat icon={Clock} label="Parcelles en attente" value={parcellesAtt} color="bg-orange-500/10 text-orange-600" />
          </div>
          <div className={chartsGrid}>
            <ChartCard title="État des parcelles">{pie(parcellesData, "Aucune parcelle")}</ChartCard>
            <ChartCard title="Vue chiffrée">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={countsData}>
                  {grid()}<XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} width={28} />
                  <Tooltip /><Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {countsData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Répartition du CA">{pie(caSplit, "Aucune recette")}</ChartCard>
            <ChartCard title="Recettes par méthode (DT)">
              <ResponsiveContainer width="100%" height={H}>
                <BarChart data={methodAgg} layout="vertical">
                  {grid()}<XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => `${v} DT`} /><Bar dataKey="value" fill={C.teal} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Paiements par période">{barChart("Paiements", C.blueGreen)}</ChartCard>
            <ChartCard title="Abonnements actifs vs expirés">{pie(abosStatusData, "Aucun abonnement")}</ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
