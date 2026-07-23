# Campagne

Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce dossier, classé sous `services/avecetat/` car porteur d'un état interne conservé entre deux appels (cf. `services/avecetat/README.md`), accueille l'Orchestrateur de campagne et le Connecteur croisé, tels que définis à l'étape 6 (cf. `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`).

Le Connecteur croisé (`connecteur-croise.utils.ts`) est livré depuis la Phase 5, incrément 3 : deux calculs sur trois (`calculerFraicheurSonar`, `calculerActiviteSansQualite`), le troisième (`calculerIaNouveauCode`) restant différé, faute de production de `gitlab.marqueurs_ia`. Bien que classé sous `avecetat/` pour rester aux côtés de son futur appelant, ce module lui-même ne porte aucun état interne : ses fonctions sont pures, à membres statiques uniquement. L'Orchestrateur de campagne reste, lui, non implémenté (incrément ultérieur).
