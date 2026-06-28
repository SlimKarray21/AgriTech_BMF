import { apiFetch } from "./http";
import { Sol } from "@/types/models";

export const getSols = async (): Promise<Sol[]> => {
  const data: any[] = await apiFetch("/api/agri/sols");
  return data.map((s) => ({
    id: String(s.id),
    nature: s.nature,
    humidite: Number(s.humidite),
    salinite: Number(s.salinite),
    ph: Number(s.ph),
    temperature: Number(s.temperature),
    dateMesure: s.date_mesure,
  }));
};

export const createSol = async (d: Omit<Sol, "id">): Promise<Sol> => {
  const res: any = await apiFetch("/api/agri/sols", {
    method: "POST",
    body: JSON.stringify({ nature: d.nature, humidite: d.humidite, salinite: d.salinite, ph: d.ph, temperature: d.temperature, date_mesure: d.dateMesure }),
  });
  return { id: String(res.id), ...d };
};

export const updateSol = async (id: string, d: Partial<Sol>): Promise<Sol | null> => {
  const body: any = {};
  if (d.nature !== undefined)      body.nature      = d.nature;
  if (d.humidite !== undefined)    body.humidite    = d.humidite;
  if (d.salinite !== undefined)    body.salinite    = d.salinite;
  if (d.ph !== undefined)          body.ph          = d.ph;
  if (d.temperature !== undefined) body.temperature = d.temperature;
  await apiFetch(`/api/agri/sols/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return null;
};

export const deleteSol = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/sols/${id}`, { method: "DELETE" });
};
