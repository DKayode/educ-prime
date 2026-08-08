import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  walletAdminService,
  RewardConfiguration,
  RewardConfigurationUpdate,
  RewardSourceType,
} from "@/lib/services/wallet-admin.service";

// L'ordre d'affichage ; le label vient du serveur (rewardSourceTypeLabel).
const SOURCE_ORDER: RewardSourceType[] = ["EPREUVE", "EXAMEN", "CONCOURS"];

const NUM_KEYS = [
  "rewardAmount",
  "reviewDelayHours",
  "dailyRewardAmountLimit",
  "monthlyRewardAmountLimit",
  "maxRewardsPerUserPerDay",
  "maxRewardsPerUserPerMonth",
] as const;
const BOOL_KEYS = ["rewardEnabled", "requiresAdminValidation"] as const;

type Draft = Record<string, string | boolean>;

export default function RecompensesWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Un brouillon par source, valeurs numériques en chaînes pour éditer librement.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wallet-reward-configs"],
    queryFn: () => walletAdminService.listRewardConfigurations(),
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Draft> = {};
    data.forEach((c) => {
      const d: Draft = {};
      NUM_KEYS.forEach((k) => (d[k] = String(c[k] ?? "")));
      BOOL_KEYS.forEach((k) => (d[k] = !!c[k]));
      next[c.rewardSourceTypeCode] = d;
    });
    setDrafts(next);
  }, [data]);

  const mutation = useMutation({
    mutationFn: ({ sourceType, payload }: { sourceType: RewardSourceType; payload: RewardConfigurationUpdate }) =>
      walletAdminService.updateRewardConfiguration(sourceType, payload),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["wallet-reward-configs"] });
      toast({
        title: "Récompense enregistrée",
        description: `La configuration ${vars.sourceType.toLowerCase()} s'applique aux prochaines validations.`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e?.message || "Échec de l'enregistrement", variant: "destructive" }),
  });

  const setField = (code: string, key: string, value: string | boolean) =>
    setDrafts((all) => ({ ...all, [code]: { ...all[code], [key]: value } }));

  const save = (config: RewardConfiguration) => {
    const d = drafts[config.rewardSourceTypeCode];
    if (!d) return;
    const payload: RewardConfigurationUpdate = {};
    NUM_KEYS.forEach((k) => ((payload as any)[k] = Number(d[k] === "" || d[k] == null ? 0 : d[k])));
    BOOL_KEYS.forEach((k) => ((payload as any)[k] = !!d[k]));
    mutation.mutate({ sourceType: config.rewardSourceTypeCode, payload });
  };

  const configs = (data ?? [])
    .slice()
    .sort((a, b) => SOURCE_ORDER.indexOf(a.rewardSourceTypeCode) - SOURCE_ORDER.indexOf(b.rewardSourceTypeCode));

  const numField = (config: RewardConfiguration, key: string, label: string, hint?: string) => {
    const d = drafts[config.rewardSourceTypeCode] ?? {};
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`${config.rewardSourceTypeCode}-${key}`}>{label}</Label>
        <Input
          id={`${config.rewardSourceTypeCode}-${key}`}
          type="number"
          inputMode="decimal"
          min={0}
          value={(d[key] as string) ?? ""}
          onChange={(e) => setField(config.rewardSourceTypeCode, key, e.target.value)}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Récompenses</h1>
          <p className="text-muted-foreground">
            Montant et plafonds du crédit versé à l'auteur, par type de contenu validé
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-destructive">Impossible de charger les récompenses.</p>
      ) : configs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune source de récompense configurée.</p>
      ) : (
        <div className="space-y-6">
          <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Sur tous les plafonds ci-dessous, <strong>0 signifie « aucune limite »</strong> — pas « aucune
            récompense ». Pour couper les versements d'une source, utilisez son interrupteur.
            L'interrupteur global « Récompenses activées » de la page Configuration Wallet prime sur ces réglages.
          </p>

          {configs.map((config) => {
            const d = drafts[config.rewardSourceTypeCode] ?? {};
            const pending = !!d.requiresAdminValidation || Number(d.reviewDelayHours || 0) > 0;
            return (
              <Card key={config.id} className="shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {config.rewardSourceTypeLabel}
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {config.rewardSourceTypeCode}
                      </Badge>
                      {!d.rewardEnabled && <Badge variant="destructive">Désactivée</Badge>}
                      {pending && <Badge variant="secondary">Crédit en attente</Badge>}
                    </CardTitle>
                    <CardDescription>
                      Crédit versé à l'auteur quand ce contenu est validé · {config.currency}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => save(config)}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer
                  </Button>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {numField(config, "rewardAmount", `Montant (${config.currency})`, "Versé par contenu validé.")}
                    {numField(
                      config,
                      "reviewDelayHours",
                      "Délai de revue (heures)",
                      "0 = crédit disponible tout de suite ; > 0 = crédité en attente.",
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {numField(config, "dailyRewardAmountLimit", `Plafond journalier (${config.currency})`, "0 = illimité.")}
                    {numField(config, "monthlyRewardAmountLimit", `Plafond mensuel (${config.currency})`, "0 = illimité.")}
                    {numField(config, "maxRewardsPerUserPerDay", "Récompenses max / utilisateur / jour", "0 = illimité.")}
                    {numField(config, "maxRewardsPerUserPerMonth", "Récompenses max / utilisateur / mois", "0 = illimité.")}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Récompense activée</p>
                        <p className="text-xs text-muted-foreground">Off : aucun crédit pour cette source.</p>
                      </div>
                      <Switch
                        checked={!!d.rewardEnabled}
                        onCheckedChange={(v) => setField(config.rewardSourceTypeCode, "rewardEnabled", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Validation admin requise</p>
                        <p className="text-xs text-muted-foreground">Le crédit reste en attente jusqu'à validation.</p>
                      </div>
                      <Switch
                        checked={!!d.requiresAdminValidation}
                        onCheckedChange={(v) => setField(config.rewardSourceTypeCode, "requiresAdminValidation", v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
