import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare } from "lucide-react";
import {
  walletAdminService,
  OtpDeliveryState,
  OtpDeliveryDiagnostic,
} from "@/lib/services/wallet-admin.service";

// Le SMS d'OTP part quand l'utilisateur DEMANDE le retrait : il prouve qu'il
// contrôle le numéro Mobile Money qui recevra l'argent. « Envoyé » et « reçu »
// sont deux choses différentes — ce badge montre ce que le fournisseur a
// réellement rapporté, pour répondre à « je n'ai jamais reçu le code ».
// La requête n'est lancée qu'à l'ouverture : sinon ce serait un appel par ligne.

const STATE_META: Record<OtpDeliveryState, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  DELIVERED: { label: "Reçu", variant: "default", className: "bg-emerald-600 hover:bg-emerald-600" },
  SENT_TO_PROVIDER: { label: "Envoyé", variant: "outline" },
  CREATED: { label: "Non parti", variant: "secondary" },
  UNDELIVERED: { label: "Non remis", variant: "destructive" },
  FAILED: { label: "Échec", variant: "destructive" },
  DELIVERY_TIMEOUT: { label: "Sans réponse", variant: "destructive" },
  DELIVERY_UNKNOWN: { label: "Inconnu", variant: "secondary" },
  NOT_REQUIRED: { label: "Non requis", variant: "outline" },
};

const LEVEL_CLASS: Record<OtpDeliveryDiagnostic["level"], string> = {
  OK: "text-emerald-600",
  INFO: "text-muted-foreground",
  WARNING: "text-amber-600",
  ERROR: "text-destructive",
};

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("fr-FR") : "—");

export function OtpDeliveryIndicator({ withdrawalId }: { withdrawalId: string }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["withdrawal-otp-delivery", withdrawalId],
    queryFn: () => walletAdminService.getOtpDeliveryStatus(withdrawalId),
    enabled: open,
    staleTime: 30_000,
  });

  const otp = data?.otp;
  const state = otp?.deliveryStatus ? STATE_META[otp.deliveryStatus] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Statut de livraison du SMS d'OTP"
          aria-label="Statut de livraison du SMS d'OTP"
        >
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 text-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <p className="py-2 text-xs text-destructive">
            {(error as any)?.message || "Statut de livraison indisponible."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">SMS d'OTP</span>
              {state ? (
                <Badge variant={state.variant} className={state.className}>{state.label}</Badge>
              ) : (
                <Badge variant="secondary">Aucun OTP</Badge>
              )}
            </div>

            {data?.diagnostic && (
              <p className={`text-xs ${LEVEL_CLASS[data.diagnostic.level]}`}>{data.diagnostic.message}</p>
            )}

            {otp && (
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Numéro</dt>
                  <dd className="tabular-nums">{otp.phoneNumber}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Fournisseur</dt>
                  <dd>{otp.provider}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Envoyé le</dt>
                  <dd>{dt(otp.sentAt)}</dd>
                </div>
                {otp.deliveredAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Reçu le</dt>
                    <dd>{dt(otp.deliveredAt)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Tentatives</dt>
                  <dd>
                    {otp.attemptCount}/{otp.maxAttempts}
                    {otp.resendCount > 0 && ` · ${otp.resendCount} renvoi${otp.resendCount > 1 ? "s" : ""}`}
                  </dd>
                </div>
                {otp.lockedAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Bloqué</dt>
                    <dd className="text-destructive">{otp.lockedReason || "oui"}</dd>
                  </div>
                )}
                {(otp.deliveryErrorCode || otp.deliveryErrorMessage || otp.failureReason) && (
                  <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                    {[otp.deliveryErrorCode, otp.deliveryErrorMessage || otp.failureReason]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                )}
                {otp.providerStatusDescription && (
                  <p className="text-muted-foreground">{otp.providerStatusDescription}</p>
                )}
              </dl>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
