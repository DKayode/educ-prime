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
import Annees from "./pages/Annees";
import Epreuves from "./pages/Epreuves";
import Ressources from "./pages/Ressources";
import Publicites from "./pages/Publicites";
import Evenements from "./pages/Evenements";
import Opportunites from "./pages/Opportunites";
import ConcoursExamens from "./pages/ConcoursExamens";
import ContactsProfessionnels from "./pages/ContactsProfessionnels";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

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
                      <Route path="/annees" element={<Annees />} />
                      <Route path="/epreuves" element={<Epreuves />} />
                      <Route path="/ressources" element={<Ressources />} />
                      <Route path="/publicites" element={<Publicites />} />
                      <Route path="/evenements" element={<Evenements />} />
                      <Route path="/opportunites" element={<Opportunites />} />
                      <Route path="/concours-examens" element={<ConcoursExamens />} />
                      <Route path="/contacts-professionnels" element={<ContactsProfessionnels />} />
                      <Route path="/settings" element={<Settings />} />
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
