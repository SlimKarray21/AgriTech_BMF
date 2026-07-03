import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users } from "lucide-react";
import {
  getProfiles,
  getSurfaces,
  getSubscriptionPayments,
  getMaterialReservations,
  getClientSales,
} from "@/services/data-service";

/**
 * Pipeline client façon Odoo : chaque client est placé à son étape la plus
 * avancée du parcours, de « Choisir un abonnement » à « Client gagnant ».
 * Cliquer une étape affiche les clients qui s'y trouvent.
 */

const STAGES = [
  { key: 1, label: "Choisir un abonnement" },
  { key: 2, label: "Payer l'abonnement" },
  { key: 3, label: "Créer une parcelle" },
  { key: 4, label: "Consultation parcelle" },
  { key: 5, label: "Sélection appareillage" },
  { key: 6, label: "Paiement appareillage" },
  { key: 7, label: "Installer appareillage" },
  { key: 8, label: "Client gagnant" },
] as const;

// Dégradé de progression : gris → verts de plus en plus soutenus → or final.
const STAGE_COLORS = [
  "bg-slate-400",
  "bg-slate-500",
  "bg-teal-500",
  "bg-teal-600",
  "bg-emerald-500",
  "bg-emerald-600",
  "bg-green-600",
  "bg-gradient-to-r from-green-600 to-amber-500",
];

type ClientAtStage = { id: string; name: string; email: string };

export default function ClientPipeline() {
  const [openStage, setOpenStage] = useState<number | null>(null);

  const { data: profiles = [] } = useQuery<any[]>({ queryKey: ["profiles"], queryFn: getProfiles });
  const { data: surfaces = [] } = useQuery<any[]>({ queryKey: ["surfaces-all"], queryFn: getSurfaces });
  const { data: subpays = [] } = useQuery<any[]>({ queryKey: ["subpays"], queryFn: getSubscriptionPayments });
  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["reservations-all"], queryFn: getMaterialReservations });
  const { data: clientSales = [] } = useQuery<any[]>({ queryKey: ["client-sales"], queryFn: getClientSales });

  const { byStage, total } = useMemo(() => {
    const clients = profiles.filter((p) => (p.user_role ?? "").toUpperCase() === "CLIENT");

    const stageOf = (pid: string): number => {
      const subs = subpays.filter((s) => String(s.profile_id) === pid);
      const hasValidSub = subs.some((s) => s.status === "valide");
      const parcelles = surfaces.filter((s: any) => String(s.fkUser ?? "") === pid);
      const resas = reservations.filter(
        (r) => String(r.profile_id ?? "") === pid && r.status !== "annule" && r.status !== "refuse",
      );
      const sales = clientSales.filter((s) => String(s.profile_id ?? "") === pid && s.status !== "refuse");
      const hasPaidSale = sales.some((s) => s.status === "confirme");

      if (resas.some((r) => r.status === "installe")) return 8;
      if (hasPaidSale || resas.some((r) => r.status === "reserve" || r.status === "confirme")) return 7;
      if (sales.length > 0) return 6;
      if (resas.length > 0) return 5;
      if (parcelles.length > 0) return 4;
      if (hasValidSub) return 3;
      if (subs.length > 0) return 2;
      return 1;
    };

    const byStage = new Map<number, ClientAtStage[]>(STAGES.map((s) => [s.key, []]));
    clients.forEach((p) => {
      byStage.get(stageOf(String(p.id)))?.push({
        id: String(p.id),
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
        email: p.email ?? "",
      });
    });
    return { byStage, total: clients.length };
  }, [profiles, surfaces, subpays, reservations, clientSales]);

  const arrow = (i: number) => ({
    clipPath:
      i === 0
        ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
        : i === STAGES.length - 1
          ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)"
          : "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)",
  });

  const openList = openStage != null ? (byStage.get(openStage) ?? []) : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Pipeline client — parcours vers le client gagnant
          <Badge variant="secondary" className="ml-auto">{total} clients</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="flex w-full overflow-x-auto pb-1" style={{ gap: 2 }}>
          {STAGES.map((s, i) => {
            const count = byStage.get(s.key)?.length ?? 0;
            const active = openStage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setOpenStage(active ? null : s.key)}
                title={s.label}
                className={`relative flex-1 min-w-[110px] px-4 py-2 text-white transition-all ${STAGE_COLORS[i]} ${
                  active ? "ring-2 ring-primary ring-offset-1 opacity-100" : count === 0 ? "opacity-45 hover:opacity-75" : "hover:opacity-90"
                }`}
                style={arrow(i)}
              >
                <div className="flex items-center justify-center gap-1 text-lg font-extrabold leading-none">
                  {s.key === 8 && <Trophy className="h-4 w-4" />}
                  {count}
                </div>
                <div className="mt-0.5 truncate text-center text-[10px] font-semibold leading-tight opacity-90">
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>

        {openStage != null && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              {STAGES.find((s) => s.key === openStage)?.label} — {openList.length} client{openList.length > 1 ? "s" : ""}
            </div>
            {openList.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun client à cette étape.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {openList.map((c) => (
                  <Badge key={c.id} variant="outline" className="bg-background py-1 px-2.5 font-normal">
                    <span className="font-medium">{c.name}</span>
                    {c.email && <span className="ml-1.5 text-muted-foreground">{c.email}</span>}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
