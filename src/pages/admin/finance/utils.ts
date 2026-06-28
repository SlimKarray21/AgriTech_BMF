import { Plan } from "./types";

// Formatage monétaire mutualisé (cf. src/lib/format.ts).
export { DT } from "@/lib/format";

export const METHOD_LABEL: Record<string, string> = {
  carte: "Carte bancaire",
  virement: "Virement",
  electronique: "Paiement électronique",
  main_a_main: "Main à main",
  especes: "Espèces",
  mobile: "Paiement mobile",
  cash: "Espèces",
};

export function parseFeatures(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (typeof raw === "string" && raw.trim() && raw !== "{}") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function parsePageAccess(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function normalizePlan(raw: any): Plan {
  return {
    id: String(raw.id),
    name: raw.name ?? "",
    price_dt: Number(raw.price_dt ?? 0),
    duration_days: Number(raw.duration_days ?? 30),
    features: parseFeatures(raw.features),
    page_access: parsePageAccess(raw.page_access),
    active: raw.active ?? true,
  };
}
