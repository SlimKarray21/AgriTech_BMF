import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Plan } from "./types";
import { DT } from "./utils";

// Arbre des accès mobiles (uiearth_flutter) sélectionnables pour un plan :
// chaque page peut déverrouiller des fonctionnalités fines (clés `page.fonction`).
// Doit rester aligné avec kPageFeatures côté Flutter (access_provider.dart).
// "meteo" et "profil" sont toujours autorisées et ne sont donc pas listées ici.
type PageNode = { key: string; label: string; features: { key: string; label: string }[] };

const PAGE_TREE: PageNode[] = [
  {
    key: "accueil",
    label: "Accueil",
    features: [
      { key: "accueil.ia", label: "IA (chatbot)" },
      { key: "accueil.add_rapport", label: "Ajouter rapport" },
      { key: "accueil.add_parcelle", label: "Ajouter parcelle" },
    ],
  },
  {
    key: "parcelles",
    label: "Parcelles",
    features: [
      { key: "parcelles.add_rapport", label: "Ajouter rapport" },
      { key: "parcelles.climat", label: "Valeurs climat" },
      { key: "parcelles.sol", label: "Valeurs sol (capteur)" },
      { key: "parcelles.controle_vanne", label: "Contrôle vannes" },
    ],
  },
  { key: "sante", label: "Santé plante", features: [] },
  { key: "vannes", label: "Vannes", features: [] },
];

const ALWAYS_ALLOWED_PAGES: { key: string; label: string }[] = [
  { key: "meteo", label: "Météo" },
  { key: "profil", label: "Profil" },
];

export default function PlansTab({ plans, isAdmin }: { plans: Plan[]; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<(Partial<Plan> & { featuresStr?: string }) | null>(null);

  const save = useMutation({
    mutationFn: async (p: Partial<Plan> & { featuresStr?: string }) => {
      const featuresArr = (p.featuresStr ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: p.name,
        price_dt: p.price_dt,
        duration_days: p.duration_days,
        features: featuresArr,   // array → Kotlin .toString() donne ["f1","f2"]
        page_access: p.page_access ?? [],  // pages mobiles déverrouillées par ce plan
        active: p.active ?? true,
      };
      if (p.id) {
        await updateSubscriptionPlan(p.id, payload);
      } else {
        await createSubscriptionPlan(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setEdit(null);
      toast({ title: "Plan enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openNew = () => setEdit({ name: "", price_dt: 0, duration_days: 30, featuresStr: "", page_access: [], active: true });
  const openEdit = (p: Plan) => setEdit({ ...p, featuresStr: p.features.join(", ") });

  const togglePage = (node: PageNode) => {
    if (!edit) return;
    const current = edit.page_access ?? [];
    const featureKeys = node.features.map((f) => f.key);
    const next = current.includes(node.key)
      ? // décocher la page retire aussi ses fonctionnalités
        current.filter((k) => k !== node.key && !featureKeys.includes(k))
      : [...current, node.key];
    setEdit({ ...edit, page_access: next });
  };

  const toggleFeature = (node: PageNode, featureKey: string) => {
    if (!edit) return;
    const current = edit.page_access ?? [];
    if (current.includes(featureKey)) {
      setEdit({ ...edit, page_access: current.filter((k) => k !== featureKey) });
    } else {
      // cocher une fonctionnalité accorde implicitement la page
      const withPage = current.includes(node.key) ? current : [...current, node.key];
      setEdit({ ...edit, page_access: [...withPage, featureKey] });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Plans d'abonnement</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />Nouveau plan
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="border-2 hover:border-primary/40 transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  {p.active
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300" variant="outline">Actif</Badge>
                    : <Badge variant="outline">Inactif</Badge>}
                </div>
                <div>
                  <span className="text-3xl font-bold text-primary">{DT(p.price_dt)}</span>
                  <span className="text-sm text-muted-foreground"> / {p.duration_days}j</span>
                </div>
                <ul className="text-sm space-y-1">
                  {p.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                </ul>
                <div className="flex flex-wrap gap-1 pt-1">
                  {PAGE_TREE.filter((node) => p.page_access.includes(node.key)).length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Aucune page mobile déverrouillée</span>
                  ) : (
                    PAGE_TREE.filter((node) => p.page_access.includes(node.key)).map((node) => {
                      const selected = node.features.filter((f) => p.page_access.includes(f.key));
                      return (
                        <Badge key={node.key} variant="outline" className="text-xs">
                          {node.label}
                          {selected.length > 0 && ` (${selected.length})`}
                        </Badge>
                      );
                    })
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm(`Supprimer "${p.name}" ?`)) del.mutate(p.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-muted-foreground text-center col-span-3 py-8">Aucun plan. Créez-en un.</p>
          )}
        </div>

        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Modifier plan" : "Nouveau plan"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prix (DT) *</Label>
                    <Input type="number" step="0.01" min="0" value={edit.price_dt ?? 0}
                      onChange={(e) => setEdit({ ...edit, price_dt: +e.target.value })} required />
                  </div>
                  <div>
                    <Label>Durée (jours) *</Label>
                    <Input type="number" min="1" value={edit.duration_days ?? 30}
                      onChange={(e) => setEdit({ ...edit, duration_days: +e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>Fonctionnalités <span className="text-muted-foreground text-xs">(séparées par virgule)</span></Label>
                  <Input
                    value={edit.featuresStr ?? ""}
                    onChange={(e) => setEdit({ ...edit, featuresStr: e.target.value })}
                    placeholder="Capteur sol, Électrovanne, Rapports..."
                  />
                </div>

                {/* Accès aux pages & fonctionnalités mobiles déverrouillées par ce plan */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label className="text-sm font-medium">Accès mobile (pages & fonctionnalités)</Label>
                  <p className="text-xs text-muted-foreground">
                    Cochez les pages, puis affinez les fonctionnalités. Si aucune fonctionnalité
                    n'est cochée pour une page, toute la page est accessible.
                  </p>
                  <div className="space-y-2 pt-1">
                    {PAGE_TREE.map((node) => {
                      const access = edit.page_access ?? [];
                      const pageOn = access.includes(node.key);
                      return (
                        <div key={node.key} className="rounded-md border bg-background">
                          <button
                            type="button"
                            onClick={() => togglePage(node)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
                              pageOn ? "text-foreground" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                pageOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                              }`}
                            >
                              {pageOn && <CheckCircle2 className="h-3 w-3" />}
                            </span>
                            <span className="font-medium">{node.label}</span>
                            {node.features.length === 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">page entière</span>
                            )}
                          </button>
                          {pageOn && node.features.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 border-t px-3 py-2">
                              {node.features.map((f) => {
                                const on = access.includes(f.key);
                                return (
                                  <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => toggleFeature(node, f.key)}
                                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition ${
                                      on
                                        ? "border border-primary bg-primary/10 text-foreground"
                                        : "border border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                        on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                      }`}
                                    >
                                      {on && <CheckCircle2 className="h-2.5 w-2.5" />}
                                    </span>
                                    {f.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Toujours autorisées : {ALWAYS_ALLOWED_PAGES.map((p) => p.label).join(", ")}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={edit.active ?? true} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />
                  <Label>Actif</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
