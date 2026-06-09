import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUserProfileApi } from "@/services/auth-api";
import { storeToken, getToken, clearTokens, markActivity, isSessionExpired } from "@/lib/token";

interface AuthUser {
  id: string;
  email: string;
}

interface Profile {
  id: string;        // profiles.id (Long) — utilisé comme created_by
  userId: string;    // users.id (UUID)
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  user_role: string;
  company_name: string | null;
  company_logo: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => void;
  setToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: () => {},
  setToken: async () => {},
});

function decodeJwt(token: string): { userId: string; email: string; role: string; profileId?: number } | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!decoded.userId || !decoded.email) return null;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role ?? "user",
      profileId: decoded.profileId ?? undefined,
    };
  } catch {
    return null;
  }
}

function mapRole(backendRole: string): string {
  const r = backendRole?.toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "PARTENAIRE") return "PARTENAIRE";
  return "CLIENT";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = async (token: string) => {
    const claims = decodeJwt(token);
    if (!claims) {
      clearTokens();
      setUser(null);
      setProfile(null);
      return;
    }

    setUser({ id: claims.userId, email: claims.email });

    try {
      const backendProfile = await getUserProfileApi(token);
      // id = profiles.id (Long) pour created_by ; userId = users.id (UUID)
      setProfile({
        id: backendProfile.profileId != null ? String(backendProfile.profileId) : claims.profileId != null ? String(claims.profileId) : claims.userId,
        userId: backendProfile.id,
        first_name: backendProfile.firstName,
        last_name: backendProfile.lastName,
        avatar_url: backendProfile.avatarUrl,
        user_role: mapRole(backendProfile.userRole ?? backendProfile.role ?? "CLIENT"),
        company_name: null,
        company_logo: null,
      });
    } catch {
      setProfile({
        id: claims.profileId != null ? String(claims.profileId) : claims.userId,
        userId: claims.userId,
        first_name: null,
        last_name: null,
        avatar_url: null,
        user_role: mapRole(claims.role),
        company_name: null,
        company_logo: null,
      });
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      loadFromToken(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Sécurité session : expiration par inactivité (5 min) après fermeture/onglet caché.
  useEffect(() => {
    const expireIfNeeded = () => {
      if (isSessionExpired()) {
        clearTokens();
        setUser(null);
        setProfile(null);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // L'onglet passe en arrière-plan / se ferme : on démarre le cooldown.
        markActivity();
      } else {
        // Retour au premier plan : on expire si > 5 min d'inactivité.
        expireIfNeeded();
      }
    };
    // pagehide couvre la fermeture de l'onglet/navigateur (record du moment de sortie).
    const onPageHide = () => markActivity();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  const setToken = async (token: string) => {
    storeToken(token);
    setLoading(true);
    await loadFromToken(token);
    setLoading(false);
  };

  const signOut = () => {
    clearTokens();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
