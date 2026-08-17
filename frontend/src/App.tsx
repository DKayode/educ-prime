import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PermissionRoute } from "./components/PermissionRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Etablissements from "./pages/Etablissements";
import Filieres from "./pages/Filieres";
import Matieres from "./pages/Matieres";
import Niveaux from "./pages/Niveaux";
import Epreuves from "./pages/Epreuves";
import Publicites from "./pages/Publicites";
import Evenements from "./pages/Evenements";
import Opportunites from "./pages/Opportunites";
import Concours from "./pages/Concours";
import ConcoursGrouped from "./pages/ConcoursGrouped";
import ConcoursAdmin from "./pages/ConcoursAdmin";
import ContactsProfessionnels from "./pages/ContactsProfessionnels";
import Parcours from "./pages/Parcours";
import Categories from "./pages/Categories";
import TypesProfil from "./pages/TypesProfil";
import TypeProfilAssociations from "./pages/TypeProfilAssociations";
import Structures from "./pages/Structures";
import Titres from "./pages/Titres";
import Departements from "./pages/Departements";
import Villes from "./pages/Villes";
import Settings from "./pages/Settings";
import ServicesAdmin from "./pages/ServicesAdmin";
import EpreuvesApprobation from "./pages/EpreuvesApprobation";
import ExamensNationaux from "./pages/ExamensNationaux";
import ExamensNationauxApprobation from "./pages/ExamensNationauxApprobation";
import TypesExamen from "./pages/TypesExamen";
import SeriesExamen from "./pages/SeriesExamen";
import MatieresExamen from "./pages/MatieresExamen";
import FilieresExamen from "./pages/FilieresExamen";
import OffresAdmin from "./pages/OffresAdmin";
import ServiceTypesAdmin from "./pages/ServiceTypesAdmin";
import RecruteursAdmin from "./pages/RecruteursAdmin";
import CompetencesAdmin from "./pages/CompetencesAdmin";
import Notifications from "./pages/Notifications";
import AppVersions from "./pages/AppVersions";
import Parrainages from "./pages/Parrainages";
import AppareilsPartages from "./pages/AppareilsPartages";
import Indicateurs from "./pages/Indicateurs";
import StatistiquesApprobations from "./pages/StatistiquesApprobations";
import RetraitsWallet from "./pages/RetraitsWallet";
import ConfigurationWallet from "./pages/ConfigurationWallet";
import EnquetesCampagnes from "./pages/EnquetesCampagnes";
import EnquetesBuilder from "./pages/EnquetesBuilder";
import EnquetesResultats from "./pages/EnquetesResultats";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Forums from "./pages/Forums";
import Desabonnement from "./pages/Desabonnement";
import Authorization from "./pages/Authorization";
import { Permission, type PermissionValue } from "./lib/permissions";

const queryClient = new QueryClient();

const guarded = (permission: PermissionValue | PermissionValue[], element: ReactElement) => (
  <PermissionRoute permission={permission}>{element}</PermissionRoute>
);

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
            <Route path="/desabonnement" element={<Desabonnement />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Dashboard />)} />
                      <Route path="/users" element={guarded(Permission.USERS_READ, <Users />)} />
                      <Route path="/etablissements" element={guarded(Permission.REFERENTIALS_READ, <Etablissements />)} />
                      <Route path="/filieres" element={guarded(Permission.REFERENTIALS_READ, <Filieres />)} />
                      <Route path="/matieres" element={guarded(Permission.REFERENTIALS_READ, <Matieres />)} />
                      <Route path="/niveaux" element={guarded(Permission.REFERENTIALS_READ, <Niveaux />)} />
                      <Route path="/epreuves" element={guarded(Permission.EPREUVES_READ, <Epreuves />)} />
                      <Route path="/approbations/epreuves" element={guarded([Permission.EPREUVES_READ, Permission.EPREUVES_VALIDATE], <EpreuvesApprobation />)} />
                      <Route path="/publicites" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Publicites />)} />
                      <Route path="/evenements" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Evenements />)} />
                      <Route path="/opportunites" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Opportunites />)} />
                      <Route path="/concours" element={guarded(Permission.CONCOURS_READ, <Concours />)} />
                      <Route path="/concours/groupes" element={guarded(Permission.CONCOURS_READ, <ConcoursGrouped />)} />
                      <Route path="/approbations/concours" element={guarded([Permission.CONCOURS_READ, Permission.CONCOURS_VALIDATE], <ConcoursAdmin />)} />
                      <Route path="/examens-nationaux" element={guarded(Permission.EXAMENS_NATIONAUX_READ, <ExamensNationaux />)} />
                      <Route path="/approbations/examens-nationaux" element={guarded([Permission.EXAMENS_NATIONAUX_READ, Permission.EXAMENS_NATIONAUX_VALIDATE], <ExamensNationauxApprobation />)} />
                      <Route path="/types-examen" element={guarded(Permission.REFERENTIALS_READ, <TypesExamen />)} />
                      <Route path="/series-examen" element={guarded(Permission.REFERENTIALS_READ, <SeriesExamen />)} />
                      <Route path="/matieres-examen" element={guarded(Permission.REFERENTIALS_READ, <MatieresExamen />)} />
                      <Route path="/filieres-examen" element={guarded(Permission.REFERENTIALS_READ, <FilieresExamen />)} />
                      <Route path="/forums" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Forums />)} />
                      <Route path="/parcours" element={guarded(Permission.ADMIN_DASHBOARD_READ, <Parcours />)} />
                      <Route path="/categories" element={guarded(Permission.REFERENTIALS_READ, <Categories />)} />
                      <Route path="/types-profil" element={guarded(Permission.REFERENTIALS_READ, <TypesProfil />)} />
                      <Route path="/types-profil/associations" element={guarded(Permission.REFERENTIALS_UPDATE, <TypeProfilAssociations />)} />
                      <Route path="/structures" element={guarded(Permission.REFERENTIALS_READ, <Structures />)} />
                      <Route path="/titres" element={guarded(Permission.REFERENTIALS_READ, <Titres />)} />
                      <Route path="/departements" element={guarded(Permission.REFERENTIALS_READ, <Departements />)} />
                      <Route path="/villes" element={guarded(Permission.REFERENTIALS_READ, <Villes />)} />
                      <Route path="/contacts-professionnels" element={guarded(Permission.ADMIN_DASHBOARD_READ, <ContactsProfessionnels />)} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/notifications" element={guarded([Permission.NOTIFICATIONS_READ, Permission.NOTIFICATIONS_SEND], <Notifications />)} />
                      <Route path="/admin/services" element={guarded(Permission.ADMIN_DASHBOARD_READ, <ServicesAdmin />)} />
                      <Route path="/admin/offres" element={guarded(Permission.ADMIN_DASHBOARD_READ, <OffresAdmin />)} />
                      <Route path="/admin/service-types" element={guarded(Permission.ADMIN_DASHBOARD_READ, <ServiceTypesAdmin />)} />
                      <Route path="/app-versions" element={guarded(Permission.AUTHORIZATION_MANAGE, <AppVersions />)} />
                      <Route path="/authorization" element={guarded(Permission.AUTHORIZATION_MANAGE, <Authorization />)} />
                      <Route path="/parrainages" element={guarded(Permission.USERS_READ, <Parrainages />)} />
                      <Route path="/appareils-partages" element={guarded(Permission.USERS_READ, <AppareilsPartages />)} />
                      <Route path="/admin/recruteurs" element={guarded(Permission.ADMIN_DASHBOARD_READ, <RecruteursAdmin />)} />
                      <Route path="/admin/competences" element={guarded(Permission.REFERENTIALS_READ, <CompetencesAdmin />)} />
                      <Route path="/indicateurs" element={guarded(Permission.STATS_READ, <Indicateurs />)} />
                      <Route path="/statistiques-approbations" element={guarded(Permission.STATS_READ, <StatistiquesApprobations />)} />
                      <Route path="/admin/retraits" element={guarded(Permission.WALLET_WITHDRAWALS_READ, <RetraitsWallet />)} />
                      <Route path="/admin/wallet-configuration" element={guarded(Permission.WALLET_CONFIGURATION_UPDATE, <ConfigurationWallet />)} />
                      <Route path="/enquetes" element={guarded(Permission.ADMIN_DASHBOARD_READ, <EnquetesCampagnes />)} />
                      <Route path="/enquetes/nouveau" element={guarded(Permission.ADMIN_DASHBOARD_READ, <EnquetesBuilder />)} />
                      <Route path="/enquetes/:uuid/edition" element={guarded(Permission.ADMIN_DASHBOARD_READ, <EnquetesBuilder />)} />
                      <Route path="/enquetes/:uuid/resultats" element={guarded(Permission.ADMIN_DASHBOARD_READ, <EnquetesResultats />)} />
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
