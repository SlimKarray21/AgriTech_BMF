// Stockage du JWT par rôle dans le localStorage.
//
// L'admin et le partenaire utilisent des clés distinctes afin de ne jamais
// mélanger les deux sessions :
//   - ADMIN       -> agritech_admin_token
//   - PARTENAIRE  -> agritech_partenaire_token
//
// Un seul rôle est connecté à la fois (un onglet = une session) : à la connexion
// on écrit sous la clé du rôle et on efface l'autre clé.

export const ADMIN_TOKEN_KEY = "agritech_admin_token";
export const PARTENAIRE_TOKEN_KEY = "agritech_partenaire_token";

/** Toutes les clés de token gérées, dans l'ordre de priorité de lecture. */
const ALL_TOKEN_KEYS = [ADMIN_TOKEN_KEY, PARTENAIRE_TOKEN_KEY] as const;

/** Décode le rôle (claim "role") d'un JWT, en majuscules. Renvoie null si illisible. */
export function roleFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.role ? String(decoded.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

/** Clé de stockage correspondant à un rôle (ADMIN par défaut si rôle inconnu). */
function keyForRole(role: string | null): string {
  return role === "PARTENAIRE" ? PARTENAIRE_TOKEN_KEY : ADMIN_TOKEN_KEY;
}

/**
 * Enregistre le token sous la clé correspondant à son rôle, et supprime
 * l'éventuel token de l'autre rôle pour éviter les sessions concurrentes.
 */
export function storeToken(token: string): void {
  const key = keyForRole(roleFromToken(token));
  for (const k of ALL_TOKEN_KEYS) {
    if (k !== key) localStorage.removeItem(k);
  }
  localStorage.setItem(key, token);
}

/** Renvoie le token de la session courante (admin ou partenaire), ou null. */
export function getToken(): string | null {
  for (const k of ALL_TOKEN_KEYS) {
    const t = localStorage.getItem(k);
    if (t) return t;
  }
  return null;
}

/** Supprime tous les tokens (déconnexion). */
export function clearTokens(): void {
  for (const k of ALL_TOKEN_KEYS) localStorage.removeItem(k);
}
