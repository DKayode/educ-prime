import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
import { TypeProfilChecklist } from "@/components/TypeProfilChecklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Libellés d'affichage des 5 entités taguables (l'API renvoie les clés canoniques).
const ENTITY_LABELS: Record<string, string> = {
  evenement: "Événements",
  opportunite: "Opportunités",
  forum: "Forums",
  service: "Services",
  offre: "Offres",
};

export default function TypeProfilAssociations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: registry, isLoading } = useQuery({
    queryKey: ["type-profils", "registry"],
    queryFn: () => typeProfilsService.getRegistry(),
  });

  // Sélection locale par entité (évite le flicker entre un toggle et le refetch).
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (!registry) return;
    const next: Record<string, number[]> = {};
    for (const row of registry) next[row.entity] = row.type_profils.map((tp) => tp.id);
    setSelections(next);
  }, [registry]);

  const mutation = useMutation({
    mutationFn: ({ entity, ids }: { entity: string; ids: number[] }) =>
      typeProfilsService.setAssociations(entity, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-profils", "registry"] });
      toast({ title: "Audience mise à jour" });
    },
    onError: () => toast({ title: "Échec de la mise à jour", variant: "destructive" }),
  });

  const handleChange = (entity: string, ids: number[]) => {
    setSelections((prev) => ({ ...prev, [entity]: ids }));
    mutation.mutate({ entity, ids });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Associations Type de profil</h1>
        <p className="text-muted-foreground">
          Associez chaque type de contenu à un ou plusieurs types de profil. Une entité sans
          sélection est visible par tous ; sinon elle n'est visible que par les utilisateurs de
          l'un des types choisis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audience par entité</CardTitle>
          <CardDescription>
            Plusieurs types de profil possibles par entité. La sélection remplace l'audience existante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </div>
          ) : (
            <div className="grid gap-6 sm:max-w-2xl">
              {(registry || []).map((row) => (
                <TypeProfilChecklist
                  key={row.entity}
                  label={ENTITY_LABELS[row.entity] || row.entity}
                  value={selections[row.entity] ?? row.type_profils.map((tp) => tp.id)}
                  onChange={(ids) => handleChange(row.entity, ids)}
                  disabled={mutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
