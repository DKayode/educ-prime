import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Libellés d'affichage des 5 entités taguables (l'API renvoie les clés canoniques).
const ENTITY_LABELS: Record<string, string> = {
  evenement: "Événements",
  opportunite: "Opportunités",
  forum: "Forums",
  service: "Services",
  offre: "Offres",
};

const NONE = "__none__";

export default function TypeProfilAssociations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: registry, isLoading } = useQuery({
    queryKey: ["type-profils", "registry"],
    queryFn: () => typeProfilsService.getRegistry(),
  });

  const { data: typeProfils } = useQuery({
    queryKey: ["type-profils", "options"],
    queryFn: () => typeProfilsService.getAll({ page: 1, limit: 100 }),
  });
  const options = typeProfils?.data || [];

  const mutation = useMutation({
    mutationFn: ({ entity, typeProfilId }: { entity: string; typeProfilId: number | null }) =>
      typeProfilsService.setAssociation(entity, typeProfilId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-profils", "registry"] });
      toast({ title: "Association mise à jour" });
    },
    onError: () => toast({ title: "Échec de la mise à jour", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Associations Type de profil</h1>
        <p className="text-muted-foreground">
          Associez chaque type de contenu à un type de profil. Une entité non associée est
          visible par tous ; sinon elle n'est visible que par les utilisateurs de ce type de profil.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audience par entité</CardTitle>
          <CardDescription>Un seul type de profil par entité (le premier / principal).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </div>
          ) : (
            <div className="grid gap-4 sm:max-w-xl">
              {(registry || []).map((row) => (
                <div key={row.entity} className="flex items-center justify-between gap-4">
                  <Label className="w-40 shrink-0">{ENTITY_LABELS[row.entity] || row.entity}</Label>
                  <Select
                    value={row.type_profil ? String(row.type_profil.id) : NONE}
                    onValueChange={(v) =>
                      mutation.mutate({ entity: row.entity, typeProfilId: v === NONE ? null : Number(v) })
                    }
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Aucune (public)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucune (public)</SelectItem>
                      {options.map((tp) => (
                        <SelectItem key={tp.id} value={String(tp.id)}>
                          {tp.titre}
                          {tp.sous_titre ? ` — ${tp.sous_titre}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
