import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Profile, Surface } from "@/types/models";

export function useFilteredProfiles(profiles: Profile[]) {
  const { profile: currentProfile } = useAuth();
  const userRole = currentProfile?.user_role ?? "CLIENT";
  const profileId = currentProfile?.id;

  return useMemo(() => {
    if (userRole === "ADMIN") return profiles;
    if (userRole === "PARTENAIRE" && profileId) {
      return profiles.filter(
        (p) => p.user_role === "CLIENT" && p.created_by === profileId
      );
    }
    return [];
  }, [profiles, userRole, profileId]);
}

export function useFilteredSurfaces(surfaces: Surface[], visibleProfileIds: Set<string>) {
  const { profile: currentProfile } = useAuth();
  const userRole = currentProfile?.user_role ?? "CLIENT";

  return useMemo(() => {
    if (userRole === "ADMIN") return surfaces;
    return surfaces.filter((s) => s.fkUser && visibleProfileIds.has(s.fkUser));
  }, [surfaces, userRole, visibleProfileIds]);
}
