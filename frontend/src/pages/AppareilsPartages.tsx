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
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronDown, Smartphone, Users } from "lucide-react";
import { usersService, SharedDeviceGroup } from "@/lib/services/users.service";
import { cn } from "@/lib/utils";

const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export default function AppareilsPartages() {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, error } = useQuery({
        queryKey: ["appareils-partages", debouncedSearch, page, limit],
        queryFn: () => usersService.getSharedDevices({ search: debouncedSearch || undefined, page, limit }),
    });

    const groups = data?.data || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Appareils partagés</h1>
                    <p className="text-muted-foreground">
                        Comptes enregistrés depuis un même appareil (token FCM partagé par 2 comptes ou plus)
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un compte du groupe (nom, email, pseudo)..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="pl-10"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">Erreur lors du chargement des données</div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                        Aucun appareil partagé trouvé.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map((g) => (
                            <DeviceCard key={g.fcm_token} group={g} />
                        ))}

                        {data?.totalPages !== undefined && data.totalPages > 1 && (
                            <div className="flex items-center justify-center space-x-2 py-4">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    Page {page} sur {data.totalPages}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
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

function DeviceCard({ group }: { group: SharedDeviceGroup }) {
    const [isOpen, setIsOpen] = useState(false);
    const tokenShort = `${group.fcm_token.slice(0, 16)}…${group.fcm_token.slice(-6)}`;

    return (
        <Card>
            <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-start">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Token FCM (appareil)</span>
                            <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded w-fit" title={group.fcm_token}>
                                {tokenShort}
                            </code>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Comptes</span>
                            <div className="font-bold text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {group.accounts_count}
                            </div>
                        </div>
                    </div>
                </div>

                <Button variant="ghost" className="gap-2" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? "Masquer" : "Voir comptes"}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
            </div>

            {isOpen && (
                <div className="border-t bg-muted/5 px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Pays</TableHead>
                                <TableHead>Créé le</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {group.accounts.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell className="font-medium">{[a.prenom, a.nom].filter(Boolean).join(" ") || "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{a.role}</Badge></TableCell>
                                    <TableCell className="capitalize">{a.pays}</TableCell>
                                    <TableCell className="text-muted-foreground">{fmtDate((a as any).date_creation)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
