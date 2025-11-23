import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { usersService } from "@/lib/services/users.service";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAll(),
  });

  const filteredUsers = users.filter(
    (user) =>
      user.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.filiere?.nom || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérer les utilisateurs de la plateforme</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou filière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Erreur lors du chargement des utilisateurs
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Filière</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.prenom} {user.nom}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.filiere?.nom || '-'}</TableCell>
                      <TableCell>{user.etablissement?.nom || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
