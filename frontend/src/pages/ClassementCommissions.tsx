import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, Loader2, Trophy } from "lucide-react";
import { abonnementsService, LigneClassement } from "@/lib/services/abonnements.service";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Raccourcis usuels. `null` = pas de borne, donc tout l'historique. */
const PERIODES: { libelle: string; calcul: () => { startDate?: string; endDate?: string } }[] = [
  {
    libelle: "Ce mois-ci",
    calcul: () => {
      const n = new Date();
      return { startDate: iso(new Date(n.getFullYear(), n.getMonth(), 1)), endDate: iso(n) };
    },
  },
  {
    libelle: "Mois dernier",
    calcul: () => {
      const n = new Date();
      return {
        startDate: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        endDate: iso(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  {
    libelle: "30 derniers jours",
    calcul: () => {
      const n = new Date();
      return { startDate: iso(new Date(n.getTime() - 30 * 86400000)), endDate: iso(n) };
    },
  },
  { libelle: "Tout l’historique", calcul: () => ({}) },
];

const nomComplet = (l: LigneClassement) =>
  [l.prenom, l.nom].filter(Boolean).join(" ") || l.email || "—";

const medaille = (rang: number) =>
  rang === 1 ? "🥇" : rang === 2 ? "🥈" : rang === 3 ? "🥉" : null;

export default function ClassementCommissions() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ["abonnements", "classement", startDate, endDate, limit],
    queryFn: () =>
      abonnementsService.getClassementCommissions({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
      }),
  });

  const appliquer = (p: (typeof PERIODES)[number]) => {
    const { startDate: d, endDate: f } = p.calcul();
    setStartDate(d ?? "");
    setEndDate(f ?? "");
  };

  const devise = "XOF";
  const lignes = data?.classement ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Classement des commissions</h1>
        <p className="text-muted-foreground">
          Qui rapporte le plus d’abonnements, sur la période choisie
        </p>
      </div>

      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 shrink-0 text-blue-500" />
          <p className="text-sm text-muted-foreground">
            La date retenue est celle du <strong>versement</strong>, pas celle de l’abonnement. Une
            commission rattrapée compte donc dans le mois où elle a été versée — sans quoi les
            totaux d’une période close changeraient après coup.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Période</CardTitle>
          <CardDescription>Sans bornes, le classement porte sur tout l’historique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIODES.map((p) => (
              <Button key={p.libelle} variant="outline" size="sm" onClick={() => appliquer(p)}>
                {p.libelle}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="debut">Du</Label>
              <Input id="debut" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin">Au (inclus)</Label>
              <Input id="fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limite">Nombre de lignes</Label>
              <Input
                id="limite"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Bénéficiaires</p>
              <p className="text-2xl font-bold">{data.totaux.beneficiaires}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Commissions versées</p>
              <p className="text-2xl font-bold">{data.totaux.nombre_commissions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Montant total</p>
              <p className="text-2xl font-bold">
                {data.totaux.total.toLocaleString("fr-FR")} {devise}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Classement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">Erreur lors du chargement</div>
          ) : !lignes.length ? (
            <div className="rounded-lg border bg-muted/10 py-8 text-center text-muted-foreground">
              Aucune commission versée sur cette période.
              {/* Distinguer « personne n'a gagné » de « la fonctionnalité est
                  éteinte » : sans ce rappel, un tableau vide se lit comme un bug. */}
              <p className="mt-1 text-xs">
                Vérifiez que la commission est active dans « Commission parrainage ».
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rang</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Abonnements</TableHead>
                  <TableHead className="text-right">Total perçu</TableHead>
                  <TableHead>Dernière</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l) => (
                  <TableRow key={l.uuid}>
                    <TableCell className="font-medium">
                      {medaille(l.rang) ?? l.rang}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{nomComplet(l)}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell>
                      {l.code ? <Badge variant="outline" className="font-mono">{l.code}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right">{l.abonnements}</TableCell>
                    <TableCell className="text-right font-medium">
                      {l.total.toLocaleString("fr-FR")} {devise}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.derniere).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
