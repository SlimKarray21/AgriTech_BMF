/**
 * Formatage monétaire en Dinar tunisien (locale fr-FR).
 *
 * @param n  montant (les valeurs nulles/undefined sont traitées comme 0)
 * @param fractionDigits  nombre max de décimales (2 par défaut ; 0 pour les KPI arrondis)
 */
export const DT = (n: number, fractionDigits = 2): string =>
  `${Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: fractionDigits })} DT`;
