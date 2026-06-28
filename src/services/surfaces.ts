import { apiFetch } from "./http";
import { Surface } from "@/types/models";

export const getSurfaces = async (): Promise<Surface[]> => {
  const [parcelles, vannes]: [any[], any[]] = await Promise.all([
    apiFetch<any[]>("/parcelles"),
    apiFetch<any[]>("/vannes"),
  ]);
  return parcelles.map((s: any) => ({
    id: String(s.id),
    nomSurface: s.nomSurface ?? s.nom_surface,
    localisation: s.localisation,
    typeSol: s.typeSol ?? s.type_sol,
    fkUser: String(s.fkUser ?? s.fk_user ?? ""),
    fkSol: s.fkSol ?? s.fk_sol ?? undefined,
    fkClimat: s.fkClimat ?? s.fk_climat ?? undefined,
    tailleHa: s.tailleHa != null ? Number(s.tailleHa) : s.taille_ha != null ? Number(s.taille_ha) : undefined,
    isConnected: s.isConnected ?? s.is_connected ?? false,
    userEmail: s.userEmail ?? "—",
    nbVanne: vannes.filter((v: any) => String(v.parcelId ?? v.parcel_id) === String(s.id)).length,
  }));
};

export const createSurface = async (d: { nomSurface: string; localisation: string; fkUser: string; tailleHa?: number }): Promise<Surface> => {
  const res: any = await apiFetch("/parcelles", {
    method: "POST",
    body: JSON.stringify({ nomSurface: d.nomSurface, localisation: d.localisation, typeSol: "loamy", fkSol: null, fkClimat: null, tailleHa: d.tailleHa ?? 0 }),
  });
  return { id: String(res.id ?? res.parcelle?.id), nomSurface: d.nomSurface, localisation: d.localisation, fkUser: d.fkUser };
};

export const updateSurface = async (id: string, d: Partial<Surface>): Promise<Surface | null> => {
  const body: any = {};
  if (d.nomSurface !== undefined)   body.nomSurface   = d.nomSurface;
  if (d.localisation !== undefined) body.localisation = d.localisation;
  if (d.typeSol !== undefined)      body.typeSol      = d.typeSol;
  if (d.fkSol !== undefined)        body.fkSol        = d.fkSol;
  if (d.fkClimat !== undefined)     body.fkClimat     = d.fkClimat;
  if (d.tailleHa !== undefined)     body.tailleHa     = d.tailleHa;
  await apiFetch(`/parcelles/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return null;
};

export const deleteSurface = async (id: string): Promise<void> => {
  await apiFetch(`/parcelles/${id}`, { method: "DELETE" });
};
