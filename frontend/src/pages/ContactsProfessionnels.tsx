import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { contactsProfessionnelsService, type ContactsProfessionnel } from "@/lib/services/contacts-professionnels.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface ContactFormData {
    nom: string;
    email: string;
    telephone?: string;
    message?: string;
    reseaux_sociaux?: Record<string, string>;
    actif: boolean;
}

export default function ContactsProfessionnels() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingContact, setEditingContact] = useState<ContactsProfessionnel | null>(null);
    const [formData, setFormData] = useState<ContactFormData>({
        nom: "",
        email: "",
        telephone: "",
        message: "",
        reseaux_sociaux: {},
        actif: true,
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: contactsResponse, isLoading } = useQuery({
        queryKey: ["contacts-professionnels"],
        queryFn: () => contactsProfessionnelsService.getAll(),
    });
    const contacts = contactsResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: ContactFormData) => contactsProfessionnelsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contacts-professionnels"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ nom: "", email: "", telephone: "", message: "", reseaux_sociaux: {}, actif: true });
            toast({ title: "Succès", description: "Contact créé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ContactFormData> }) =>
            contactsProfessionnelsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contacts-professionnels"] });
            setIsEditDialogOpen(false);
            setEditingContact(null);
            toast({ title: "Succès", description: "Contact mis à jour avec succès" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => contactsProfessionnelsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contacts-professionnels"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Contact supprimé avec succès" });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingContact) {
            updateMutation.mutate({ id: editingContact.id.toString(), data: editingContact });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        Contacts Professionnels
                    </h1>
                    <p className="text-muted-foreground">Gérer les contacts professionnels</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter un contact
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer un contact</DialogTitle>
                                <DialogDescription>Ajouter un nouveau contact professionnel</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nom">Nom *</Label>
                                    <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="telephone">Téléphone</Label>
                                        <Input id="telephone" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</> : "Créer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des contacts</CardTitle>
                    <CardDescription>{contacts.length} contact{contacts.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {contacts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Aucun contact trouvé.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Téléphone</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">{contact.nom}</TableCell>
                                        <TableCell>{contact.email}</TableCell>
                                        <TableCell>{contact.telephone || "—"}</TableCell>
                                        <TableCell><Badge variant={contact.actif ? "default" : "secondary"}>{contact.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingContact(contact); setIsEditDialogOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(contact.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleEdit}>
                        <DialogHeader><DialogTitle>Modifier le contact</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nom *</Label>
                                <Input value={editingContact?.nom || ""} onChange={(e) => setEditingContact(editingContact ? { ...editingContact, nom: e.target.value } : null)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email *</Label>
                                <Input type="email" value={editingContact?.email || ""} onChange={(e) => setEditingContact(editingContact ? { ...editingContact, email: e.target.value } : null)} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</> : "Mettre à jour"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer ce contact ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId.toString())} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression...</> : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
