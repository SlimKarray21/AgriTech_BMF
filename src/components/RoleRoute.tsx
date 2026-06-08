import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Droplets } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { homeForRole } from "@/lib/roles";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Droplets className="h-8 w-8 animate-pulse text-primary" />
    </div>
  );
}

/**
 * Garde de route par rôle.
 *
 * - tant que le profil charge : écran d'attente ;
 * - non connecté : redirection vers /auth/login ;
 * - connecté mais mauvais rôle : redirection silencieuse vers son propre espace
 *   (un partenaire qui ouvre /admin/* est renvoyé vers /partenaire, et inversement).
 *   On ne déconnecte jamais l'utilisateur juste parce qu'il a visité la mauvaise URL.
 */
export default function RoleRoute({
  role,
  children,
}: {
  role: "ADMIN" | "PARTENAIRE";
  children: ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <Navigate to="/auth/login" replace />;

  if (profile.user_role !== role) {
    // Renvoie l'utilisateur vers l'espace qui correspond à son rôle.
    return <Navigate to={homeForRole(profile.user_role)} replace />;
  }

  return <>{children}</>;
}

/**
 * Redirection de la racine "/" vers l'espace d'accueil du rôle connecté.
 * Non connecté -> /auth/login.
 */
export function HomeRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <Navigate to="/auth/login" replace />;

  return <Navigate to={homeForRole(profile.user_role)} replace />;
}
