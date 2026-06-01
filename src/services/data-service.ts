import { supabase } from "@/integrations/supabase/client";
import { Profile, TypePlante, Surface, Plante, Vanne, Sol, Climat, Reclamation } from "@/types/models";

// ─── Profiles (replaces Clients) ────────────────────
export const getProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
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
    created_by: p.created_by ?? undefined,
    company_name: p.company_name ?? undefined,
    company_logo: p.company_logo ?? undefined,
    abo_capteur_sol: p.abo_capteur_sol ?? true,
    abo_electrovanne: p.abo_electrovanne ?? false,
    abo_sante_plante: p.abo_sante_plante ?? false,
  }));
};

export const updateProfile = async (id: string, data: Partial<Profile>): Promise<Profile | null> => {
  const dbData: any = {};
  if (data.first_name !== undefined) dbData.first_name = data.first_name;
  if (data.last_name !== undefined) dbData.last_name = data.last_name;
  if (data.user_role !== undefined) dbData.user_role = data.user_role;
  if (data.phone_number !== undefined) dbData.phone_number = data.phone_number;
  if (data.location !== undefined) dbData.location = data.location;
  if (data.email !== undefined) dbData.email = data.email;
  if (data.date_deb_abo !== undefined) dbData.date_deb_abo = data.date_deb_abo || null;
  if (data.date_exp_abo !== undefined) dbData.date_exp_abo = data.date_exp_abo || null;
  if (data.type_abo !== undefined) dbData.type_abo = data.type_abo || null;
  if (data.company_name !== undefined) dbData.company_name = data.company_name || null;
  if (data.company_logo !== undefined) dbData.company_logo = data.company_logo || null;
  if (data.abo_capteur_sol !== undefined) dbData.abo_capteur_sol = data.abo_capteur_sol;
  if (data.abo_electrovanne !== undefined) dbData.abo_electrovanne = data.abo_electrovanne;
  if (data.abo_sante_plante !== undefined) dbData.abo_sante_plante = data.abo_sante_plante;

  const { data: result, error } = await supabase
    .from("profiles")
    .update(dbData as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as any;
};

// ─── Types Plante ───────────────────────────────────
export const getTypesPlante = async (): Promise<TypePlante[]> => {
  const { data, error } = await supabase.from("types_plante").select("*");
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    id: t.id,
    nomPlante: t.nom_plante,
    typePlante: t.type_plante,
    besoinEauParPlante: Number(t.besoin_eau_par_plante),
  }));
};

export const createTypePlante = async (d: Omit<TypePlante, "id">): Promise<TypePlante> => {
  const { data, error } = await supabase.from("types_plante").insert({
    nom_plante: d.nomPlante,
    type_plante: d.typePlante,
    besoin_eau_par_plante: d.besoinEauParPlante,
  } as any).select().single();
  if (error) throw error;
  return { id: data.id, nomPlante: (data as any).nom_plante, typePlante: (data as any).type_plante, besoinEauParPlante: Number((data as any).besoin_eau_par_plante) };
};

export const updateTypePlante = async (id: string, d: Partial<TypePlante>): Promise<TypePlante | null> => {
  const dbData: any = {};
  if (d.nomPlante !== undefined) dbData.nom_plante = d.nomPlante;
  if (d.typePlante !== undefined) dbData.type_plante = d.typePlante;
  if (d.besoinEauParPlante !== undefined) dbData.besoin_eau_par_plante = d.besoinEauParPlante;
  const { data, error } = await supabase.from("types_plante").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, nomPlante: (data as any).nom_plante, typePlante: (data as any).type_plante, besoinEauParPlante: Number((data as any).besoin_eau_par_plante) };
};

export const deleteTypePlante = async (id: string): Promise<void> => {
  const { error } = await supabase.from("types_plante").delete().eq("id", id);
  if (error) throw error;
};

// ─── Surfaces (Parcelles) ───────────────────────────
export const getSurfaces = async (): Promise<Surface[]> => {
  const { data, error } = await supabase.from("surfaces").select("*");
  if (error) throw error;
  const { data: profiles } = await supabase.from("profiles").select("id, email");
  const { data: vannes } = await supabase.from("vannes").select("id, fk_surface");
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

  return (data ?? []).map((s: any) => ({
    id: s.id,
    nomSurface: s.nom_surface,
    localisation: s.localisation,
    typeSol: s.type_sol,
    fkUser: s.fk_user,
    fkSol: s.fk_sol,
    fkClimat: s.fk_climat,
    tailleHa: s.taille_ha != null ? Number(s.taille_ha) : undefined,
    isConnected: s.is_connected ?? false,
    userEmail: profileMap.get(s.fk_user) ?? "—",
    nbVanne: (vannes ?? []).filter((v: any) => v.fk_surface === s.id).length,
  }));
};

export const createSurface = async (d: { nomSurface: string; localisation: string; fkUser: string; tailleHa?: number }): Promise<Surface> => {
  const insertData: any = {
    nom_surface: d.nomSurface,
    localisation: d.localisation,
    fk_user: d.fkUser,
  };
  if (d.tailleHa !== undefined) insertData.taille_ha = d.tailleHa;
  const { data, error } = await supabase.from("surfaces").insert(insertData as any).select().single();
  if (error) throw error;
  return { id: data.id, nomSurface: (data as any).nom_surface, localisation: (data as any).localisation, fkUser: (data as any).fk_user, tailleHa: (data as any).taille_ha != null ? Number((data as any).taille_ha) : undefined };
};

export const updateSurface = async (id: string, d: Partial<Surface>): Promise<Surface | null> => {
  const dbData: any = {};
  if (d.nomSurface !== undefined) dbData.nom_surface = d.nomSurface;
  if (d.localisation !== undefined) dbData.localisation = d.localisation;
  if (d.typeSol !== undefined) dbData.type_sol = d.typeSol;
  if (d.fkSol !== undefined) dbData.fk_sol = d.fkSol;
  if (d.fkClimat !== undefined) dbData.fk_climat = d.fkClimat;
  if (d.tailleHa !== undefined) dbData.taille_ha = d.tailleHa;
  if (d.isConnected !== undefined) dbData.is_connected = d.isConnected;
  const { data, error } = await supabase.from("surfaces").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, nomSurface: (data as any).nom_surface, localisation: (data as any).localisation } as Surface;
};

export const deleteSurface = async (id: string): Promise<void> => {
  const { error } = await supabase.from("surfaces").delete().eq("id", id);
  if (error) throw error;
};

// ─── Plantes ────────────────────────────────────────
export const getPlantes = async (): Promise<Plante[]> => {
  const { data, error } = await supabase.from("plantes").select("*");
  if (error) throw error;
  const { data: surfaces } = await supabase.from("surfaces").select("id, nom_surface");
  const { data: types } = await supabase.from("types_plante").select("id, nom_plante");
  const surfMap = new Map((surfaces ?? []).map((s: any) => [s.id, s.nom_surface]));
  const typeMap = new Map((types ?? []).map((t: any) => [t.id, t.nom_plante]));

  return (data ?? []).map((p: any) => ({
    id: p.id,
    nomPlante: p.nom_plante,
    age: p.age,
    fkTypePlante: p.fk_type_plante ?? "",
    fkSurface: p.fk_surface ?? "",
    surfaceNom: surfMap.get(p.fk_surface) ?? "—",
    typePlanteNom: typeMap.get(p.fk_type_plante) ?? "—",
  }));
};

export const createPlante = async (d: Omit<Plante, "id" | "surfaceNom" | "typePlanteNom">): Promise<Plante> => {
  const { data, error } = await supabase.from("plantes").insert({
    nom_plante: d.nomPlante,
    age: d.age,
    fk_type_plante: d.fkTypePlante,
    fk_surface: d.fkSurface,
  } as any).select().single();
  if (error) throw error;
  return { id: data.id, nomPlante: (data as any).nom_plante, age: (data as any).age, fkTypePlante: (data as any).fk_type_plante, fkSurface: (data as any).fk_surface };
};

export const updatePlante = async (id: string, d: Partial<Plante>): Promise<Plante | null> => {
  const dbData: any = {};
  if (d.nomPlante !== undefined) dbData.nom_plante = d.nomPlante;
  if (d.age !== undefined) dbData.age = d.age;
  if (d.fkTypePlante !== undefined) dbData.fk_type_plante = d.fkTypePlante;
  if (d.fkSurface !== undefined) dbData.fk_surface = d.fkSurface;
  const { data, error } = await supabase.from("plantes").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, nomPlante: (data as any).nom_plante, age: (data as any).age, fkTypePlante: (data as any).fk_type_plante, fkSurface: (data as any).fk_surface };
};

export const deletePlante = async (id: string): Promise<void> => {
  const { error } = await supabase.from("plantes").delete().eq("id", id);
  if (error) throw error;
};

// ─── Vannes ─────────────────────────────────────────
export const getVannes = async (): Promise<Vanne[]> => {
  const { data, error } = await supabase.from("vannes").select("*");
  if (error) throw error;
  const { data: surfaces } = await supabase.from("surfaces").select("id, nom_surface");
  const surfMap = new Map((surfaces ?? []).map((s: any) => [s.id, s.nom_surface]));

  return (data ?? []).map((v: any) => ({
    id: v.id,
    nomVanne: v.nom_vanne,
    nbPlantParVanne: v.nb_plant_par_vanne,
    debitEauParVanne: Number(v.debit_eau_par_vanne),
    fkSurface: v.fk_surface ?? "",
    surfaceNom: surfMap.get(v.fk_surface) ?? "—",
  }));
};

export const createVanne = async (d: Omit<Vanne, "id" | "surfaceNom">): Promise<Vanne> => {
  const { data, error } = await supabase.from("vannes").insert({
    nom_vanne: d.nomVanne,
    nb_plant_par_vanne: d.nbPlantParVanne,
    debit_eau_par_vanne: d.debitEauParVanne,
    fk_surface: d.fkSurface,
  } as any).select().single();
  if (error) throw error;
  return { id: data.id, nomVanne: (data as any).nom_vanne, nbPlantParVanne: (data as any).nb_plant_par_vanne, debitEauParVanne: Number((data as any).debit_eau_par_vanne), fkSurface: (data as any).fk_surface };
};

export const updateVanne = async (id: string, d: Partial<Vanne>): Promise<Vanne | null> => {
  const dbData: any = {};
  if (d.nomVanne !== undefined) dbData.nom_vanne = d.nomVanne;
  if (d.nbPlantParVanne !== undefined) dbData.nb_plant_par_vanne = d.nbPlantParVanne;
  if (d.debitEauParVanne !== undefined) dbData.debit_eau_par_vanne = d.debitEauParVanne;
  if (d.fkSurface !== undefined) dbData.fk_surface = d.fkSurface;
  const { data, error } = await supabase.from("vannes").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, nomVanne: (data as any).nom_vanne, nbPlantParVanne: (data as any).nb_plant_par_vanne, debitEauParVanne: Number((data as any).debit_eau_par_vanne), fkSurface: (data as any).fk_surface };
};

export const deleteVanne = async (id: string): Promise<void> => {
  const { error } = await supabase.from("vannes").delete().eq("id", id);
  if (error) throw error;
};

// ─── Sols ───────────────────────────────────────────
export const getSols = async (): Promise<Sol[]> => {
  const { data, error } = await supabase.from("sols").select("*");
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    id: s.id,
    nature: s.nature,
    humidite: Number(s.humidite),
    salinite: Number(s.salinite),
    ph: Number(s.ph),
    temperature: Number(s.temperature),
    dateMesure: s.date_mesure,
  }));
};

export const createSol = async (d: Omit<Sol, "id">): Promise<Sol> => {
  const { data, error } = await supabase.from("sols").insert({
    nature: d.nature,
    humidite: d.humidite,
    salinite: d.salinite,
    ph: d.ph,
    temperature: d.temperature,
    date_mesure: d.dateMesure,
  } as any).select().single();
  if (error) throw error;
  return { id: data.id, nature: (data as any).nature, humidite: Number((data as any).humidite), salinite: Number((data as any).salinite), ph: Number((data as any).ph), temperature: Number((data as any).temperature), dateMesure: (data as any).date_mesure };
};

export const updateSol = async (id: string, d: Partial<Sol>): Promise<Sol | null> => {
  const dbData: any = {};
  if (d.nature !== undefined) dbData.nature = d.nature;
  if (d.humidite !== undefined) dbData.humidite = d.humidite;
  if (d.salinite !== undefined) dbData.salinite = d.salinite;
  if (d.ph !== undefined) dbData.ph = d.ph;
  if (d.temperature !== undefined) dbData.temperature = d.temperature;
  const { data, error } = await supabase.from("sols").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, nature: (data as any).nature, humidite: Number((data as any).humidite), salinite: Number((data as any).salinite), ph: Number((data as any).ph), temperature: Number((data as any).temperature), dateMesure: (data as any).date_mesure };
};

export const deleteSol = async (id: string): Promise<void> => {
  const { error } = await supabase.from("sols").delete().eq("id", id);
  if (error) throw error;
};

// ─── Climats ────────────────────────────────────────
export const getClimats = async (): Promise<Climat[]> => {
  const { data, error } = await supabase.from("climats").select("*");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    id: c.id,
    temperatureC: Number(c.temperature_c),
    humiditeC: Number(c.humidite_c),
    vitesseVent: Number(c.vitesse_vent),
    puissanceEnsoleillement: Number(c.puissance_ensoleillement),
  }));
};

export const createClimat = async (d: Omit<Climat, "id">): Promise<Climat> => {
  const { data, error } = await supabase.from("climats").insert({
    temperature_c: d.temperatureC,
    humidite_c: d.humiditeC,
    vitesse_vent: d.vitesseVent,
    puissance_ensoleillement: d.puissanceEnsoleillement,
  } as any).select().single();
  if (error) throw error;
  return { id: data.id, temperatureC: Number((data as any).temperature_c), humiditeC: Number((data as any).humidite_c), vitesseVent: Number((data as any).vitesse_vent), puissanceEnsoleillement: Number((data as any).puissance_ensoleillement) };
};

export const updateClimat = async (id: string, d: Partial<Climat>): Promise<Climat | null> => {
  const dbData: any = {};
  if (d.temperatureC !== undefined) dbData.temperature_c = d.temperatureC;
  if (d.humiditeC !== undefined) dbData.humidite_c = d.humiditeC;
  if (d.vitesseVent !== undefined) dbData.vitesse_vent = d.vitesseVent;
  if (d.puissanceEnsoleillement !== undefined) dbData.puissance_ensoleillement = d.puissanceEnsoleillement;
  const { data, error } = await supabase.from("climats").update(dbData as any).eq("id", id).select().single();
  if (error) throw error;
  return { id: data.id, temperatureC: Number((data as any).temperature_c), humiditeC: Number((data as any).humidite_c), vitesseVent: Number((data as any).vitesse_vent), puissanceEnsoleillement: Number((data as any).puissance_ensoleillement) };
};

export const deleteClimat = async (id: string): Promise<void> => {
  const { error } = await supabase.from("climats").delete().eq("id", id);
  if (error) throw error;
};

// Legacy aliases for backward compatibility
export const getClients = getProfiles;
export const updateClient = updateProfile;

// ─── Réclamations ───────────────────────────────────
export const getReclamations = async (): Promise<Reclamation[]> => {
  const { data, error } = await supabase.from("reclamations" as any).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const { data: profiles } = await supabase.from("profiles").select("id, user_id, first_name, last_name, email");
  const profByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return ((data ?? []) as any[]).map((r: any) => {
    const prof: any = profByUser.get(r.user_id);
    return {
      id: r.id,
      user_id: r.user_id,
      profile_id: r.profile_id,
      sujet: r.sujet,
      message: r.message,
      statut: r.statut,
      traite_at: r.traite_at,
      traite_by: r.traite_by,
      created_at: r.created_at,
      userName: prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() : "—",
      userEmail: prof?.email ?? "—",
    };
  });
};

export const createReclamation = async (d: { user_id: string; profile_id?: string; sujet: string; message: string }): Promise<Reclamation> => {
  const { data, error } = await supabase.from("reclamations" as any).insert(d as any).select().single();
  if (error) throw error;
  return data as any;
};

export const updateReclamationStatus = async (id: string, statut: "en_attente" | "traite", traite_by?: string): Promise<void> => {
  const payload: any = { statut };
  if (statut === "traite") {
    payload.traite_at = new Date().toISOString();
    if (traite_by) payload.traite_by = traite_by;
  } else {
    payload.traite_at = null;
    payload.traite_by = null;
  }
  const { error } = await supabase.from("reclamations" as any).update(payload).eq("id", id);
  if (error) throw error;
};

export const deleteReclamation = async (id: string): Promise<void> => {
  const { error } = await supabase.from("reclamations" as any).delete().eq("id", id);
  if (error) throw error;
};
