import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Profile } from "@/types/models";

export function SubscriptionStatus({ profile }: { profile: Profile }) {
  if (!profile.date_exp_abo || !profile.type_abo) {
    return (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Pas d'abonnement</span>
      </div>
    );
  }
  const diff = Math.ceil((new Date(profile.date_exp_abo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = diff <= 0;
  const isExpiring = !isExpired && diff <= 30;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isExpired ? (
          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expiré</Badge>
        ) : isExpiring ? (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600"><AlertTriangle className="h-3 w-3" /> Expire bientôt</Badge>
        ) : (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="h-3 w-3" /> Actif</Badge>
        )}
        <Badge variant="outline">{profile.type_abo === "op1" ? "Option 1" : profile.type_abo === "op1_op2" ? "Option 1+2" : "Full"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Temps restant</span>
          <p className={`font-semibold ${isExpired ? "text-destructive" : "text-foreground"}`}>
            {isExpired ? "Expiré" : `${diff} jours`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Début</span>
          <p className="font-medium">{profile.date_deb_abo || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Fin</span>
          <p className="font-medium">{profile.date_exp_abo || "—"}</p>
        </div>
      </div>
    </div>
  );
}
