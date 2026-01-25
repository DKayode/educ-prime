import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Card } from "@/components/ui/card";
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
import { Search, Loader2, ChevronLeft, ChevronRight, Users, ChevronDown } from "lucide-react";
import { usersService } from "@/lib/services/users.service";
import { Utilisateur } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Parrainages() {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    // Main query for parrains (users)
    const { data: usersResponse, isLoading, error } = useQuery({
        queryKey: ['parrainages', debouncedSearchQuery, page, limit],
        queryFn: () => usersService.getAll({
            search: debouncedSearchQuery || undefined,
            page,
            limit,
            sort_by: 'filleuls',
            sort_order: 'DESC'
        }),
    });

    const users = usersResponse?.data || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Parrainages</h1>
                    <p className="text-muted-foreground">Suivi des parrainages utilisateurs</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">
                        Erreur lors du chargement des données
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                        Aucun utilisateur trouvé.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {users.map((user: Utilisateur) => (
                            <ParrainCard key={user.id} parrain={user} />
                        ))}

                        {usersResponse?.totalPages !== undefined && usersResponse.totalPages > 1 && (
                            <div className="flex items-center justify-center space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    Page {page} sur {usersResponse.totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(usersResponse.totalPages, p + 1))}
                                    disabled={page === usersResponse.totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ParrainCard({ parrain }: { parrain: Utilisateur }) {
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 10;

    // Fetch filleuls only when expanded
    const { data: filleulsResponse, isLoading } = useQuery({
        queryKey: ['filleuls', parrain.id, page],
        queryFn: () => usersService.getAll({
            parrain_id: parrain.id.toString(),
            page,
            limit
        }),
        enabled: isOpen, // Only fetch when open
    });

    const filleuls = filleulsResponse?.data || [];
    const totalPages = filleulsResponse?.totalPages || 0;

    return (
        <Card>
            <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-start">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Utilisateur</span>
                            <div>
                                <div className="font-semibold text-lg leading-none">{parrain.prenom} {parrain.nom}</div>
                                <div className="text-xs text-muted-foreground mt-1">{parrain.email}</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Rôle</span>
                            <div>
                                <Badge variant="outline" className="capitalize">{parrain.role}</Badge>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Code Parrainage</span>
                            <code className="font-mono text-base font-bold bg-muted px-2 py-0.5 rounded w-fit">
                                {parrain.mon_code_parrainage || '-'}
                            </code>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Filleuls</span>
                            <div className="font-bold text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {parrain.filleulsCount || 0}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="gap-2" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? "Masquer" : "Voir filleuls"}
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                </div>
            </div>

            {isOpen && (
                <div className="border-t bg-muted/5 px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filleuls.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            Aucun filleul trouvé.
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Filleul</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Date d'inscription</TableHead>
                                        <TableHead>Role</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filleuls.map((filleul: Utilisateur) => (
                                        <TableRow key={filleul.id}>
                                            <TableCell className="font-medium">
                                                {filleul.prenom} {filleul.nom}
                                            </TableCell>
                                            <TableCell>{filleul.email}</TableCell>
                                            <TableCell>
                                                {filleul.date_creation
                                                    ? new Date(filleul.date_creation).toLocaleDateString()
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{filleul.role}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center space-x-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-sm text-muted-foreground">
                                        Page {page} sur {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
