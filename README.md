# educ-prime

Application éducative

# Branches 

```sh
main (ou master) # branche de préproduction
│
├── develop  # branche de préproduction
│   ├── feature # ajouter une nouvelle fonctionnalitée
│   └── fix # corriger un bug
```
- créer des nouvelles branches à partir des branches `feature` et `fix` pour de nouveau développement.
- merger ensuite dans les branches `feature` et `fix` quand les développements sont prets.
- merger ensuite dans la branche `develop` et enfin dans la branche `main` pour finir.

# Commits messages

- `feat`: nouvelle fonctionnalitée
- `fix`: correction du bug
- `test`: ajout/modification de tests
- `chore`: 
    - mise à jour de dépendances
    - documentation
    - mise en forme du code
    - ...
