export interface Profile {
  id: string;
  user_id: string;
  email?: string;
  user_role: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  location?: string;
  country?: string;
  city?: string;
  avatar_url?: string;
  date_of_birth?: string;
  date_deb_abo?: string;
  date_exp_abo?: string;
  type_abo?: "op1" | "op1_op2" | "full";
  created_by?: string;
  company_name?: string;
  company_logo?: string;
  abo_capteur_sol?: boolean;
  abo_electrovanne?: boolean;
  abo_sante_plante?: boolean;
}

export interface Reclamation {
  id: string;
  user_id: string;
  profile_id?: string;
  sujet: string;
  message: string;
  statut: "en_attente" | "traite";
  traite_at?: string;
  traite_by?: string;
  created_at: string;
  // joined
  userName?: string;
  userEmail?: string;
}

export interface TypePlante {
  id: string;
  nomPlante: string;
  typePlante: string;
  besoinEauParPlante: number;
}

export interface Climat {
  id: string;
  temperatureC: number;
  humiditeC: number;
  vitesseVent: number;
  puissanceEnsoleillement: number;
}

export interface Sol {
  id: string;
  nature: string;
  humidite: number;
  salinite: number;
  ph: number;
  temperature: number;
  dateMesure: string;
}

export interface Surface {
  id: string;
  nomSurface: string;
  localisation: string;
  typeSol?: string;
  fkUser?: string;
  fkSol?: string;
  fkClimat?: string;
  tailleHa?: number;
  isConnected?: boolean;
  // joined
  userEmail?: string;
  nbVanne?: number;
}

export interface Plante {
  id: string;
  nomPlante: string;
  age: number;
  fkTypePlante: string;
  fkSurface: string;
  // joined
  surfaceNom?: string;
  typePlanteNom?: string;
}

export interface Vanne {
  id: string;
  nomVanne: string;
  nbPlantParVanne: number;
  debitEauParVanne: number;
  fkSurface: string;
  // joined
  surfaceNom?: string;
}

export interface WaterReport {
  id: string;
  client_id: string;
  report_type: string;
  created_at: string;
  ph: number | null;
  cew: number | null;
  residu_sec: number | null;
  chlorures: number | null;
  sulfates: number | null;
  bicarbonates: number | null;
  sodium: number | null;
  calcium: number | null;
  magnesium: number | null;
  sar: number | null;
  durete: number | null;
}
