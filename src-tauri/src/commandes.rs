// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Façade de commandes : frontière unique entre l'interface Angular et le cœur natif (cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`).
//!
//! Périmètre de la Phase 1 : uniquement les commandes strictement nécessaires à la création, au chargement, à la
//! sauvegarde et au verrouillage/déverrouillage du fichier de données (US-001, US-002, US-026). La Façade n'est
//! jamais testée isolément : chaque commande délègue au Moteur de persistance, déjà couvert par ses propres tests
//! unitaires (cf. `docs/02_documentation/16_normesTests.md#tests-unitaires`).

pub(crate) mod etat_session;
pub(crate) mod fichier;
