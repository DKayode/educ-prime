import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Searchable single-select (combobox) for id/nom lists that can be numerous.
// Filter-as-you-type; pre-selected to `value`. `emptyText` is shown when the
// list has no options at all (vs. a plain "no search match" line).
export function SearchableSelect({ value, options, onSelect, placeholder, searchPlaceholder, emptyText, disabled }: {
    value?: number | null;
    options: { id: number; nom: string }[];
    onSelect: (id: number) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const selected = options.find(o => o.id === value);
    const filtered = search.trim()
        ? options.filter(o => o.nom.toLowerCase().includes(search.trim().toLowerCase()))
        : options;
    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal">
                    <span className={cn("truncate", selected ? '' : 'text-muted-foreground')}>{selected ? selected.nom : placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                    <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty>{options.length === 0 ? emptyText : 'Aucun résultat pour cette recherche.'}</CommandEmpty>
                        <CommandGroup>
                            {filtered.map(o => (
                                <CommandItem key={o.id} value={o.nom} onSelect={() => { onSelect(o.id); setOpen(false); setSearch(''); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                                    {o.nom}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
