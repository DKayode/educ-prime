import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, HandCoins, Info, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { abonnementsService } from "@/lib/services/abonnements.service";

/** Aperçu concret : un taux abstrait se juge mal sans montant en face. */
const PRIX_EXEMPLES = [2000, 5000, 18000];

export default function CommissionParrainage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reglage, isLoading, error } = useQuery({
    queryKey: ["abonnements", "commission"],
    queryFn: () => abonnementsService.getCommission(),
  });

  const [taux, setTaux] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!reglage) return;
    setTaux(reglage.taux);
    setActive(reglage.est_active);
  }, [reglage?.taux, reglage?.est_active]);

  const modifie = !!reglage && (taux !== reglage.taux || active !== reglage.est_active);

  const enregistrer = useMutation({
    mutationFn: () => abonnementsService.updateCommission({ taux, est_active: active }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["abonnements", "commission"] });
      toast({
        title: "Commission enregistrée",
        description: r.verse_effectivement
          ? `${r.taux} % du prix payé sera versé au bénéficiaire.`
          : "Aucune commission ne sera versée avec ce réglage.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e?.message || "Échec de l’enregistrement", variant: "destructive" }),
  });

  const versementInactif = !active || taux === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Commission de parrainage</h1>
        <p className="text-muted-foreground">
          Part du prix d’un abonnement reversée à celui qui l’a amené
        </p>
      </div>

      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Qui touche la commission ?</strong> Le
              propriétaire du <strong>code saisi au moment de l’achat</strong>, s’il y en a un.
              Sinon, le <strong>parrain d’inscription</strong> — celui dont le code avait été
              utilisé à la création du compte.
            </p>
            <p>
              Un code saisi à l’achat ne change <strong>pas</strong> le parrain d’inscription : il
              ne vaut que pour cet abonnement. Sans cela, une seule vente réattribuerait toutes les
              commissions futures.
            </p>
            <p>
              Le montant est crédité dans le <strong>wallet</strong> du bénéficiaire, retirable
              comme les autres gains.
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-destructive">Erreur lors du chargement</div>
      ) : (
        <>
          {versementInactif && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex gap-3 pt-6">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Aucune commission n’est versée.</p>
                  <p className="text-muted-foreground">
                    {!active
                      ? "La commission est désactivée. C’est l’état livré : un taux non arbitré verserait de l’argent réel dès le premier abonnement."
                      : "Le taux est à 0 % : activer ne suffit pas, il faut aussi un taux."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <HandCoins className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <CardTitle>Taux de commission</CardTitle>
                    <CardDescription className="mt-1">
                      Appliqué au montant réellement encaissé, arrondi à l’unité — le {reglage?.devise}
                      {" "}n’a pas de subdivision.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={reglage?.verse_effectivement ? "default" : "secondary"}>
                  {reglage?.verse_effectivement ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taux">Taux (%)</Label>
                  <Input
                    id="taux"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={taux}
                    disabled={!active}
                    onChange={(e) => setTaux(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Verser la commission</Label>
                  <p className="text-xs text-muted-foreground">
                    Désactivée, les abonnements s’activent normalement mais rien n’est versé.
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              {active && taux > 0 && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-2 text-sm font-medium">Ce que percevrait le bénéficiaire</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {PRIX_EXEMPLES.map((prix) => (
                      <div key={prix} className="flex justify-between">
                        <span>Abonnement à {prix.toLocaleString("fr-FR")} {reglage?.devise}</span>
                        <span className="font-medium text-foreground">
                          {Math.round((prix * taux) / 100).toLocaleString("fr-FR")} {reglage?.devise}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Le changement s’applique aux prochains encaissements. Les commissions déjà versées ne
                sont pas recalculées.
              </p>

              <div className="flex justify-end">
                <Button onClick={() => enregistrer.mutate()} disabled={!modifie || enregistrer.isPending}>
                  {enregistrer.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
