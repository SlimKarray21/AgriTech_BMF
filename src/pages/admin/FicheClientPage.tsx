import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getProfiles, getSubscriptionPayments, getClientSales, getSubscriptionPlans, getSurfaces,
} from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { DT } from "@/lib/format";
import { SubscriptionStatus } from "@/pages/shared/basedonnees/SubscriptionStatus";
import { roleBadgeClass } from "@/pages/shared/basedonnees/utils";
import { METHOD_LABEL } from "@/pages/admin/finance/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, ArrowLeft, CreditCard, Package, Grid3X3, CheckCircle2, XCircle,
  Wallet, ShoppingCart, UserRound,
} from "lucide-react";
import { Profile } from "@/types/models";

// ── Sélecteur de client (quand aucun id dans l'URL) ────────────────────────────

function ClientPicker({ profiles, onPick }: { profiles: Profile[]; onPick: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return profiles;
    const s = search.toLowerCase();
    return profiles.filter((p) => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(s));
  }, [profiles, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserRound className="h-6 w-6 text-primary" /> Fiche Client
        </h2>
        <p className="text-sm text-muted-foreground">Sélectionnez un client pour consulter sa fiche et son historique de paiements.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Nom, prénom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onPick(p.id)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{p.first_name} {p.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${roleBadgeClass(p.user_role)}`}>{p.user_role}</Badge>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">Aucun client trouvé.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FicheClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [openHistory, setOpenHistory] = useState<"abo" | "appareillage" | null>(null);

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const { data: rawSubPays = [] } = useQuery({ queryKey: ["subpays"], queryFn: getSubscriptionPayments });
  const { data: rawSales = [] } = useQuery({ queryKey: ["client-sales"], queryFn: getClientSales });
  const { data: rawPlans = [] } = useQuery({ queryKey: ["plans"], queryFn: getSubscriptionPlans });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });

  const planName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of rawPlans as any[]) map[String(p.id)] = p.name ?? "—";
    return map;
  }, [rawPlans]);

  const profile = useMemo(() => profiles.find((p) => p.id === clientId), [profiles, clientId]);

  // Historique abonnement (subscription_payments du client).
  const subPays = useMemo(
    () => (rawSubPays as any[]).filter((s) => String(s.profile_id) === String(clientId)),
    [rawSubPays, clientId],
  );
  // Historique appareillage (client_sales du client — part équipement).
  const sales = useMemo(
    () => (rawSales as any[]).filter((s) => String(s.profile_id) === String(clientId)),
    [rawSales, clientId],
  );

  const totals = useMemo(() => {
    const abo = subPays
      .filter((s) => s.status === "valide")
      .reduce((acc, s) => acc + Number(s.amount_dt ?? 0), 0);
    const appareillage = sales
      .filter((s) => s.status === "confirme")
      .reduce((acc, s) => acc + Number(s.equipment_price_dt ?? 0), 0);
    const parcelles = surfaces.filter((s) => String(s.fkUser) === String(clientId)).length;
    return { abo, appareillage, parcelles };
  }, [subPays, sales, surfaces, clientId]);

  // Pas d'id → sélecteur de client.
  if (!clientId) {
    return <ClientPicker profiles={profiles} onPick={(id) => navigate(`/admin/fiche-client/${id}`)} />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/fiche-client")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  // Disponibilité du service : abonnement présent et non expiré.
  const daysLeft = profile.date_exp_abo
    ? Math.ceil((new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const serviceActive = !!profile.date_exp_abo && !!profile.type_abo && (daysLeft ?? 0) > 0;

  const subStatusBadge = (status: string) => {
    if (status === "valide") return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Validé</Badge>;
    if (status === "refuse") return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">Refusé</Badge>;
    return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">En attente</Badge>;
  };

  const saleStatusBadge = (status: string) => {
    if (status === "confirme") return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Confirmé</Badge>;
    if (status === "annule") return <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-300">Annulé</Badge>;
    return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/fiche-client")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{profile.first_name} {profile.last_name}</h2>
          <p className="text-sm text-muted-foreground">{profile.email} · {profile.phone_number || "—"}</p>
        </div>
        <Badge variant="outline" className={`ml-auto ${roleBadgeClass(profile.user_role)}`}>{profile.user_role}</Badge>
      </div>

      {/* Bannière disponibilité du service */}
      <Card className={serviceActive ? "border-emerald-300 bg-emerald-500/5" : "border-red-300 bg-red-500/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          {serviceActive ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${serviceActive ? "text-emerald-700" : "text-red-700"}`}>
              {serviceActive ? "Service disponible" : "Service indisponible"}
            </p>
            <p className="text-sm text-muted-foreground">
              {serviceActive
                ? `Abonnement actif — ${daysLeft} jour(s) restant(s).`
                : profile.date_exp_abo
                  ? "Abonnement expiré : le client doit régler un nouveau paiement d'abonnement."
                  : "Aucun abonnement payé : l'accès à l'application est bloqué."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Total abonnement payé</p><p className="text-xl font-bold text-primary">{DT(totals.abo)}</p></div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Total appareillage payé</p><p className="text-xl font-bold text-primary">{DT(totals.appareillage)}</p></div>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Parcelles</p><p className="text-xl font-bold">{totals.parcelles}</p></div>
            <Grid3X3 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Abonnement actuel */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Abonnement actuel</CardTitle></CardHeader>
        <CardContent><SubscriptionStatus profile={profile} /></CardContent>
      </Card>

      {/* Deux historiques séparés, accessibles via deux boutons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-4 justify-start gap-3" onClick={() => setOpenHistory("abo")}>
          <div className="h-9 w-9 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Paiement Abonnement</p>
            <p className="text-xs text-muted-foreground">{subPays.length} mouvement(s) · {DT(totals.abo)} encaissé</p>
          </div>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start gap-3" onClick={() => setOpenHistory("appareillage")}>
          <div className="h-9 w-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Paiement Appareillage</p>
            <p className="text-xs text-muted-foreground">{sales.length} mouvement(s) · {DT(totals.appareillage)} encaissé</p>
          </div>
        </Button>
      </div>

      {/* Dialog — Historique paiements abonnement */}
      <Dialog open={openHistory === "abo"} onOpenChange={(o) => !o && setOpenHistory(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" /> Paiements abonnement — {profile.first_name} {profile.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Plan</TableHead><TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead><TableHead>Période</TableHead><TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subPays.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell>{planName[String(s.plan_id)] ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{DT(Number(s.amount_dt ?? 0))}</TableCell>
                    <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.date_start ?? "—"} → {s.date_exp ?? "—"}</TableCell>
                    <TableCell>{subStatusBadge(s.status)}</TableCell>
                  </TableRow>
                ))}
                {subPays.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun paiement d'abonnement</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Historique paiements appareillage */}
      <Dialog open={openHistory === "appareillage"} onOpenChange={(o) => !o && setOpenHistory(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-600" /> Paiements appareillage — {profile.first_name} {profile.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Montant matériel</TableHead>
                  <TableHead>Méthode</TableHead><TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="font-semibold">{DT(Number(s.equipment_price_dt ?? 0))}</TableCell>
                    <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                    <TableCell>{saleStatusBadge(s.status)}</TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun paiement d'appareillage</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
