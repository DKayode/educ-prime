import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserCircle,
  Cake,
  MapPin,
  Accessibility,
  LogIn,
  Activity,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kpiService } from "@/lib/services/kpi.service";

// Default range: the trailing 6 months.
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const defaultEnd = () => fmt(new Date());
const defaultStart = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return fmt(d);
};

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-card-foreground">
            {value.toLocaleString("fr-FR")}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Indicateurs() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const country = localStorage.getItem("country") || "benin";
  const countryLabel = country.charAt(0).toUpperCase() + country.slice(1);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["kpi", country, startDate, endDate],
    queryFn: () => kpiService.getKpis(startDate, endDate),
    enabled: !!startDate && !!endDate && startDate <= endDate,
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Indicateurs</h1>
        <p className="text-muted-foreground">
          Indicateurs de suivi —{" "}
          <span className="font-medium text-foreground">{countryLabel}</span> · période
          du {startDate} au {endDate}
        </p>
      </div>

      {/* Date-range picker */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="kpi-start">Date de début</Label>
            <Input
              id="kpi-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kpi-end">Date de fin</Label>
            <Input
              id="kpi-end"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-44"
            />
          </div>
          {isFetching && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Actualisation…
            </span>
          )}
        </CardContent>
      </Card>

      {startDate > endDate && (
        <p className="text-sm text-destructive">
          La date de début doit précéder la date de fin.
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Impossible de charger les indicateurs. Réessayez.
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Section 2 — Utilisateurs */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Utilisateurs</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Total inscrits" value={data.utilisateurs.total} icon={Users} />
              <KpiCard label="Âgés de 35 ans ou moins" value={data.utilisateurs.age_35_max} icon={Cake} />
              <KpiCard label="Femmes" value={data.utilisateurs.femmes} icon={UserCircle} />
              <KpiCard label="Femmes de 35 ans ou moins" value={data.utilisateurs.femmes_35_max} icon={UserCircle} />
              <KpiCard label="En zone rurale" value={data.utilisateurs.zone_rurale} icon={MapPin} />
              <KpiCard label="En situation de handicap" value={data.utilisateurs.situation_handicap} icon={Accessibility} />
              <KpiCard label="Connectés sur la période" value={data.utilisateurs.connectes} icon={LogIn} />
            </div>
          </section>

          {/* Section 3 — Apprenants / Inscription */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Apprenants</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Apprenants inscrits" value={data.apprenants.total} icon={UserCheck} />
              <KpiCard label="Âgés de 35 ans ou moins" value={data.apprenants.age_35_max} icon={Cake} />
              <KpiCard label="Femmes de 35 ans ou moins" value={data.apprenants.age_35_max_femmes} icon={UserCircle} />
              <KpiCard label="Femmes" value={data.apprenants.femmes} icon={UserCircle} />
              <KpiCard label="En zone rurale" value={data.apprenants.zone_rurale} icon={MapPin} />
              <KpiCard label="En situation de handicap" value={data.apprenants.situation_handicap} icon={Accessibility} />
            </div>
          </section>

          {/* Section 4 — Engagement */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Engagement</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Apprenants connectés sur la période"
                value={data.engagement.apprenants_connectes}
                icon={LogIn}
              />
            </div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Apprenants ayant consulté une ressource (épreuve ou concours)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="Dernière semaine" value={data.engagement.apprenants_ressource.semaine} icon={Activity} />
                <KpiCard label="Dernières 2 semaines" value={data.engagement.apprenants_ressource.deux_semaines} icon={Activity} />
                <KpiCard label="Dernier mois" value={data.engagement.apprenants_ressource.mois} icon={Activity} />
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  );
}
