import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Grid3X3, Users, LogOut, CreditCard, LayoutDashboard, Cpu, Database, FileBarChart, HardDrive, MessageSquare, Wallet, Package, ClipboardList, ShoppingCart } from "lucide-react";
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
  { titleKey: "nav.dashboard", url: "/admin/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { titleKey: "nav.users", url: "/admin/users", icon: Users, roles: ["ADMIN"] },
  { titleKey: "nav.subscriptions", url: "/admin/subscriptions", icon: CreditCard, roles: ["ADMIN"] },
  { titleKey: "nav.rapports", url: "/admin/rapports", icon: FileBarChart, roles: ["ADMIN"] },
  { titleKey: "nav.reclamations", url: "/admin/reclamations", icon: MessageSquare, roles: ["ADMIN"] },
  { titleKey: "nav.baseDonnees", url: "/admin/base-donnees", icon: HardDrive, roles: ["ADMIN"] },
];

const navStock: NavItem[] = [
  { titleKey: "nav.stock", url: "/admin/stock", icon: Package, roles: ["ADMIN"] },
  { titleKey: "nav.reservationMateriel", url: "/admin/reservation-materiel", icon: ClipboardList, roles: ["ADMIN"] },
];

// Sous-partie "Comptabilité" (sous Stock) : finance + ventes.
const navComptabilite: NavItem[] = [
  { titleKey: "nav.finance", url: "/admin/finance", icon: Wallet, roles: ["ADMIN"] },
  { titleKey: "nav.ventes", url: "/admin/ventes", icon: ShoppingCart, roles: ["ADMIN"] },
];

const navTravail: NavItem[] = [
  { titleKey: "nav.surfaces", url: "/admin/surfaces", icon: Grid3X3, roles: ["ADMIN"] },
  { titleKey: "nav.donneesDetaillees", url: "/admin/donnees-detaillees", icon: Database, roles: ["ADMIN"] },
  { titleKey: "nav.capteurs", url: "/admin/capteurs", icon: Cpu, roles: ["ADMIN"] },
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
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();

  // L'accès (auth + rôle ADMIN) est déjà garanti par <RoleRoute role="ADMIN"> dans App.tsx ;
  // ce layout ne s'occupe que de l'affichage.
  const userRole = profile?.user_role ?? "";
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : "Administration";

  if (location.pathname === "/admin" || location.pathname === "/admin/") {
    return <Navigate to="/admin/dashboard" replace />;
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
                <span className="text-[10px] font-semibold tracking-[0.25em] text-primary">ENERGIE</span>
              </div>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
              onClick={() => navigate("/admin/profile")}
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
                  {navGlobal.filter(item => item.roles.includes(userRole)).map((item) => (
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
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Comptabilité</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navComptabilite.filter(item => item.roles.includes(userRole)).map((item) => (
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
          </header>
          <div className="p-6">
            {/* key={pathname} : le boundary se remonte à chaque navigation,
                donc une erreur sur une page ne bloque pas les suivantes. */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
