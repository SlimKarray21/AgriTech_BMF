import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";

type Sale = {
  id: string;
  profile_id: string;
  subscription_plan_id: string | null;
  subscription_price_dt: number;
  equipment_price_dt: number;
  total_dt: number;
  payment_method: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

const DT = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT`;
const METHODS: Record<string, string> = { especes: "Espèces", carte: "Carte", virement: "Virement", mobile: "Paiement mobile" };

export default function VentesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  useEffect(() => {
    const ch = supabase.channel("ventes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_sales" }, () => qc.invalidateQueries({ queryKey: ["ventes"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["ventes"],
    queryFn: async () => (await supabase.from("client_sales").select("*").order("created_at", { ascending: false })).data as any || [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("id,first_name,last_name,email")).data as any || [],
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["plans-min2"],
    queryFn: async () => (await supabase.from("subscription_plans").select("id,name")).data as any || [],
  });
  const profById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p: any) => [p.id, p])), [plans]);

  const filtered = useMemo(() => sales.filter(s =>
    (statusFilter === "all" || s.status === statusFilter) &&
    (methodFilter === "all" || s.payment_method === methodFilter)
  ), [sales, statusFilter, methodFilter]);

  const kpis = useMemo(() => ({
    ca: sales.filter(s => s.status === "confirme").reduce((a, s) => a + s.total_dt, 0),
    confirme: sales.filter(s => s.status === "confirme").length,
    attente: sales.filter(s => s.status === "en_attente").length,
    refuse: sales.filter(s => s.status === "refuse").length,
  }), [sales]);

  const statusBadge = (s: string) => {
    if (s === "confirme") return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Confirmé</Badge>;
    if (s === "refuse") return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">Refusé</Badge>;
    return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">En attente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Ventes</h2>
        <p className="text-sm text-muted-foreground">Historique des ventes confirmées</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">Chiffre d'affaires</p><p className="text-xl font-bold text-primary">{DT(kpis.ca)}</p></div><TrendingUp className="h-5 w-5 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">Confirmées</p><p className="text-xl font-bold text-emerald-600">{kpis.confirme}</p></div><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">En attente</p><p className="text-xl font-bold text-orange-600">{kpis.attente}</p></div><Clock className="h-5 w-5 text-orange-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">Refusées</p><p className="text-xl font-bold text-red-600">{kpis.refuse}</p></div><XCircle className="h-5 w-5 text-red-500" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Toutes les ventes</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="confirme">Confirmé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes méthodes</SelectItem>
                {Object.entries(METHODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Acheteur</TableHead><TableHead>Abonnement</TableHead>
              <TableHead>Total</TableHead><TableHead>Méthode</TableHead><TableHead>Statut</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(s => {
                const buyer = profById[s.profile_id];
                const plan = planById[s.subscription_plan_id ?? ""];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{buyer ? `${buyer.first_name ?? ""} ${buyer.last_name ?? ""}`.trim() || buyer.email : "—"}</TableCell>
                    <TableCell>{plan?.name ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-primary">{DT(s.total_dt)}</TableCell>
                    <TableCell className="text-xs">{METHODS[s.payment_method] ?? s.payment_method}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucune vente</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
