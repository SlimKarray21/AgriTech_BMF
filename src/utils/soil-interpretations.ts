
type Interpretation = { label: string; color: string };

export function interpretPH(v: number): Interpretation {
  if (v < 5.5) return { label: "Fortement acide", color: "text-red-600" };
  if (v < 6.5) return { label: "Acide", color: "text-orange-500" };
  if (v <= 7.5) return { label: "Optimal", color: "text-green-600" };
  if (v <= 8.2) return { label: "Légèrement alcalin", color: "text-yellow-600" };
  return { label: "Alcalin", color: "text-red-600" };
}

export function interpretCE(v: number): Interpretation {
  if (v < 0.4) return { label: "Non salin", color: "text-green-600" };
  if (v < 0.8) return { label: "Légèrement salin", color: "text-yellow-600" };
  if (v <= 2) return { label: "Salinité moyenne", color: "text-orange-500" };
  return { label: "Sol salin", color: "text-red-600" };
}

export function interpretMO(v: number): Interpretation {
  if (v < 1) return { label: "Très faible", color: "text-red-600" };
  if (v < 2) return { label: "Faible", color: "text-orange-500" };
  if (v < 3) return { label: "Moyenne", color: "text-yellow-600" };
  if (v <= 5) return { label: "Bonne", color: "text-green-600" };
  return { label: "Très riche", color: "text-green-700" };
}

export function interpretAzote(v: number): Interpretation {
  if (v < 0.05) return { label: "Très faible", color: "text-red-600" };
  if (v < 0.10) return { label: "Faible", color: "text-orange-500" };
  if (v < 0.20) return { label: "Moyen", color: "text-yellow-600" };
  return { label: "Bon", color: "text-green-600" };
}

export function interpretPhosphore(v: number): Interpretation {
  if (v < 10) return { label: "Très faible", color: "text-red-600" };
  if (v < 20) return { label: "Faible", color: "text-orange-500" };
  if (v < 40) return { label: "Moyen", color: "text-yellow-600" };
  if (v < 80) return { label: "Bon", color: "text-green-600" };
  return { label: "Très riche", color: "text-green-700" };
}

export function interpretPotassium(v: number): Interpretation {
  if (v < 100) return { label: "Faible", color: "text-red-600" };
  if (v < 200) return { label: "Moyen", color: "text-yellow-600" };
  if (v < 300) return { label: "Bon", color: "text-green-600" };
  return { label: "Élevé", color: "text-green-700" };
}

export function interpretCalcium(v: number): Interpretation {
  if (v < 1000) return { label: "Faible", color: "text-red-600" };
  if (v < 2000) return { label: "Moyen", color: "text-yellow-600" };
  if (v < 3000) return { label: "Bon", color: "text-green-600" };
  return { label: "Élevé", color: "text-green-700" };
}

export function interpretMagnesium(v: number): Interpretation {
  if (v < 50) return { label: "Faible", color: "text-red-600" };
  if (v < 150) return { label: "Moyen", color: "text-yellow-600" };
  if (v < 300) return { label: "Bon", color: "text-green-600" };
  return { label: "Élevé", color: "text-green-700" };
}

export function interpretSodium(v: number): Interpretation {
  if (v < 100) return { label: "Normal", color: "text-green-600" };
  if (v < 200) return { label: "Surveillance", color: "text-orange-500" };
  return { label: "Risque sodisation", color: "text-red-600" };
}

export function interpretCEC(v: number): Interpretation {
  if (v < 5) return { label: "Très faible", color: "text-red-600" };
  if (v < 15) return { label: "Faible", color: "text-orange-500" };
  if (v < 25) return { label: "Moyenne", color: "text-yellow-600" };
  return { label: "Bonne à très bonne", color: "text-green-600" };
}

export function interpretFer(v: number): Interpretation {
  if (v < 2) return { label: "Carence", color: "text-red-600" };
  if (v < 5) return { label: "Limite", color: "text-orange-500" };
  if (v < 10) return { label: "Moyen", color: "text-yellow-600" };
  return { label: "Suffisant", color: "text-green-600" };
}

export function interpretZinc(v: number): Interpretation {
  if (v < 0.5) return { label: "Carence", color: "text-red-600" };
  if (v < 1) return { label: "Limite", color: "text-orange-500" };
  return { label: "Suffisant", color: "text-green-600" };
}

export function interpretCuivre(v: number): Interpretation {
  if (v < 0.2) return { label: "Carence", color: "text-red-600" };
  if (v < 0.6) return { label: "Limite", color: "text-orange-500" };
  return { label: "Suffisant", color: "text-green-600" };
}

export function interpretManganese(v: number): Interpretation {
  if (v < 2) return { label: "Carence", color: "text-red-600" };
  if (v < 5) return { label: "Moyen", color: "text-yellow-600" };
  return { label: "Suffisant", color: "text-green-600" };
}

export function interpretBore(v: number): Interpretation {
  if (v < 0.5) return { label: "Carence", color: "text-red-600" };
  if (v < 1) return { label: "Correct", color: "text-yellow-600" };
  if (v <= 2) return { label: "Bon", color: "text-green-600" };
  return { label: "Risque toxicité", color: "text-red-600" };
}

export function interpretGranulo(argile: number, limon: number, sable: number): string {
  if (sable > 70) return "Sableux";
  if (argile > 40) return "Argileux";
  if (limon > 50) return "Limoneux";
  if (argile > 25 && sable > 25) return "Argilo-sableux";
  if (argile > 25 && limon > 25) return "Argilo-limoneux";
  return "Équilibré (Loam)";
}
