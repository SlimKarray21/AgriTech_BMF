import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Grid3X3, Users, LogOut, CreditCard, LayoutDashboard, Cpu, Database, FileBarChart, HardDrive, MessageSquare, Wallet, Package, ClipboardList, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  { titleKey: "nav.demandeMateriel", url: "/partenaire/demande-materiel", icon: Package, roles: ["PARTENAIRE"] },
  { titleKey: "nav.baseDonnees", url: "/partenaire/base-donnees", icon: HardDrive, roles: ["PARTENAIRE"] },
];

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
  "/partenaire/demande-materiel": "nav.demandeMateriel",
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
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-4">
              <img src={logoTesla} alt="TESLA" className="h-10 w-10 object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-sidebar-foreground tracking-wide">TESLA</span>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-primary">PARTENAIRE</span>
              </div>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
              onClick={() => navigate("/partenaire/profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url ?? undefined} />
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
                  {navGlobal.map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span className="flex-1">{t(item.titleKey)}</span>
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
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
