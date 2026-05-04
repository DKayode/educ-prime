import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  countriesService,
  type CountrySummary,
} from "@/lib/services/countries.service";

const label = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

export function CountrySwitcher() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [current, setCurrent] = useState<string>(api.getCountry() || "");

  useEffect(() => {
    let cancelled = false;
    countriesService
      .list()
      .then((list) => {
        if (cancelled) return;
        setCountries(list);
      })
      .catch((err) => {
        console.error("[CountrySwitcher] Échec du chargement des pays:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (next: string) => {
    if (!next || next === current) return;
    api.setCountry(next);
    setCurrent(next);
    // Full reload so every cached query refetches under the new scope.
    window.location.reload();
  };

  if (countries.length <= 1) return null;

  const renderOption = (entry: CountrySummary) => (
    <span className="flex items-center gap-2">
      {entry.logo ? (
        <img src={entry.logo} alt="" className="h-4 w-4 object-contain" />
      ) : (
        <Globe className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{label(entry.country)}</span>
    </span>
  );

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[160px]">
        <SelectValue placeholder="Pays" />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.country} value={c.country}>
            {renderOption(c)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
