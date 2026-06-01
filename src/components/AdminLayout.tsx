import { useEffect } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Droplets, Grid3X3, Users, Briefcase, LogOut, CreditCard, LayoutDashboard, Cpu, Database, FileBarChart, HardDrive, MessageSquare, Wallet, Package, ClipboardList, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoTesla from "@/assets/logo-tesla-energie.png";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

type NavItem = { titleKey: string; url: string; icon: any; roles: string[]; badgeKey?: "reclamations" | "support" };

const navGlobal: NavItem[] = [
  { titleKey: "nav.dashboard", url: "/admin/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.users", url: "/admin/users", icon: Users, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.subscriptions", url: "/admin/subscriptions", icon: CreditCard, roles: ["ADMIN"] },
  { titleKey: "nav.finance", url: "/admin/finance", icon: Wallet, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.rapports", url: "/admin/rapports", icon: FileBarChart, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.reclamations", url: "/admin/reclamations", icon: MessageSquare, roles: ["ADMIN", "SOUS_ADMIN"], badgeKey: "reclamations" },
  { titleKey: "nav.baseDonnees", url: "/admin/base-donnees", icon: HardDrive, roles: ["ADMIN", "SOUS_ADMIN"] },
];

const navStock: NavItem[] = [
  { titleKey: "nav.stock", url: "/admin/stock", icon: Package, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.reservationMateriel", url: "/admin/reservation-materiel", icon: ClipboardList, roles: ["ADMIN", "SOUS_ADMIN"], badgeKey: "support" },
  { titleKey: "nav.ventes", url: "/admin/ventes", icon: ShoppingCart, roles: ["ADMIN", "SOUS_ADMIN"] },
];

const navTravail: NavItem[] = [
  { titleKey: "nav.travail", url: "/admin/travail", icon: Briefcase, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.surfaces", url: "/admin/surfaces", icon: Grid3X3, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.donneesDetaillees", url: "/admin/donnees-detaillees", icon: Database, roles: ["ADMIN", "SOUS_ADMIN"] },
  { titleKey: "nav.capteurs", url: "/admin/capteurs", icon: Cpu, roles: ["ADMIN", "SOUS_ADMIN"] },
];

const pageTitleKeys: Record<string, string> = {
  "/admin/dashboard": "nav.dashboard",
  "/admin/travail": "nav.travail",
  "/admin/surfaces": "nav.surfaces",
  "/admin/donnees-detaillees": "nav.donneesDetaillees",
  "/admin/capteurs": "nav.capteurs",
  "/admin/users": "nav.users",
  "/admin/subscriptions": "nav.subscriptions",
  "/admin/rapports": "nav.rapports",
  "/admin/rapport-sol": "nav.rapportSol",
  "/admin/rapport-eau": "rapports.waterReport",
  "/admin/base-donnees": "nav.baseDonnees",
  "/admin/reclamations": "nav.reclamations",
  "/admin/finance": "nav.finance",
  "/admin/stock": "nav.stock",
  "/admin/reservation-materiel": "nav.reservationMateriel",
  "/admin/ventes": "nav.ventes",
  "/admin/profile": "nav.profile",
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const userRole = profile?.user_role;
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : "Administration";
  const isClientUser = userRole === "CLIENT";

  // Pending reclamations count (real-time)
  const { data: pendingReclamations = 0 } = useQuery({
    queryKey: ["reclamations-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("reclamations")
        .select("id", { count: "exact", head: true })
        .eq("statut", "en_attente");
      return count ?? 0;
    },
    enabled: !!profile && !isClientUser,
  });

  // Pending support notifications count (real-time)
  const { data: pendingSupport = 0 } = useQuery({
    queryKey: ["support-notifications-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!profile && !isClientUser,
  });

  useEffect(() => {
    if (!profile || isClientUser) return;
    const ch = supabase
      .channel("badges-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reclamations" }, () => {
        qc.invalidateQueries({ queryKey: ["reclamations-pending-count"] });
        qc.invalidateQueries({ queryKey: ["reclamations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["support-notifications-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, isClientUser, qc]);

  // Dynamic branding for SOUS_ADMIN
  const isSousAdmin = userRole === "SOUS_ADMIN";
  const brandName = isSousAdmin && profile?.company_name ? profile.company_name : "TESLA";
  const brandSub = isSousAdmin && profile?.company_name ? "" : "ENERGIE";
  const brandLogo = isSousAdmin && profile?.company_logo ? profile.company_logo : logoTesla;

  useEffect(() => {
    if (isClientUser) {
      void signOut();
    }
  }, [isClientUser, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Droplets className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (!profile) return null;

  if (isClientUser) {
    return <Navigate to="/auth/login" replace />;
  }

  if (location.pathname === "/admin" || location.pathname === "/admin/") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : user.email ?? "";

  const initials = profile?.first_name
    ? `${profile.first_name[0]}${(profile.last_name?.[0] ?? "")}`.toUpperCase()
    : (user.email?.[0] ?? "U").toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-4">
              <img src={brandLogo} alt={brandName} className="h-10 w-10 object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-sidebar-foreground tracking-wide">{brandName}</span>
                {brandSub && <span className="text-[10px] font-semibold tracking-[0.25em] text-primary">{brandSub}</span>}
              </div>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
              onClick={() => navigate("/admin/profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Général</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navGlobal.filter(item => item.roles.includes(userRole)).map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span className="flex-1">{t(item.titleKey)}</span>
                          {item.badgeKey === "reclamations" && pendingReclamations > 0 && (
                            <span
                              className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-in zoom-in-50 duration-200"
                              aria-label={`${pendingReclamations} réclamations en attente`}
                            >
                              {pendingReclamations > 99 ? "99+" : pendingReclamations}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Stock</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navStock.filter(item => item.roles.includes(userRole)).map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span className="flex-1">{t(item.titleKey)}</span>
                          {item.badgeKey === "support" && pendingSupport > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold animate-in zoom-in-50 duration-200">
                              {pendingSupport > 99 ? "99+" : pendingSupport}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t("nav.travail")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navTravail.filter(item => item.roles.includes(userRole)).map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{t(item.titleKey)}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("nav.logout")}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-foreground flex-1">{title}</h1>
            <LanguageSwitcher />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
