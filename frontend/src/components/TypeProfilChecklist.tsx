import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TypeProfilChecklistProps {
  /** Controlled selection (type_profil ids). */
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Shared multi-select checklist of the country's type-profils. Used in the
 * create/edit form of all 5 taggable admin pages (Opportunités, Événements,
 * Forums, Services, Offres). Controlled: the parent owns the selected ids,
 * prefills on edit (GET /<entity>/:id/type-profils) and saves them via
 * PUT /<entity>/:id/type-profils after the entity itself is created/updated.
 */
export function TypeProfilChecklist({
  value,
  onChange,
  disabled,
  label = "Types de profil (audience)",
}: TypeProfilChecklistProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["type-profils", "checklist-options"],
    queryFn: () => typeProfilsService.getAll({ page: 1, limit: 100 }),
  });
  const options = data?.data || [];

  const toggle = (id: number, checked: boolean) => {
    if (checked) {
      if (!value.includes(id)) onChange([...value, id]);
    } else {
      onChange(value.filter((v) => v !== id));
    }
  };

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Aucune sélection = visible par tous. Sinon, visible uniquement par les utilisateurs
        ayant l'un de ces types de profil.
      </p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun type de profil. Créez-en dans « Personnalisation › Types de profil ».
        </p>
      ) : (
        <ScrollArea className="h-32 rounded-md border p-2">
          <div className="grid gap-2">
            {options.map((tp) => (
              <label key={tp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={value.includes(tp.id)}
                  onCheckedChange={(c) => toggle(tp.id, c === true)}
                  disabled={disabled}
                />
                <span>
                  {tp.titre}
                  {tp.sous_titre ? <span className="text-muted-foreground"> — {tp.sous_titre}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
