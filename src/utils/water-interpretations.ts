export interface Interpretation {
  label: string;
  color: string;
}

export function interpretWaterPH(val: number): Interpretation {
  if (val < 6.5) return { label: "Acide – Corrosion possible", color: "text-red-600" };
  if (val > 8.2) return { label: "Alcalin – Risque colmatage", color: "text-red-600" };
  return { label: "Normal", color: "text-green-600" };
}

export function interpretCEW(val: number): Interpretation {
  if (val < 0.7) return { label: "Bonne qualité", color: "text-green-600" };
  if (val <= 3) return { label: "Salinité modérée", color: "text-orange-500" };
  return { label: "Eau très salée", color: "text-red-600" };
}

export function interpretResiduSec(val: number): Interpretation {
  if (val < 500) return { label: "Faible", color: "text-green-600" };
  if (val <= 1500) return { label: "Modéré", color: "text-orange-500" };
  return { label: "Élevé", color: "text-red-600" };
}

export function interpretChlorures(val: number): Interpretation {
  if (val < 4) return { label: "Normal", color: "text-green-600" };
  if (val <= 10) return { label: "Modéré", color: "text-orange-500" };
  return { label: "Toxique", color: "text-red-600" };
}

export function interpretSulfates(val: number): Interpretation {
  if (val < 4) return { label: "Normal", color: "text-green-600" };
  if (val <= 8) return { label: "Modéré", color: "text-orange-500" };
  return { label: "Élevé", color: "text-red-600" };
}

export function interpretBicarbonates(val: number): Interpretation {
  if (val < 1.5) return { label: "Faible", color: "text-green-600" };
  if (val <= 8.5) return { label: "Modéré", color: "text-orange-500" };
  return { label: "Élevé – Risque colmatage", color: "text-red-600" };
}

export function interpretSodiumW(val: number): Interpretation {
  if (val < 3) return { label: "Normal", color: "text-green-600" };
  if (val <= 9) return { label: "Modéré", color: "text-orange-500" };
  return { label: "Élevé – Sodisation", color: "text-red-600" };
}

export function interpretCalciumW(val: number): Interpretation {
  if (val < 2) return { label: "Faible", color: "text-orange-500" };
  if (val <= 20) return { label: "Normal", color: "text-green-600" };
  return { label: "Élevé", color: "text-orange-500" };
}

export function interpretMagnesiumW(val: number): Interpretation {
  if (val < 2) return { label: "Faible", color: "text-orange-500" };
  if (val <= 5) return { label: "Normal", color: "text-green-600" };
  return { label: "Élevé", color: "text-orange-500" };
}

export function interpretMgVsCa(mg: number, ca: number): Interpretation {
  if (mg > ca) return { label: "Mg > Ca – Risque imperméabilité", color: "text-red-600" };
  return { label: "Équilibre normal", color: "text-green-600" };
}

export function interpretSAR(val: number): Interpretation {
  if (val < 3) return { label: "Aucun risque", color: "text-green-600" };
  if (val <= 9) return { label: "Risque modéré", color: "text-orange-500" };
  return { label: "Sodisation – Danger", color: "text-red-600" };
}

export function interpretDurete(val: number): Interpretation {
  if (val < 15) return { label: "Eau douce", color: "text-green-600" };
  if (val <= 30) return { label: "Eau moyennement dure", color: "text-orange-500" };
  return { label: "Eau très dure", color: "text-red-600" };
}
