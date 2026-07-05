import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  walletAdminService,
  PaymentConfiguration,
  PaymentConfigurationUpdate,
  FeeType,
} from "@/lib/services/wallet-admin.service";

type NumKey = keyof PaymentConfigurationUpdate;
type NumField = { key: NumKey; label: string; hint?: string };

const REWARD_FIELDS: NumField[] = [
  { key: "rewardPerExam", label: "Récompense par ressource validée (XOF)", hint: "Montant crédité à l'auteur quand une épreuve/concours est approuvé." },
];
const WITHDRAW_FIELDS: NumField[] = [
  { key: "minimumWithdrawal", label: "Retrait minimum (XOF)" },
  { key: "maximumWithdrawal", label: "Retrait maximum (XOF)" },
  { key: "withdrawFee", label: "Frais de retrait" },
];
const LIMIT_FIELDS: NumField[] = [
  { key: "dailyWithdrawalLimit", label: "Plafond journalier (XOF)" },
  { key: "monthlyWithdrawalLimit", label: "Plafond mensuel (XOF)" },
  { key: "minimumWalletBalance", label: "Solde minimum du wallet (XOF)" },
  { key: "reviewDelayHours", label: "Délai de revue (heures)" },
  { key: "maxWithdrawPerDay", label: "Retraits max / jour" },
  { key: "maxWithdrawPerWeek", label: "Retraits max / semaine" },
  { key: "maxWithdrawPerMonth", label: "Retraits max / mois" },
];

const TOGGLES: { key: NumKey; label: string; hint?: string }[] = [
  { key: "walletEnabled", label: "Wallet activé", hint: "Désactive tout le module wallet si off." },
  { key: "rewardEnabled", label: "Récompenses activées" },
  { key: "withdrawEnabled", label: "Retraits activés" },
  { key: "automaticWithdrawal", label: "Retrait automatique", hint: "Laisser off : les paiements sont manuels." },
  { key: "maintenanceMode", label: "Mode maintenance" },
];

const NUM_KEYS: NumKey[] = [
  "rewardPerExam", "minimumWithdrawal", "maximumWithdrawal", "withdrawFee",
  "dailyWithdrawalLimit", "monthlyWithdrawalLimit", "minimumWalletBalance",
  "reviewDelayHours", "maxWithdrawPerDay", "maxWithdrawPerWeek", "maxWithdrawPerMonth",
];
const BOOL_KEYS: NumKey[] = ["walletEnabled", "rewardEnabled", "withdrawEnabled", "automaticWithdrawal", "maintenanceMode"];

export default function ConfigurationWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Draft is kept as strings so number inputs edit freely (empty, partial…).
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [currency, setCurrency] = useState("XOF");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wallet-config"],
    queryFn: () => walletAdminService.getConfiguration(),
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string | boolean> = {};
    NUM_KEYS.forEach((k) => (next[k] = String((data as any)[k] ?? "")));
    BOOL_KEYS.forEach((k) => (next[k] = !!(data as any)[k]));
    next.withdrawFeeType = (data as PaymentConfiguration).withdrawFeeType;
    setDraft(next);
    setCurrency(data.currency);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: PaymentConfigurationUpdate) => walletAdminService.updateConfiguration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-config"] });
      toast({ title: "Configuration enregistrée", description: "Les nouvelles valeurs s'appliquent immédiatement." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message || "Échec de l'enregistrement", variant: "destructive" }),
  });

  const setField = (key: string, value: string | boolean) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    const payload: PaymentConfigurationUpdate = { withdrawFeeType: draft.withdrawFeeType as FeeType };
    NUM_KEYS.forEach((k) => { (payload as any)[k] = Number(draft[k] === "" || draft[k] == null ? 0 : draft[k]); });
    BOOL_KEYS.forEach((k) => { (payload as any)[k] = !!draft[k]; });
    mutation.mutate(payload);
  };

  const renderNumFields = (fields: NumField[]) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={String(f.key)} className="space-y-1.5">
          <Label htmlFor={String(f.key)}>{f.label}</Label>
          <Input
            id={String(f.key)}
            type="number"
            inputMode="decimal"
            min={0}
            value={(draft[f.key] as string) ?? ""}
            onChange={(e) => setField(String(f.key), e.target.value)}
          />
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
    </div>
  );

  const hasDraft = Object.keys(draft).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Settings2 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuration Wallet</h1>
            <p className="text-muted-foreground">Récompenses, retraits et limites du module de paiement</p>
          </div>
        </div>
        <Button onClick={save} disabled={!hasDraft || mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : isError || !hasDraft ? (
        <p className="py-8 text-center text-sm text-destructive">Impossible de charger la configuration.</p>
      ) : (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Récompense</CardTitle><CardDescription>Crédit versé à l'auteur d'une ressource approuvée · devise {currency}</CardDescription></CardHeader>
            <CardContent>{renderNumFields(REWARD_FIELDS)}</CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Retraits</CardTitle><CardDescription>Bornes et frais des demandes de retrait</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {renderNumFields(WITHDRAW_FIELDS)}
              <div className="space-y-1.5 max-w-xs">
                <Label>Type de frais</Label>
                <Select value={draft.withdrawFeeType as string} onValueChange={(v) => setField("withdrawFeeType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixe</SelectItem>
                    <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Limites</CardTitle><CardDescription>Plafonds et cadence des retraits</CardDescription></CardHeader>
            <CardContent>{renderNumFields(LIMIT_FIELDS)}</CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Activation</CardTitle><CardDescription>Interrupteurs du module</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {TOGGLES.map((t) => (
                <div key={String(t.key)} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    {t.hint && <p className="text-xs text-muted-foreground">{t.hint}</p>}
                  </div>
                  <Switch checked={!!draft[t.key]} onCheckedChange={(v) => setField(String(t.key), v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
