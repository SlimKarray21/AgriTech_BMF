import { apiFetch } from "./http";
import { Climat } from "@/types/models";

export const getClimats = async (): Promise<Climat[]> => {
  const data: any[] = await apiFetch("/api/agri/climats");
  return data.map((c) => ({
    id: String(c.id),
    temperatureC: Number(c.temperature_c),
    humiditeC: Number(c.humidite_c),
    vitesseVent: Number(c.vitesse_vent),
    puissanceEnsoleillement: Number(c.puissance_ensoleillement),
  }));
};

export const createClimat = async (d: Omit<Climat, "id">): Promise<Climat> => {
  const res: any = await apiFetch("/api/agri/climats", {
    method: "POST",
    body: JSON.stringify({ temperature_c: d.temperatureC, humidite_c: d.humiditeC, vitesse_vent: d.vitesseVent, puissance_ensoleillement: d.puissanceEnsoleillement }),
  });
  return { id: String(res.id), ...d };
};

export const updateClimat = async (id: string, d: Partial<Climat>): Promise<Climat | null> => {
  const body: any = {};
  if (d.temperatureC !== undefined)            body.temperature_c            = d.temperatureC;
  if (d.humiditeC !== undefined)               body.humidite_c               = d.humiditeC;
  if (d.vitesseVent !== undefined)             body.vitesse_vent             = d.vitesseVent;
  if (d.puissanceEnsoleillement !== undefined) body.puissance_ensoleillement = d.puissanceEnsoleillement;
  await apiFetch(`/api/agri/climats/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return null;
};

export const deleteClimat = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/climats/${id}`, { method: "DELETE" });
};
