import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfiles, getSurfaces, getVannes } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Droplets, Leaf, Wifi, WifiOff } from "lucide-react";

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });

  const profile = useMemo(() => profiles.find((p) => p.id === clientId), [profiles, clientId]);
  const profileSurfaces = useMemo(() => surfaces.filter((s) => s.fkUser === clientId), [surfaces, clientId]);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Utilisateur introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/travail")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/travail")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{profile.first_name} {profile.last_name}</h2>
          <p className="text-sm text-muted-foreground">{profile.email} · {profile.phone_number}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <Button variant="outline" size="sm">
            <Wifi className="mr-1 h-3 w-3" /> Connect
          </Button>
          <div className="flex items-center gap-1">
            <WifiOff className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive font-medium">Pas connecté</span>
          </div>
        </div>
      </div>

      {profileSurfaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Aucune surface pour cet utilisateur</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileSurfaces.map((surface) => {
            const surfaceVannes = vannes.filter((v) => v.fkSurface === surface.id);
            return (
              <Card key={surface.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/travail/surface/${surface.id}`)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{surface.nomSurface}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {surface.localisation}</div>
                    <div className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5" /> {surface.nbVanne} vanne(s)</div>
                  </div>
                  {surfaceVannes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {surfaceVannes.map((v) => (
                        <Badge key={v.id} variant="secondary" className="text-xs">
                          <Droplets className="mr-1 h-3 w-3" /> {v.nomVanne}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
