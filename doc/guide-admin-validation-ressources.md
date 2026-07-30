# Guide administrateur — Validation des demandes d'ajout de ressources

Ce guide s'adresse aux **administrateurs** du tableau de bord Edukia chargés de
**valider (approuver ou refuser)** les demandes d'ajout de ressources soumises
par les utilisateurs : les **épreuves** et les **concours**.

---

## 1. Le principe

Un utilisateur peut proposer une nouvelle ressource depuis l'application. Sa
demande arrive dans une **file d'attente** et n'est **pas encore publiée** :
elle attend qu'un administrateur la valide.

Pour chaque niveau d'une demande, l'utilisateur fournit **soit un élément
existant** (déjà dans le catalogue), **soit un nom proposé** (un élément qui
n'existe pas encore et qu'il faudra créer) :

- **Épreuve** : Établissement › Filière › Niveau d'étude › Matière, plus l'année
  et la session (section).
- **Concours** : Structure › Titre / Poste, plus l'année et le lieu.

Votre rôle : **résoudre** les éléments proposés (les rattacher à un élément réel
ou les créer), **corriger** au besoin les champs saisis, puis **approuver** la
demande (ce qui crée la vraie ressource) **ou la refuser** (en indiquant un
motif à l'auteur).

---

## 2. Accès

Dans le menu latéral, ouvrez la rubrique **Approbations** :

- **Épreuves en attente** — les demandes d'ajout d'épreuves.
- **Concours en attente** — les demandes d'ajout de concours.
- **Statistiques** — un aperçu chiffré des soumissions.

Chaque page affiche un tableau des demandes **en attente d'approbation**.

---

## 3. Lire une demande

Chaque ligne du tableau représente une demande. Les colonnes reprennent les
champs saisis par l'utilisateur (Structure, Titre, Année, Lieu… pour un
concours ; la chaîne Étab. › Filière › Niveau › Matière pour une épreuve).

Les champs sont affichés sous forme de **badges** :

| Badge | Signification |
|---|---|
| Badge **gris** avec le nom | L'élément **existe** déjà dans le catalogue — rien à faire. |
| Badge **rouge** « **à créer : …** » | L'utilisateur a **proposé un nouveau nom** ; l'élément n'existe pas encore. |
| Badge **rouge** « **… manquant(e)** » | Le niveau n'est ni renseigné ni proposé. |

> **À retenir :** tant qu'un champ est affiché **en rouge**, la ressource
> correspondante n'existe pas encore. Il faut la **résoudre** avant de pouvoir
> approuver la demande.

Un badge **« Fichier manquant »** signale qu'aucun fichier (PDF) n'a encore été
téléversé pour cette demande.

---

## 4. Les actions disponibles

Sur chaque ligne, à droite (colonne **Actions**), quatre boutons :

| Icône | Bouton | Rôle |
|---|---|---|
| 👁 (bleu) | **Voir le fichier soumis** | Ouvre le fichier (PDF) téléversé dans un nouvel onglet. |
| 🔧 (orange) | **Modifier / résoudre** | Ouvre la fenêtre d'édition de la demande. |
| ✅ (vert) | **Approuver** | Valide la demande et crée la vraie ressource. |
| ❌ (rouge) | **Refuser** | Rejette la demande (avec un motif). |

---

## 5. Modifier / résoudre une demande (bouton 🔧)

Cliquez sur le bouton **🔧 (Modifier / résoudre)** de la ligne : une fenêtre
s'ouvre. Pour **chaque niveau affiché en rouge** (proposé ou manquant), vous
avez deux possibilités :

1. **Rattacher un élément existant** — ouvrez la liste déroulante « Choisir… »
   et sélectionnez l'élément déjà présent dans le catalogue.
2. **Créer l'élément proposé** — le nom proposé par l'utilisateur est
   pré-rempli ; ajustez-le si besoin puis cliquez sur **Créer**. Si un élément
   du même nom existe déjà, il est **réutilisé** automatiquement (pas de
   doublon).

Vous pouvez aussi **corriger les autres champs** dans cette même fenêtre :

- **Épreuve** : l'année et la session (section). L'intitulé (titre) est
  **recalculé automatiquement** à partir de la matière, de la session et de
  l'année.
- **Concours** : l'année et le lieu (bouton **Enregistrer année/lieu**).

> Chaque choix (rattachement ou création) est **enregistré immédiatement** sur
> la demande : le badge rouge correspondant passe alors au **vert**.

> **Note :** seules les demandes **en attente** peuvent être modifiées. Une
> demande déjà approuvée ou refusée est **figée**.

---

## 6. Approuver une demande (✅)

Le bouton **✅ (Approuver)** ne devient actif que lorsque **deux conditions**
sont réunies :

1. **Tous les niveaux sont résolus** (plus aucun badge rouge) —
   pour une épreuve, la matière doit être résolue ; pour un concours, la
   structure **et** le titre.
2. **Un fichier est présent** (le PDF de la ressource).

Si le bouton reste grisé, passez la souris dessus : une info-bulle vous indique
ce qui bloque (« Résolvez la structure et le titre d'abord », « En attente du
fichier »…).

À l'approbation :

- La **vraie ressource** (épreuve ou concours) est créée et devient visible par
  les utilisateurs.
- **L'auteur est notifié par email** que sa contribution a été approuvée.
- La demande disparaît de la file d'attente.

---

## 7. Refuser une demande avec un motif (❌)

Cliquez sur le bouton **❌ (Refuser)** : une fenêtre **« Refuser la soumission »**
s'ouvre.

- Saisissez un **motif du refus** (facultatif mais **recommandé**) dans la zone
  de texte — par exemple : « Fichier illisible », « Doublon avec une ressource
  existante », « Informations incorrectes »…
- Cliquez sur **Refuser** pour confirmer (ou **Annuler** pour revenir).

À la confirmation :

- La demande passe au statut **« Refusée »**.
- Le **motif est enregistré** et **envoyé à l'auteur par email**, afin qu'il
  comprenne **pourquoi** sa demande a été rejetée et puisse, le cas échéant,
  la corriger et la soumettre à nouveau.

> **Bonne pratique :** indiquez toujours un motif clair et courtois. C'est la
> seule explication que l'utilisateur recevra.

---

## 8. Voir le fichier soumis (👁)

Le bouton **👁 (Voir le fichier soumis)** ouvre le PDF téléversé par
l'utilisateur dans un nouvel onglet. **Vérifiez systématiquement le fichier**
(lisibilité, contenu, conformité) **avant d'approuver** une demande.

> Si votre navigateur bloque l'ouverture de l'onglet, autorisez les fenêtres
> pop-up pour le tableau de bord.

---

## 9. Bonnes pratiques

- **Vérifiez le fichier** avant toute approbation.
- **Réutilisez** les éléments existants plutôt que d'en créer de nouveaux :
  la fenêtre de résolution réutilise automatiquement un élément de même nom, ce
  qui évite les doublons dans le catalogue.
- **Corrigez** les fautes de frappe et incohérences via le bouton 🔧 avant
  d'approuver.
- **Motivez** chaque refus : l'auteur reçoit le motif par email.

---

## 10. Questions fréquentes

**Le bouton « Approuver » est grisé, pourquoi ?**
Il manque un élément à résoudre (badge rouge) ou le fichier n'a pas été
téléversé. L'info-bulle du bouton précise la cause.

**Puis-je modifier une demande déjà approuvée ou refusée ?**
Non. Seules les demandes **en attente** sont modifiables.

**Que voit l'utilisateur après ma décision ?**
Un email l'informe de l'approbation ou du refus. En cas de refus, l'email
contient le **motif** que vous avez saisi.

**Créer un élément va-t-il générer un doublon ?**
Non : si un élément du même nom existe déjà, il est réutilisé automatiquement.
