import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Play,
  Archive,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
} from "lucide-react";
import {
  formsService,
  STATUT_LABEL,
  type CampaignStatut,
  type FormCampaignListItem,
} from "@/lib/services/forms.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUT_BADGE: Record<CampaignStatut, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUT_FILTERS: { value: CampaignStatut | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillons" },
  { value: "active", label: "Actives" },
  { value: "archived", label: "Archivées" },
];

export default function EnquetesCampagnes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statut, setStatut] = useState<CampaignStatut | "all">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["form-campaigns", statut, page, limit],
    queryFn: () =>
      formsService.getAll({
        page,
        limit,
        ...(statut !== "all" ? { statut } : {}),
      }),
  });
  const campaigns = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const statutMutation = useMutation({
    mutationFn: ({ uuid, next }: { uuid: string; next: CampaignStatut }) =>
      formsService.updateStatut(uuid, next),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ["form-campaigns"] });
      toast({
        title: "Statut mis à jour",
        description: `La campagne est désormais « ${STATUT_LABEL[v.next]} ».`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message || "Échec", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => formsService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-campaigns"] });
      setDeleteId(null);
      toast({ title: "Supprimée", description: "Campagne supprimée avec succès." });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message || "Échec", variant: "destructive" }),
  });

  const StatutAction = ({ c }: { c: FormCampaignListItem }) => {
    if (c.statut === "active") {
      return (
        <Button
          variant="ghost"
          size="icon"
          title="Archiver"
          onClick={() => statutMutation.mutate({ uuid: c.uuid, next: "archived" })}
        >
          <Archive className="h-4 w-4 text-slate-500" />
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        title={c.statut === "draft" ? "Activer" : "Réactiver"}
        onClick={() => statutMutation.mutate({ uuid: c.uuid, next: "active" })}
      >
        <Play className="h-4 w-4 text-emerald-600" />
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Enquêtes</h1>
            <p className="text-muted-foreground">
              Campagnes de satisfaction servies à l'application mobile
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={statut}
            onValueChange={(v) => {
              setStatut(v as CampaignStatut | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUT_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => navigate("/enquetes/nouveau")}>
            <Plus className="h-4 w-4" /> Nouvelle campagne
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes</CardTitle>
          <CardDescription>
            {data?.total ?? 0} campagne{(data?.total ?? 0) > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucune campagne. Créez-en une pour commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Réponses</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.uuid}>
                    <TableCell className="font-medium">
                      <button
                        className="text-left hover:underline"
                        onClick={() => navigate(`/enquetes/${c.uuid}/resultats`)}
                      >
                        {c.titre}
                      </button>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {c.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-medium", STATUT_BADGE[c.statut])}>
                        {STATUT_LABEL[c.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.nb_reponses}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.date_debut)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.date_creation)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Résultats"
                          onClick={() => navigate(`/enquetes/${c.uuid}/resultats`)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Éditer"
                          onClick={() => navigate(`/enquetes/${c.uuid}/edition`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <StatutAction c={c} />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer"
                          onClick={() => setDeleteId(c.uuid)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la campagne ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprime aussi les réponses déjà collectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
