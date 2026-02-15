import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Etablissements from "./pages/Etablissements";
import Filieres from "./pages/Filieres";
import Matieres from "./pages/Matieres";
import Niveaux from "./pages/Niveaux";
import Epreuves from "./pages/Epreuves";
import Ressources from "./pages/Ressources";
import Publicites from "./pages/Publicites";
import Evenements from "./pages/Evenements";
import Opportunites from "./pages/Opportunites";
import Concours from "./pages/Concours";
import ContactsProfessionnels from "./pages/ContactsProfessionnels";
import Parcours from "./pages/Parcours";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import AppVersions from "./pages/AppVersions";
import Parrainages from "./pages/Parrainages";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Forums from "./pages/Forums";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/etablissements" element={<Etablissements />} />
                      <Route path="/filieres" element={<Filieres />} />
                      <Route path="/matieres" element={<Matieres />} />
                      <Route path="/niveaux" element={<Niveaux />} />
                      <Route path="/epreuves" element={<Epreuves />} />
                      <Route path="/ressources" element={<Ressources />} />
                      <Route path="/publicites" element={<Publicites />} />
                      <Route path="/evenements" element={<Evenements />} />
                      <Route path="/opportunites" element={<Opportunites />} />
                      <Route path="/concours" element={<Concours />} />
                      <Route path="/forums" element={<Forums />} />
                      <Route path="/parcours" element={<Parcours />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/contacts-professionnels" element={<ContactsProfessionnels />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/app-versions" element={<AppVersions />} />
                      <Route path="/parrainages" element={<Parrainages />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
