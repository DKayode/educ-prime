import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "@/lib/services/auth.service";

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || "");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
    }, [location.state]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setIsLoading(true);

        try {
            await authService.resetPassword({ email, code, nouveau_mot_de_passe: password });
            setSuccess("Votre mot de passe a été réinitialisé avec succès.");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err: any) {
            setError(err?.message || "Une erreur est survenue lors de la réinitialisation.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Réinitialiser le mot de passe</CardTitle>
                    <CardDescription className="text-center">
                        Entrez le code reçu par email et votre nouveau mot de passe.
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
                        {success && (
                            <Alert className="border-green-500 text-green-700 bg-green-50">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

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
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">Code de vérification</Label>
                            <Input
                                id="code"
                                type="text"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Nouveau mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={isLoading}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Réinitialisation...
                                </>
                            ) : (
                                "Réinitialiser le mot de passe"
                            )}
                        </Button>

                        <div className="text-center">
                            <Button variant="link" className="text-indigo-600 p-0" onClick={() => navigate("/login")}>
                                Retour à la connexion
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
