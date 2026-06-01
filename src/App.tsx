import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/AdminLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import TravailPage from "@/pages/admin/TravailPage";
import SurfacesPage from "@/pages/admin/SurfacesPage";
import DonneesDetailleesPage from "@/pages/admin/DonneesDetailleesPage";
import CapteurPage from "@/pages/admin/CapteurPage";
import UsersPage from "@/pages/admin/UsersPage";
import SubscriptionsPage from "@/pages/admin/SubscriptionsPage";
import ProfilePage from "@/pages/admin/ProfilePage";
import ClientDetailPage from "@/pages/admin/ClientDetailPage";
import RapportSolPage from "@/pages/admin/RapportSolPage";
import RapportEauPage from "@/pages/admin/RapportEauPage";
import RapportsPage from "@/pages/admin/RapportsPage";
import SurfaceDetailPage from "@/pages/admin/SurfaceDetailPage";
import BaseDonneesPage from "@/pages/admin/BaseDonneesPage";
import ReclamationsPage from "@/pages/admin/ReclamationsPage";
import FinancePage from "@/pages/admin/FinancePage";
import StockPage from "@/pages/admin/StockPage";
import ReservationMaterielPage from "@/pages/admin/ReservationMaterielPage";
import VentesPage from "@/pages/admin/VentesPage";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="travail" element={<TravailPage />} />
                <Route path="surfaces" element={<SurfacesPage />} />
                <Route path="donnees-detaillees" element={<DonneesDetailleesPage />} />
                <Route path="capteurs" element={<CapteurPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="travail/client/:clientId" element={<ClientDetailPage />} />
                <Route path="travail/surface/:surfaceId" element={<SurfaceDetailPage />} />
                <Route path="rapports" element={<RapportsPage />} />
                <Route path="rapport-sol" element={<RapportSolPage />} />
                <Route path="rapport-eau" element={<RapportEauPage />} />
                <Route path="base-donnees" element={<BaseDonneesPage />} />
                <Route path="reclamations" element={<ReclamationsPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="reservation-materiel" element={<ReservationMaterielPage />} />
                <Route path="ventes" element={<VentesPage />} />
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
