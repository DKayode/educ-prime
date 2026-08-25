import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Wrench,
  FileText,
  Award,
  GraduationCap,
  Loader2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  submissionStatsService,
  type SubmissionStatusCounts,
} from "@/lib/services/submissionStats.service";

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
const defaultStart = () => monthsAgo(12); // shows all current rows (2026-07)

const PRESETS: { label: string; start: () => string }[] = [
  { label: "30 j", start: () => daysAgo(30) },
  { label: "3 mois", start: () => monthsAgo(3) },
  { label: "12 mois", start: () => monthsAgo(12) },
  { label: "24 mois", start: () => monthsAgo(24) },
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
const pctFmt = (rate: number) =>
  `${(rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

const GRANULARITY_LABEL: Record<string, string> = {
  day: "Par jour",
  week: "Par semaine",
  month: "Par mois",
};

const EPREUVE_COLOR = "#4f46e5"; // primary/violet
const CONCOURS_COLOR = "#f59e0b"; // amber
const EXAMEN_NATIONAL_COLOR = "#0ea5e9"; // sky

// ---------- hero summary tile ----------
function HeroTile({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
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
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ---------- per-type breakdown card ----------
function BreakdownCard({
  title,
  description,
  icon: Icon,
  accent,
  counts,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  counts: SubmissionStatusCounts;
}) {
  const rows: { label: string; value: number; accent: Accent }[] = [
    { label: "En attente", value: counts.pending_approval, accent: "amber" },
    { label: "Approuvées", value: counts.approved, accent: "emerald" },
    { label: "Refusées", value: counts.declined, accent: "rose" },
    { label: "À compléter", value: counts.a_completer, accent: "sky" },
  ];
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className={cn("rounded-lg p-2", ACCENT_TILE[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-card-foreground">
            {nf(counts.total)}
          </p>
          <p className="text-xs text-muted-foreground">demandes</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const pct =
            counts.total > 0
              ? Math.min(100, Math.round((r.value / counts.total) * 100))
              : 0;
          return (
            <div key={r.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {nf(r.value)}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Taux d'approbation</span>
          <span className="text-lg font-bold tabular-nums text-emerald-600">
            {pctFmt(counts.approval_rate)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CardSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

export default function StatistiquesApprobations() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const country = localStorage.getItem("country") || "benin";
  const countryLabel = country.charAt(0).toUpperCase() + country.slice(1);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["submission-stats", country, startDate, endDate],
    queryFn: () => submissionStatsService.getStats(startDate, endDate),
    enabled: !!startDate && !!endDate && startDate <= endDate,
    staleTime: 30000,
  });

  const activePreset = PRESETS.find(
    (p) => p.start() === startDate && endDate === defaultEnd(),
  )?.label;

  const combined = data?.combined;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Statistiques des approbations
            </h1>
            <p className="text-muted-foreground">
              Demandes d'ajout de ressources —{" "}
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
            <Label htmlFor="sub-start">Date de début</Label>
            <Input
              id="sub-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-end">Date de fin</Label>
            <Input
              id="sub-end"
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
          Impossible de charger les statistiques. Réessayez.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-8">
          <CardSkeletonGrid count={6} />
          <CardSkeletonGrid count={2} />
        </div>
      ) : data && combined ? (
        <div className="space-y-8">
          {/* Summary cards (combined) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <HeroTile
              label="Total des demandes"
              value={nf(combined.total)}
              icon={ClipboardCheck}
              accent="primary"
              sub="épreuves + concours + examens nationaux"
            />
            <HeroTile
              label="En attente"
              value={nf(combined.pending_approval)}
              icon={Clock}
              accent="amber"
              sub="à examiner"
            />
            <HeroTile
              label="Approuvées"
              value={nf(combined.approved)}
              icon={CheckCircle2}
              accent="emerald"
            />
            <HeroTile
              label="Refusées"
              value={nf(combined.declined)}
              icon={XCircle}
              accent="rose"
            />
            <HeroTile
              label="Taux d'approbation"
              value={pctFmt(combined.approval_rate)}
              icon={Percent}
              accent="sky"
              sub="approuvées / traitées"
            />
            <HeroTile
              label="À compléter"
              value={nf(combined.a_completer)}
              icon={Wrench}
              accent="violet"
              sub="parent à rattacher par l'admin"
            />
          </div>

          {/* Per-type breakdown */}
          <div className="grid gap-4 lg:grid-cols-3">
            <BreakdownCard
              title="Épreuves"
              description="Demandes d'ajout d'épreuves"
              icon={FileText}
              accent="violet"
              counts={data.epreuves}
            />
            <BreakdownCard
              title="Concours"
              description="Demandes d'ajout de concours"
              icon={Award}
              accent="amber"
              counts={data.concours}
            />
            <BreakdownCard
              title="Examens nationaux"
              description="Demandes d'ajout d'examens nationaux"
              icon={GraduationCap}
              accent="sky"
              counts={data.examens_nationaux}
            />
          </div>

          {/* Time series chart */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Demandes créées dans le temps
                </CardTitle>
                <CardDescription>
                  {GRANULARITY_LABEL[data.granularity] ?? "Par période"} · épreuves
                  concours et examens nationaux
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {data.series.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Aucune demande sur la période.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <BarChart
                    data={data.series}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: GRANULARITY_LABEL[data.granularity] ?? "Période",
                        position: "insideBottom",
                        offset: -2,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="epreuves"
                      name="Épreuves"
                      stackId="s"
                      fill={EPREUVE_COLOR}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="concours"
                      name="Concours"
                      stackId="s"
                      fill={CONCOURS_COLOR}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="examens_nationaux"
                      name="Examens nationaux"
                      stackId="s"
                      fill={EXAMEN_NATIONAL_COLOR}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
