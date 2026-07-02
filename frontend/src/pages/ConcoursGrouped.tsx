import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronRight, ChevronLeft, Building, Award } from "lucide-react";
import { concoursService, ConcoursGroup } from "@/lib/services/concours.service";
import { cn } from "@/lib/utils";

function GroupCard({ group }: { group: ConcoursGroup }) {
    const [open, setOpen] = useState(false);
    const rows = group.concours || [];

    return (
        <Card className="shadow-sm">
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <button type="button" className="w-full text-left">
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <ChevronRight
                                className={cn("h-4 w-4 shrink-0 transition-transform text-muted-foreground", open && "rotate-90")}
                            />
                            <div className="min-w-0 flex-1">
                                <CardTitle className="truncate text-base" title={group.official_title}>
                                    {group.official_title || "—"}
                                </CardTitle>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {group.structure?.nom && (
                                        <span className="inline-flex items-center gap-1">
                                            <Building className="h-3.5 w-3.5" />{group.structure.nom}
                                        </span>
                                    )}
                                    {group.titre_ref?.nom && (
                                        <span className="inline-flex items-center gap-1">
                                            <Award className="h-3.5 w-3.5" />{group.titre_ref.nom}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Badge variant="secondary">{rows.length} édition{rows.length > 1 ? "s" : ""}</Badge>
                                {group.annees?.length > 0 && (
                                    <Badge variant="outline">{group.annees[0]}{group.annees.length > 1 ? `–${group.annees[group.annees.length - 1]}` : ""}</Badge>
                                )}
                            </div>
                        </CardHeader>
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Année</TableHead>
                                    <TableHead>Lieu</TableHead>
                                    <TableHead>Pages</TableHead>
                                    <TableHead>Téléchargements</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.annee ?? "—"}</TableCell>
                                        <TableCell>{c.lieu || "—"}</TableCell>
                                        <TableCell>{c.nombre_page ?? 0}</TableCell>
                                        <TableCell>{c.nombre_telechargements ?? 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

export default function ConcoursGrouped() {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['concours-grouped', page, limit, search],
        queryFn: () => concoursService.getGrouped({ page, limit, search: search || undefined }),
    });

    const groups = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Concours par titre officiel</h1>
                    <p className="text-muted-foreground">Vue groupée : un titre officiel par carte, ses éditions annuelles imbriquées</p>
                </div>
            </div>

            <form onSubmit={submitSearch} className="flex gap-2">
                <Input
                    placeholder="Rechercher un titre officiel (structure, titre)…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="max-w-sm"
                />
                <Button type="submit" variant="secondary">Rechercher</Button>
            </form>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="text-center py-12 text-destructive">
                    Erreur lors du chargement des concours
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    Aucun concours trouvé.
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {groups.map((group, i) => (
                            <GroupCard key={`${group.structure?.id ?? 'na'}-${group.titre_ref?.id ?? 'na'}-${i}`} group={group} />
                        ))}
                    </div>
                    {totalPages > 1 && (
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
    );
}
