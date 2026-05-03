import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { countriesService } from "@/lib/services/countries.service";
import { Loader2, AlertCircle } from "lucide-react";

const countryLabel = (slug: string) =>
  slug.charAt(0).toUpperCase() + slug.slice(1);

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("");
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesError, setCountriesError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    countriesService
      .list()
      .then((list) => {
        if (cancelled) return;
        setCountries(list);
        // Pre-select the country saved at the previous login if it's still configured.
        const previous = localStorage.getItem("country");
        if (previous && list.includes(previous)) {
          setCountry(previous);
        } else if (list.length === 1) {
          setCountry(list[0]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Login] Échec du chargement des pays:", err);
        setCountriesError(
          "Impossible de charger la liste des pays. Réessayez plus tard."
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!country) {
      setError("Veuillez sélectionner un pays.");
      return;
    }
    setIsLoading(true);

    try {
      await login(email, password, country);
      console.log('[Login] Navigation vers le tableau de bord...');
      navigate("/");
    } catch (err: any) {
      console.error('[Login] Erreur:', err);
      setError(err?.message || "Échec de la connexion. Vérifiez vos identifiants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Educ-Prime Admin</CardTitle>
          <CardDescription className="text-center">
            Connectez-vous pour accéder au tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {countriesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{countriesError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Select
                value={country}
                onValueChange={setCountry}
                disabled={isLoading || countries.length === 0}
              >
                <SelectTrigger id="country">
                  <SelectValue
                    placeholder={
                      countries.length === 0 && !countriesError
                        ? "Chargement…"
                        : "Sélectionnez un pays"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {countryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="link"
                className="px-0 font-normal"
                onClick={() => navigate("/forgot-password")}
                type="button"
              >
                Mot de passe oublié ?
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !country}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Plateforme de gestion des examens</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
