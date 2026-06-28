import { apiFetch } from "./http";
import { Profile } from "@/types/models";

export const getProfiles = async (): Promise<Profile[]> => {
  const data: any[] = await apiFetch("/api/agri/profiles");
  return data.map((p) => ({
    id: String(p.id),
    user_id: String(p.user_id),
    email: p.email ?? "",
    user_role: p.user_role ?? "CLIENT",
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    phone_number: p.phone_number ?? "",
    location: p.location ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    avatar_url: p.avatar_url ?? "",
    date_of_birth: p.date_of_birth ?? "",
    date_deb_abo: p.date_deb_abo ?? "",
    date_exp_abo: p.date_exp_abo ?? "",
    type_abo: p.type_abo ?? undefined,
    created_by: p.created_by != null ? String(p.created_by) : undefined,
    company_name: p.company_name ?? undefined,
    company_logo: p.company_logo ?? undefined,
    abo_capteur_sol: p.abo_capteur_sol ?? true,
    abo_electrovanne: p.abo_electrovanne ?? false,
    abo_sante_plante: p.abo_sante_plante ?? false,
  }));
};

export const updateProfile = async (id: string, data: Partial<Profile>): Promise<Profile | null> => {
  const body: any = {};
  if (data.first_name !== undefined)       body.first_name       = data.first_name;
  if (data.last_name !== undefined)        body.last_name        = data.last_name;
  if (data.user_role !== undefined)        body.user_role        = data.user_role;
  if (data.phone_number !== undefined)     body.phone_number     = data.phone_number;
  if (data.location !== undefined)         body.location         = data.location;
  if (data.country !== undefined)          body.country          = data.country;
  if (data.city !== undefined)             body.city             = data.city;
  if (data.email !== undefined)            body.email            = data.email;
  if (data.date_deb_abo !== undefined)     body.date_deb_abo     = data.date_deb_abo || null;
  if (data.date_exp_abo !== undefined)     body.date_exp_abo     = data.date_exp_abo || null;
  if (data.type_abo !== undefined)         body.type_abo         = data.type_abo  || null;
  if (data.company_name !== undefined)     body.company_name     = data.company_name || null;
  if (data.company_logo !== undefined)     body.company_logo     = data.company_logo || null;
  return apiFetch(`/api/agri/profiles/${id}`, { method: "PATCH", body: JSON.stringify(body) });
};

export const deleteProfile = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/profiles/${id}`, { method: "DELETE" });
};

// Affecte un client à un partenaire (created_by = id du partenaire), ou le
// détache (partnerId = null → rattaché à l'admin). Côté backend : PATCH
// /api/agri/profiles/{clientId} { created_by }.
export const assignClientToPartner = async (
  clientProfileId: string | number,
  partnerId: number | null,
): Promise<void> => {
  await apiFetch(`/api/agri/profiles/${clientProfileId}`, {
    method: "PATCH",
    body: JSON.stringify({ created_by: partnerId }),
  });
};

// Legacy aliases
export const getClients = getProfiles;
export const updateClient = updateProfile;
