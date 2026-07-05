import { Users, FileText, Loader2, Building2, GraduationCap, GitFork } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { statsService } from "@/lib/services/stats.service";
import { filieresService } from "@/lib/services/filieres.service";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const BREAKDOWN_COLORS = ["#4f46e5", "#10b981", "#f59e0b"];

export default function Dashboard() {
  const [allCountries, setAllCountries] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', allCountries],
    queryFn: () => statsService.getDashboardStats(allCountries),
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

  const country = localStorage.getItem("country") || "benin";
  const countryLabel = country.charAt(0).toUpperCase() + country.slice(1);
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // All chart/breakdown data comes from the real /stats counts.
  const contentBars = [
    { name: "Épreuves", value: stats?.epreuvesCount ?? 0 },
    { name: "Concours", value: stats?.concoursCount ?? 0 },
    { name: "Parcours", value: stats?.parcoursCount ?? 0 },
    { name: "Publicités", value: stats?.publicitesCount ?? 0 },
    { name: "Événements", value: stats?.evenementsCount ?? 0 },
    { name: "Opportunités", value: stats?.opportunitesCount ?? 0 },
  ];

  const breakdownRaw = [
    { name: "Épreuves", value: stats?.epreuvesCount ?? 0 },
    { name: "Concours", value: stats?.concoursCount ?? 0 },
    { name: "Parcours", value: stats?.parcoursCount ?? 0 },
  ];
  const breakdownTotal = breakdownRaw.reduce((sum, d) => sum + d.value, 0);
  const breakdown = breakdownRaw.map((d) => ({
    ...d,
    pct: breakdownTotal ? Math.round((d.value / breakdownTotal) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble —{" "}
            <span className="font-medium text-foreground">
              {allCountries ? "Tous les pays" : countryLabel}
            </span>{" "}
            · {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="all-countries"
            checked={allCountries}
            onCheckedChange={setAllCountries}
          />
          <Label htmlFor="all-countries" className="cursor-pointer text-sm">
            Tous les pays
          </Label>
        </div>
      </div>

      {/* Stat cards — bound to real /stats counts */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={stats?.usersCount.toLocaleString("fr-FR") || "0"}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Établissements"
          value={stats?.etablissementsCount.toLocaleString("fr-FR") || "0"}
          icon={Building2}
          variant="accent"
        />
        <StatCard
          title="Épreuves"
          value={stats?.epreuvesCount.toLocaleString("fr-FR") || "0"}
          icon={FileText}
          variant="success"
        />
        <StatCard
          title="Concours"
          value={stats?.concoursCount.toLocaleString("fr-FR") || "0"}
          icon={GraduationCap}
        />
      </div>

      {/* Chart + breakdown — both derived from real counts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition des contenus</CardTitle>
            <CardDescription>Volume par type de contenu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={contentBars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="value" name="Total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Répartition du contenu</CardTitle>
            <CardDescription>Épreuves · Concours · Parcours</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownTotal === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucun contenu disponible
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {breakdown.map((_, i) => (
                        <Cell key={i} fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2 text-sm">
                  {breakdown.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
                        />
                        {d.name}
                      </span>
                      <span className="text-muted-foreground">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent list — real filières from filieresService */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Filières récentes</CardTitle>
            <CardDescription>Dernières filières enregistrées</CardDescription>
          </div>
          <Link to="/filieres" className="text-sm font-medium text-primary">
            Tout voir →
          </Link>
        </CardHeader>
        <CardContent>
          {filieres.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Aucune filière disponible</p>
          ) : (
            <div className="divide-y divide-border">
              {filieres.slice(0, 5).map((filiere) => (
                <div key={filiere.id} className="flex items-center gap-3 py-3 text-sm">
                  <GitFork className="h-4 w-4 text-primary" />
                  <span className="flex-1 font-medium text-foreground">{filiere.nom}</span>
                  <Badge variant="outline">{filiere.etablissement?.nom || "N/A"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
