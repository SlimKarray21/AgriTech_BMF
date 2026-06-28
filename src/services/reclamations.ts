import { apiFetch } from "./http";
import { Reclamation } from "@/types/models";

export const getReclamations = async (): Promise<Reclamation[]> => {
  const [reclamations, profiles]: [any[], any[]] = await Promise.all([
    apiFetch<any[]>("/api/agri/reclamations"),
    apiFetch<any[]>("/api/agri/profiles"),
  ]);
  const profMap = new Map(profiles.map((p: any) => [String(p.id), p]));
  return reclamations.map((r: any) => {
    const prof: any = profMap.get(String(r.profile_id));
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      profile_id: r.profile_id != null ? String(r.profile_id) : undefined,
      sujet: r.sujet,
      message: r.message,
      statut: r.statut,
      traite_at: r.traite_at ?? null,
      traite_by: r.traite_by != null ? String(r.traite_by) : null,
      created_at: r.created_at,
      userName: prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() : "—",
      userEmail: prof?.email ?? "—",
      userRole: prof?.user_role ?? "",
    };
  });
};

export const createReclamation = async (d: { user_id: string; profile_id?: string; sujet: string; message: string }): Promise<Reclamation> => {
  const res: any = await apiFetch("/api/agri/reclamations", {
    method: "POST",
    body: JSON.stringify({ user_id: Number(d.user_id), profile_id: d.profile_id ? Number(d.profile_id) : null, sujet: d.sujet, message: d.message }),
  });
  return res as any;
};

export const updateReclamationStatus = async (id: string, statut: "en_attente" | "traite", traite_by?: string): Promise<void> => {
  const payload: any = { statut };
  if (statut === "traite") {
    payload.traite_at = new Date().toISOString();
    if (traite_by) payload.traite_by = Number(traite_by);
  } else {
    payload.traite_at = null;
    payload.traite_by = null;
  }
  await apiFetch(`/api/agri/reclamations/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
};

export const deleteReclamation = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/reclamations/${id}`, { method: "DELETE" });
};
