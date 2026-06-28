import { apiFetch } from "./http";
import { Vanne } from "@/types/models";

export const getVannes = async (): Promise<Vanne[]> => {
  const [vannes, parcelles]: [any[], any[]] = await Promise.all([
    apiFetch<any[]>("/vannes"),
    apiFetch<any[]>("/parcelles"),
  ]);
  const surfMap = new Map(parcelles.map((s: any) => [String(s.id), s.nomSurface ?? s.nom_surface]));
  return vannes.map((v: any) => ({
    id: String(v.id),
    nomVanne: v.name ?? v.nom_vanne,
    nbPlantParVanne: v.nbPlants ?? v.nb_plants ?? v.nb_plant_par_vanne ?? 0,
    debitEauParVanne: Number(v.debit ?? v.debitEauParVanne ?? v.debit_eau_par_vanne ?? 0),
    fkSurface: String(v.parcelId ?? v.parcel_id ?? v.fk_surface ?? ""),
    surfaceNom: surfMap.get(String(v.parcelId ?? v.parcel_id ?? v.fk_surface)) ?? "—",
    isAuto: v.isAuto ?? v.is_auto ?? false,
    isOpen: v.isOpen ?? v.is_open ?? false,
    deviceId: v.deviceId ?? v.device_id ?? undefined,
    pistonNumber: v.pistonNumber ?? v.piston_number ?? undefined,
  }));
};

export const createVanne = async (d: Omit<Vanne, "id" | "surfaceNom">): Promise<Vanne> => {
  const res: any = await apiFetch("/vannes", {
    method: "POST",
    body: JSON.stringify({
      name: d.nomVanne,
      parcelId: Number(d.fkSurface),
      debit: d.debitEauParVanne,
      nbPlants: d.nbPlantParVanne,
      isAuto: false,
      isOpen: false,
      deviceId: d.deviceId || undefined,
      pistonNumber: d.pistonNumber || undefined,
    }),
  });
  return { id: String(res.id), nomVanne: d.nomVanne, nbPlantParVanne: d.nbPlantParVanne, debitEauParVanne: d.debitEauParVanne, fkSurface: d.fkSurface, deviceId: d.deviceId, pistonNumber: d.pistonNumber };
};

export const updateVanne = async (id: string, d: Partial<Vanne>): Promise<Vanne | null> => {
  const body: any = {};
  if (d.nomVanne !== undefined)        body.name         = d.nomVanne;
  if (d.nbPlantParVanne !== undefined) body.nbPlants     = d.nbPlantParVanne;
  if (d.debitEauParVanne !== undefined) body.debit       = d.debitEauParVanne;
  if (d.fkSurface !== undefined)       body.parcelId     = Number(d.fkSurface);
  if (d.isOpen !== undefined)          body.isOpen       = d.isOpen;
  if (d.deviceId !== undefined)        body.deviceId     = d.deviceId;
  if (d.pistonNumber !== undefined)    body.pistonNumber = d.pistonNumber;
  await apiFetch(`/vannes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return null;
};

export const deleteVanne = async (id: string): Promise<void> => {
  await apiFetch(`/vannes/${id}`, { method: "DELETE" });
};
