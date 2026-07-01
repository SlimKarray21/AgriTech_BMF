import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Grid3X3, Users, LogOut, CreditCard, LayoutDashboard, Cpu, Database, FileBarChart, HardDrive, MessageSquare, Wallet, Package, ClipboardList, ShoppingCart, UserRound } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import logoTesla from "@/assets/logo-tesla-energie.png";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

type NavItem = { titleKey: string; url: string; icon: any; roles: string[] };

const navGlobal: NavItem[] = [
  { titleKey: "nav.users", url: "/partenaire/users", icon: Users, roles: ["PARTENAIRE"] },
  { titleKey: "nav.subscriptions", url: "/partenaire/subscriptions", icon: CreditCard, roles: ["PARTENAIRE"] },
  { titleKey: "nav.rapports", url: "/partenaire/rapports", icon: FileBarChart, roles: ["PARTENAIRE"] },
  { titleKey: "nav.reclamations", url: "/partenaire/reclamations", icon: MessageSquare, roles: ["PARTENAIRE"] },
  { titleKey: "nav.baseDonnees", url: "/partenaire/base-donnees", icon: HardDrive, roles: ["PARTENAIRE"] },
];

// Style commun des liens de navigation (base / actif) — aligné sur AdminLayout.
const NAV_LINK_BASE =
  "group/nav relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground";
const NAV_LINK_ACTIVE =
  "!bg-primary/10 !text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-r-full before:bg-primary";

const pageTitleKeys: Record<string, string> = {
  "/partenaire/dashboard": "nav.dashboard",
  "/partenaire/surfaces": "nav.surfaces",
  "/partenaire/donnees-detaillees": "nav.donneesDetaillees",
  "/partenaire/capteurs": "nav.capteurs",
  "/partenaire/users": "nav.users",
  "/partenaire/subscriptions": "nav.subscriptions",
  "/partenaire/rapports": "nav.rapports",
  "/partenaire/rapport-sol": "nav.rapportSol",
  "/partenaire/rapport-eau": "rapports.waterReport",
  "/partenaire/base-donnees": "nav.baseDonnees",
  "/partenaire/reclamations": "nav.reclamations",
  "/partenaire/finance": "nav.finance",
  "/partenaire/stock": "nav.stock",
  "/partenaire/reservation-materiel": "nav.reservationMateriel",
  "/partenaire/ventes": "nav.ventes",
  "/partenaire/profile": "nav.profile",
};

export default function PartenaireLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();

  // L'accès (auth + rôle PARTENAIRE) est déjà garanti par <RoleRoute role="PARTENAIRE"> dans App.tsx ;
  // ce layout ne s'occupe que de l'affichage.
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : "Espace Partenaire";

  if (location.pathname === "/partenaire" || location.pathname === "/partenaire/") {
    return <Navigate to="/partenaire/users" replace />;
  }

  const displayName = profile.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : user.email;

  const initials = profile.first_name
    ? `${profile.first_name[0]}${(profile.last_name?.[0] ?? "")}`.toUpperCase()
    : (user.email[0] ?? "U").toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="p-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5 px-1 py-1 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                <img src={logoTesla} alt="TESLA" className="h-7 w-7 object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-sidebar-foreground tracking-wide">TESLA</span>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-primary">PARTENAIRE</span>
              </div>
            </div>
            <button
              type="button"
              className="group flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-2 text-left transition-all hover:border-primary/30 hover:bg-sidebar-accent/60"
              onClick={() => navigate("/partenaire/profile")}
            >
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                Général
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {navGlobal.map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild className="h-auto p-0">
                        <NavLink to={item.url} end className={NAV_LINK_BASE} activeClassName={NAV_LINK_ACTIVE}>
                          <item.icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover/nav:scale-110" />
                          <span className="flex-1 truncate">{t(item.titleKey)}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("nav.logout")}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-muted/30">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] text-muted-foreground">Espace Partenaire</span>
              <h1 className="text-base font-semibold text-foreground">{title}</h1>
            </div>
          </header>
          <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1500px]">
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
