import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSurfaces, getVannes, getPlantes, getSols, getClimats } from "@/services/data-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Droplets, Leaf, MapPin, Thermometer, Wind, Sun, Mountain } from "lucide-react";

export default function SurfaceDetailPage() {
  const { surfaceId } = useParams();
  const navigate = useNavigate();

  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: vannes = [] } = useQuery({ queryKey: ["vannes"], queryFn: getVannes });
  const { data: plantes = [] } = useQuery({ queryKey: ["plantes"], queryFn: getPlantes });
  const { data: sols = [] } = useQuery({ queryKey: ["sols"], queryFn: getSols });
  const { data: climats = [] } = useQuery({ queryKey: ["climats"], queryFn: getClimats });

  const surface = useMemo(() => surfaces.find((s) => s.id === surfaceId), [surfaces, surfaceId]);
  const surfaceVannes = useMemo(() => vannes.filter((v) => v.fkSurface === surfaceId), [vannes, surfaceId]);
  const surfacePlantes = useMemo(() => plantes.filter((p) => p.fkSurface === surfaceId), [plantes, surfaceId]);
  const sol = useMemo(() => (surface?.fkSol ? sols.find((s) => s.id === surface.fkSol) : null), [surface, sols]);
  const climat = useMemo(() => (surface?.fkClimat ? climats.find((c) => c.id === surface.fkClimat) : null), [surface, climats]);

  if (!surface) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Surface introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{surface.nomSurface}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {surface.localisation}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Détails de la surface</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Utilisateur :</span> <span className="font-medium">{surface.userEmail}</span></div>
            <div><span className="text-muted-foreground">Type sol :</span> <span className="font-medium">{surface.typeSol ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Nb vannes :</span> <span className="font-medium">{surface.nbVanne}</span></div>
            <div><span className="text-muted-foreground">Localisation :</span> <span className="font-medium">{surface.localisation}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mountain className="h-4 w-4" /> Sol</CardTitle></CardHeader>
          <CardContent>
            {sol ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Nature :</span> {sol.nature}</div>
                <div><span className="text-muted-foreground">Humidité :</span> {sol.humidite}%</div>
                <div><span className="text-muted-foreground">Salinité :</span> {sol.salinite}</div>
                <div><span className="text-muted-foreground">pH :</span> {sol.ph}</div>
                <div><span className="text-muted-foreground">Température :</span> {sol.temperature}°C</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">-- Aucune donnée (capteur non connecté)</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Thermometer className="h-4 w-4" /> Climat</CardTitle></CardHeader>
          <CardContent>
            {climat ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {climat.temperatureC}°C</div>
                <div className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {climat.humiditeC}%</div>
                <div className="flex items-center gap-1"><Wind className="h-3 w-3" /> {climat.vitesseVent} km/h</div>
                <div className="flex items-center gap-1"><Sun className="h-3 w-3" /> {climat.puissanceEnsoleillement} W/m²</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">-- Aucune donnée (capteur non connecté)</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4" /> Plantes</CardTitle></CardHeader>
        <CardContent>
          {surfacePlantes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune plante</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {surfacePlantes.map((p) => (
                <div key={p.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium">{p.nomPlante}</div>
                  <div className="text-muted-foreground">Type : {p.typePlanteNom ?? "—"} · Âge : {p.age} ans</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4" /> Vannes</CardTitle></CardHeader>
        <CardContent>
          {surfaceVannes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune vanne</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {surfaceVannes.map((v) => (
                <Card key={v.id} className="w-48">
                  <CardContent className="p-3 text-sm space-y-1">
                    <div className="font-semibold flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-primary" /> {v.nomVanne}</div>
                    <div className="text-muted-foreground">Plantes : {v.nbPlantParVanne}</div>
                    <div className="text-muted-foreground">Débit : {v.debitEauParVanne} L/h</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
