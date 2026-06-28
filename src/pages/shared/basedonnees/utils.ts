// Couleur du badge selon le rôle : Admin=rouge, Partenaire=bleu, Client=vert
export const roleBadgeClass = (role?: string): string => {
  const r = (role ?? "").toUpperCase();
  if (r === "ADMIN") return "bg-red-100 text-red-700 border-red-300";
  if (r === "PARTENAIRE") return "bg-blue-100 text-blue-700 border-blue-300";
  return "bg-emerald-100 text-emerald-700 border-emerald-300"; // CLIENT
};
