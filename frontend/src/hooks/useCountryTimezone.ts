import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { countriesService } from "@/lib/services/countries.service";

/**
 * Fuseau horaire (ex. "Africa/Cotonou") du pays sélectionné, lu depuis la config
 * backend (`GET /countries`). benin → Africa/Cotonou, senegal → Africa/Dakar,
 * congo → Africa/Brazzaville. Fallback : le fuseau du navigateur.
 */
export function useCountryTimezone(): string {
  const { data } = useQuery({
    queryKey: ["countries"],
    queryFn: () => countriesService.list(),
    staleTime: Infinity, // config statique côté serveur
  });
  const current = api.getCountry();
  const tz = data?.find((c) => c.country === current)?.timezone;
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!tz) return browser;
  // Un fuseau IANA inconnu (ex. config erronée) ferait planter toLocaleString → on
  // valide et on retombe sur le fuseau du navigateur si besoin.
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return browser;
  }
}
