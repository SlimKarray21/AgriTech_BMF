import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/AdminLayout";
import RoleRoute, { HomeRedirect } from "@/components/RoleRoute";
import DashboardPage from "@/pages/admin/DashboardPage";
import SurfacesPage from "@/pages/admin/SurfacesPage";
import DonneesDetailleesPage from "@/pages/admin/DonneesDetailleesPage";
import CapteurPage from "@/pages/admin/CapteurPage";
import UsersPage from "@/pages/admin/UsersPage";
import SubscriptionsPage from "@/pages/admin/SubscriptionsPage";
import ProfilePage from "@/pages/shared/ProfilePage";
import ClientDetailPage from "@/pages/shared/ClientDetailPage";
import RapportSolPage from "@/pages/shared/RapportSolPage";
import RapportEauPage from "@/pages/shared/RapportEauPage";
import RapportsPage from "@/pages/shared/RapportsPage";
import SurfaceDetailPage from "@/pages/shared/SurfaceDetailPage";
import BaseDonneesPage from "@/pages/admin/BaseDonneesPage";
import ReclamationsPage from "@/pages/admin/ReclamationsPage";
import FinancePage from "@/pages/admin/FinancePage";
import StockPage from "@/pages/admin/StockPage";
import FicheClientPage from "@/pages/admin/FicheClientPage";
import ReservationMaterielPage from "@/pages/admin/ReservationMaterielPage";
import RecettesPage from "@/pages/admin/RecettesPage";
import PartenaireDetailsPage from "@/pages/admin/PartenaireDetailsPage";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import PartenaireLayout from "@/components/PartenaireLayout";
import PartenaireUsersPage from "@/pages/partenaire/UsersPage";
import PartenaireSubscriptionsPage from "@/pages/partenaire/SubscriptionsPage";
import PartenaireBaseDonneesPage from "@/pages/partenaire/BaseDonneesPage";
import PartenaireReclamationsPage from "@/pages/partenaire/ReclamationsPage";
import PartenaireDemandeMaterielPage from "@/pages/partenaire/DemandeMaterielPage";
import PartenaireVerifyEmailPage from "@/pages/partenaire/VerifyEmailPage";

// Cache partagé entre navigations : évite que les données repartent en
// `undefined`/null à chaque changement de page (flash de valeurs vides).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // données considérées fraîches 1 min
      gcTime: 5 * 60_000,         // gardées en cache 5 min
      retry: 1,
      refetchOnWindowFocus: false, // pas de refetch (et de flicker) au focus
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/admin"
                element={
                  <RoleRoute role="ADMIN">
                    <AdminLayout />
                  </RoleRoute>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="surfaces" element={<SurfacesPage />} />
                <Route path="donnees-detaillees" element={<DonneesDetailleesPage />} />
                <Route path="capteurs" element={<CapteurPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="travail/client/:clientId" element={<ClientDetailPage backTo="/admin/travail" />} />
                <Route path="travail/surface/:surfaceId" element={<SurfaceDetailPage />} />
                <Route path="rapports" element={<RapportsPage />} />
                <Route path="rapport-sol" element={<RapportSolPage />} />
                <Route path="rapport-eau" element={<RapportEauPage />} />
                <Route path="base-donnees" element={<BaseDonneesPage />} />
                <Route path="reclamations" element={<ReclamationsPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="reservation-materiel" element={<ReservationMaterielPage />} />
                <Route path="recettes" element={<RecettesPage />} />
                <Route path="fiche-client" element={<FicheClientPage />} />
                <Route path="fiche-client/:clientId" element={<FicheClientPage />} />
                <Route path="partenaire/:partenaireId" element={<PartenaireDetailsPage />} />
              </Route>
              <Route
                path="/partenaire"
                element={
                  <RoleRoute role="PARTENAIRE">
                    <PartenaireLayout />
                  </RoleRoute>
                }
              >
                <Route path="users" element={<PartenaireUsersPage />} />
                <Route path="subscriptions" element={<PartenaireSubscriptionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="travail/client/:clientId" element={<ClientDetailPage />} />
                <Route path="travail/surface/:surfaceId" element={<SurfaceDetailPage />} />
                <Route path="rapports" element={<RapportsPage />} />
                <Route path="rapport-sol" element={<RapportSolPage />} />
                <Route path="rapport-eau" element={<RapportEauPage />} />
                <Route path="base-donnees" element={<PartenaireBaseDonneesPage />} />
                <Route path="reclamations" element={<PartenaireReclamationsPage />} />
                <Route path="demande-materiel" element={<PartenaireDemandeMaterielPage />} />
                <Route path="users/verify-email" element={<PartenaireVerifyEmailPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
