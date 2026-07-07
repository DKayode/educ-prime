import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  MessageSquareText,
  Star,
  Users,
  Gauge,
  TrendingUp,
  Quote,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formsService,
  RATING_SCALE,
  STATUT_LABEL,
  type CampaignStatut,
} from "@/lib/services/forms.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const STATUT_BADGE: Record<CampaignStatut, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

// Per-rating-value colours (1 worst → 4 best), reused by chart + legend.
const VALUE_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: "#f43f5e", // rose — Pas utile
  2: "#f59e0b", // amber — Moyen
  3: "#0ea5e9", // sky — Utile
  4: "#10b981", // emerald — Top
};

const nf = (v: number) => v.toLocaleString("fr-FR");
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

// Static accent classes (Tailwind JIT can't see interpolated class names).
type Accent = "primary" | "emerald" | "amber" | "violet";
const ACCENT_TILE: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  violet: "bg-violet-500/10 text-violet-600",
};

function StatTile({
  label,
  value,
  icon: Icon,
  sub,
  accent = "primary",
}: {
  label: string;
  value: string;
  icon: any;
  sub?: string;
  accent?: Accent;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn("rounded-lg p-2", ACCENT_TILE[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-card-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function EnquetesResultats() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["form-campaign-results", uuid],
    queryFn: () => formsService.getResults(uuid!),
    enabled: !!uuid,
  });

  // Overall satisfaction = mean rating across ALL rating answers (weighted).
  const overall = useMemo(() => {
    if (!data) return null;
    let num = 0;
    let den = 0;
    for (const q of data.rating_questions) {
      if (q.moyenne != null && q.total_reponses > 0) {
        num += q.moyenne * q.total_reponses;
        den += q.total_reponses;
      }
    }
    return den > 0 ? num / den : null;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/enquetes")}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Impossible de charger les résultats.
        </p>
      </div>
    );
  }

  const { campaign } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/enquetes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.titre}</h1>
              <Badge variant="outline" className={cn("font-medium", STATUT_BADGE[campaign.statut])}>
                {STATUT_LABEL[campaign.statut]}
              </Badge>
            </div>
            {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Réponses totales" value={nf(data.total_reponses)} icon={Users} sub="utilisateurs ayant répondu" />
        <StatTile
          label="Satisfaction moyenne"
          value={overall != null ? `${overall.toFixed(2)} / 4` : "—"}
          icon={Gauge}
          accent="emerald"
          sub="toutes questions de notation"
        />
        <StatTile label="Questions de notation" value={nf(data.rating_questions.length)} icon={Star} accent="amber" />
        <StatTile label="Questions ouvertes" value={nf(data.text_questions.length)} icon={MessageSquareText} accent="violet" />
      </div>

      {data.total_reponses === 0 && (
        <p className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Aucune réponse pour l'instant. Les graphiques s'afficheront dès la première réponse.
        </p>
      )}

      {/* Rating distributions */}
      {data.rating_questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Notations</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.rating_questions.map((q) => {
              const chartData = [...RATING_SCALE]
                .slice()
                .reverse()
                .map((r) => ({
                  label: `${r.emoji} ${r.label}`,
                  value: r.value,
                  count: q.distribution[r.value] ?? 0,
                }));
              return (
                <Card key={q.uuid} className="shadow-sm">
                  <CardHeader className="pb-2">
                    {q.section_titre && (
                      <CardDescription className="text-xs uppercase tracking-wide">
                        {q.section_titre}
                      </CardDescription>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{q.libelle}</CardTitle>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-bold tabular-nums text-emerald-600">
                          {q.moyenne != null ? q.moyenne.toFixed(2) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">moyenne / 4</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {nf(q.total_reponses)} réponse{q.total_reponses > 1 ? "s" : ""}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                        <Bar dataKey="count" name="Réponses" radius={[4, 4, 0, 0]}>
                          {chartData.map((d) => (
                            <Cell key={d.value} fill={VALUE_COLOR[d.value as 1 | 2 | 3 | 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Responses over time */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Réponses dans le temps</CardTitle>
            <CardDescription>Nombre de réponses par jour</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {data.reponses_par_jour.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune réponse sur la période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.reponses_par_jour.map((r) => ({ jour: fmtDay(r.jour), count: r.count }))}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="jour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="count" name="Réponses" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Open-text answers */}
      {data.text_questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Réponses ouvertes</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.text_questions.map((q) => (
              <Card key={q.uuid} className="shadow-sm">
                <CardHeader className="pb-2">
                  {q.section_titre && (
                    <CardDescription className="text-xs uppercase tracking-wide">{q.section_titre}</CardDescription>
                  )}
                  <CardTitle className="text-base">{q.libelle}</CardTitle>
                  <CardDescription>
                    {q.reponses.length} réponse{q.reponses.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {q.reponses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Aucune réponse.</p>
                  ) : (
                    <ScrollArea className="h-56 pr-3">
                      <ul className="space-y-2">
                        {q.reponses.map((r, i) => (
                          <li key={i} className="flex gap-2 rounded-md border bg-muted/20 p-2.5 text-sm">
                            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-foreground">{r.texte}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Legend for the rating colours */}
      {data.rating_questions.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/20 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">Échelle :</span>
          {RATING_SCALE.map((r) => (
            <span key={r.value} className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: VALUE_COLOR[r.value] }} />
              {r.emoji} {r.label} ({r.value})
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Progress value={overall != null ? (overall / 4) * 100 : 0} className="h-1.5 w-24" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {overall != null ? `${Math.round((overall / 4) * 100)} %` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
