Avant toute chose, le dépôt doit être initialisé pour permettre d'utiliser ClaudeCode.

# 1/ Le settings.json
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

# 2/ Le répertoire de mémoire
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
