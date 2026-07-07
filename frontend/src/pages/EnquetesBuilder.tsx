import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Save,
  Lock,
  GripVertical,
  Star,
  Type as TypeIcon,
  Eye,
} from "lucide-react";
import {
  formsService,
  RATING_SCALE,
  type QuestionType,
  type CampaignInput,
} from "@/lib/services/forms.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Local drafts use a stable client key (React key) separate from any server uuid.
let _keySeq = 0;
const nextKey = () => `k${++_keySeq}`;

interface QDraft {
  key: string;
  libelle: string;
  type: QuestionType;
}
interface SDraft {
  key: string;
  titre: string;
  icone: string;
  questions: QDraft[];
}

const EMOJI_QUICKPICK = ["📚", "⭐", "💬", "🎯", "🧑‍🏫", "📝", "🚀", "❤️", "👍", "🔔"];

const newQuestion = (): QDraft => ({ key: nextKey(), libelle: "", type: "rating" });
const newSection = (): SDraft => ({
  key: nextKey(),
  titre: "",
  icone: "",
  questions: [newQuestion()],
});

// move an item within an array by delta (-1 up / +1 down), returns a new array
function move<T>(arr: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export default function EnquetesBuilder() {
  const { uuid } = useParams<{ uuid: string }>();
  const isEdit = !!uuid;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SDraft[]>([newSection()]);
  const loadedRef = useRef(false);

  // On edit: load the tree + response count (structure freezes once answered).
  const { data: tree, isLoading: loadingTree } = useQuery({
    queryKey: ["form-campaign", uuid],
    queryFn: () => formsService.getById(uuid!),
    enabled: isEdit,
  });
  const { data: results } = useQuery({
    queryKey: ["form-campaign-results", uuid],
    queryFn: () => formsService.getResults(uuid!),
    enabled: isEdit,
  });
  const hasResponses = (results?.total_reponses ?? 0) > 0;
  const structureLocked = isEdit && hasResponses;

  useEffect(() => {
    if (tree && !loadedRef.current) {
      loadedRef.current = true;
      setTitre(tree.titre);
      setDescription(tree.description ?? "");
      setSections(
        (tree.sections ?? []).map((s) => ({
          key: nextKey(),
          titre: s.titre,
          icone: s.icone ?? "",
          questions: (s.questions ?? []).map((q) => ({
            key: nextKey(),
            libelle: q.libelle,
            type: q.type,
          })),
        })),
      );
    }
  }, [tree]);

  // ── section / question mutations on local state ──
  const patchSection = (i: number, patch: Partial<SDraft>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const patchQuestion = (si: number, qi: number, patch: Partial<QDraft>) =>
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === si
          ? { ...s, questions: s.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) }
          : s,
      ),
    );

  const addSection = () => setSections((p) => [...p, newSection()]);
  const removeSection = (i: number) => setSections((p) => p.filter((_, idx) => idx !== i));
  const moveSection = (i: number, d: number) => setSections((p) => move(p, i, d));

  const addQuestion = (si: number) =>
    setSections((p) =>
      p.map((s, idx) => (idx === si ? { ...s, questions: [...s.questions, newQuestion()] } : s)),
    );
  const removeQuestion = (si: number, qi: number) =>
    setSections((p) =>
      p.map((s, idx) =>
        idx === si ? { ...s, questions: s.questions.filter((_, j) => j !== qi) } : s,
      ),
    );
  const moveQuestion = (si: number, qi: number, d: number) =>
    setSections((p) =>
      p.map((s, idx) => (idx === si ? { ...s, questions: move(s.questions, qi, d) } : s)),
    );

  // ── validation + payload ──
  const validationError = useMemo(() => {
    if (!titre.trim()) return "Le titre de la campagne est requis.";
    if (sections.length === 0) return "Ajoutez au moins une section.";
    for (const s of sections) {
      if (!s.titre.trim()) return "Chaque section doit avoir un titre.";
      if (s.questions.length === 0) return `La section « ${s.titre} » doit contenir au moins une question.`;
      for (const q of s.questions) {
        if (!q.libelle.trim()) return "Chaque question doit avoir un libellé.";
      }
    }
    return null;
  }, [titre, sections]);

  const buildPayload = (): CampaignInput => ({
    titre: titre.trim(),
    description: description.trim() || undefined,
    sections: sections.map((s, si) => ({
      titre: s.titre.trim(),
      icone: s.icone.trim() || undefined,
      ordre: si,
      questions: s.questions.map((q, qi) => ({
        libelle: q.libelle.trim(),
        type: q.type,
        ordre: qi,
      })),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (structureLocked) {
        // Structure is frozen — only metadata may change.
        return formsService.updateMeta(uuid!, {
          titre: titre.trim(),
          description: description.trim(),
        });
      }
      const payload = buildPayload();
      return isEdit ? formsService.update(uuid!, payload) : formsService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["form-campaign", uuid] });
      toast({ title: "Enregistrée", description: "La campagne a été enregistrée." });
      navigate("/enquetes");
    },
    onError: (e: any) =>
      toast({
        title: "Erreur",
        description: e.message || "Échec de l'enregistrement",
        variant: "destructive",
      }),
  });

  const canSave = structureLocked ? !!titre.trim() : !validationError;

  if (isEdit && loadingTree) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/enquetes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEdit ? "Modifier la campagne" : "Nouvelle campagne"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Composez les sections et questions ; l'aperçu montre le rendu mobile.
            </p>
          </div>
        </div>
        <Button className="gap-2" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {structureLocked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cette campagne a déjà reçu des réponses : la structure est verrouillée. Seuls le
            titre et la description peuvent être modifiés.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
        {/* ── Builder column ── */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="titre">Titre *</Label>
                <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Enquête de satisfaction — Juillet" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objet de l'enquête (optionnel)" />
              </div>
            </CardContent>
          </Card>

          {sections.map((s, si) => (
            <Card key={s.key} className={cn(structureLocked && "opacity-70")}>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="flex-1 text-sm text-muted-foreground">
                  Section {si + 1}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={structureLocked || si === 0} title="Monter" onClick={() => moveSection(si, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={structureLocked || si === sections.length - 1} title="Descendre" onClick={() => moveSection(si, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={structureLocked || sections.length === 1} title="Supprimer la section" onClick={() => removeSection(si)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="grid w-20 gap-1.5">
                    <Label className="text-xs">Icône</Label>
                    <Input value={s.icone} maxLength={4} disabled={structureLocked} onChange={(e) => patchSection(si, { icone: e.target.value })} className="text-center text-lg" placeholder="🙂" />
                  </div>
                  <div className="grid flex-1 gap-1.5">
                    <Label className="text-xs">Titre de la section *</Label>
                    <Input value={s.titre} disabled={structureLocked} onChange={(e) => patchSection(si, { titre: e.target.value })} placeholder="Contenu pédagogique" />
                  </div>
                </div>
                {!structureLocked && (
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_QUICKPICK.map((em) => (
                      <button key={em} type="button" className="rounded-md border px-2 py-1 text-base hover:bg-accent" onClick={() => patchSection(si, { icone: em })}>
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Questions</Label>
                  {s.questions.map((q, qi) => (
                    <div key={q.key} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-5 w-6" disabled={structureLocked || qi === 0} onClick={() => moveQuestion(si, qi, -1)}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-6" disabled={structureLocked || qi === s.questions.length - 1} onClick={() => moveQuestion(si, qi, 1)}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input value={q.libelle} disabled={structureLocked} onChange={(e) => patchQuestion(si, qi, { libelle: e.target.value })} placeholder="Libellé de la question" className="flex-1" />
                      <Select value={q.type} disabled={structureLocked} onValueChange={(v) => patchQuestion(si, qi, { type: v as QuestionType })}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">
                            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Note</span>
                          </SelectItem>
                          <SelectItem value="text">
                            <span className="flex items-center gap-1.5"><TypeIcon className="h-3.5 w-3.5" /> Texte</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={structureLocked || s.questions.length === 1} onClick={() => removeQuestion(si, qi)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {!structureLocked && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => addQuestion(si)}>
                      <Plus className="h-3.5 w-3.5" /> Ajouter une question
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!structureLocked && (
            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addSection}>
              <Plus className="h-4 w-4" /> Ajouter une section
            </Button>
          )}

          {!structureLocked && validationError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {validationError}
            </p>
          )}
        </div>

        {/* ── Live preview column ── */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="border-primary/20 bg-muted/20">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
              <Eye className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Aperçu (rendu mobile)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{titre || "Titre de la campagne"}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
              {sections.map((s) => (
                <div key={s.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {s.icone && <span className="text-lg">{s.icone}</span>}
                    <h4 className="font-medium text-foreground">{s.titre || "Section sans titre"}</h4>
                  </div>
                  {s.questions.map((q) => (
                    <div key={q.key} className="space-y-2 rounded-lg border bg-background p-3">
                      <p className="text-sm font-medium text-foreground">{q.libelle || "Question…"}</p>
                      {q.type === "rating" ? (
                        <div className="flex justify-between gap-1">
                          {RATING_SCALE.map((r) => (
                            <div key={r.value} className="flex flex-1 flex-col items-center gap-1 rounded-md border py-2">
                              <span className="text-xl">{r.emoji}</span>
                              <span className="text-[10px] text-muted-foreground">{r.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Textarea placeholder="Votre réponse…" disabled className="resize-none bg-muted/40" rows={2} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {sections.length === 0 && (
                <Badge variant="outline">Ajoutez une section pour voir l'aperçu</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
