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

# 2/ Exécution

## 2.1/ Etape 1
* Dans une première session, exécuter le prompt sauvegardé dans ./docs/_modèles/00_promptInitial.md et répondre aux questions demandées.
* Relire tous les documents générés
* Puis exécuter, dans une seconde session, le prompt suivant :
```
Relie les documents @docs/01_modalitesUsageEtConventions.md ,  @docs/02_glossaire.md   et @docs/plan_01_miseEnPlace.md généré à l'étape 1 du prompt @docs/_modèles/00_promptInitial.md .
Critique les et proposition des modifications/améliorations 
```
* Discuter/décider avec l'IA
* Relire chaque modification proposée
* Une fois le travail satisfaisant, dans la seconde de relecture, exécuter le prompt suivant :
```
Propose moi (s'il en existe) des éléments pouvant être ajoutés dans @docs/_modèles/00_promptInitial.md  pour ne pas avoir ces modifications/améliorations à réaliser en relecture ?
```
* Attention à être très précis dans ces modifications car elles sont structurantes.


## 2.2/ Etape 2
* Dans la première session, valider l'étape et passer à la suivante avec le prompt :
```
Une session indépendante a réalisé la relecture et les possibles améliorations.
J'ai relu tous les documents.
Passons à l'étape suivante.
```


