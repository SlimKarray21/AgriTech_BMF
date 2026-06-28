import { useLocation } from "react-router-dom";

/**
 * Préfixe de route du segment courant ("/admin" ou "/partenaire").
 *
 * Permet aux pages partagées entre les espaces Admin et Partenaire de
 * naviguer vers le bon sous-arbre sans dupliquer le composant ni recevoir
 * de prop : le préfixe est déduit de l'URL active.
 */
export function useRoleBasePath(): "/admin" | "/partenaire" {
  const { pathname } = useLocation();
  return pathname.startsWith("/partenaire") ? "/partenaire" : "/admin";
}
