import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, XCircle, Wallet, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OtpDeliveryIndicator } from "@/components/OtpDeliveryIndicator";
import {
  walletAdminService,
  WithdrawalRequest,
  WithdrawalStatus,
  MobileMoneyProvider,
} from "@/lib/services/wallet-admin.service";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  PENDING: { label: "En attente", variant: "secondary" },
  OTP_PENDING: { label: "OTP en attente", variant: "outline" },
  APPROVED: { label: "Approuvée", variant: "default" },
  PROCESSING: { label: "En cours", variant: "outline" },
  PAID: { label: "Payée", variant: "default", className: "bg-emerald-600 hover:bg-emerald-600" },
  REJECTED: { label: "Rejetée", variant: "destructive" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Approuvées" },
  { value: "PROCESSING", label: "En cours" },
  { value: "PAID", label: "Payées" },
  { value: "REJECTED", label: "Rejetées" },
];

const money = (n: number) => `${Number(n ?? 0).toLocaleString("fr-FR")} XOF`;

export default function RetraitsWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payTarget, setPayTarget] = useState<WithdrawalRequest | null>(null);
  const [pay, setPay] = useState<{ provider: MobileMoneyProvider; transactionReference: string; phoneNumber: string; paidAmount: string }>(
    { provider: "MTN_MOMO", transactionReference: "", phoneNumber: "", paidAmount: "" },
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wallet-withdrawals", status, page],
    queryFn: () => walletAdminService.listWithdrawals({
      status: status === "ALL" ? undefined : (status as WithdrawalStatus),
      page,
      limit,
    }),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["wallet-withdrawals"] });


  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => walletAdminService.reject(id, reason),
    onSuccess: () => { invalidate(); setRejectTarget(null); setRejectReason(""); toast({ title: "Retrait rejeté", description: "L'utilisateur sera notifié." }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message || "Échec du rejet", variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: (t: WithdrawalRequest) => walletAdminService.confirmPayment(t.id, {
      provider: pay.provider,
      transactionReference: pay.transactionReference.trim(),
      phoneNumber: pay.phoneNumber.trim(),
      paidAmount: Number(pay.paidAmount),
    }),
    onSuccess: () => { invalidate(); setPayTarget(null); toast({ title: "Paiement confirmé", description: "Le wallet a été débité et l'utilisateur notifié." }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message || "Échec de la confirmation", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Wallet className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Retraits (Wallet)</h1>
          <p className="text-muted-foreground">Demandes de retrait Mobile Money des utilisateurs</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Demandes de retrait</CardTitle>
            <CardDescription>{total} demande{total > 1 ? "s" : ""}</CardDescription>
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">Impossible de charger les retraits.</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Aucune demande de retrait.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Frais</TableHead>
                  <TableHead>Net à payer</TableHead>
                  <TableHead>Compte MoMo</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => {
                  const meta = STATUS_META[w.status] ?? { label: w.status, variant: "secondary" as const };
                  const busy = rejectMutation.isPending || confirmMutation.isPending;
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        {w.user ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{[w.user.prenom, w.user.nom].filter(Boolean).join(" ") || "—"}</span>
                            <span className="text-xs text-muted-foreground">{w.user.email}</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{money(w.amount)}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{money(w.fees)}</TableCell>
                      <TableCell className="font-semibold tabular-nums">{money(w.netAmount)}</TableCell>
                      <TableCell>
                        {w.paymentAccount ? (
                          <div className="flex flex-col">
                            <span className="text-sm tabular-nums">{w.paymentAccount.phoneNumber}</span>
                            <span className="text-xs text-muted-foreground">{w.paymentAccount.operator?.replace("_", " ")}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">non renseigné</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>
                          <OtpDeliveryIndicator withdrawalId={w.id} />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(w.status === "PENDING" || w.status === "APPROVED" || w.status === "PROCESSING") && (
                            <>
                              <Button size="sm" className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-600/90" disabled={busy}
                                title="Marquer comme payé (après transfert Mobile Money)"
                                onClick={() => { setPayTarget(w); setPay({ provider: (w.paymentAccount?.operator as MobileMoneyProvider) ?? "MTN_MOMO", transactionReference: "", phoneNumber: w.paymentAccount?.phoneNumber ?? "", paidAmount: String(w.netAmount) }); }}>
                                <BadgeCheck className="h-4 w-4" /> Marquer payé
                              </Button>
                              <Button variant="ghost" size="icon" title="Rejeter la demande" disabled={busy} onClick={() => { setRejectTarget(w); setRejectReason(""); }}>
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {w.status === "PAID" && (
                            <span className="text-xs font-medium text-emerald-600">Payé</span>
                          )}
                          {w.status === "REJECTED" && w.rejectedReason && (
                            <span className="text-xs text-muted-foreground italic max-w-[180px] truncate" title={w.rejectedReason}>{w.rejectedReason}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>Indiquez le motif — il sera communiqué à l'utilisateur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Motif</Label>
            <Input id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex. : compte Mobile Money invalide" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button>
            <Button variant="destructive" disabled={rejectReason.trim().length < 3 || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })}>
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm manual payment dialog */}
      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme payé</DialogTitle>
            <DialogDescription>Après avoir effectué le transfert Mobile Money manuellement, renseignez les détails ci-dessous. La demande passera en « Payée », le wallet sera débité et l'utilisateur notifié.</DialogDescription>
          </DialogHeader>
          {payTarget && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bénéficiaire</span><span className="font-medium">{[payTarget.user?.prenom, payTarget.user?.nom].filter(Boolean).join(" ") || payTarget.user?.email || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Montant net à payer</span><span className="font-semibold tabular-nums">{money(payTarget.netAmount)}</span></div>
              {payTarget.paymentAccount && (
                <div className="flex justify-between"><span className="text-muted-foreground">Compte MoMo</span><span className="tabular-nums">{payTarget.paymentAccount.phoneNumber}</span></div>
              )}
            </div>
          )}
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Opérateur</Label>
              <Select value={pay.provider} onValueChange={(v) => setPay((p) => ({ ...p, provider: v as MobileMoneyProvider }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                  <SelectItem value="MOOV_MONEY">Moov Money</SelectItem>
                  <SelectItem value="CELTIIS_CASH">Celtiis Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Référence de transaction</Label>
              <Input value={pay.transactionReference} onChange={(e) => setPay((p) => ({ ...p, transactionReference: e.target.value }))} placeholder="MM240630001122" />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro payé</Label>
              <Input value={pay.phoneNumber} onChange={(e) => setPay((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="+229 01XXXXXXXX · +221 7XXXXXXXX · +242 0XXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Montant payé (XOF)</Label>
              <Input type="number" value={pay.paidAmount} onChange={(e) => setPay((p) => ({ ...p, paidAmount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Annuler</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={!pay.transactionReference.trim() || !pay.phoneNumber.trim() || !pay.paidAmount || confirmMutation.isPending}
              onClick={() => payTarget && confirmMutation.mutate(payTarget)}>
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Marquer comme payé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
