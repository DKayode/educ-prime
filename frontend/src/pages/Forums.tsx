import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Search, Plus, Loader2, Trash2, ArrowUpDown, MessageSquare, Heart, Image as ImageIcon } from "lucide-react";
import { forumService } from "@/lib/services/forum.service";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CommentItemProps {
    comment: any; // Using any for now to avoid circular type issues, or import ForumCommentaire
    onLike: (id: number) => void;
}

const SecureForumImage = ({ forumId, alt, className, onClick }: { forumId: number, alt: string, className?: string, onClick?: (url: string) => void }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        forumService.getPhoto(forumId)
            .then(blob => {
                if (active) {
                    const url = URL.createObjectURL(blob);
                    setImageSrc(url);
                }
            })
            .catch(() => {
                if (active) setImageSrc(null);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
            // Note: We should ideally revoke object URLs, but doing it on cleanup might be premature if reused. 
            // In a simple list it's usually fine or we track them.
        };
    }, [forumId]);

    if (isLoading) {
        return (
            <div className={`rounded bg-muted flex items-center justify-center text-muted-foreground animate-pulse ${className}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }

    if (!imageSrc) {
        return (
            <div className={`rounded bg-muted flex items-center justify-center text-muted-foreground ${className}`}>
                <ImageIcon className="h-5 w-5" />
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            onClick={() => onClick && onClick(imageSrc)}
        />
    );
};

const CommentItem = ({ comment, onLike }: CommentItemProps) => {
    return (
        <div className="space-y-2">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">
                        {comment.user ? `${comment.user.prenom} ${comment.user.nom}` : "Utilisateur inconnu"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                    </div>
                </div>
                <p className="text-sm cursor-text selection:bg-primary/20">{comment.content}</p>
                <div className="flex items-center gap-2 mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 gap-1 ${comment.is_like ? 'text-red-500' : 'text-muted-foreground'}`}
                        onClick={() => onLike(comment.id)}
                    >
                        <Heart className={`h-3 w-3 ${comment.is_like ? 'fill-current' : ''}`} />
                        <span className="text-xs">{comment.nb_like || 0}</span>
                    </Button>
                </div>
            </div>
            {/* Recursively render children */}
            {comment.children && comment.children.length > 0 && (
                <div className="pl-6 border-l-2 border-muted">
                    <div className="space-y-4">
                        {comment.children.map((child: any) => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                onLike={onLike}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Forums() {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'most_liked' | 'most_commented' | undefined>(undefined);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [newForum, setNewForum] = useState({
        theme: "",
        content: "",
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: forumsData, isLoading, error } = useQuery({
        queryKey: ['forums', debouncedSearchQuery, sortBy],
        queryFn: () => forumService.getAll(debouncedSearchQuery || undefined, sortBy),
    });

    const forums = forumsData?.data || [];

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const forum = await forumService.create(data);
            if (selectedFile) {
                await forumService.uploadPhoto(forum.id, selectedFile);
            }
            return forum;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["forums"] });
            setIsCreateOpen(false);
            setNewForum({ theme: "", content: "", });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Forum créé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const [selectedForumId, setSelectedForumId] = useState<number | null>(null);


    const { data: commentsData, isLoading: isCommentsLoading } = useQuery({
        queryKey: ['comments', selectedForumId],
        queryFn: () => selectedForumId ? forumService.getComments(selectedForumId) : Promise.resolve({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
        enabled: !!selectedForumId,
    });

    const comments = (commentsData?.data || []) as any[];



    const toggleLikeMutation = useMutation({
        mutationFn: ({ model, id }: { model: 'Forums' | 'Commentaires', id: number }) => forumService.toggleLike(model, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['forums'] });
            if (selectedForumId) {
                queryClient.invalidateQueries({ queryKey: ['comments', selectedForumId] });
            }
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: "Impossible de liker", variant: "destructive" });
        }
    });

    const handleLike = (model: 'Forums' | 'Commentaires', id: number) => {
        toggleLikeMutation.mutate({ model, id });
    };

    const deleteMutation = useMutation({
        mutationFn: (id: number) => forumService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["forums"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Forum supprimé (soft) avec succès" });
        },
    });



    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newForum);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Forums</h1>
                    <p className="text-muted-foreground">Gérer les discussions et sujets</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau sujet
                </Button>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Liste des sujets</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher par thème..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button
                                variant={sortBy === 'most_liked' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSortBy(sortBy === 'most_liked' ? undefined : 'most_liked')}
                            >
                                Likes <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                                variant={sortBy === 'most_commented' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSortBy(sortBy === 'most_commented' ? undefined : 'most_commented')}
                            >
                                Commentaires <MessageSquare className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">Erreur lors du chargement des forums</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Photo</TableHead>
                                    <TableHead>Thème</TableHead>
                                    <TableHead>Contenu</TableHead>
                                    <TableHead>Auteur</TableHead>
                                    <TableHead>Likes</TableHead>
                                    <TableHead>Commentaires</TableHead>
                                    <TableHead>Date création</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forums.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">Aucun forum trouvé</TableCell>
                                    </TableRow>
                                ) : (
                                    forums.map((forum) => (
                                        <TableRow key={forum.id}>
                                            <TableCell>
                                                {forum.photo ? (
                                                    <SecureForumImage
                                                        forumId={forum.id}
                                                        alt={forum.theme}
                                                        className="h-10 w-10 rounded object-cover cursor-pointer hover:scale-150 transition-transform z-10 relative"
                                                        onClick={(url) => window.open(url, '_blank')}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{forum.theme}</TableCell>
                                            <TableCell className="max-w-xs truncate" title={forum.content}>{forum.content}</TableCell>
                                            <TableCell>
                                                {forum.user ? `${forum.user.prenom} ${forum.user.nom}` : "Utilisateur inconnu"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Heart className="h-4 w-4" />
                                                    <span>{forum.nb_like || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>{forum.nb_comment || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{new Date(forum.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSelectedForumId(forum.id)}
                                                        className="text-blue-600 hover:text-blue-700"
                                                        title="Voir les commentaires"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteId(forum.id)}
                                                        className="text-orange-500 hover:text-orange-600"
                                                        title="Suppression logique"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>

                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Soft Delete Dialog */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Suppression logique</AlertDialogTitle>
                        <AlertDialogDescription>Voulez-vous déplacer ce forum dans la corbeille ? Il pourra être restauré.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-orange-500 hover:bg-orange-600">Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>



            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau Sujet</DialogTitle>
                        <DialogDescription>Créez une nouvelle discussion.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="theme">Thème</Label>
                            <Input id="theme" value={newForum.theme} onChange={(e) => setNewForum({ ...newForum, theme: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Contenu</Label>
                            <Textarea id="content" value={newForum.content} onChange={(e) => setNewForum({ ...newForum, content: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="photo">Photo (Optionnel)</Label>
                            <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Création..." : "Créer"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Comments Dialog */}
            <Dialog open={selectedForumId !== null} onOpenChange={(open) => !open && setSelectedForumId(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Commentaires</DialogTitle>
                        <DialogDescription>
                            Discussions pour ce sujet.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-4">
                        {isCommentsLoading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : comments?.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                Aucun commentaire pour le moment. Soyez le premier à répondre !
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments?.map((comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        onLike={(id) => handleLike('Commentaires', id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>


                </DialogContent>
            </Dialog>
        </div >
    );
}
