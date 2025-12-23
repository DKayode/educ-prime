import { Users, BookOpen, FileText, Loader2, Building2, BookMarked } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/lib/services/stats.service";
import { filieresService } from "@/lib/services/filieres.service";

const recentActivities = [
  { user: "Admin", action: "Upload épreuve", filiere: "Informatique", time: "Il y a 5 min" },
  { user: "Modérateur", action: "Ajout filière", filiere: "Mathématiques", time: "Il y a 1h" },
  { user: "Admin", action: "Modification", filiere: "Physique", time: "Il y a 2h" },
  { user: "Admin", action: "Upload épreuve", filiere: "Chimie", time: "Il y a 3h" },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: filieresResponse, isLoading: filieresLoading } = useQuery({
    queryKey: ['filieres'],
    queryFn: () => filieresService.getAll(),
    staleTime: 30000, // Cache for 30 seconds
  });
  const filieres = filieresResponse?.data || [];



  const isLoading = statsLoading || filieresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre plateforme</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Contenu Académique</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Utilisateurs"
            value={stats?.usersCount.toString() || "0"}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Établissements"
            value={stats?.etablissementsCount.toString() || "0"}
            icon={Building2}
            variant="accent"
          />
          <StatCard
            title="Filières"
            value={stats?.filieresCount.toString() || "0"}
            icon={BookOpen}
            variant="success"
          />
          <StatCard
            title="Matières"
            value={stats?.matieresCount.toString() || "0"}
            icon={BookMarked}
          />
          <StatCard
            title="Épreuves"
            value={stats?.epreuvesCount.toString() || "0"}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Ressources"
            value={stats?.ressourcesCount.toString() || "0"}
            icon={BookOpen}
            variant="success"
          />

        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Contenu Public</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Parcours"
            value={stats?.parcoursCount.toString() || "0"}
            icon={BookOpen}
            variant="accent"
          />
          <StatCard
            title="Publicités"
            value={stats?.publicitesCount.toString() || "0"}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Événements"
            value={stats?.evenementsCount.toString() || "0"}
            icon={FileText}
            variant="accent"
          />
          <StatCard
            title="Opportunités"
            value={stats?.opportunitesCount.toString() || "0"}
            icon={FileText}
            variant="success"
          />
          <StatCard
            title="Concours"
            value={stats?.concoursCount.toString() || "0"}
            icon={FileText}
          />
          <StatCard
            title="Contacts Pro"
            value={stats?.contactsProfessionnelsCount.toString() || "0"}
            icon={Users}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
            <CardDescription>Dernières actions effectuées sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Filière</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.user}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.action}</Badge>
                    </TableCell>
                    <TableCell>{activity.filiere}</TableCell>
                    <TableCell className="text-muted-foreground">{activity.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Filières</CardTitle>
            <CardDescription>Liste des filières disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filieres.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune filière disponible</p>
              ) : (
                filieres.slice(0, 5).map((filiere, index) => (
                  <div key={filiere.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{filiere.nom}</span>
                      <span className="text-muted-foreground text-xs">
                        {filiere.etablissement?.nom || 'N/A'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all"
                        style={{ width: `${Math.max(20, 100 - index * 15)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
