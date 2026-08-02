import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { seriesService, typesExamenService, type Serie } from "@/lib/services/examens-nationaux.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";

export default function SeriesExamen() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editing, setEditing] = useState<Serie | null>(null);
    const [formData, setFormData] = useState<{ nom: string; description: string; type_examen_id: string }>({ nom: "", description: "", type_examen_id: "" });
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [filterType, setFilterType] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const limit = 10;

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: typesResp } = useQuery({ queryKey: ["types-examen", "all"], queryFn: () => typesExamenService.getAll({ limit: 200 }) });
    const types = typesResp?.data || [];

    const { data: resp, isLoading } = useQuery({
        queryKey: ["series-examen", debouncedSearch, filterType, page],
        queryFn: () => seriesService.getAll({ search: debouncedSearch, type_examen: filterType === "ALL" ? undefined : Number(filterType), page, limit }),
    });
    const rows = resp?.data || [];
    const totalPages = resp?.totalPages || 1;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["series-examen"] });

    const createMutation = useMutation({
        mutationFn: (data: { nom: string; type_examen_id: number; description?: string }) => seriesService.create(data),
        onSuccess: () => { invalidate(); setIsCreateOpen(false); setFormData({ nom: "", description: "", type_examen_id: "" }); toast({ title: "Succès", description: "Série créée" }); },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec de la création", variant: "destructive" }),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => seriesService.update(id, data),
        onSuccess: () => { invalidate(); setIsEditOpen(false); setEditing(null); toast({ title: "Succès", description: "Série mise à jour" }); },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec de la mise à jour", variant: "destructive" }),
    });
    const deleteMutation = useMutation({
        mutationFn: (id: number) => seriesService.delete(id),
        onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Succès", description: "Série supprimée" }); },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec de la suppression", variant: "destructive" }),
    });

    if (isLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Layers className="h-8 w-8" /> Séries</h1>
                    <p className="text-muted-foreground">Séries rattachées à un type d'examen</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous les types" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les types</SelectItem>
                            {types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nom}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Rechercher..." className="pl-8 w-[220px]" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild><Button className="gap-2" onClick={() => setFormData({ nom: "", description: "", type_examen_id: filterType !== "ALL" ? filterType : "" })}><Plus className="h-4 w-4" /> Ajouter</Button></DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <form onSubmit={(e) => { e.preventDefault(); if (!formData.type_examen_id) return; createMutation.mutate({ nom: formData.nom, type_examen_id: Number(formData.type_examen_id), description: formData.description || undefined }); }}>
                                <DialogHeader><DialogTitle>Créer une série</DialogTitle><DialogDescription>Rattachée à un type d'examen</DialogDescription></DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Type d'examen *</Label>
                                        <Select value={formData.type_examen_id} onValueChange={(v) => setFormData({ ...formData, type_examen_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                                            <SelectContent>{types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nom}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2"><Label>Nom *</Label><Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required /></div>
                                    <div className="grid gap-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                                </div>
                                <DialogFooter><Button type="submit" disabled={createMutation.isPending || !formData.nom || !formData.type_examen_id}>{createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer"}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Liste des séries</CardTitle><CardDescription>{rows.length} série{rows.length > 1 ? "s" : ""}</CardDescription></CardHeader>
                <CardContent>
                    {rows.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucune série trouvée.</div> :
                        <Table>
                            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Nom</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {rows.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-muted-foreground">{item.type_examen?.nom || "—"}</TableCell>
                                        <TableCell className="font-medium">{item.nom}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.description || "—"}</TableCell>
                                        <TableCell className="text-right"><div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setIsEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>}
                </CardContent>
            </Card>
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">Page {page} sur {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            )}

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-[500px]">
                    <form onSubmit={(e) => { e.preventDefault(); if (editing) updateMutation.mutate({ id: editing.id, data: { nom: editing.nom, description: editing.description || "", type_examen_id: editing.type_examen_id } }); }}>
                        <DialogHeader><DialogTitle>Modifier la série</DialogTitle></DialogHeader>
                        {editing && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Type d'examen</Label>
                                    <Select value={String(editing.type_examen_id)} onValueChange={(v) => setEditing({ ...editing, type_examen_id: Number(v) })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nom}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2"><Label>Nom</Label><Input value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} required /></div>
                                <div className="grid gap-2"><Label>Description</Label><Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                            </div>
                        )}
                        <DialogFooter><Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Supprimer cette série ? Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
