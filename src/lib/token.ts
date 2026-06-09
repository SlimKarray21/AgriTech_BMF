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

/** Horodatage de dernière activité (ms) — sert à l'expiration par inactivité. */
const LAST_ACTIVE_KEY = "agritech_last_active";

/**
 * Délai d'inactivité au-delà duquel la session expire après fermeture de l'onglet
 * ou du navigateur (cooldown de 5 min). Tant que l'onglet reste ouvert et actif,
 * la session est rafraîchie et n'expire pas.
 */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

/** Toutes les clés de token gérées, dans l'ordre de priorité de lecture. */
const ALL_TOKEN_KEYS = [ADMIN_TOKEN_KEY, PARTENAIRE_TOKEN_KEY] as const;

const now = (): number => Date.now();

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
  markActivity();
}

/** Lit le token brut stocké (sans contrôle d'expiration). */
function readRawToken(): string | null {
  for (const k of ALL_TOKEN_KEYS) {
    const t = localStorage.getItem(k);
    if (t) return t;
  }
  return null;
}

/**
 * Renvoie le token de la session courante (admin ou partenaire), ou null.
 * Applique l'expiration par inactivité : si plus de 5 min se sont écoulées depuis
 * la dernière activité (onglet fermé/en arrière-plan), la session est effacée.
 */
export function getToken(): string | null {
  const t = readRawToken();
  if (!t) return null;

  const last = Number(localStorage.getItem(LAST_ACTIVE_KEY));
  if (last && now() - last > INACTIVITY_TIMEOUT_MS) {
    clearTokens(); // session expirée -> on efface tout
    return null;
  }
  // Session active : on rafraîchit l'horodatage.
  markActivity();
  return t;
}

/** Enregistre l'instant courant comme dernière activité (démarre/relance le cooldown). */
export function markActivity(): void {
  if (readRawToken()) localStorage.setItem(LAST_ACTIVE_KEY, String(now()));
}

/** Indique si la session a expiré par inactivité (token présent mais cooldown dépassé). */
export function isSessionExpired(): boolean {
  if (!readRawToken()) return false;
  const last = Number(localStorage.getItem(LAST_ACTIVE_KEY));
  return !!last && now() - last > INACTIVITY_TIMEOUT_MS;
}

/** Supprime tous les tokens (déconnexion). */
export function clearTokens(): void {
  for (const k of ALL_TOKEN_KEYS) localStorage.removeItem(k);
  localStorage.removeItem(LAST_ACTIVE_KEY);
}
