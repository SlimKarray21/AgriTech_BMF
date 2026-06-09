import { API_BASE_URL } from "./api-config";
import { getToken } from "@/lib/token";
import { Profile, Surface, Plante, Vanne, Sol, Climat, Reclamation } from "@/types/models";

// ── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

// ── PROFILES ─────────────────────────────────────────────────────────────────

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

// Legacy aliases
export const getClients = getProfiles;
export const updateClient = updateProfile;

// ── SURFACES (parcelle) ───────────────────────────────────────────────────────

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

// ── PLANTES ───────────────────────────────────────────────────────────────────

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

// ── VANNES ────────────────────────────────────────────────────────────────────

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
    }),
  });
  return { id: String(res.id), nomVanne: d.nomVanne, nbPlantParVanne: d.nbPlantParVanne, debitEauParVanne: d.debitEauParVanne, fkSurface: d.fkSurface };
};

export const updateVanne = async (id: string, d: Partial<Vanne>): Promise<Vanne | null> => {
  const body: any = {};
  if (d.nomVanne !== undefined)        body.name      = d.nomVanne;
  if (d.nbPlantParVanne !== undefined) body.nbPlants  = d.nbPlantParVanne;
  if (d.debitEauParVanne !== undefined) body.debit    = d.debitEauParVanne;
  if (d.fkSurface !== undefined)       body.parcelId  = Number(d.fkSurface);
  await apiFetch(`/vannes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return null;
};

export const deleteVanne = async (id: string): Promise<void> => {
  await apiFetch(`/vannes/${id}`, { method: "DELETE" });
};

// ── SOLS (sol_expo) ───────────────────────────────────────────────────────────

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

// ── CLIMATS (climats_expo) ────────────────────────────────────────────────────

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

// ── RÉCLAMATIONS ─────────────────────────────────────────────────────────────

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

// ── SUBSCRIPTION PLANS ────────────────────────────────────────────────────────

export const getSubscriptionPlans = async (): Promise<any[]> =>
  apiFetch("/api/agri/subscription-plans");

export const createSubscriptionPlan = async (d: any): Promise<any> =>
  apiFetch("/api/agri/subscription-plans", { method: "POST", body: JSON.stringify(d) });

export const updateSubscriptionPlan = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/subscription-plans/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteSubscriptionPlan = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/subscription-plans/${id}`, { method: "DELETE" });
};

// ── SUBSCRIPTION PAYMENTS ─────────────────────────────────────────────────────

export const getSubscriptionPayments = async (): Promise<any[]> =>
  apiFetch("/api/agri/subscription-payments");

export const createSubscriptionPayment = async (d: any): Promise<any> =>
  apiFetch("/api/agri/subscription-payments", { method: "POST", body: JSON.stringify(d) });

export const updateSubscriptionPayment = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/subscription-payments/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── CLIENT SALES ──────────────────────────────────────────────────────────────

export const getClientSales = async (): Promise<any[]> =>
  apiFetch("/api/agri/client-sales");

export const createClientSale = async (d: any): Promise<any> =>
  apiFetch("/api/agri/client-sales", { method: "POST", body: JSON.stringify(d) });

export const updateClientSale = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/client-sales/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── DEVICE CATALOG ────────────────────────────────────────────────────────────

export const getDeviceCatalog = async (): Promise<any[]> =>
  apiFetch("/api/agri/device-catalog");

export const createDeviceCatalog = async (d: any): Promise<any> =>
  apiFetch("/api/agri/device-catalog", { method: "POST", body: JSON.stringify(d) });

export const updateDeviceCatalog = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/device-catalog/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteDeviceCatalog = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/device-catalog/${id}`, { method: "DELETE" });
};

// ── DEVICE SALES ──────────────────────────────────────────────────────────────

export const getDeviceSales = async (): Promise<any[]> =>
  apiFetch("/api/agri/device-sales");

export const createDeviceSale = async (d: any): Promise<any> =>
  apiFetch("/api/agri/device-sales", { method: "POST", body: JSON.stringify(d) });

export const updateDeviceSale = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/device-sales/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── STOCK ITEMS ───────────────────────────────────────────────────────────────

export const getStockItems = async (): Promise<any[]> =>
  apiFetch("/api/agri/stock-items");

export const createStockItem = async (d: any): Promise<any> =>
  apiFetch("/api/agri/stock-items", { method: "POST", body: JSON.stringify(d) });

export const updateStockItem = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/stock-items/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteStockItem = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/stock-items/${id}`, { method: "DELETE" });
};

// ── STOCK MOVEMENTS ───────────────────────────────────────────────────────────

export const getStockMovements = async (stockItemId?: string): Promise<any[]> => {
  const url = stockItemId
    ? `/api/agri/stock-movements?stock_item_id=${stockItemId}`
    : "/api/agri/stock-movements";
  return apiFetch(url);
};

export const createStockMovement = async (d: any): Promise<any> =>
  apiFetch("/api/agri/stock-movements", { method: "POST", body: JSON.stringify(d) });

// ── MATERIAL RESERVATIONS ─────────────────────────────────────────────────────

export const getMaterialReservations = async (): Promise<any[]> =>
  apiFetch("/api/agri/material-reservations");

export const createMaterialReservation = async (d: any): Promise<any> =>
  apiFetch("/api/agri/material-reservations", { method: "POST", body: JSON.stringify(d) });

export const updateMaterialReservation = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/material-reservations/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── RESERVATION ITEMS ─────────────────────────────────────────────────────────

export const getReservationItems = async (): Promise<any[]> =>
  apiFetch("/api/agri/reservation-items");

export const createReservationItem = async (d: any): Promise<any> =>
  apiFetch("/api/agri/reservation-items", { method: "POST", body: JSON.stringify(d) });

export const getReservationItemsByReservation = async (reservationId: string): Promise<any[]> =>
  apiFetch(`/api/agri/reservation-items?reservation_id=${reservationId}`);

export const deleteReservationItem = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/reservation-items/${id}`, { method: "DELETE" });
};

// ── SUPPORT NOTIFICATIONS ─────────────────────────────────────────────────────

export const getSupportNotifications = async (): Promise<any[]> =>
  apiFetch("/api/agri/support-notifications");

export const createSupportNotification = async (d: any): Promise<any> =>
  apiFetch("/api/agri/support-notifications", { method: "POST", body: JSON.stringify(d) });

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/support-notifications/${id}`, { method: "PATCH", body: JSON.stringify({ is_read: true }) });
};

// ── SUBSCRIP NOTIF ────────────────────────────────────────────────────────────

export const getSubscripNotifs = async (): Promise<any[]> =>
  apiFetch("/api/agri/subscrip-notif");

export const createSubscripNotif = async (d: any): Promise<any> =>
  apiFetch("/api/agri/subscrip-notif", { method: "POST", body: JSON.stringify(d) });

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
