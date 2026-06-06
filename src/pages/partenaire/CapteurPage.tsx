import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSols, getClimats, getSurfaces, getProfiles } from "@/services/data-service";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain, Thermometer, Droplets, Wind, Sun, User, Lock, MapPin } from "lucide-react";

export default function CapteurPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: sols = [] } = useQuery({ queryKey: ["sols"], queryFn: getSols });
  const { data: climats = [] } = useQuery({ queryKey: ["climats"], queryFn: getClimats });
  const { data: surfaces = [] } = useQuery({ queryKey: ["surfaces"], queryFn: getSurfaces });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });

  // Realtime sensor updates
  useEffect(() => {
    const ch = supabase
      .channel("capteurs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sols" }, () => qc.invalidateQueries({ queryKey: ["sols"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "climats" }, () => qc.invalidateQueries({ queryKey: ["climats"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const getUserForEntity = (entityId: string, field: "fkSol" | "fkClimat") => {
    const surface = surfaces.find(s => s[field] === entityId);
    if (!surface) return { user: null, surface: null };
    return { user: profiles.find(p => p.id === surface.fkUser) ?? null, surface };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("nav.capteurs")}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Lock className="h-3.5 w-3.5" /> Section en lecture seule — données temps réel
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          Live
        </Badge>
      </div>

      <Tabs defaultValue="sol">
        <TabsList>
          <TabsTrigger value="sol"><Mountain className="mr-1 h-4 w-4" /> {t("capteur.sol")}</TabsTrigger>
          <TabsTrigger value="climat"><Thermometer className="mr-1 h-4 w-4" /> {t("capteur.climat")}</TabsTrigger>
        </TabsList>

        <TabsContent value="sol" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sols.map(s => {
              const { user, surface } = getUserForEntity(s.id, "fkSol");
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mountain className="h-4 w-4 text-primary" /> {s.nature}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-3 pb-3 border-b">
                      <div className="flex items-center gap-1.5"><User className="h-3 w-3" /> <span className="font-medium text-foreground">{user ? `${user.first_name} ${user.last_name}` : "—"}</span></div>
                      <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> <span className="font-medium text-foreground">{surface?.nomSurface ?? "—"}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">{t("capteur.humidity")}:</span> {s.humidite}%</div>
                      <div><span className="text-muted-foreground">{t("capteur.salinity")}:</span> {s.salinite}</div>
                      <div><span className="text-muted-foreground">pH:</span> {s.ph}</div>
                      <div><span className="text-muted-foreground">{t("capteur.temperature")}:</span> {s.temperature}°C</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">{new Date(s.dateMesure).toLocaleString()}</div>
                  </CardContent>
                </Card>
              );
            })}
            {sols.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">{t("capteur.noSol")}</p>}
          </div>
        </TabsContent>

        <TabsContent value="climat" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {climats.map(c => {
              const { user, surface } = getUserForEntity(c.id, "fkClimat");
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-primary" /> {c.temperatureC}°C
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-3 pb-3 border-b">
                      <div className="flex items-center gap-1.5"><User className="h-3 w-3" /> <span className="font-medium text-foreground">{user ? `${user.first_name} ${user.last_name}` : "—"}</span></div>
                      <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> <span className="font-medium text-foreground">{surface?.nomSurface ?? "—"}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {c.temperatureC}°C</div>
                      <div className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {c.humiditeC}%</div>
                      <div className="flex items-center gap-1"><Wind className="h-3 w-3" /> {c.vitesseVent} km/h</div>
                      <div className="flex items-center gap-1"><Sun className="h-3 w-3" /> {c.puissanceEnsoleillement} W/m²</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {climats.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">{t("capteur.noClimat")}</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
