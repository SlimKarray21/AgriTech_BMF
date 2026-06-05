import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUserProfileApi } from "@/services/auth-api";
import { API_BASE_URL } from "@/services/api-config";

export const TOKEN_KEY = "agritech_admin_token";

interface AuthUser {
  id: string;
  email: string;
}

interface Profile {
  id: string;
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

function decodeJwt(token: string): { userId: string; email: string; role: string } | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!decoded.userId || !decoded.email) return null;
    return { userId: decoded.userId, email: decoded.email, role: decoded.role ?? "user" };
  } catch {
    return null;
  }
}

function mapRole(backendRole: string, profileRole?: string | null): string {
  // L'auth role (JWT) a priorité pour admin — il est signé et fiable
  if (backendRole === "admin") return "ADMIN";
  if (backendRole === "sous_admin") return "SOUS_ADMIN";
  // Pour les users normaux, on regarde le profileRole de la table profiles
  if (profileRole === "SOUS_ADMIN") return "SOUS_ADMIN";
  if (profileRole === "ADMIN") return "ADMIN";
  return "CLIENT";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = async (token: string) => {
    const claims = decodeJwt(token);
    if (!claims) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setProfile(null);
      return;
    }

    setUser({ id: claims.userId, email: claims.email });

    try {
      const backendProfile = await getUserProfileApi(token);

      // profileRole depuis le backend (si redémarré) ou fetch direct sinon
      let profileRole: string | null = (backendProfile as any).profileRole ?? null;

      if (!profileRole && backendProfile.role !== "admin") {
        // Fetch la liste des profils pour trouver user_role du sous-admin
        try {
          const res = await fetch(`${API_BASE_URL}/api/agri/profiles`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const profiles: any[] = await res.json();
            const mine = profiles.find(
              (p: any) => p.email?.toLowerCase() === backendProfile.email?.toLowerCase()
            );
            profileRole = mine?.user_role ?? null;
          }
        } catch { /* ignore */ }
      }

      setProfile({
        id: backendProfile.id,
        first_name: backendProfile.firstName,
        last_name: backendProfile.lastName,
        avatar_url: backendProfile.avatarUrl,
        user_role: mapRole(backendProfile.role, profileRole),
        company_name: null,
        company_logo: null,
      });
    } catch {
      // Fallback: build profile from JWT claims only
      setProfile({
        id: claims.userId,
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
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      loadFromToken(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const setToken = async (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setLoading(true);
    await loadFromToken(token);
    setLoading(false);
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
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
