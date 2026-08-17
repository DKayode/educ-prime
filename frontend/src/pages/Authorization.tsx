import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, Pencil, Trash2, Save, Loader2, UserPlus } from "lucide-react";
import { authorizationService, type PermissionProfile, type SavePermissionProfilePayload } from "@/lib/services/authorization.service";
import { usersService } from "@/lib/services/users.service";
import type { PermissionValue } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const emptyDraft: SavePermissionProfilePayload = {
  code: "",
  label: "",
  description: "",
  is_system: false,
  permissions: [],
};

const permissionGroupLabel = (permission: string) => permission.split(".")[0].replace(/_/g, " ");

const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;

function permissionSummary(profile: PermissionProfile) {
  return profile.permissions.map((item) => item.permission).sort();
}

export default function Authorization() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);
  const [draft, setDraft] = useState<SavePermissionProfilePayload>(emptyDraft);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const permissionsQuery = useQuery({
    queryKey: ["authorization", "permissions"],
    queryFn: authorizationService.listPermissions,
  });
  const profilesQuery = useQuery({
    queryKey: ["authorization", "profiles"],
    queryFn: authorizationService.listProfiles,
  });
  const usersQuery = useQuery({
    queryKey: ["authorization", "users"],
    queryFn: () => usersService.getAll({ page: 1, limit: 100 }),
  });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionValue[]>();
    for (const permission of permissionsQuery.data ?? []) {
      const group = permissionGroupLabel(permission);
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return Array.from(groups.entries()).map(([group, values]) => [group, values.sort()] as const);
  }, [permissionsQuery.data]);

  const resetDialog = () => {
    setEditingProfile(null);
    setDraft(emptyDraft);
    setDialogOpen(false);
  };

  const openCreateDialog = () => {
    setEditingProfile(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };

  const openEditDialog = (profile: PermissionProfile) => {
    setEditingProfile(profile);
    setDraft({
      code: profile.code,
      label: profile.label,
      description: profile.description ?? "",
      is_system: profile.is_system,
      permissions: permissionSummary(profile) as PermissionValue[],
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...draft, code: draft.code.trim(), label: draft.label.trim(), description: draft.description?.trim() };
      return editingProfile
        ? authorizationService.updateProfile(editingProfile.id, payload)
        : authorizationService.createProfile(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorization", "profiles"] });
      toast({ title: "Profil enregistr?", description: "Les permissions du profil sont ? jour." });
      resetDialog();
    },
    onError: (error: unknown) => toast({ title: "Erreur", description: errorMessage(error, "Impossible d'enregistrer le profil"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => authorizationService.deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorization", "profiles"] });
      toast({ title: "Profil supprim?" });
    },
    onError: (error: unknown) => toast({ title: "Suppression impossible", description: errorMessage(error, "Ce profil ne peut pas ?tre supprim?"), variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: () => authorizationService.assignProfile(Number(selectedUserId), Number(selectedProfileId)),
    onSuccess: () => {
      toast({ title: "Profil assign?", description: "Les anciens tokens de cet utilisateur seront invalid?s." });
      setSelectedUserId("");
      setSelectedProfileId("");
    },
    onError: (error: unknown) => toast({ title: "Assignation impossible", description: errorMessage(error, "V?rifie l'utilisateur et le profil"), variant: "destructive" }),
  });

  const togglePermission = (permission: PermissionValue) => {
    setDraft((current) => {
      const selected = new Set(current.permissions);
      if (selected.has(permission)) selected.delete(permission);
      else selected.add(permission);
      return { ...current, permissions: Array.from(selected).sort() };
    });
  };

  const profiles = profilesQuery.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const isLoading = permissionsQuery.isLoading || profilesQuery.isLoading;
  const canSave = draft.code.trim().length > 0 && draft.label.trim().length > 0;
  const canAssign = !!selectedUserId && !!selectedProfileId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Autorisations</h1>
            <p className="text-muted-foreground">Profils m?tier, permissions et assignations utilisateur</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : resetDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}><Plus className="h-4 w-4" />Nouveau profil</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProfile ? "Modifier le profil" : "Nouveau profil"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Code</Label>
                  <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="finance" />
                </div>
                <div className="space-y-1.5">
                  <Label>Libell?</Label>
                  <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Finance" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={draft.is_system} onCheckedChange={(checked) => setDraft({ ...draft, is_system: checked === true })} />
                <Label>Profil syst?me</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {groupedPermissions.map(([group, permissions]) => (
                  <Card key={group} className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm capitalize">{group}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {permissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={draft.permissions.includes(permission)} onCheckedChange={() => togglePermission(permission)} />
                          <span className="font-mono text-xs">{permission}</span>
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigner un profil</CardTitle>
          <CardDescription>L'assignation invalide imm?diatement les anciens access tokens de l'utilisateur.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder="Utilisateur" /></SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>{user.prenom} {user.nom} - {user.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger><SelectValue placeholder="Profil" /></SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => <SelectItem key={profile.id} value={String(profile.id)}>{profile.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => assignMutation.mutate()} disabled={!canAssign || assignMutation.isPending} className="gap-2">
            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Assigner
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profils de permissions</CardTitle>
          <CardDescription>{profiles.length} profil(s) configur?(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profil</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="font-medium">{profile.label}</div>
                      <div className="text-xs text-muted-foreground">{profile.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {permissionSummary(profile).slice(0, 8).map((permission) => <Badge key={permission} variant="outline" className="font-mono text-[11px]">{permission}</Badge>)}
                        {profile.permissions.length > 8 && <Badge variant="secondary">+{profile.permissions.length - 8}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{profile.is_system ? <Badge>Syst?me</Badge> : <Badge variant="outline">M?tier</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(profile)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" disabled={profile.is_system || deleteMutation.isPending} onClick={() => deleteMutation.mutate(profile.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
