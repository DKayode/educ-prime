import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Gauge, Info, Loader2, Save, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  abonnementsService,
  ConfigurationQuota,
  FeatureQuota,
  PeriodeReset,
} from "@/lib/services/abonnements.service";

const LIBELLES: Record<FeatureQuota, { titre: string; description: string; icone: typeof Gauge }> = {
  RESOURCE_VIEW: {
    titre: "Ressources académiques",
    description:
      "Épreuves et examens nationaux, pool commun. Le compte porte sur des ressources distinctes : rouvrir la même n’en consomme pas une seconde.",
    icone: Gauge,
  },
  KETSIA_AI: {
    titre: "Assistante Ketsia",
    description:
      "Nombre de ressources sur lesquelles Ketsia peut être lancée. Compteur indépendant des ressources académiques.",
    icone: Sparkles,
  },
};

const prochaineReinitialisation = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function CarteQuota({ config }: { config: ConfigurationQuota }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = LIBELLES[config.feature] ?? { titre: config.feature, description: "", icone: Gauge };
  const Icone = meta.icone;

  const [limite, setLimite] = useState(config.limite);
  const [periode, setPeriode] = useState<PeriodeReset>(config.periode_reset);
  const [actif, setActif] = useState(config.est_actif);

  // Le formulaire suit la donnée serveur après un enregistrement ou un
  // changement de pays — sans quoi il afficherait des valeurs périmées.
  useEffect(() => {
    setLimite(config.limite);
    setPeriode(config.periode_reset);
    setActif(config.est_actif);
  }, [config.uuid, config.limite, config.periode_reset, config.est_actif]);

  const modifie =
    limite !== config.limite || periode !== config.periode_reset || actif !== config.est_actif;

  const enregistrer = useMutation({
    mutationFn: () =>
      abonnementsService.updateQuota(config.uuid, {
        limite,
        periode_reset: periode,
        est_actif: actif,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abonnements", "quotas"] });
      toast({
        title: "Quota enregistré",
        description: "La nouvelle valeur s’applique immédiatement, sans déploiement.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e?.message || "Échec de l’enregistrement", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Icone className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle>{meta.titre}</CardTitle>
              <CardDescription className="mt-1">{meta.description}</CardDescription>
            </div>
          </div>
          <Badge variant={actif ? "default" : "secondary"}>{actif ? "Actif" : "Désactivé"}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`limite-${config.uuid}`}>Nombre autorisé par période</Label>
            <Input
              id={`limite-${config.uuid}`}
              type="number"
              min={0}
              value={limite}
              disabled={!actif}
              onChange={(e) => setLimite(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Remise à zéro</Label>
            <Select value={periode} onValueChange={(v) => setPeriode(v as PeriodeReset)} disabled={!actif}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSUEL">Mensuelle — le 1er de chaque mois</SelectItem>
                <SelectItem value="AVIE">Jamais — quota à vie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Appliquer ce quota</Label>
            <p className="text-xs text-muted-foreground">
              Désactivé, la fonctionnalité redevient libre pour tous, abonnés ou non.
            </p>
          </div>
          <Switch checked={actif} onCheckedChange={setActif} />
        </div>

        {periode === "MENSUEL" && actif && (
          <p className="text-xs text-muted-foreground">
            Prochaine remise à zéro le <strong>{prochaineReinitialisation()}</strong>.
          </p>
        )}

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
  );
}

export default function QuotasGratuits() {
  const { data: quotas, isLoading, error } = useQuery({
    queryKey: ["abonnements", "quotas"],
    queryFn: () => abonnementsService.getQuotas(),
  });

  const tousInactifs = !!quotas?.length && quotas.every((q) => !q.est_actif);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quotas gratuits</h1>
        <p className="text-muted-foreground">
          Ce à quoi un utilisateur sans abonnement a droit avant d’être invité à souscrire
        </p>
      </div>

      {tousInactifs && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Aucun quota n’est appliqué.</p>
              <p className="text-muted-foreground">
                Épreuves, examens nationaux et Ketsia sont accessibles sans limite. C’est l’état
                livré par défaut : rien n’est refusé, et <strong>rien n’est compté</strong> — sans
                quoi, le jour de l’activation, des utilisateurs se retrouveraient bloqués pour des
                consultations faites à une époque où rien ne les prévenait. Activez les quotas
                lorsque le paiement en ligne sera en service.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Baisser un plafond ne retire rien aux consommations déjà enregistrées sur la période en
              cours : un utilisateur ayant déjà consulté 4 ressources garde ses 4, même si le plafond
              passe à 3. Le nouveau chiffre s’applique aux consultations suivantes.
            </p>
            <p className="text-muted-foreground">
              Les concours n’apparaissent pas ici : ils n’ont aucun accès gratuit, un abonnement est
              requis dès la première consultation.
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
      ) : !quotas?.length ? (
        <div className="rounded-lg border bg-muted/10 py-8 text-center text-muted-foreground">
          Aucun quota configuré pour ce pays.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {quotas.map((q) => (
            <CarteQuota key={q.uuid} config={q} />
          ))}
        </div>
      )}
    </div>
  );
}
