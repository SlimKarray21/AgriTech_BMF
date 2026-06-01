import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Profile, Surface } from "@/types/models";

/**
 * Filters profiles based on current user's role:
 * - ADMIN: sees all profiles
 * - SOUS_ADMIN: sees only CLIENT profiles created by them
 */
export function useFilteredProfiles(profiles: Profile[]) {
  const { profile: currentProfile } = useAuth();
  const userRole = currentProfile?.user_role ?? "CLIENT";
  const profileId = currentProfile?.id;

  return useMemo(() => {
    if (userRole === "ADMIN") return profiles;
    if (userRole === "SOUS_ADMIN" && profileId) {
      return profiles.filter(
        (p) => p.created_by === profileId || p.id === profileId
      );
    }
    return [];
  }, [profiles, userRole, profileId]);
}

/**
 * Filters surfaces based on which profiles the user can see
 */
export function useFilteredSurfaces(surfaces: Surface[], visibleProfileIds: Set<string>) {
  const { profile: currentProfile } = useAuth();
  const userRole = currentProfile?.user_role ?? "CLIENT";

  return useMemo(() => {
    if (userRole === "ADMIN") return surfaces;
    return surfaces.filter((s) => s.fkUser && visibleProfileIds.has(s.fkUser));
  }, [surfaces, userRole, visibleProfileIds]);
}
