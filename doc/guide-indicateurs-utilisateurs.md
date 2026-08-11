# Page « Utilisateurs → Indicateurs » — guide de lecture

Cette page est celle du **rapport bailleur**. Elle répond à une seule question :
**que s'est-il passé entre deux dates ?** Chaque chiffre est recalculé selon la
période choisie et selon le pays sélectionné en haut à droite.

Ce guide donne, pour chaque carte de l'écran, ce qu'elle mesure exactement, et
les quelques endroits où l'affichage peut induire en erreur.

---

## 1. La période, d'abord

Rien sur cette page n'est un cumul historique. Tout dépend des deux dates.

- Raccourcis disponibles : **7 j**, **30 j**, **6 mois**, **12 mois**, ou des dates personnalisées.
- La **date de fin est incluse en entier**, jusqu'à 23 h 59.
- Les journées sont celles du **pays**, pas du serveur : une inscription à 00 h 30 à Cotonou compte pour le bon jour.

> Deux périodes différentes ne sont jamais comparables directement : « 7 j »
> compte une semaine d'inscriptions, « 12 mois » en compte 52 fois plus. Pour
> comparer, il faut comparer des durées égales.

---

## 2. Le bandeau du haut

Quatre chiffres de synthèse, repris en détail plus bas.

| Tuile | Ce qu'elle donne |
|---|---|
| **Utilisateurs inscrits** | Comptes créés pendant la période, tous rôles |
| **Apprenants inscrits** | Parmi eux, ceux dont le rôle est « étudiant » |
| **Utilisateurs connectés** | Comptes s'étant connectés au moins une fois pendant la période |
| **Apprenants actifs** | Apprenants ayant consulté une épreuve ou un concours sur les 30 derniers jours |

Attention : les deux premières tuiles parlent d'**inscriptions**, les deux
suivantes d'**activité**. Ce ne sont pas les mêmes personnes, et il ne faut pas
les soustraire l'une de l'autre.

---

## 3. Section « Utilisateurs »

Sous-titre à l'écran : « Population totale inscrite sur la période ». Sept
cartes, toutes portant sur les comptes **créés pendant la période**, tous rôles
confondus (administrateurs compris).

| Carte | Définition exacte |
|---|---|
| **Total inscrits** | Nombre de comptes créés sur la période |
| **Âgés de 35 ans ou moins** | Tranche d'âge déclarée « < 18 », « 18 - 25 » ou « 26 - 35 » |
| **Femmes** | Sexe déclaré « F » |
| **Femmes de 35 ans ou moins** | Les deux critères ci-dessus à la fois |
| **En zone rurale** | Zone de résidence déclarée « rural » |
| **En situation de handicap** | Case handicap cochée sur le profil |
| **Connectés sur la période** | Comptes distincts ayant ouvert au moins une session |

Chaque carte affiche aussi un pourcentage, appelé **part du total** : la carte
divisée par « Total inscrits ».

---

## 4. Section « Apprenants »

Sous-titre : « Inscription — utilisateurs au rôle étudiant ». Les mêmes
découpages, restreints aux comptes de rôle **étudiant**, et rapportés au total
des apprenants inscrits.

Cartes : **Apprenants inscrits**, **Âgés de 35 ans ou moins**, **Femmes de
35 ans ou moins**, **Femmes**, **En zone rurale**, **En situation de handicap**.

C'est la section à citer pour parler du public cible : elle exclut les
administrateurs, les professeurs et les autres rôles.

---

## 5. Section « Engagement »

Sous-titre : « Connexion & consultation de ressources par les apprenants ».

| Carte | Définition |
|---|---|
| **Apprenants connectés sur la période** | Apprenants distincts ayant ouvert au moins une session pendant la période |
| **Dernière semaine** | Apprenants distincts ayant consulté une épreuve ou un concours sur les 7 derniers jours |
| **Dernières 2 semaines** | Idem sur 14 jours |
| **Dernier mois** | Idem sur 30 jours |

**Se connecter et consulter ne sont pas la même chose.** « Connectés » compte
l'ouverture de session ; « Dernière semaine » compte l'ouverture effective d'un
contenu. Le second est la mesure d'usage réel.

> Les trois fenêtres 7 / 14 / 30 jours **ne suivent pas la période choisie**.
> Elles regardent toujours en arrière depuis la **date de fin**. Si la période
> couvre 12 mois et se termine aujourd'hui, « Dernière semaine » signifie bien
> les sept derniers jours, pas l'année.

---

## 6. Comment lire les pourcentages

Les pourcentages des sections Utilisateurs et Apprenants se lisent sans piège :
ils rapportent une sous-population à son total, sur la même période. « Femmes
40 % » signifie que 40 % des personnes inscrites sur la période sont des femmes.

**Une exception importante : le « taux de connexion ».** Il divise les comptes
connectés pendant la période par les comptes **inscrits** pendant la période.
Or les personnes connectées ne sont pas forcément inscrites sur cette période :
un compte créé l'an dernier qui se connecte aujourd'hui est compté au numérateur
mais pas au dénominateur.

Conséquence mesurée sur les données réelles du Bénin :

| Période | Inscrits | Connectés | Taux affiché |
|---|---|---|---|
| 7 jours | 98 | 169 | **172 %** |
| 30 jours | 4 499 | 820 | 18 % |
| 6 mois | 23 907 | 12 012 | 50 % |

Sur une période courte, le taux peut donc **dépasser 100 %**. Ce n'est pas une
anomalie de données : le numérateur et le dénominateur ne portent pas sur la
même population. En présentation, citer les deux nombres bruts — « 169 comptes
connectés, 98 nouvelles inscriptions » — plutôt que ce pourcentage.

---

## 7. Ce que les chiffres ne disent pas

1. **Les âges non renseignés ne sont comptés dans aucune tranche.** Un compte sans tranche d'âge n'apparaît ni dans « 35 ans ou moins », ni ailleurs : la somme des tranches est donc inférieure au total.
2. **Il en va de même pour le sexe, la zone et le handicap.** Ces cartes comptent des déclarations, pas des faits : un champ vide est un « non » silencieux, et fait baisser mécaniquement le pourcentage.
3. **La section Utilisateurs inclut les administrateurs.** Pour le public réel, utiliser la section Apprenants.
4. **« Connectés » compte des ouvertures de session, pas du temps passé** ni du contenu consulté.
5. **Tous les chiffres dépendent du pays sélectionné.** Un indicateur cité sans le pays n'a pas de sens.
6. **Une inscription n'est jamais retirée rétroactivement.** Un compte supprimé plus tard reste absent des périodes futures mais ne modifie pas le passé affiché.

---

## 8. Récapitulatif

| Indicateur | Population | Fenêtre |
|---|---|---|
| Utilisateurs inscrits | Tous rôles | Période |
| Apprenants inscrits | Rôle étudiant | Période |
| Répartitions âge / sexe / zone / handicap | Selon la section | Période |
| Connectés (utilisateurs, apprenants) | Comptes ayant ouvert une session | Période |
| Apprenants actifs 7 / 14 / 30 j | Apprenants ayant consulté une ressource | Depuis la date de fin |
