# Services sans état

Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce dossier regroupe les services applicatifs de l'interface dont le résultat ne dépend que de leurs paramètres (et, le cas échéant, de l'état du fichier de données au moment de l'appel), jamais d'un état interne conservé entre deux appels, conformément à `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches` : `jugement/` (Moteur de jugement, fonctions pures de calcul des indicateurs) et `commandes/` (client typé de la Façade de commandes).

Chacun de ces deux modules conserve, à l'intérieur de ce dossier, le rôle et le contenu déjà décrits dans son propre `README.md`.
