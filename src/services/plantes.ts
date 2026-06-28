import { apiFetch } from "./http";
import { Plante } from "@/types/models";

export const getPlantes = async (): Promise<Plante[]> => {
  const parcelles: any[] = await apiFetch<any[]>("/parcelles");
  const surfMap = new Map(parcelles.map((s: any) => [String(s.id), s.nomSurface ?? s.nom_surface]));

  const allPlantes: Plante[] = [];
  for (const p of parcelles) {
    const plants: any[] = await apiFetch(`/parcelles/${p.id}/plants`);
    for (const pl of plants) {
      allPlantes.push({
        id: String(pl.id),
        nomPlante: pl.name ?? pl.nom_plante,
        age: pl.age ?? 0,
        fkSurface: String(p.id),
        surfaceNom: surfMap.get(String(p.id)) ?? "—",
      });
    }
  }
  return allPlantes;
};

export const createPlante = async (d: Omit<Plante, "id" | "surfaceNom">): Promise<Plante> => {
  const res: any = await apiFetch(`/parcelles/${d.fkSurface}/plants`, {
    method: "POST",
    body: JSON.stringify({ name: d.nomPlante, age: d.age, count: 1, waterNeedPerPlant: 2 }),
  });
  return { id: String(res.id ?? ""), nomPlante: d.nomPlante, age: d.age, fkSurface: d.fkSurface };
};

export const createWizardParcelle = async (d: {
  nomSurface: string;
  localisation: string;
  fkUser: string;
  tailleHa?: number;
  plants: { name: string; type: string; age: number; count: number; waterNeedPerPlant: number }[];
  vannes: { name: string; nbPlants: number; debit: number }[];
}): Promise<any> => {
  return apiFetch("/wizard/parcelles", {
    method: "POST",
    body: JSON.stringify({
      nomSurface: d.nomSurface,
      localisation: d.localisation,
      fkUser: Number(d.fkUser),
      typeSol: "standard",
      tailleHa: d.tailleHa ?? 0,
      plants: d.plants,
      vannes: d.vannes,
    }),
  });
};

export const updatePlante = async (_id: string, _d: Partial<Plante>): Promise<Plante | null> => null;
export const deletePlante  = async (_id: string): Promise<void> => {};
