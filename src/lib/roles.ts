/** Espace d'accueil par défaut de chaque rôle. */
export const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  PARTENAIRE: "/partenaire/users",
};

/** Renvoie la route d'accueil d'un rôle, ou /auth/login si rôle inconnu. */
export function homeForRole(role: string | undefined | null): string {
  return (role && HOME_BY_ROLE[role]) || "/auth/login";
}
