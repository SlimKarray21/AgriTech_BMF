import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, updateProfile, getSubscriptionPlans } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Pencil, CreditCard, Trash2, AlertCircle, Package, CalendarIcon } from "lucide-react";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/models";

export default function SubscriptionsPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);

  const { data: rawPlans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: getSubscriptionPlans,
  });
  const parseFeatures = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string" || !raw.trim()) return [];
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch { /* not JSON */ }
    return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
  };
  const plans = rawPlans.map((p: any) => ({
    id: String(p.id),
    name: String(p.name),
    price_dt: Number(p.price_dt ?? 0),
    duration_days: Number(p.duration_days ?? 30),
    active: Boolean(p.active ?? true),
    features: parseFeatures(p.features),
  })).filter((p: any) => p.active);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Profile> }) => updateProfile(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setEditing(null);
      toast({ title: t("sub.updated") });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) =>
      updateProfile(id, {
        date_deb_abo: undefined,
        date_exp_abo: undefined,
        type_abo: undefined,
        abo_electrovanne: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: t("sub.removed") });
    },
  });

  // Format YYYY-MM-DD sans décalage timezone
  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const addDays = (isoDate: string, days: number): string => {
    const [y, m, day] = isoDate.split("-").map(Number);
    const d = new Date(y, m - 1, day + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  const openEdit = (p: Profile) => {
    const matchedPlan = plans.find((pl: any) => pl.name === p.type_abo || pl.id === p.type_abo);
    const start = p.date_deb_abo ?? todayIso();
    setSelectedPlanId(matchedPlan?.id ?? "");
    setStartDate(start);
    setEndDate(p.date_exp_abo ?? (matchedPlan ? addDays(start, matchedPlan.duration_days) : ""));
    setEditing(p);
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p: any) => p.id === planId);
    if (plan && startDate) setEndDate(addDays(startDate, plan.duration_days));
  };

  const handleStartChange = (val: string) => {
    setStartDate(val);
    const plan = plans.find((p: any) => p.id === selectedPlanId);
    if (plan && val) setEndDate(addDays(val, plan.duration_days));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);

    updateMut.mutate({
      id: editing.id,
      data: {
        date_deb_abo: startDate || undefined,
        date_exp_abo: endDate || undefined,
        type_abo: selectedPlan?.name ?? undefined,
        abo_capteur_sol: true,
        abo_electrovanne: false,
      },
    });
  };

  const getStatus = (profile: Profile) => {
    if (!profile.date_exp_abo || !profile.type_abo) {
      return { label: t("sub.noSub"), variant: "outline" as const, className: "" };
    }
    const diff = Math.ceil(
      (new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= 0)
      return { label: t("sub.expired"), variant: "destructive" as const, className: "" };
    if (diff <= 30)
      return {
        label: `${diff} ${t("sub.daysLeft")}`,
        variant: "outline" as const,
        className: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30",
      };
    return { label: `${diff} ${t("sub.daysLeft")}`, variant: "default" as const, className: "" };
  };

  const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nav.subscriptions")}</h2>

      {/* Abonnements disponibles — lecture seule (gérés par l'admin) */}
      {plans.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Abonnements disponibles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p: any) => (
                <Card key={p.id} className="border-2">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold leading-tight">{p.name}</h4>
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300 shrink-0">Actif</Badge>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-primary">{p.price_dt.toLocaleString("fr-FR")} DT</span>
                      <span className="text-sm text-muted-foreground"> / {p.duration_days}j</span>
                    </div>
                    {p.features.length > 0 && (
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {p.features.map((f: string, i: number) => <li key={i}>✓ {f}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4 text-sm text-orange-700 flex items-center gap-2">
          <Package className="h-4 w-4 shrink-0" />
          Aucun plan d'abonnement actif. Créez-en un dans{" "}
          <strong>Finance → Abonnements</strong> pour pouvoir les assigner ici.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.title")}</TableHead>
                <TableHead>Abonnement actif</TableHead>
                <TableHead>{t("sub.start")}</TableHead>
                <TableHead>{t("sub.end")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const status = getStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.first_name} {p.last_name}
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell>
                      {p.type_abo ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Package className="h-3 w-3" />
                          {p.type_abo}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{p.date_deb_abo ?? "—"}</TableCell>
                    <TableCell>{p.date_exp_abo ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className={status.className}>
                        {status.className && <AlertCircle className="mr-1 h-3 w-3" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {(p.date_exp_abo || p.type_abo) && (
                          <Button
                            variant="ghost" size="sm" className="text-destructive"
                            onClick={() => removeMut.mutate(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun client
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <CreditCard className="inline mr-2 h-5 w-5" />
              {editing?.first_name} {editing?.last_name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Plan selector */}
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
              <Label className="text-sm font-medium">Plan d'abonnement</Label>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun plan disponible. Créez-en un dans Finance → Abonnements.
                </p>
              ) : (
                <Select value={selectedPlanId} onValueChange={handlePlanChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <span className="font-medium">{plan.name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          — {plan.price_dt.toLocaleString("fr-FR")} DT / {plan.duration_days}j
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Dates — sélecteur calendrier DD/MM/YYYY */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("sub.start")}</Label>
                <DatePicker
                  value={startDate}
                  onChange={handleStartChange}
                  placeholder="Sélectionner début"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("sub.end")} <span className="text-xs text-muted-foreground">(modifiable)</span></Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Sélectionner fin"
                />
              </div>
            </div>

            {selectedPlan && startDate && endDate && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Début</span>
                  <span className="font-medium text-foreground">{fmtDate(startDate)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Durée plan</span>
                  <span className="font-medium text-foreground">{selectedPlan.duration_days} jours</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Expiration</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{fmtDate(endDate)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Composant DatePicker (calendrier en français, affichage DD/MM/YYYY) ────────

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const selected = isoToDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {value ? (
            <span>{fmtDisplay(value)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onChange(dateToIso(d))}
          initialFocus
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  );
}
