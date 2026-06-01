import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfiles } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Crown, Wallet, Package, ShoppingBag, Clock, CheckCircle2, ShieldCheck, ShieldOff, TrendingUp, CalendarDays } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line } from "recharts";

type Range = "day" | "week" | "month" | "year" | "all";
const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT`;

export default function DashboardPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>("month");
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => qc.invalidateQueries({ queryKey: ["profiles"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "device_sales" }, () => qc.invalidateQueries({ queryKey: ["sales"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_payments" }, () => qc.invalidateQueries({ queryKey: ["subpays"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const allFiltered = useFilteredProfiles(allProfiles);
  const sousAdmins = allFiltered.filter(p => p.user_role === "SOUS_ADMIN");

  const { data: sales = [] } = useQuery<any[]>({ queryKey: ["sales"], queryFn: async () => (await supabase.from("device_sales").select("*").order("created_at")).data || [] });
  const { data: subpays = [] } = useQuery<any[]>({ queryKey: ["subpays"], queryFn: async () => (await supabase.from("subscription_payments").select("*").order("created_at")).data || [] });

  const validSales = sales.filter(s => s.status === "valide");
  const validSubs = subpays.filter(s => s.status === "valide");
  const revenusAppareils = validSales.reduce((acc, s) => acc + Number(s.total_dt || 0), 0);
  const revenusAbos = validSubs.reduce((acc, s) => acc + Number(s.amount_dt || 0), 0);
  const ca = revenusAppareils + revenusAbos;
  const paiementsEnAttente = [...sales, ...subpays].filter(s => s.status === "en_attente").length;
  const paiementsValides = validSales.length + validSubs.length;
  const appareilsVendus = validSales.reduce((acc, s) => acc + Number(s.quantity || 0), 0);
  const now = Date.now();
  const abosActifs = validSubs.filter(s => s.date_exp && new Date(s.date_exp).getTime() > now).length;
  const abosExpires = validSubs.filter(s => s.date_exp && new Date(s.date_exp).getTime() <= now).length;

  const stats = [
    { label: "Total Users", value: allFiltered.length, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Sous-Admins", value: sousAdmins.length, icon: Crown, color: "bg-violet-500/10 text-violet-600" },
    { label: "Chiffre d'affaire", value: DT(ca), icon: Wallet, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Revenus abonnements", value: DT(revenusAbos), icon: ShieldCheck, color: "bg-teal-500/10 text-teal-600" },
    { label: "Revenus appareils", value: DT(revenusAppareils), icon: Package, color: "bg-amber-500/10 text-amber-600" },
    { label: "Paiements en attente", value: paiementsEnAttente, icon: Clock, color: "bg-orange-500/10 text-orange-600" },
    { label: "Paiements validés", value: paiementsValides, icon: CheckCircle2, color: "bg-green-500/10 text-green-600" },
    { label: "Appareils vendus", value: appareilsVendus, icon: ShoppingBag, color: "bg-sky-500/10 text-sky-600" },
    { label: "Abonnements actifs", value: abosActifs, icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-700" },
    { label: "Abonnements expirés", value: abosExpires, icon: ShieldOff, color: "bg-red-500/10 text-red-600" },
  ];

  // Time series
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
    const allCreated = [...sales, ...subpays].map(x => new Date(x.created_at).getTime()).filter(t => t > 0);
    const start = cutoff ?? (allCreated.length ? Math.min(...allCreated) : Date.now() - 30 * 86400_000);
    const end = Date.now();
    const step = (end - start) / buckets;
    const fmt = (d: Date) => {
      if (range === "day") return d.getHours() + "h";
      if (range === "year" || range === "all") return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    };
    return Array.from({ length: buckets }, (_, i) => {
      const t0 = start + step * i, t1 = start + step * (i + 1);
      const revA = validSales.filter(s => { const c = new Date(s.created_at).getTime(); return c >= t0 && c < t1; }).reduce((a, s) => a + Number(s.total_dt), 0);
      const revS = validSubs.filter(s => { const c = new Date(s.created_at).getTime(); return c >= t0 && c < t1; }).reduce((a, s) => a + Number(s.amount_dt), 0);
      const ventes = validSales.filter(s => { const c = new Date(s.created_at).getTime(); return c >= t0 && c < t1; }).reduce((a, s) => a + Number(s.quantity), 0);
      const paie = [...sales, ...subpays].filter(s => { const c = new Date(s.created_at).getTime(); return c >= t0 && c < t1; }).length;
      return { name: fmt(new Date(t1)), Appareils: revA, Abonnements: revS, Ventes: ventes, Paiements: paie };
    });
  }, [range, cutoff, sales, subpays, validSales, validSubs]);

  const abosStatusData = [
    { name: "Actifs", value: abosActifs, fill: "hsl(145,63%,40%)" },
    { name: "Expirés", value: abosExpires, fill: "hsl(0,75%,55%)" },
  ].filter(d => d.value > 0);

  const ranges: { v: Range; label: string }[] = [
    { v: "day", label: "Jour" }, { v: "week", label: "Semaine" }, { v: "month", label: "Mois" }, { v: "year", label: "Année" }, { v: "all", label: "Tout" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {ranges.map(r => (
            <Button key={r.v} size="sm" variant={range === r.v ? "default" : "ghost"} onClick={() => setRange(r.v)} className="h-7 text-xs">{r.label}</Button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="hover:shadow-lg transition-all hover:-translate-y-0.5">
            <CardContent className="p-3 flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-foreground leading-tight truncate" title={String(s.value)}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate" title={s.label}>{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue evolution */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Évolution des revenus (DT)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(145,63%,40%)" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(145,63%,40%)" stopOpacity={0} /></linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(30,90%,55%)" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(30,90%,55%)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v: any) => `${v} DT`} />
              <Legend />
              <Area type="monotone" dataKey="Abonnements" stroke="hsl(145,63%,40%)" fill="url(#gA)" strokeWidth={2} />
              <Area type="monotone" dataKey="Appareils" stroke="hsl(30,90%,55%)" fill="url(#gB)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ventes d'appareils</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} />
                <Tooltip /><Bar dataKey="Ventes" fill="hsl(210,80%,55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Abonnements: actifs vs expirés</CardTitle></CardHeader>
          <CardContent>
            {abosStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={abosStatusData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value" label={({ name, value }) => `${name}: ${value}`} paddingAngle={3}>
                    {abosStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12">Aucun abonnement</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Paiements par période</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} />
                <Tooltip /><Bar dataKey="Paiements" fill="hsl(280,60%,55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Croissance financière (DT)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeSeries.map((d, i, arr) => ({ ...d, Total: arr.slice(0, i + 1).reduce((a, x) => a + x.Appareils + x.Abonnements, 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => `${v} DT`} />
                <Line type="monotone" dataKey="Total" stroke="hsl(145,63%,32%)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
