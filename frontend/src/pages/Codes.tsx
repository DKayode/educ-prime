import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Download, History, Info, Loader2, Plus, Search, Ticket, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Campagne, Code, codesService, CodePayload, libelleRemise, libelleUsage, TypeCode, TypeRemise,
} from "@/lib/services/codes.service";

const FORMULAIRE_VIDE: CodePayload = {
  code: "",
  type: "REDUCTION",
  libelle: "",
  remise_type: "POURCENTAGE",
  remise_valeur: 10,
  usage_max_par_utilisateur: 1,
  est_actif: true,
};

const badgeType = (t: TypeCode) =>
  t === "REDUCTION" ? "default" : t === "AMBASSADEUR" ? "secondary" : "outline";

export default function Codes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [recherche, setRecherche] = useState("");
  const rechercheDifferee = useDebounce(recherche, 500);
  const [type, setType] = useState<TypeCode | "TOUS">("TOUS");
  const [page, setPage] = useState(1);

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [edite, setEdite] = useState<Code | null>(null);
  const [formulaire, setFormulaire] = useState<CodePayload>(FORMULAIRE_VIDE);
  const [illimite, setIllimite] = useState(true);
  const [maxTotal, setMaxTotal] = useState(100);
  const [utilisationsDe, setUtilisationsDe] = useState<Code | null>(null);

  const [campagne, setCampagne] = useState({
    nom: "", nombre_codes: 100, prefixe: "", remise_type: "POURCENTAGE" as TypeRemise, remise_valeur: 20,
  });
  const [dialogCampagne, setDialogCampagne] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["codes", rechercheDifferee, type, page],
    queryFn: () =>
      codesService.getAll({
        page, limit: 20,
        search: rechercheDifferee || undefined,
        type: type === "TOUS" ? undefined : type,
      }),
  });

  const { data: campagnes } = useQuery({
    queryKey: ["codes", "campagnes"],
    queryFn: () => codesService.getCampagnes(),
  });

  const { data: utilisations, isLoading: utilisationsChargent } = useQuery({
    queryKey: ["codes", "utilisations", utilisationsDe?.uuid],
    queryFn: () => codesService.getUtilisations(utilisationsDe!.uuid),
    enabled: !!utilisationsDe,
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["codes"] });

  const enregistrer = useMutation({
    mutationFn: () => {
      const payload: CodePayload = {
        ...formulaire,
        usage_max_total: illimite ? undefined : maxTotal,
      };
      return edite ? codesService.update(edite.uuid, payload) : codesService.create(payload);
    },
    onSuccess: () => {
      rafraichir();
      setDialogOuvert(false);
      toast({ title: edite ? "Code modifié" : "Code créé" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e?.message || "Échec", variant: "destructive" }),
  });

  const bascule = useMutation({
    mutationFn: ({ code, actif }: { code: Code; actif: boolean }) =>
      actif ? codesService.update(code.uuid, { est_actif: true }) : codesService.desactiver(code.uuid),
    onSuccess: () => rafraichir(),
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const genererCampagne = useMutation({
    mutationFn: () => codesService.genererCampagne(campagne),
    onSuccess: (r) => {
      rafraichir();
      setDialogCampagne(false);
      toast({
        title: "Campagne générée",
        description:
          r.codes_generes === r.demandes
            ? `${r.codes_generes} codes créés. Exportez-les pour les distribuer.`
            : `${r.codes_generes} codes sur ${r.demandes} — collisions répétées, relancez pour compléter.`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e?.message || "Échec", variant: "destructive" }),
  });

  const ouvrirCreation = () => {
    setEdite(null);
    setFormulaire(FORMULAIRE_VIDE);
    setIllimite(true);
    setMaxTotal(100);
    setDialogOuvert(true);
  };

  const ouvrirEdition = (c: Code) => {
    setEdite(c);
    setFormulaire({
      code: c.code, type: c.type, libelle: c.libelle ?? "",
      remise_type: c.remise_type ?? undefined, remise_valeur: c.remise_valeur ?? undefined,
      usage_max_par_utilisateur: c.usage_max_par_utilisateur, est_actif: c.est_actif,
    });
    setIllimite(c.usage_max_total == null);
    setMaxTotal(c.usage_max_total ?? 100);
    setDialogOuvert(true);
  };

  const codes = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Codes</h1>
          <p className="text-muted-foreground">Réductions, ambassadeurs et campagnes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogCampagne(true)}>
            <Users className="mr-2 h-4 w-4" />
            Générer une campagne
          </Button>
          <Button onClick={ouvrirCreation}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau code
          </Button>
        </div>
      </div>

      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Un code, deux effets possibles.</strong> Une{" "}
              <strong>réduction</strong> baisse le prix ; un code d’<strong>ambassadeur</strong> verse
              en plus une commission à son propriétaire. L’acheteur ne saisit qu’un champ : le
              registre décide.
            </p>
            <p>
              Les codes de <strong>parrainage</strong> sont générés à l’inscription et n’apparaissent
              pas ici par défaut — ils sont des dizaines de milliers.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Codes</TabsTrigger>
          <TabsTrigger value="campagnes">Campagnes ({campagnes?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un code ou un libellé..."
                value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={type} onValueChange={(v) => { setType(v as TypeCode | "TOUS"); setPage(1); }}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Réductions et ambassadeurs</SelectItem>
                <SelectItem value="REDUCTION">Réduction</SelectItem>
                <SelectItem value="AMBASSADEUR">Ambassadeur</SelectItem>
                <SelectItem value="PARRAINAGE">Parrainage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : !codes.length ? (
                <div className="rounded-lg border bg-muted/10 py-8 text-center text-muted-foreground">
                  Aucun code pour ces critères.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Remise</TableHead>
                      <TableHead className="text-right">Utilisations</TableHead>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((c) => (
                      <TableRow key={c.uuid}>
                        <TableCell>
                          <div className="font-mono font-medium">{c.code}</div>
                          {c.libelle && <div className="text-xs text-muted-foreground">{c.libelle}</div>}
                          {c.proprietaire && (
                            <div className="text-xs text-muted-foreground">
                              → {[c.proprietaire.prenom, c.proprietaire.nom].filter(Boolean).join(" ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><Badge variant={badgeType(c.type)}>{c.type}</Badge></TableCell>
                        <TableCell>{libelleRemise(c)}</TableCell>
                        <TableCell className="text-right font-medium">{libelleUsage(c)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.campagne?.nom ?? "—"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={c.est_actif}
                            disabled={bascule.isPending}
                            onCheckedChange={(actif) => bascule.mutate({ code: c, actif })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setUtilisationsDe(c)}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => ouvrirEdition(c)}>Modifier</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages} — {data?.total} code(s)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campagnes" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-5 w-5" />
                Campagnes
              </CardTitle>
              <CardDescription>
                Chaque campagne génère n codes à usage unique — un par personne. Exportez-les pour
                les distribuer : ils ne sont visibles nulle part ailleurs en bloc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!campagnes?.length ? (
                <div className="rounded-lg border bg-muted/10 py-8 text-center text-muted-foreground">
                  Aucune campagne.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Préfixe</TableHead>
                      <TableHead>Remise</TableHead>
                      <TableHead className="text-right">Codes</TableHead>
                      <TableHead className="text-right">Utilisés</TableHead>
                      <TableHead className="text-right">Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campagnes.map((c: Campagne) => (
                      <TableRow key={c.uuid}>
                        <TableCell className="font-medium">{c.nom}</TableCell>
                        <TableCell className="font-mono text-xs">{c.prefixe ?? "—"}</TableCell>
                        <TableCell>{libelleRemise(c)}</TableCell>
                        <TableCell className="text-right">{c.codes_generes}</TableCell>
                        <TableCell className="text-right">{c.codes_utilises}</TableCell>
                        <TableCell className="text-right">
                          <a href={codesService.urlExport(c.uuid)} download>
                            <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Créer / modifier un code */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{edite ? "Modifier le code" : "Nouveau code"}</DialogTitle>
            <DialogDescription>
              Un code, n utilisations. Pour n codes à usage unique, passez par une campagne.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="RENTREE2026"
                  value={formulaire.code}
                  onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
                />
                <p className="text-xs text-muted-foreground">La casse est ignorée à la saisie.</p>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formulaire.type}
                  onValueChange={(v) => setFormulaire({ ...formulaire, type: v as TypeCode })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REDUCTION">Réduction</SelectItem>
                    <SelectItem value="AMBASSADEUR">Ambassadeur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé interne</Label>
              <Input
                id="libelle"
                placeholder="Campagne rentrée 2026"
                value={formulaire.libelle ?? ""}
                onChange={(e) => setFormulaire({ ...formulaire, libelle: e.target.value })}
              />
            </div>

            {formulaire.type === "AMBASSADEUR" && (
              <div className="space-y-2">
                <Label htmlFor="prop">Identifiant du propriétaire</Label>
                <Input
                  id="prop"
                  type="number"
                  value={formulaire.proprietaire_id ?? ""}
                  onChange={(e) => setFormulaire({ ...formulaire, proprietaire_id: Number(e.target.value) || undefined })}
                />
                <p className="text-xs text-muted-foreground">
                  Il percevra la commission de parrainage sur chaque abonnement acheté avec ce code.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de remise</Label>
                <Select
                  value={formulaire.remise_type ?? "AUCUNE"}
                  onValueChange={(v) =>
                    setFormulaire({
                      ...formulaire,
                      remise_type: v === "AUCUNE" ? undefined : (v as TypeRemise),
                      remise_valeur: v === "AUCUNE" ? undefined : (formulaire.remise_valeur ?? 10),
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUCUNE">Aucune remise</SelectItem>
                    <SelectItem value="POURCENTAGE">Pourcentage</SelectItem>
                    <SelectItem value="MONTANT_FIXE">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valeur">Valeur</Label>
                <Input
                  id="valeur"
                  type="number"
                  min={0}
                  disabled={!formulaire.remise_type}
                  value={formulaire.remise_valeur ?? ""}
                  onChange={(e) => setFormulaire({ ...formulaire, remise_valeur: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Utilisations illimitées</Label>
                <p className="text-xs text-muted-foreground">
                  Sinon, fixez le nombre de personnes pouvant en profiter.
                </p>
              </div>
              <Switch checked={illimite} onCheckedChange={setIllimite} />
            </div>

            {!illimite && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxtotal">Nombre total</Label>
                  <Input id="maxtotal" type="number" min={1} value={maxTotal} onChange={(e) => setMaxTotal(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxuser">Par personne</Label>
                  <Input
                    id="maxuser"
                    type="number"
                    min={1}
                    value={formulaire.usage_max_par_utilisateur ?? 1}
                    onChange={(e) => setFormulaire({ ...formulaire, usage_max_par_utilisateur: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button
              onClick={() => enregistrer.mutate()}
              disabled={enregistrer.isPending || formulaire.code.trim().length < 3}
            >
              {enregistrer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Générer une campagne */}
      <Dialog open={dialogCampagne} onOpenChange={setDialogCampagne}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer une campagne</DialogTitle>
            <DialogDescription>
              n codes uniques, une utilisation chacun. Pensez à les exporter : ils ne sont pas
              consultables en bloc ailleurs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cnom">Nom</Label>
              <Input id="cnom" placeholder="Rentrée 2026 — influenceurs" value={campagne.nom}
                onChange={(e) => setCampagne({ ...campagne, nom: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnb">Nombre de codes</Label>
                <Input id="cnb" type="number" min={1} max={5000} value={campagne.nombre_codes}
                  onChange={(e) => setCampagne({ ...campagne, nombre_codes: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpre">Préfixe</Label>
                <Input id="cpre" placeholder="RENTREE" value={campagne.prefixe}
                  onChange={(e) => setCampagne({ ...campagne, prefixe: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de remise</Label>
                <Select value={campagne.remise_type} onValueChange={(v) => setCampagne({ ...campagne, remise_type: v as TypeRemise })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POURCENTAGE">Pourcentage</SelectItem>
                    <SelectItem value="MONTANT_FIXE">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cval">Valeur</Label>
                <Input id="cval" type="number" min={0} value={campagne.remise_valeur}
                  onChange={(e) => setCampagne({ ...campagne, remise_valeur: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCampagne(false)}>Annuler</Button>
            <Button onClick={() => genererCampagne.mutate()} disabled={genererCampagne.isPending || campagne.nom.trim().length < 2}>
              {genererCampagne.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Utilisations d'un code */}
      <Dialog open={!!utilisationsDe} onOpenChange={(o) => !o && setUtilisationsDe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utilisations de {utilisationsDe?.code}</DialogTitle>
            <DialogDescription>Qui l’a utilisé, et pour quelle remise.</DialogDescription>
          </DialogHeader>
          {utilisationsChargent ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !utilisations?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Ce code n’a pas encore servi.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {utilisations.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <div className="font-medium">{[u.prenom, u.nom].filter(Boolean).join(" ") || u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(u.date_creation).toLocaleString("fr-FR")}
                      {u.statut && ` — abonnement ${u.statut}`}
                    </div>
                  </div>
                  <span className="font-medium">−{Number(u.montant_remise).toLocaleString("fr-FR")} XOF</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
