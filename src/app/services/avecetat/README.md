# Services avec état

Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce dossier regroupe les services applicatifs de l'interface porteurs d'un état interne conservé entre deux appels (état réactif exposé par Signals, ou structure construite une fois puis réutilisée), conformément à `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches` : `campagne/` (Orchestrateur de campagne, Connecteur croisé), `etat/` (Store d'état applicatif) et `recherche/` (Index de recherche transversale).

Chacun de ces trois modules conserve, à l'intérieur de ce dossier, le rôle et le contenu déjà décrits dans son propre `README.md`.
