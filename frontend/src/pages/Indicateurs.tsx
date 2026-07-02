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
  BarChart3,
  GraduationCap,
  Zap,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { kpiService } from "@/lib/services/kpi.service";

// ---------- date helpers ----------
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
};
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return fmt(d);
};
const defaultEnd = () => fmt(new Date());
const defaultStart = () => monthsAgo(6);

const PRESETS: { label: string; start: () => string }[] = [
  { label: "7 j", start: () => daysAgo(7) },
  { label: "30 j", start: () => daysAgo(30) },
  { label: "6 mois", start: () => monthsAgo(6) },
  { label: "12 mois", start: () => monthsAgo(12) },
];

// ---------- accent palette (static strings for Tailwind JIT) ----------
type Accent = "primary" | "emerald" | "violet" | "amber" | "sky" | "rose";
const ACCENT_TILE: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  amber: "bg-amber-500/10 text-amber-600",
  sky: "bg-sky-500/10 text-sky-600",
  rose: "bg-rose-500/10 text-rose-600",
};
const ACCENT_BAR: Record<Accent, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
};

const nf = (v: number) => v.toLocaleString("fr-FR");

// ---------- hero tile (top summary strip) ----------
function HeroTile({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: Accent;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <span
        className={cn("absolute inset-x-0 top-0 h-1", ACCENT_BAR[accent])}
        aria-hidden
      />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn("rounded-lg p-2", ACCENT_TILE[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-card-foreground">
          {nf(value)}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ---------- detail stat card with share-of-total bar ----------
function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  base,
  baseLabel = "part du total",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: Accent;
  base?: number;
  baseLabel?: string;
}) {
  const pct =
    base && base > 0 ? Math.min(100, Math.round((value / base) * 100)) : null;
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium leading-tight text-muted-foreground">
            {label}
          </p>
          <div className={cn("shrink-0 rounded-lg p-2", ACCENT_TILE[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-card-foreground">
          {nf(value)}
        </p>
        {pct !== null ? (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{baseLabel}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        ) : (
          <div className="mt-3 h-[1.375rem]" aria-hidden />
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: Accent;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("rounded-lg p-2", ACCENT_TILE[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CardSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-1.5 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
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

  const activePreset = PRESETS.find(
    (p) => p.start() === startDate && endDate === defaultEnd(),
  )?.label;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Indicateurs
            </h1>
            <p className="text-muted-foreground">
              Suivi & reporting —{" "}
              <span className="font-medium text-foreground">{countryLabel}</span> ·
              du {startDate} au {endDate}
            </p>
          </div>
        </div>
        {isFetching && !isLoading && (
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualisation…
          </span>
        )}
      </div>

      {/* Date-range controls */}
      <Card className="shadow-sm">
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
          <Separator orientation="vertical" className="hidden h-10 sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={activePreset === p.label ? "default" : "outline"}
                onClick={() => {
                  setStartDate(p.start());
                  setEndDate(defaultEnd());
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {startDate > endDate && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          La date de début doit précéder la date de fin.
        </p>
      )}
      {isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Impossible de charger les indicateurs. Réessayez.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-8">
          <CardSkeletonGrid count={4} />
          <CardSkeletonGrid count={7} />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Hero summary strip */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HeroTile
              label="Utilisateurs inscrits"
              value={data.utilisateurs.total}
              icon={Users}
              accent="primary"
              sub="sur la période"
            />
            <HeroTile
              label="Apprenants inscrits"
              value={data.apprenants.total}
              icon={GraduationCap}
              accent="violet"
              sub="rôle étudiant"
            />
            <HeroTile
              label="Utilisateurs connectés"
              value={data.utilisateurs.connectes}
              icon={LogIn}
              accent="emerald"
              sub="au moins une connexion"
            />
            <HeroTile
              label="Apprenants actifs"
              value={data.engagement.apprenants_ressource.mois}
              icon={Zap}
              accent="amber"
              sub="ressource consultée · 30 j"
            />
          </div>

          {/* Section — Utilisateurs */}
          <section className="space-y-4">
            <SectionHeader
              icon={Users}
              title="Utilisateurs"
              description="Population totale inscrite sur la période"
              accent="primary"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total inscrits" value={data.utilisateurs.total} icon={Users} accent="primary" />
              <StatCard label="Âgés de 35 ans ou moins" value={data.utilisateurs.age_35_max} icon={Cake} accent="sky" base={data.utilisateurs.total} />
              <StatCard label="Femmes" value={data.utilisateurs.femmes} icon={UserCircle} accent="rose" base={data.utilisateurs.total} />
              <StatCard label="Femmes de 35 ans ou moins" value={data.utilisateurs.femmes_35_max} icon={UserCircle} accent="rose" base={data.utilisateurs.total} />
              <StatCard label="En zone rurale" value={data.utilisateurs.zone_rurale} icon={MapPin} accent="emerald" base={data.utilisateurs.total} />
              <StatCard label="En situation de handicap" value={data.utilisateurs.situation_handicap} icon={Accessibility} accent="amber" base={data.utilisateurs.total} />
              <StatCard label="Connectés sur la période" value={data.utilisateurs.connectes} icon={LogIn} accent="emerald" base={data.utilisateurs.total} baseLabel="taux de connexion" />
            </div>
          </section>

          {/* Section — Apprenants */}
          <section className="space-y-4">
            <SectionHeader
              icon={GraduationCap}
              title="Apprenants"
              description="Inscription — utilisateurs au rôle étudiant"
              accent="violet"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Apprenants inscrits" value={data.apprenants.total} icon={UserCheck} accent="violet" />
              <StatCard label="Âgés de 35 ans ou moins" value={data.apprenants.age_35_max} icon={Cake} accent="sky" base={data.apprenants.total} />
              <StatCard label="Femmes de 35 ans ou moins" value={data.apprenants.age_35_max_femmes} icon={UserCircle} accent="rose" base={data.apprenants.total} />
              <StatCard label="Femmes" value={data.apprenants.femmes} icon={UserCircle} accent="rose" base={data.apprenants.total} />
              <StatCard label="En zone rurale" value={data.apprenants.zone_rurale} icon={MapPin} accent="emerald" base={data.apprenants.total} />
              <StatCard label="En situation de handicap" value={data.apprenants.situation_handicap} icon={Accessibility} accent="amber" base={data.apprenants.total} />
            </div>
          </section>

          {/* Section — Engagement */}
          <section className="space-y-4">
            <SectionHeader
              icon={Activity}
              title="Engagement"
              description="Connexion & consultation de ressources par les apprenants"
              accent="amber"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Apprenants connectés sur la période"
                value={data.engagement.apprenants_connectes}
                icon={LogIn}
                accent="emerald"
                base={data.apprenants.total}
                baseLabel="des apprenants"
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Apprenants ayant consulté une ressource
                  </CardTitle>
                  <CardDescription>
                    Épreuve ou concours — apprenants distincts, fenêtres glissantes
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Dernière semaine", value: data.engagement.apprenants_ressource.semaine },
                  { label: "Dernières 2 semaines", value: data.engagement.apprenants_ressource.deux_semaines },
                  { label: "Dernier mois", value: data.engagement.apprenants_ressource.mois },
                ].map((w) => {
                  const pct =
                    data.apprenants.total > 0
                      ? Math.min(100, Math.round((w.value / data.apprenants.total) * 100))
                      : null;
                  return (
                    <div key={w.label} className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-medium text-muted-foreground">{w.label}</p>
                      <p className="mt-1.5 text-3xl font-bold tabular-nums text-card-foreground">
                        {nf(w.value)}
                      </p>
                      {pct !== null && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>des apprenants</span>
                            <span className="font-semibold text-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  );
}
