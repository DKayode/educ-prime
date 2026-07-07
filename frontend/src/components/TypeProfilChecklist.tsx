import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface TypeProfilChecklistProps {
  /** Controlled selection (type_profil ids). */
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Shared multi-select of the country's type-profils, used in the create/edit
 * form of all 5 taggable admin pages (Opportunités, Événements, Forums,
 * Services, Offres). Searchable popover + removable badges for the current
 * selection. Controlled: the parent owns the selected ids, prefills on edit
 * (GET /<entity>/:id/type-profils) and saves via PUT /<entity>/:id/type-profils.
 */
export function TypeProfilChecklist({
  value,
  onChange,
  disabled,
  label = "Types de profil (audience)",
}: TypeProfilChecklistProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["type-profils", "checklist-options"],
    queryFn: () => typeProfilsService.getAll({ page: 1, limit: 100 }),
  });
  const options = data?.data || [];
  const selected = options.filter((tp) => value.includes(tp.id));

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
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
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                className="w-full justify-between font-normal"
              >
                {value.length > 0
                  ? `${value.length} type${value.length > 1 ? "s" : ""} de profil sélectionné${value.length > 1 ? "s" : ""}`
                  : "Sélectionner des types de profil"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command
                filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
              >
                <CommandInput placeholder="Rechercher un type de profil..." />
                <CommandList>
                  <CommandEmpty>Aucun type trouvé.</CommandEmpty>
                  <CommandGroup>
                    {options.map((tp) => (
                      <CommandItem
                        key={tp.id}
                        value={`${tp.titre} ${tp.sous_titre ?? ""}`}
                        onSelect={() => toggle(tp.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value.includes(tp.id) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span>
                          {tp.titre}
                          {tp.sous_titre ? (
                            <span className="text-muted-foreground"> — {tp.sous_titre}</span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((tp) => (
                <Badge key={tp.id} variant="secondary" className="gap-1">
                  {tp.titre}
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Retirer ${tp.titre}`}
                      className="ml-0.5 rounded-full outline-none hover:text-destructive"
                      onClick={() => toggle(tp.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
