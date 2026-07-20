Avant toute chose, le dépôt doit être initialisé pour permettre d'utiliser ClaudeCode.

# 1/ Initisation
## 1.1/ Le settings.json
Donc un fichier .claude/settings.json doit être créé avec, a minima, ce contenu :
```
{
  "telemetry": "off",
  "permissions": {
    "deny": [
      "Bash(git *)",
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(nc *)",
      "Bash(ssh *)",
      "Read(*.pem)",
      "Grep(*.pem)",
      "Read(*.key)",
      "Grep(*.key)"
    ]
  }
}
```

## 1.2/ Le répertoire de mémoire
Sur un poste de développement physique, exécuter la commande suivante (après avoir remplacé XXX par le nom du projet)
```
mkdir -p ~/.claude/projects/-workspaces-XXX && rm -rf ~/.claude/projects/-workspaces-XXX/memory && ln -s ./.claude/memory ~/.claude/projects/-workspaces-XXX/memory"
```

Sur un poste de développement GitHub-Codespace, créer le fichier **.devcontainer/devcontainer.json** avec le contenu suivant (après avoir remplacé XXX par le nom du projet)
```
{
  "name": "XXX",
  "postCreateCommand": "mkdir -p ~/.claude/projects/-workspaces-XXX && rm -rf ~/.claude/projects/-workspaces-XXX/memory && ln -s ./.claude/memory ~/.claude/projects/-workspaces-XXX/memory"
}
```

## 1.3/ Créer l'arborescence & déposer le besoin
- Créer le répertoire *./docs/00_init&prompt* et y déposer les fichiers *00_init.md* et *00_promptInitial.md*
- Déposer la description (la plus complète possible) dans le répertoire *./docs/01_besoin*
- Créer le répertoire *./docs/02_documentation/_modèles* et y déposer tous les modèles disponibles
- Créer le répertoire *./docs/03_plan/_modèles* et y déposer tous les modèles disponibles

# 2/ Génération de la documentation

L'usage de l'IA doit toujours être cyclique car il n'est jamais parfait du premier coup.
Les choix faits dans une session sont faits pour une raison. Pour que l'IA les revoit, il faut créer une autre session.

## 2.1/ Etape initiale
* Dans une première session, exécuter le prompt sauvegardé dans ./docs/00_init&prompt/00_promptInitial.md et répondre aux questions demandées.
* Relire tous les documents générés

## 2.2/ Etape de relecture de l'étape
Exécuter, dans une nouvelle session, le prompt suivant :
```
Relie le(s) document(s) @docs/01_modalitesUsageEtConventions.md ,  @docs/02_glossaire.md   et @docs/plan_01_miseEnPlace.md généré à l'étape 1 du prompt @docs/00_init&prompt/00_promptInitial.md .
Critique les et propose des modifications/améliorations
```
* Discuter/décider avec l'IA
* Relire chaque modification proposée
* Une fois le travail satisfaisant, dans la seconde de relecture, exécuter le prompt suivant :
```
Propose moi (s'il en existe) des éléments pouvant être ajoutés dans @docs/00_init&prompt/00_promptInitial.md ou dans les modèles de document pour ne pas avoir ces modifications/améliorations à réaliser en relecture ?
```
* Attention à être très précis dans ces modifications car elles sont structurantes.

## 2.3/ Etape suivante
* Dans la toute première session, valider l'étape et passer à la suivante avec le prompt :
```
Une session indépendante a réalisé la relecture et les possibles améliorations.
J'ai relu tous les documents.
Passons à l'étape suivante.
```

## 2.4/ Boucler
Boucler les §2.2 et 2.3 jusqu'à arriver à la dernière étape du prompt de génération de documentation

# 3/ Développement

Le développement est initialement et totalement réalisé par l'IA.
Tout le travail de documentation a mené à cela.

Pour cela, créer une nouvelle session et y copier/coller le prompt *00_promptDeveloppement.md* pour initialiser le développement.

Puis, dans une nouvelle session à chaque fois, exécuter le prompt
```
La phase XX du prompt @docs/00_init&prompt/00_promptDeveloppement.md  est terminée. Démarre la phase suivante.
```


