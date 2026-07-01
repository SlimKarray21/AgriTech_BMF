import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmailCampaigns, createEmailCampaign, updateEmailCampaign, deleteEmailCampaign,
  sendEmailCampaignNow, previewEmailCampaign, getSubscriptionPlans,
} from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Mail, Plus, Pencil, Send, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Audience = "all" | "client" | "partenaire" | "abonnement" | "nom";

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Tout le monde",
  client: "Clients",
  partenaire: "Partenaires",
  abonnement: "Par abonnement",
  nom: "Par nom (recherche)",
};

type Form = {
  id?: string;
  name: string;
  audience: Audience;
  planName: string;
  searchName: string;
  useExpiry: boolean;
  expiryDays: number;
  frequencyDays: number;
  subject: string;
  body: string;
  active: boolean;
};

const emptyForm: Form = {
  name: "", audience: "all", planName: "", searchName: "",
  useExpiry: false, expiryDays: 30, frequencyDays: 4,
  subject: "", body: "", active: true,
};

export default function MailAutomatiquePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);

  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["email-campaigns"], queryFn: getEmailCampaigns });
  const { data: rawPlans = [] } = useQuery<any[]>({ queryKey: ["plans"], queryFn: getSubscriptionPlans });
  const plans = useMemo(
    () => rawPlans.map((p) => ({ id: String(p.id), name: String(p.name) })),
    [rawPlans],
  );

  const toPayload = (f: Form) => ({
    name: f.name || "Campagne",
    audience: f.audience,
    subject: f.subject,
    body: f.body,
    plan_name: f.audience === "abonnement" ? f.planName || null : null,
    search_name: f.audience === "nom" ? f.searchName || null : null,
    expiry_within_days: f.useExpiry ? f.expiryDays : null,
    frequency_days: f.frequencyDays,
    active: f.active,
  });

  const saveMut = useMutation({
    mutationFn: async (f: Form) => {
      if (f.id) await updateEmailCampaign(f.id, toPayload(f));
      else await createEmailCampaign(toPayload(f));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      setForm(null);
      toast({ title: "Campagne enregistrée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmailCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-campaigns"] }); toast({ title: "Campagne supprimée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) => sendEmailCampaignNow(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({ title: "Envoi effectué", description: `${r.sent} email(s) envoyé(s).` });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const previewMut = useMutation({
    mutationFn: (f: Form) => previewEmailCampaign({
      audience: f.audience,
      plan_name: f.audience === "abonnement" ? f.planName || null : null,
      search_name: f.audience === "nom" ? f.searchName || null : null,
      expiry_within_days: f.useExpiry ? f.expiryDays : null,
    }),
    onSuccess: (r) => setPreview(r),
    onError: (e: any) => toast({ title: "Erreur aperçu", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setPreview(null); setForm({ ...emptyForm }); };
  const openEdit = (c: any) => {
    setPreview(null);
    setForm({
      id: String(c.id),
      name: c.name ?? "",
      audience: (c.audience ?? "all") as Audience,
      planName: c.plan_name ?? "",
      searchName: c.search_name ?? "",
      useExpiry: c.expiry_within_days != null,
      expiryDays: c.expiry_within_days ?? 30,
      frequencyDays: c.frequency_days ?? 4,
      subject: c.subject ?? "",
      body: c.body ?? "",
      active: c.active ?? true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Mail automatique
          </h2>
          <p className="text-sm text-muted-foreground">Campagnes email ciblées, envoyées automatiquement</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nouvelle campagne</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Campagnes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Déclencheur</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernier envoi</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.name}
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {AUDIENCE_LABEL[(c.audience ?? "all") as Audience]}
                    {c.audience === "abonnement" && c.plan_name && <span className="text-xs text-muted-foreground"> ({c.plan_name})</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.expiry_within_days != null
                      ? <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-300"><Clock className="h-3 w-3 mr-1" />Expire ≤ {c.expiry_within_days}j</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">Tous les {c.frequency_days}j</TableCell>
                  <TableCell>
                    {c.active
                      ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Actif</Badge>
                      : <Badge variant="outline">Inactif</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_sent_at ? new Date(c.last_sent_at).toLocaleDateString("fr-FR") : "Jamais"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Envoyer maintenant" disabled={sendMut.isPending} onClick={() => sendMut.mutate(String(c.id))}>
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Modifier" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteDialog onConfirm={() => deleteMut.mutate(String(c.id))} itemName={c.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Aucune campagne. Cliquez sur « Nouvelle campagne ».
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Formulaire création / édition */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Nom de la campagne *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Promo renouvellement" />
              </div>

              {/* Ciblage */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" /> À qui envoyer ?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Cible</Label>
                    <Select value={form.audience} onValueChange={(v: Audience) => { setForm({ ...form, audience: v }); setPreview(null); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                          <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.audience === "abonnement" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Type d'abonnement</Label>
                      <Select value={form.planName} onValueChange={(v) => { setForm({ ...form, planName: v }); setPreview(null); }}>
                        <SelectTrigger><SelectValue placeholder="Choisir un plan..." /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {form.audience === "nom" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Rechercher (nom ou email)</Label>
                      <Input value={form.searchName} onChange={(e) => { setForm({ ...form, searchName: e.target.value }); setPreview(null); }} placeholder="Karray..." />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.useExpiry} onCheckedChange={(v) => { setForm({ ...form, useExpiry: v }); setPreview(null); }} />
                  <Label className="text-sm">Uniquement les abonnements qui expirent bientôt</Label>
                </div>
                {form.useExpiry && (
                  <div className="flex items-center gap-2 pl-8">
                    <span className="text-sm">Expire dans</span>
                    <Input type="number" min={1} className="w-20" value={form.expiryDays}
                      onChange={(e) => { setForm({ ...form, expiryDays: +e.target.value }); setPreview(null); }} />
                    <span className="text-sm">jours</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={previewMut.isPending} onClick={() => previewMut.mutate(form)}>
                    <Users className="h-3.5 w-3.5 mr-1" />Aperçu des destinataires
                  </Button>
                  {preview && (
                    <span className="text-sm">
                      <span className="font-semibold text-primary">{preview.count}</span> destinataire(s)
                      {preview.sample.length > 0 && <span className="text-xs text-muted-foreground"> — {preview.sample.slice(0, 3).join(", ")}{preview.count > 3 ? "…" : ""}</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Planification */}
              <div>
                <Label>Envoi automatique tous les (jours) *</Label>
                <Input type="number" min={1} value={form.frequencyDays}
                  onChange={(e) => setForm({ ...form, frequencyDays: +e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Ex. 4 = le mail est renvoyé automatiquement tous les 4 jours aux destinataires correspondants.</p>
              </div>

              {/* Contenu du mail */}
              <div>
                <Label>Objet du mail *</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Votre abonnement expire bientôt — offre spéciale !" />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={"Bonjour {name},\n\nProfitez de -20% pour renouveler votre abonnement..."} />
                <p className="text-xs text-muted-foreground mt-1">Astuce : <code>{"{name}"}</code> sera remplacé par le prénom du client.</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Campagne active (envoi automatique)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Annuler</Button>
            <Button
              disabled={saveMut.isPending || !form?.subject || !form?.body}
              onClick={() => form && saveMut.mutate(form)}
            >
              {saveMut.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
