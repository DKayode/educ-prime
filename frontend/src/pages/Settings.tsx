import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const handleSave = () => {
    toast.success("Paramètres enregistrés avec succès");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Configurer les paramètres de la plateforme</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Configuration de base de la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Nom de la plateforme</Label>
              <Input id="platform-name" defaultValue="Épreuves d'examens" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email administrateur</Label>
              <Input id="admin-email" type="email" defaultValue="admin@epreuves.bj" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-file-size">Taille max des fichiers (MB)</Label>
              <Input id="max-file-size" type="number" defaultValue="10" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Gérer les notifications système</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nouveaux utilisateurs</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir une notification pour chaque inscription
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nouvelles épreuves</Label>
                <p className="text-sm text-muted-foreground">
                  Notification lors de l'ajout d'une épreuve
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rapports hebdomadaires</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir un rapport d'activité chaque semaine
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Stockage Firebase</CardTitle>
            <CardDescription>Configuration du stockage des fichiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firebase-bucket">Bucket Firebase</Label>
              <Input id="firebase-bucket" placeholder="gs://your-bucket.appspot.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Espace utilisé</span>
                <span className="font-medium">4.2 GB / 50 GB</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: "8.4%" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>API Backend</CardTitle>
            <CardDescription>Configuration de l'API Node.js</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL de l'API</Label>
              <Input id="api-url" placeholder="https://api.example.com" />
            </div>
            <div className="space-y-2">
              <Label>État de l'API</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-muted-foreground">Opérationnelle</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Annuler</Button>
        <Button onClick={handleSave}>Enregistrer les modifications</Button>
      </div>
    </div>
  );
}
