# Dépôt d'une épreuve — les listes déroulantes changent

Note pour l'équipe mobile, à la suite du signalement d'un utilisateur qui publie
des épreuves : les matières déjà enregistrées n'apparaissaient pas dans les
suggestions, et il devait ressaisir chaque nom.

Les correctifs sont **en production depuis le 28 août 2026**. Rien n'est cassé :
tous les paramètres existants gardent leur sens, et une application non mise à
jour continue de fonctionner exactement comme avant — avec le même défaut.

Trois changements vous concernent.

---

## 1. Filtrer les matières par niveau d'étude

C'est le manque principal, et la cause du symptôme signalé.

Le parcours de dépôt est **établissement → filière → niveau → matière**. Or
`/matieres` n'offrait aucun filtre par niveau : l'application ne pouvait demander
que les matières de **toute la filière**.

Sur un cas réel de production :

```
Médecine Générale : 68 matières réparties sur 5 niveaux
                    10 renvoyées par défaut, tous niveaux mélangés
```

La matière cherchée avait toutes les chances de ne pas figurer dans ces dix.

### Ce qu'il faut appeler désormais

```
GET /matieres?country=benin&niveau_etude_id=2938&limit=100
```

```json
{
  "total": 18,
  "page": 1,
  "limit": 3,
  "data": [
    {
      "id": 355,
      "nom": "ANATOMIE",
      "niveau_etude": { "id": 2938, "nom": "Licence 1",
        "filiere": { "id": 86, "nom": "Médecine Générale" } }
    }
  ]
}
```

Le même niveau découpe proprement la filière :

| Niveau | Matières |
|---|---|
| Licence 1 | 18 |
| Licence 2 | 10 |
| Licence 3 | 17 |
| Master 1 | 14 |
| Master 2 | 9 |

> **Pensez à `limit`.** La valeur par défaut est **10**. Pour une liste de
> sélection, passez `limit=100` : sans cela, un niveau de 18 matières n'en
> montrera que dix, et l'utilisateur croira que les siennes ont disparu.

---

## 2. Filtrer par identifiant plutôt que par nom

`filiere_id` est désormais accepté sur `/matieres` et sur `/niveau-etude`.

```
GET /matieres?country=benin&filiere_id=86&limit=100
GET /niveau-etude?country=benin&filiere_id=86
```

**Préférez-le au nom.** Le filtre `filiere=<nom>` fonctionne toujours, et il est
maintenant insensible à la casse et aux accents — mais il reposait jusqu'ici sur
une correspondance exacte, et c'était un piège silencieux.

### Le piège, pour que vous puissiez le reconnaître ailleurs

Mesuré en production avant correctif :

```
filiere=…Maîtrise de l'Eau   (apostrophe droite)         → 0 résultat
filiere=…Maîtrise de l’Eau   (apostrophe typographique)  → 2 résultats
filiere=génie rural…         (minuscules)                → 0 résultat
```

**17 filières** portent une apostrophe typographique en base. Les claviers
saisissent une apostrophe droite. L'API répondait alors une liste vide, sans
message d'erreur — indiscernable d'un référentiel réellement vide.

C'est corrigé pour ces deux points d'entrée. Ailleurs dans l'API, la prudence
reste de mise : **un identifiant ne se normalise pas, un nom si.**

---

## 3. Le paramètre `all` de `/niveau-etude` ne sert à rien

Sa documentation annonçait qu'il fallait le passer pour voir les niveaux sans
épreuve. C'était faux — le filtre correspondant n'a jamais existé.

```
GET /niveau-etude?country=benin            → 143 niveaux
GET /niveau-etude?country=benin&all=true   → 143 niveaux
```

Le champ reste **accepté** pour ne pas rejeter les appels qui l'envoient déjà,
mais il n'a aucun effet. Sa description a été corrigée dans Swagger.

---

## Ce qui n'est pas réglé, et qui vous concerne

Le même utilisateur signalait qu'un **seul niveau d'étude** lui était proposé.
Sur ce point, l'application dit vrai : sa filière n'a réellement qu'un niveau en
base. Aucun filtre n'y changera rien.

Or **le serveur accepte déjà une saisie libre** au dépôt d'une épreuve :

| Champ | Usage |
|---|---|
| `proposed_etablissement` | établissement absent du référentiel |
| `proposed_filiere` | filière absente |
| `proposed_niveau` | niveau absent |
| `proposed_matiere` | matière absente |

Chacun s'utilise **à la place** de l'identifiant correspondant. La soumission
part alors avec un nom en texte libre, et l'administrateur le rattache à une
entité réelle au moment de la validation — l'écran d'approbation compte d'ailleurs
ces demandes « à compléter ».

**Ces champs ne sont visiblement pas exposés dans l'application.** Tant qu'ils ne
le sont pas, un enseignant dont le niveau n'existe pas encore ne peut rien
publier : il doit attendre qu'un administrateur crée l'entrée pour lui. Les
exposer est, à notre avis, le correctif le plus utile pour ces utilisateurs.

---

## Récapitulatif des appels

| Étape du dépôt | Requête |
|---|---|
| Filières d'un établissement | `GET /filieres?country=benin` |
| Niveaux d'une filière | `GET /niveau-etude?country=benin&filiere_id=86` |
| **Matières d'un niveau** | `GET /matieres?country=benin&niveau_etude_id=2938&limit=100` |
| Recherche libre | `GET /matieres?country=benin&search=anato` |

`search` reste insensible à la casse et aux accents, et porte sur le nom de la
matière, du niveau et de la filière — c'est le bon outil pour une saisie
progressive au clavier.

Tous ces appels exigent le jeton JWT et le paramètre `country`.
