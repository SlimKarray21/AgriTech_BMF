import { apiFetch } from "./http";

// ── RAPPORT SOL ───────────────────────────────────────────────────────────────

export const getRapportsSol = async (): Promise<any[]> =>
  apiFetch("/api/agri/rapport-sol");

export const createRapportSol = async (d: any): Promise<any> =>
  apiFetch("/api/agri/rapport-sol", { method: "POST", body: JSON.stringify(d) });

export const deleteRapportSol = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/rapport-sol/${id}`, { method: "DELETE" });
};

// ── RAPPORT EAU ───────────────────────────────────────────────────────────────

export const getRapportsEau = async (): Promise<any[]> =>
  apiFetch("/api/agri/rapport-eau");

export const createRapportEau = async (d: any): Promise<any> =>
  apiFetch("/api/agri/rapport-eau", { method: "POST", body: JSON.stringify(d) });

export const deleteRapportEau = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/rapport-eau/${id}`, { method: "DELETE" });
};
