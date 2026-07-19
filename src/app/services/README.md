# Services

Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce dossier regroupe l'ensemble des services applicatifs de l'interface (au sens large : aussi bien les services Angular injectables que les classes utilitaires porteuses de fonctions pures), répartis en deux sous-dossiers selon leur caractère stateless ou stateful, conformément à `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches` : `sansetat/` (services sans état, cf. `services/sansetat/README.md`) et `avecetat/` (services porteurs d'un état réactif, cf. `services/avecetat/README.md`).

Cette répartition remplace, depuis le 2026-07-19, une organisation antérieure où les cinq modules concernés étaient placés directement sous `src/app/`, sans distinction explicite entre services sans état et services porteurs d'un état ; ce regroupement est une décision humaine issue de la relecture de la Phase 0 (bootstrap).
