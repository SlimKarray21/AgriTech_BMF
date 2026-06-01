import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles, updateProfile } from "@/services/data-service";
import { useFilteredProfiles } from "@/hooks/useRoleFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, CreditCard, Trash2, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

const OPT_TOOLTIPS = {
  capteur: "Capteur de sol pour mesurer humidité, salinité, pH et température en temps réel. Inclus dans toute formule.",
  electro: "Électrovanne connectée pour contrôler l'irrigation à distance et automatiser l'arrosage par parcelle.",
};
import { Profile } from "@/types/models";

export default function SubscriptionsPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: allProfiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const profiles = useFilteredProfiles(allProfiles);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [optElectro, setOptElectro] = useState(false);

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Profile> }) => updateProfile(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profiles"] }); setEditing(null); toast({ title: t("sub.updated") }); },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => updateProfile(id, {
      date_deb_abo: undefined,
      date_exp_abo: undefined,
      type_abo: undefined,
      abo_electrovanne: false,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profiles"] }); toast({ title: t("sub.removed") }); },
  });

  const openEdit = (p: Profile) => {
    setOptElectro(!!p.abo_electrovanne);
    setEditing(p);
  };

  const computeTypeAbo = (electro: boolean): "op1" | "op1_op2" => {
    return electro ? "op1_op2" : "op1";
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!editing) return;
    updateMut.mutate({
      id: editing.id,
      data: {
        date_deb_abo: fd.get("dateDebAbo") as string || undefined,
        date_exp_abo: fd.get("dateExpAbo") as string || undefined,
        abo_capteur_sol: true,
        abo_electrovanne: optElectro,
        type_abo: computeTypeAbo(optElectro),
      },
    });
  };

  const getStatus = (profile: Profile) => {
    if (!profile.date_exp_abo) return { label: t("sub.noSub"), variant: "outline" as const, className: "" };
    const diff = Math.ceil((new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return { label: t("sub.expired"), variant: "destructive" as const, className: "" };
    if (diff <= 30) return { label: `${diff} ${t("sub.daysLeft")}`, variant: "outline" as const, className: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30" };
    return { label: `${diff} ${t("sub.daysLeft")}`, variant: "default" as const, className: "" };
  };

  const renderOptions = (p: Profile) => {
    const opts: string[] = [];
    if (p.abo_capteur_sol !== false) opts.push("CapteurSol");
    if (p.abo_electrovanne) opts.push("ElectroVanne");
    
    return opts.length ? opts.join(" + ") : "—";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nav.subscriptions")}</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.title")}</TableHead>
                <TableHead>Options activées</TableHead>
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
                    <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-sm">{renderOptions(p)}</TableCell>
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
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        {(p.date_exp_abo || p.abo_electrovanne) && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMut.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle><CreditCard className="inline mr-2 h-5 w-5" />{editing?.first_name} {editing?.last_name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium text-foreground">Options d'abonnement</p>
              <div className="flex items-center gap-2 opacity-90">
                <Checkbox checked disabled />
                <Label className="text-sm flex items-center gap-1">
                  CapteurSol <span className="text-xs text-muted-foreground">(toujours inclus)</span>
                  <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent className="max-w-xs">{OPT_TOOLTIPS.capteur}</TooltipContent></Tooltip>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="electro" checked={optElectro} onCheckedChange={(v) => setOptElectro(!!v)} />
                <Label htmlFor="electro" className="text-sm cursor-pointer flex items-center gap-1">
                  ElectroVanne
                  <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent className="max-w-xs">{OPT_TOOLTIPS.electro}</TooltipContent></Tooltip>
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("sub.start")}</Label><Input name="dateDebAbo" type="date" defaultValue={editing?.date_deb_abo ?? ""} /></div>
              <div><Label>{t("sub.end")}</Label><Input name="dateExpAbo" type="date" defaultValue={editing?.date_exp_abo ?? ""} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
